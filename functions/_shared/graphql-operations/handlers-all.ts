/**
 * Maps legacy GraphQL operation names to Appwrite Databases calls.
 * Collection IDs and attribute keys match the legacy SQL-style model (snake_case).
 */

import { ID, Query } from "node-appwrite";
import {
  C,
  countDocuments,
  createDocument,
  deleteDocument,
  getDocument,
  listDocumentsFull,
  updateDocument,
} from "../appwrite-db";
import { hydrateShot, hydrateShots, queriesForUserProjects } from "./helpers";

type V = Record<string, unknown>;
type Op = (v: V) => Promise<unknown>;

/**
 * Writable attributes on `ai_chat_settings` — must match provision-appwrite-schema.mjs.
 * Stops stray keys / null payloads from reaching Appwrite ("Unknown attribute" / invalid structure).
 */
const AI_CHAT_SETTINGS_WRITABLE = new Set([
  "user_id",
  "provider",
  "model",
  "settings_json",
  "temperature",
  "system_prompt_default",
  "openai_api_key",
  "anthropic_api_key",
  "google_api_key",
  "openrouter_api_key",
  "deepseek_api_key",
  "ollama_base_url",
  "ollama_api_key",
  "ollama_image_api_key",
  "active_provider",
  "active_model",
  "system_prompt",
  "max_tokens",
  "use_rag",
]);

const AI_CHAT_API_KEY_FIELDS = new Set([
  "openai_api_key",
  "anthropic_api_key",
  "google_api_key",
  "openrouter_api_key",
  "deepseek_api_key",
  "ollama_api_key",
  "ollama_image_api_key",
]);

function sanitizeAiChatSettingsInsert(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!AI_CHAT_SETTINGS_WRITABLE.has(k)) continue;
    if (v === null || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

function sanitizeAiChatSettingsUpdate(
  data: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!AI_CHAT_SETTINGS_WRITABLE.has(k)) continue;
    if (v === undefined) continue;
    if (v === null && AI_CHAT_API_KEY_FIELDS.has(k)) {
      out[k] = "";
      continue;
    }
    if (v === null) continue;
    out[k] = v;
  }
  return out;
}

async function upsertUser(
  object: Record<string, unknown>,
): Promise<{ insert_users_one: { id: string } }> {
  const id = object.id as string;
  const { id: _drop, ...rest } = object;
  const ex = await getDocument(C.users, id);
  if (ex) {
    await updateDocument(C.users, id, rest);
  } else {
    await createDocument(C.users, id, rest);
  }
  return { insert_users_one: { id } };
}

async function listShotAudioForOrg(
  organizationId: string,
): Promise<
  Array<{ file_name: string; file_size: number | null; created_at: string }>
> {
  const projects = await listDocumentsFull(C.projects, [
    Query.equal("organization_id", organizationId),
  ]);
  const out: Array<{
    file_name: string;
    file_size: number | null;
    created_at: string;
  }> = [];
  for (const p of projects) {
    const shots = await listDocumentsFull(C.shots, [
      Query.equal("project_id", p.id as string),
    ]);
    for (const s of shots) {
      const aud = await listDocumentsFull(C.shot_audio, [
        Query.equal("shot_id", s.id as string),
      ]);
      for (const a of aud) {
        out.push({
          file_name: a.file_name as string,
          file_size: (a.file_size as number) ?? null,
          created_at: a.created_at as string,
        });
      }
    }
  }
  return out;
}

/** `ai_chat_messages` schema only has `metadata_json` for model/provider/tokens; expand for GraphQL-shaped clients. */
function enrichAiChatMessageRow(
  row: Record<string, unknown>,
): Record<string, unknown> {
  let meta: Record<string, unknown> = {};
  try {
    const mj = row.metadata_json;
    if (typeof mj === "string" && mj.trim()) {
      meta = JSON.parse(mj) as Record<string, unknown>;
    } else if (mj && typeof mj === "object" && !Array.isArray(mj)) {
      meta = mj as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return {
    ...row,
    model: meta.model ?? row.model,
    provider: meta.provider ?? row.provider,
    tokens_used: meta.tokens_used ?? row.tokens_used,
    tool_calls: meta.tool_calls ?? row.tool_calls,
  };
}

export const allHandlers: Record<string, Op> = {
  GetProjects: async (v) => ({
    projects: await listDocumentsFull(
      C.projects,
      queriesForUserProjects(v.organizationId as string, v.userId as string),
    ),
  }),

  CreateProject: async (v) => ({
    insert_projects_one: await createDocument(
      C.projects,
      ID.unique(),
      v.object as Record<string, unknown>,
    ),
  }),

  UpdateProject: async (v) => ({
    update_projects_by_pk: await updateDocument(
      C.projects,
      v.projectId as string,
      v.changes as Record<string, unknown>,
    ),
  }),

  SoftDeleteProject: async (v) => ({
    update_projects_by_pk: await updateDocument(
      C.projects,
      v.projectId as string,
      { is_deleted: true },
    ),
  }),

  UpdateProjectCoverImage: async (v) => ({
    update_projects_by_pk: await updateDocument(C.projects, v.id as string, {
      cover_image_url: v.imageUrl,
    }),
  }),

  LegacyProjectsList: async (v) => ({
    projects: await listDocumentsFull(
      C.projects,
      queriesForUserProjects(v.organizationId as string, v.userId as string),
    ),
  }),

  ProjectsHealthcheck: async () => ({
    projects_aggregate: {
      aggregate: { count: await countDocuments(C.projects) },
    },
  }),

  GetUserOrganizations: async (v) => ({
    organization_members: await listDocumentsFull(C.organization_members, [
      Query.equal("user_id", v.userId as string),
    ]),
  }),

  GetAccessibleProject: async (v) => {
    const projectId = v.projectId as string;
    const userId = v.userId as string;
    const organizationIds = (v.organizationIds as string[]) || [];
    const proj = await getDocument(C.projects, projectId);
    if (!proj) {
      return { projects: [] };
    }
    if (proj.user_id === userId) {
      return { projects: [proj] };
    }
    if (organizationIds.includes(proj.organization_id as string)) {
      return { projects: [proj] };
    }
    return { projects: [] };
  },

  GetUserByIntegrationToken: async (v) => ({
    user_integration_tokens: await listDocumentsFull(
      C.user_integration_tokens,
      [Query.equal("token_hash", v.tokenHash as string), Query.limit(1)],
    ),
  }),

  GetUserProfile: async (v) => ({
    users_by_pk: await getDocument(C.users, v.userId as string),
  }),

  GetExistingUserState: async (v) => ({
    users_by_pk: await getDocument(C.users, v.userId as string),
    organization_members: await listDocumentsFull(C.organization_members, [
      Query.equal("user_id", v.userId as string),
      Query.limit(1),
    ]),
  }),

  CreateOrganization: async (v) => ({
    insert_organizations_one: await createDocument(
      C.organizations,
      ID.unique(),
      v.object as Record<string, unknown>,
    ),
  }),

  AddOrganizationMember: async (v) => ({
    insert_organization_members_one: await createDocument(
      C.organization_members,
      ID.unique(),
      v.object as Record<string, unknown>,
    ),
  }),

  AddOwnerMembership: async (v) => ({
    insert_organization_members_one: await createDocument(
      C.organization_members,
      ID.unique(),
      v.object as Record<string, unknown>,
    ),
  }),

  UpsertUser: async (v) => upsertUser(v.object as Record<string, unknown>),

  GetOrganizations: async (v) => {
    const memberships = await listDocumentsFull(C.organization_members, [
      Query.equal("user_id", v.userId as string),
    ]);
    const organization_members = [];
    for (const m of memberships) {
      const org = await getDocument(
        C.organizations,
        m.organization_id as string,
      );
      organization_members.push({
        role: m.role,
        organizations: org,
      });
    }
    return { organization_members };
  },

  GetOrganizationMembership: async (v) => ({
    organization_members: await listDocumentsFull(C.organization_members, [
      Query.equal("organization_id", v.orgId as string),
      Query.equal("user_id", v.userId as string),
      Query.limit(1),
    ]),
    organizations_by_pk: await getDocument(C.organizations, v.orgId as string),
  }),

  UpdateOrganization: async (v) => ({
    update_organizations_by_pk: await updateDocument(
      C.organizations,
      v.orgId as string,
      v.changes as Record<string, unknown>,
    ),
  }),

  DeleteOrganization: async (v) => {
    await deleteDocument(C.organizations, v.orgId as string);
    return { delete_organizations_by_pk: { id: v.orgId } };
  },

  GetProfile: async (v) => ({
    users_by_pk: await getDocument(C.users, v.userId as string),
  }),

  UpdateProfile: async (v) => ({
    update_users_by_pk: await updateDocument(
      C.users,
      v.userId as string,
      v.changes as Record<string, unknown>,
    ),
  }),

  ListIntegrationTokens: async (v) => ({
    user_integration_tokens: await listDocumentsFull(
      C.user_integration_tokens,
      [
        Query.equal("user_id", v.userId as string),
        Query.orderDesc("$createdAt"),
      ],
    ),
  }),

  CreateIntegrationToken: async (v) => ({
    insert_user_integration_tokens_one: await createDocument(
      C.user_integration_tokens,
      ID.unique(),
      v.object as Record<string, unknown>,
    ),
  }),

  GetIntegrationToken: async (v) => ({
    user_integration_tokens_by_pk: await getDocument(
      C.user_integration_tokens,
      v.id as string,
    ),
  }),

  DeleteIntegrationToken: async (v) => {
    await deleteDocument(C.user_integration_tokens, v.id as string);
    return { delete_user_integration_tokens_by_pk: { id: v.id } };
  },

  AuthHealthcheck: async () => ({
    organizations_aggregate: {
      aggregate: { count: await countDocuments(C.organizations) },
    },
  }),

  GetWorlds: async (v) => ({
    worlds: await listDocumentsFull(C.worlds, [
      Query.equal("organization_id", v.organizationId as string),
      Query.orderDesc("$createdAt"),
    ]),
  }),

  CreateWorld: async (v) => ({
    insert_worlds_one: await createDocument(
      C.worlds,
      ID.unique(),
      v.object as Record<string, unknown>,
    ),
  }),

  GetWorld: async (v) => ({
    worlds: await listDocumentsFull(C.worlds, [
      // Document id is Appwrite `$id`; collection may also define attribute `id` (often null) — do not query on `id`.
      Query.equal("$id", v.worldId as string),
      Query.equal("organization_id", v.organizationId as string),
      Query.limit(1),
    ]),
  }),

  /** Alias for RAG context loader query name. */
  RagWorld: async (v) => ({
    worlds: await listDocumentsFull(C.worlds, [
      Query.equal("$id", v.worldId as string),
      Query.equal("organization_id", v.organizationId as string),
      Query.limit(1),
    ]),
  }),

  UpdateWorld: async (v) => ({
    update_worlds_by_pk: await updateDocument(
      C.worlds,
      v.worldId as string,
      v.changes as Record<string, unknown>,
    ),
  }),

  DeleteWorld: async (v) => {
    await deleteDocument(C.worlds, v.worldId as string);
    return { delete_worlds_by_pk: { id: v.worldId } };
  },

  GetWorldForUpload: async (v) => ({
    worlds_by_pk: await getDocument(C.worlds, v.id as string),
  }),

  UpdateWorldCoverImage: async (v) => ({
    update_worlds_by_pk: await updateDocument(C.worlds, v.id as string, {
      cover_image_url: v.imageUrl,
    }),
  }),

  GetWorldCategories: async (v) => ({
    world_categories: await listDocumentsFull(C.world_categories, [
      Query.equal("world_id", v.worldId as string),
      Query.orderAsc("order_index"),
    ]),
  }),

  CreateWorldCategory: async (v) => ({
    insert_world_categories_one: await createDocument(
      C.world_categories,
      ID.unique(),
      v.object as Record<string, unknown>,
    ),
  }),

  GetWorldItems: async (v) => ({
    world_items: await listDocumentsFull(C.world_items, [
      Query.equal("world_id", v.worldId as string),
    ]),
  }),

  GetWorldbuildingCharacters: async (v) => {
    const q: string[] = [
      Query.equal("organization_id", v.organizationId as string),
    ];
    if (v.worldId) {
      q.push(Query.equal("world_id", v.worldId as string));
    } else {
      q.push(Query.isNull("world_id"));
    }
    q.push(Query.orderDesc("$createdAt"));
    return { characters: await listDocumentsFull(C.characters, q) };
  },

  WorldsHealthcheck: async () => ({
    worlds_aggregate: { aggregate: { count: await countDocuments(C.worlds) } },
  }),

  GetProjectForTimeline: async (v) => ({
    projects_by_pk: await getDocument(C.projects, v.projectId as string),
  }),

  GetTimelineNode: async (v) => ({
    timeline_nodes_by_pk: await getDocument(
      C.timeline_nodes,
      v.nodeId as string,
    ),
  }),

  GetTimelineChildren: async (v) => ({
    timeline_nodes: await listDocumentsFull(C.timeline_nodes, [
      Query.equal("parent_id", v.parentId as string),
      Query.orderAsc("order_index"),
    ]),
  }),

  GetAllProjectNodes: async (v) => ({
    timeline_nodes: await listDocumentsFull(C.timeline_nodes, [
      Query.equal("project_id", v.projectId as string),
      Query.orderAsc("order_index"),
    ]),
  }),

  GetCharactersByProject: async (v) => ({
    characters: await listDocumentsFull(C.characters, [
      Query.equal("project_id", v.projectId as string),
      Query.orderDesc("$createdAt"),
    ]),
  }),

  GetCharacter: async (v) => ({
    characters_by_pk: await getDocument(C.characters, v.characterId as string),
  }),

  GetShotsByProject: async (v) => ({
    shots: await hydrateShots(
      await listDocumentsFull(C.shots, [
        Query.equal("project_id", v.projectId as string),
        Query.orderAsc("order_index"),
      ]),
    ),
  }),

  GetShotsByScene: async (v) => ({
    shots: await hydrateShots(
      await listDocumentsFull(C.shots, [
        Query.equal("scene_id", v.sceneId as string),
        Query.orderAsc("order_index"),
      ]),
    ),
  }),

  GetShot: async (v) => {
    const row = await getDocument(C.shots, v.shotId as string);
    return { shots_by_pk: row ? await hydrateShot(row) : null };
  },

  GetStoryBeats: async (v) => ({
    story_beats: await listDocumentsFull(C.story_beats, [
      Query.equal("project_id", v.projectId as string),
      Query.orderAsc("order_index"),
    ]),
  }),

  /** Alias for RAG context loader query name. */
  RagStoryBeats: async (v) => ({
    story_beats: await listDocumentsFull(C.story_beats, [
      Query.equal("project_id", v.projectId as string),
      Query.orderAsc("order_index"),
    ]),
  }),

  CreateBeat: async (v) => ({
    insert_story_beats_one: await createDocument(
      C.story_beats,
      ID.unique(),
      v.object as Record<string, unknown>,
    ),
  }),

  GetBeat: async (v) => ({
    story_beats_by_pk: await getDocument(C.story_beats, v.beatId as string),
  }),

  UpdateBeat: async (v) => ({
    update_story_beats_by_pk: await updateDocument(
      C.story_beats,
      v.beatId as string,
      v.changes as Record<string, unknown>,
    ),
  }),

  DeleteBeat: async (v) => {
    await deleteDocument(C.story_beats, v.beatId as string);
    return { delete_story_beats_by_pk: { id: v.beatId } };
  },

  BeatsHealthcheck: async () => ({
    story_beats_aggregate: {
      aggregate: { count: await countDocuments(C.story_beats) },
    },
  }),

  CreateTimelineNode: async (v) => ({
    insert_timeline_nodes_one: await createDocument(
      C.timeline_nodes,
      ID.unique(),
      v.object as Record<string, unknown>,
    ),
  }),

  UpdateTimelineNode: async (v) => ({
    update_timeline_nodes_by_pk: await updateDocument(
      C.timeline_nodes,
      v.id as string,
      v.changes as Record<string, unknown>,
    ),
  }),

  DeleteTimelineNode: async (v) => {
    await deleteDocument(C.timeline_nodes, v.id as string);
    return { delete_timeline_nodes_by_pk: { id: v.id } };
  },

  ReorderTimelineNode: async (v) => ({
    update_timeline_nodes_by_pk: await updateDocument(
      C.timeline_nodes,
      v.id as string,
      {
        order_index: v.orderIndex,
      },
    ),
  }),

  BulkCreateTimelineNodes: async (v) => {
    const objects = v.objects as Record<string, unknown>[];
    const created = [];
    for (const o of objects) {
      created.push(await createDocument(C.timeline_nodes, ID.unique(), o));
    }
    return { insert_timeline_nodes: { returning: created } };
  },

  InitializeTimelineProject: async (v) => {
    const objects = v.objects as Record<string, unknown>[];
    const created = [];
    for (const o of objects) {
      created.push(await createDocument(C.timeline_nodes, ID.unique(), o));
    }
    return { insert_timeline_nodes: { returning: created } };
  },

  CreateShot: async (v) => ({
    insert_shots_one: await createDocument(
      C.shots,
      ID.unique(),
      v.object as Record<string, unknown>,
    ),
  }),

  UpdateShot: async (v) => ({
    update_shots_by_pk: await updateDocument(
      C.shots,
      v.id as string,
      v.changes as Record<string, unknown>,
    ),
  }),

  DeleteShot: async (v) => {
    await deleteDocument(C.shots, v.id as string);
    return { delete_shots_by_pk: { id: v.id } };
  },

  ReorderShot: async (v) => ({
    update_shots_by_pk: await updateDocument(C.shots, v.id as string, {
      order_index: v.orderIndex,
      user_id: v.userId,
    }),
  }),

  UpdateShotImage: async (v) => ({
    update_shots_by_pk: await updateDocument(C.shots, v.id as string, {
      image_url: v.imageUrl,
      user_id: v.userId,
    }),
  }),

  AddShotCharacter: async (v) => ({
    insert_shot_characters_one: await createDocument(
      C.shot_characters,
      ID.unique(),
      {
        shot_id: v.shotId,
        character_id: v.characterId,
      },
    ),
  }),

  RemoveShotCharacter: async (v) => {
    const links = await listDocumentsFull(C.shot_characters, [
      Query.equal("shot_id", v.shotId as string),
      Query.equal("character_id", v.characterId as string),
      Query.limit(10),
    ]);
    for (const l of links) {
      await deleteDocument(C.shot_characters, l.id as string);
    }
    return { delete_shot_characters: { affected_rows: links.length } };
  },

  CreateCharacter: async (v) => ({
    insert_characters_one: await createDocument(
      C.characters,
      ID.unique(),
      v.object as Record<string, unknown>,
    ),
  }),

  UpdateCharacter: async (v) => ({
    update_characters_by_pk: await updateDocument(
      C.characters,
      v.id as string,
      v.changes as Record<string, unknown>,
    ),
  }),

  DeleteCharacter: async (v) => {
    await deleteDocument(C.characters, v.id as string);
    return { delete_characters_by_pk: { id: v.id } };
  },

  CreateShotAudio: async (v) => ({
    insert_shot_audio_one: await createDocument(
      C.shot_audio,
      ID.unique(),
      v.object as Record<string, unknown>,
    ),
  }),

  GetShotAudio: async (v) => ({
    shot_audio: await listDocumentsFull(C.shot_audio, [
      Query.equal("shot_id", v.shotId as string),
    ]),
  }),

  GetShotAudioFile: async (v) => ({
    shot_audio_by_pk: await getDocument(C.shot_audio, v.id as string),
  }),

  UpdateShotAudio: async (v) => ({
    update_shot_audio_by_pk: await updateDocument(
      C.shot_audio,
      v.id as string,
      v.changes as Record<string, unknown>,
    ),
  }),

  DeleteShotAudio: async (v) => {
    await deleteDocument(C.shot_audio, v.id as string);
    return { delete_shot_audio_by_pk: { id: v.id } };
  },

  GetBatchShotAudio: async (v) => {
    const shotIds = v.shotIds as string[];
    const rows: Record<string, unknown>[] = [];
    for (const sid of shotIds) {
      rows.push(
        ...(await listDocumentsFull(C.shot_audio, [
          Query.equal("shot_id", sid),
          Query.orderAsc("$createdAt"),
        ])),
      );
    }
    return { shot_audio: rows };
  },

  GetAiSettings: async (v) => ({
    ai_chat_settings: await listDocumentsFull(C.ai_chat_settings, [
      Query.equal("user_id", v.userId as string),
      Query.limit(1),
    ]),
  }),

  /** Alias used by scriptony-image cover generation settings lookup. */
  GetImageSettings: async (v) => ({
    ai_chat_settings: await listDocumentsFull(C.ai_chat_settings, [
      Query.equal("user_id", v.userId as string),
      Query.limit(1),
    ]),
  }),

  /** Alias used by scriptony-image image-settings route. */
  CreateImageSettings: async (v) => ({
    insert_ai_chat_settings_one: await createDocument(
      C.ai_chat_settings,
      ID.unique(),
      sanitizeAiChatSettingsInsert(v.object as Record<string, unknown>),
    ),
  }),

  /** Used by `scriptony-assistant/ai/models.ts` to load keys/settings for dynamic model listing. */
  GetAiModelsContext: async (v) => ({
    ai_chat_settings: await listDocumentsFull(C.ai_chat_settings, [
      Query.equal("user_id", v.userId as string),
      Query.limit(1),
    ]),
  }),

  CreateAiSettings: async (v) => ({
    insert_ai_chat_settings_one: await createDocument(
      C.ai_chat_settings,
      ID.unique(),
      sanitizeAiChatSettingsInsert(v.object as Record<string, unknown>),
    ),
  }),

  UpdateAiSettings: async (v) => ({
    update_ai_chat_settings_by_pk: await updateDocument(
      C.ai_chat_settings,
      v.id as string,
      sanitizeAiChatSettingsUpdate(v.changes as Record<string, unknown>),
    ),
  }),

  /** Alias used by scriptony-image image-settings route. */
  UpdateImageSettings: async (v) => ({
    update_ai_chat_settings_by_pk: await updateDocument(
      C.ai_chat_settings,
      v.id as string,
      sanitizeAiChatSettingsUpdate(v.changes as Record<string, unknown>),
    ),
  }),

  GetActiveProvider: async (v) => ({
    ai_chat_settings: await listDocumentsFull(C.ai_chat_settings, [
      Query.equal("user_id", v.userId as string),
      Query.limit(1),
    ]),
  }),

  GetAiConversations: async (v) => ({
    ai_conversations: await listDocumentsFull(C.ai_conversations, [
      Query.equal("user_id", v.userId as string),
      Query.orderDesc("last_message_at"),
    ]),
  }),

  CreateAiConversation: async (v) => ({
    insert_ai_conversations_one: await createDocument(
      C.ai_conversations,
      ID.unique(),
      v.object as Record<string, unknown>,
    ),
  }),

  GetConversationMessages: async (v) => {
    const rows = await listDocumentsFull(C.ai_chat_messages, [
      Query.equal("conversation_id", v.conversationId as string),
      Query.orderAsc("$createdAt"),
    ]);
    return { ai_chat_messages: rows.map((r) => enrichAiChatMessageRow(r)) };
  },

  UpdateConversationPrompt: async (v) => ({
    update_ai_conversations_by_pk: await updateDocument(
      C.ai_conversations,
      v.id as string,
      {
        system_prompt: v.systemPrompt,
      },
    ),
  }),

  GetChatSettings: async (v) => ({
    ai_chat_settings: await listDocumentsFull(C.ai_chat_settings, [
      Query.equal("user_id", v.userId as string),
      Query.limit(1),
    ]),
  }),

  CreateConversation: async (v) => ({
    insert_ai_conversations_one: await createDocument(
      C.ai_conversations,
      ID.unique(),
      v.object as Record<string, unknown>,
    ),
  }),

  CreateChatMessages: async (v) => {
    const objects = v.objects as Record<string, unknown>[];
    const returning: Record<string, unknown>[] = [];
    for (const o of objects) {
      const payload: Record<string, unknown> = {
        conversation_id: o.conversation_id,
        role: o.role,
        content: o.content,
      };
      if (typeof o.metadata_json === "string") {
        payload.metadata_json = o.metadata_json;
      }
      returning.push(
        await createDocument(C.ai_chat_messages, ID.unique(), payload),
      );
    }
    return {
      insert_ai_chat_messages: {
        returning: returning.map((r) => enrichAiChatMessageRow(r)),
      },
    };
  },

  TouchConversation: async (v) => ({
    update_ai_conversations_by_pk: await updateDocument(
      C.ai_conversations,
      v.id as string,
      {
        message_count: v.messageCount,
        last_message_at: v.lastMessageAt,
      },
    ),
  }),

  QueueRagSync: async (v) => ({
    insert_rag_sync_queue_one: await createDocument(
      C.rag_sync_queue,
      ID.unique(),
      v.object as Record<string, unknown>,
    ),
  }),

  GetNodeLogs: async (v) => ({
    activity_logs: await listDocumentsFull(C.activity_logs, [
      Query.equal("entity_type", v.entityType as string),
      Query.equal("entity_id", v.entityId as string),
      Query.orderDesc("$createdAt"),
      Query.limit(v.limit as number),
    ]),
  }),

  GetProjectLogs: async (v) => ({
    activity_logs: await listDocumentsFull(C.activity_logs, [
      Query.equal("project_id", v.projectId as string),
      Query.orderDesc("$createdAt"),
      Query.limit(v.limit as number),
    ]),
  }),

  GetProjectStatsPayload: async (v) => {
    const projectId = v.projectId as string;
    const projects_by_pk = await getDocument(C.projects, projectId);
    const timeline_nodes = await listDocumentsFull(C.timeline_nodes, [
      Query.equal("project_id", projectId),
    ]);
    const shots = await listDocumentsFull(C.shots, [
      Query.equal("project_id", projectId),
    ]);
    const characters = await listDocumentsFull(C.characters, [
      Query.equal("project_id", projectId),
    ]);
    const worlds = await listDocumentsFull(C.worlds, [
      Query.equal("linked_project_id", projectId),
    ]);
    return { projects_by_pk, timeline_nodes, shots, characters, worlds };
  },

  GetShotCharacterCounts: async (v) => {
    const shots = await listDocumentsFull(C.shots, [
      Query.equal("project_id", v.projectId as string),
    ]);
    const links: Array<{
      character_id: string;
      character: { name: string } | null;
    }> = [];
    for (const s of shots) {
      const sc = await listDocumentsFull(C.shot_characters, [
        Query.equal("shot_id", s.id as string),
      ]);
      for (const l of sc) {
        const ch = await getDocument(C.characters, l.character_id as string);
        links.push({
          character_id: l.character_id as string,
          character: ch ? { name: (ch.name as string) || "Unknown" } : null,
        });
      }
    }
    return { shot_characters: links };
  },

  GetShotStats: async (v) => {
    const shots_by_pk = await getDocument(C.shots, v.id as string);
    const shot_characters = await listDocumentsFull(C.shot_characters, [
      Query.equal("shot_id", v.id as string),
    ]);
    return { shots_by_pk, shot_characters };
  },

  GetNodeStats: async (v) => {
    const id = v.id as string;
    const node = await getDocument(C.timeline_nodes, id);
    if (!node) {
      return {
        timeline_nodes_by_pk: null,
        timeline_nodes: [],
        shots: [],
        shot_characters: [],
      };
    }
    const projectId = node.project_id as string;
    const allNodes = await listDocumentsFull(C.timeline_nodes, [
      Query.equal("project_id", projectId),
    ]);
    const byParent = new Map<string | null, Array<Record<string, any>>>();
    for (const n of allNodes) {
      const key = (n.parent_id as string | null) ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(n);
    }
    const desc: Record<string, any>[] = [];
    const stack = [...(byParent.get(id) || [])];
    while (stack.length) {
      const cur = stack.pop()!;
      desc.push(cur);
      stack.push(...(byParent.get(cur.id as string) || []));
    }
    const sceneIds = new Set<string>();
    if ((node.level as number) === 3) sceneIds.add(id);
    for (const d of desc) {
      if ((d.level as number) === 3) sceneIds.add(d.id as string);
    }
    const allShots = await listDocumentsFull(C.shots, [
      Query.equal("project_id", projectId),
    ]);
    const relevantShots = allShots.filter((s) =>
      sceneIds.has(s.scene_id as string)
    );
    const shot_characters: Record<string, unknown>[] = [];
    for (const s of relevantShots) {
      shot_characters.push(
        ...(await listDocumentsFull(C.shot_characters, [
          Query.equal("shot_id", s.id as string),
        ])),
      );
    }
    return {
      timeline_nodes_by_pk: node,
      timeline_nodes: desc,
      shots: relevantShots,
      shot_characters,
    };
  },

  GetSceneCharacters: async (v) => {
    const shotIds = v.shotIds as string[];
    const rows: Array<{ character_id: string }> = [];
    for (const sid of shotIds) {
      const sc = await listDocumentsFull(C.shot_characters, [
        Query.equal("shot_id", sid),
      ]);
      for (const l of sc) rows.push({ character_id: l.character_id as string });
    }
    return { shot_characters: rows };
  },

  GetProjectAudioCount: async (v) => {
    const shots = await listDocumentsFull(C.shots, [
      Query.equal("project_id", v.projectId as string),
    ]);
    let n = 0;
    for (const s of shots) {
      const aud = await listDocumentsFull(C.shot_audio, [
        Query.equal("shot_id", s.id as string),
      ]);
      n += aud.length;
    }
    return { shot_audio_aggregate: { aggregate: { count: n } } };
  },

  GetSuperadminUsers: async () => ({
    users: await listDocumentsFull(C.users, [
      Query.orderDesc("$createdAt"),
      Query.limit(500),
    ]),
  }),

  GetSuperadminStats: async () => {
    const [users, orgs, projects, worlds] = await Promise.all([
      countDocuments(C.users),
      countDocuments(C.organizations),
      countDocuments(C.projects, [
        Query.or([
          Query.equal("is_deleted", false),
          Query.isNull("is_deleted"),
        ]),
      ]),
      countDocuments(C.worlds),
    ]);
    return {
      users_aggregate: { aggregate: { count: users } },
      organizations_aggregate: { aggregate: { count: orgs } },
      projects_aggregate: { aggregate: { count: projects } },
      worlds_aggregate: { aggregate: { count: worlds } },
    };
  },

  GetSuperadminOrganizations: async () => {
    const organizations = await listDocumentsFull(C.organizations, [
      Query.orderDesc("$createdAt"),
      Query.limit(500),
    ]);
    const organization_members = await listDocumentsFull(
      C.organization_members,
      [Query.limit(5000)],
    );
    const projects = await listDocumentsFull(C.projects, [
      Query.or([Query.equal("is_deleted", false), Query.isNull("is_deleted")]),
      Query.limit(5000),
    ]);
    const worlds = await listDocumentsFull(C.worlds, [Query.limit(5000)]);
    return {
      organizations,
      organization_members: organization_members.map((m) => ({
        organization_id: m.organization_id,
      })),
      projects: projects.map((p) => ({ organization_id: p.organization_id })),
      worlds: worlds.map((w) => ({ organization_id: w.organization_id })),
    };
  },

  GetSuperadminAnalytics: async () => {
    const totalEvents = await countDocuments(C.activity_logs);
    const activity_logs = await listDocumentsFull(C.activity_logs, [
      Query.orderDesc("$createdAt"),
      Query.limit(500),
    ]);
    const organization_members = await listDocumentsFull(
      C.organization_members,
      [Query.limit(2000)],
    );
    return {
      activity_logs_aggregate: { aggregate: { count: totalEvents } },
      activity_logs,
      organization_members,
    };
  },

  GetStorageUsage: async (v) => {
    const organizationId = v.organizationId as string;
    const shot_audio = await listShotAudioForOrg(organizationId);
    const projects = await listDocumentsFull(C.projects, [
      Query.equal("organization_id", organizationId),
    ]);
    const worlds = await listDocumentsFull(C.worlds, [
      Query.equal("organization_id", organizationId),
    ]);
    const allShots: Record<string, unknown>[] = [];
    for (const p of projects) {
      allShots.push(
        ...(await listDocumentsFull(C.shots, [
          Query.equal("project_id", p.id as string),
        ])),
      );
    }
    return {
      shot_audio,
      projects: projects.map((p) => ({ cover_image_url: p.cover_image_url })),
      worlds: worlds.map((w) => ({ cover_image_url: w.cover_image_url })),
      shots: allShots.map((s) => ({
        image_url: s.image_url,
        storyboard_url: s.storyboard_url,
      })),
    };
  },
};
