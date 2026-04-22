/**
 * Appwrite function: Style Guide (project_visual_style + items).
 * Routes under /style-guide/*
 */

import { ID } from "node-appwrite";
import { requireUserBootstrap } from "../_shared/auth";
import {
  C,
  createDocument,
  deleteDocument,
  updateDocument,
} from "../_shared/appwrite-db";
import { getStorageBucketId } from "../_shared/env";
import {
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
} from "../_shared/http";
import { createAppwriteHandler } from "../_shared/appwrite-handler";
import { extractUploadedFile, uploadFileToStorage } from "../_shared/storage";
import {
  getAccessibleProject,
  getUserOrganizationIds,
} from "../_shared/scriptony";
import {
  createReferenceBodySchema,
  extractPaletteBodySchema,
  patchBodyToAppwriteRow,
  patchStyleGuideBodySchema,
  reorderReferencesBodySchema,
  updateReferenceBodySchema,
} from "../_shared/style-guide-schema";
import {
  compileExportPayload,
  getItemById,
  getOrCreateStyleRoot,
  itemRowToApi,
  listItemsForStyle,
  maxOrderIndex,
  persistCompiledOutputs,
  styleRowToApi,
} from "./style-guide-service";
import {
  extractJobContext,
  stripJobFields,
  reportJobProgress,
  completeJob,
  failJob,
} from "../_shared/jobs/jobWorker";

function getPathname(req: RequestLike): string {
  const direct = (typeof req?.path === "string" && req.path) ||
    (typeof req?.url === "string" && req.url) ||
    "/";
  try {
    if (direct.startsWith("http://") || direct.startsWith("https://")) {
      return new URL(direct).pathname || "/";
    }
  } catch {
    /* noop */
  }
  const q = direct.indexOf("?");
  return q >= 0 ? direct.slice(0, q) : direct;
}

async function requireProjectAccess(
  req: RequestLike,
  res: ResponseLike,
  projectId: string,
): Promise<{ userId: string; organizationIds: string[] } | null> {
  const bootstrap = await requireUserBootstrap(req);
  if (!bootstrap) {
    sendUnauthorized(res);
    return null;
  }
  const organizationIds = await getUserOrganizationIds(bootstrap.user.id);
  const project = await getAccessibleProject(
    projectId,
    bootstrap.user.id,
    organizationIds,
  );
  if (!project) {
    sendNotFound(res, "Project not found");
    return null;
  }
  return { userId: bootstrap.user.id, organizationIds };
}

async function loadStyleBundle(projectId: string, userId: string) {
  const root = await getOrCreateStyleRoot(projectId, userId);
  const items = await listItemsForStyle(root.id);
  return { root, items };
}

async function handleGetStyleGuide(
  req: RequestLike,
  res: ResponseLike,
  projectId: string,
): Promise<void> {
  const access = await requireProjectAccess(req, res, projectId);
  if (!access) return;
  const { root, items } = await loadStyleBundle(projectId, access.userId);
  sendJson(res, 200, {
    styleGuide: {
      ...styleRowToApi(root),
      items: items.map((r) => itemRowToApi(r)),
    },
  });
}

async function handlePatchStyleGuide(
  req: RequestLike,
  res: ResponseLike,
  projectId: string,
): Promise<void> {
  const access = await requireProjectAccess(req, res, projectId);
  if (!access) return;
  if (req.method !== "PATCH") {
    sendMethodNotAllowed(res, ["PATCH"]);
    return;
  }
  const body = await readJsonBody(req);
  const parsed = patchStyleGuideBodySchema.safeParse(body);
  if (!parsed.success) {
    sendBadRequest(res, parsed.error.flatten().message || "Invalid body");
    return;
  }
  const root = await getOrCreateStyleRoot(projectId, access.userId);
  const row = patchBodyToAppwriteRow(parsed.data);
  if (Object.keys(row).length === 0) {
    sendBadRequest(res, "No fields to update");
    return;
  }
  const updated = await updateDocument(C.project_visual_style, root.id, row);
  const items = await listItemsForStyle(updated.id);
  const merged = await persistCompiledOutputs(updated.id, updated, items);
  sendJson(res, 200, {
    styleGuide: {
      ...styleRowToApi(merged),
      items: items.map((r) => itemRowToApi(r)),
    },
  });
}

async function handlePostReference(
  req: RequestLike,
  res: ResponseLike,
  projectId: string,
): Promise<void> {
  const access = await requireProjectAccess(req, res, projectId);
  if (!access) return;
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }

  const root = await getOrCreateStyleRoot(projectId, access.userId);
  const file = extractUploadedFile(req, "file");

  let body: Record<string, unknown>;
  if (file && file.size > 0) {
    body = {
      kind: "image",
      title: (req.body as any)?.title ?? "",
      caption: (req.body as any)?.caption ?? "",
      tags: typeof (req.body as any)?.tags === "string"
        ? JSON.parse((req.body as any).tags || "[]")
        : (req.body as any)?.tags,
      influence: (req.body as any)?.influence != null
        ? Number((req.body as any).influence)
        : undefined,
      pinned: (req.body as any)?.pinned === true ||
        (req.body as any)?.pinned === "true",
    };
  } else {
    body = await readJsonBody(req);
  }

  const parsed = createReferenceBodySchema.safeParse(body);
  if (!parsed.success) {
    sendBadRequest(res, parsed.error.flatten().message || "Invalid body");
    return;
  }
  const data = parsed.data;

  if (
    data.kind === "image" &&
    !file &&
    !(data.image_url && String(data.image_url).trim())
  ) {
    sendBadRequest(res, "Image reference requires a file upload or image_url");
    return;
  }
  if (
    data.kind === "link" &&
    !(data.source_url && String(data.source_url).trim())
  ) {
    sendBadRequest(res, "Link reference requires source_url");
    return;
  }
  if (
    data.kind === "text" &&
    !(data.text_body && String(data.text_body).trim()) &&
    !(data.caption && String(data.caption).trim())
  ) {
    sendBadRequest(res, "Text reference requires text_body or caption");
    return;
  }

  let imageUrl = data.image_url ? String(data.image_url).trim() : "";
  let storageFileId = "";
  let mimeType = "";
  let fileSize: number | null = null;

  if (file && file.size > 0) {
    const uploaded = await uploadFileToStorage({
      file,
      bucketId: getStorageBucketId("projectImages"),
      name: `${projectId}-style-ref-${Date.now()}.${
        (
          file.name.split(".").pop() || "jpg"
        ).slice(0, 8)
      }`,
      metadata: {
        entity: "style_guide_item",
        projectId,
        visualStyleId: root.id,
      },
    });
    imageUrl = uploaded.url;
    storageFileId = uploaded.id;
    mimeType = uploaded.mimeType || file.type || "";
    fileSize = uploaded.size ?? file.size;
  }

  const orderIndex = await maxOrderIndex(root.id);
  const caption = data.kind === "text"
    ? String(data.text_body ?? data.caption ?? "").slice(0, 8000)
    : String(data.caption ?? "").slice(0, 8000);

  const itemRow = {
    visual_style_id: root.id,
    project_id: projectId,
    user_id: access.userId,
    kind: data.kind,
    title: String(data.title ?? "").slice(0, 1024),
    caption,
    image_url: imageUrl,
    storage_file_id: storageFileId,
    source_url: data.source_url ? String(data.source_url) : "",
    source_name: String(data.source_name ?? "").slice(0, 512),
    tags_json: JSON.stringify(data.tags ?? []),
    influence: data.influence ?? 3,
    pinned: data.pinned ?? false,
    order_index: orderIndex,
    extracted_palette_json: "[]",
    width: null,
    height: null,
    mime_type: mimeType,
    file_size: fileSize,
    license_note: String(data.license_note ?? "").slice(0, 4000),
  };

  const created = await createDocument(
    C.project_visual_style_items,
    ID.unique(),
    itemRow,
  );
  const items = await listItemsForStyle(root.id);
  const rootFresh = await getOrCreateStyleRoot(projectId, access.userId);
  const refreshedRoot = await persistCompiledOutputs(root.id, rootFresh, items);
  sendJson(res, 201, {
    item: itemRowToApi(created),
    styleGuide: {
      ...styleRowToApi(refreshedRoot),
      items: items.map((r) => itemRowToApi(r)),
    },
  });
}

async function handlePatchReference(
  req: RequestLike,
  res: ResponseLike,
  referenceId: string,
): Promise<void> {
  if (req.method !== "PATCH") {
    sendMethodNotAllowed(res, ["PATCH"]);
    return;
  }
  const item = await getItemById(referenceId);
  if (!item) {
    sendNotFound(res, "Reference not found");
    return;
  }
  const projectId = String(item.project_id);
  const access = await requireProjectAccess(req, res, projectId);
  if (!access) return;

  const body = await readJsonBody(req);
  const parsed = updateReferenceBodySchema.safeParse(body);
  if (!parsed.success) {
    sendBadRequest(res, parsed.error.flatten().message || "Invalid body");
    return;
  }
  const d = parsed.data;
  const row: Record<string, unknown> = {};
  if (d.kind !== undefined) row.kind = d.kind;
  if (d.title !== undefined) row.title = d.title;
  if (d.text_body !== undefined && String(item.kind) === "text") {
    row.caption = d.text_body;
  } else if (d.caption !== undefined) row.caption = d.caption;
  if (d.image_url !== undefined) row.image_url = d.image_url;
  if (d.source_url !== undefined) row.source_url = d.source_url;
  if (d.source_name !== undefined) row.source_name = d.source_name;
  if (d.tags !== undefined) row.tags_json = JSON.stringify(d.tags);
  if (d.influence !== undefined) row.influence = d.influence;
  if (d.pinned !== undefined) row.pinned = d.pinned;
  if (d.order_index !== undefined) row.order_index = d.order_index;
  if (d.license_note !== undefined) row.license_note = d.license_note;

  if (Object.keys(row).length === 0) {
    sendBadRequest(res, "No fields to update");
    return;
  }

  const updated = await updateDocument(
    C.project_visual_style_items,
    referenceId,
    row,
  );
  const root = await getOrCreateStyleRoot(projectId, access.userId);
  const items = await listItemsForStyle(root.id);
  const merged = await persistCompiledOutputs(root.id, root, items);
  sendJson(res, 200, {
    item: itemRowToApi(updated),
    styleGuide: {
      ...styleRowToApi(merged),
      items: items.map((r) => itemRowToApi(r)),
    },
  });
}

async function handleDeleteReference(
  req: RequestLike,
  res: ResponseLike,
  referenceId: string,
): Promise<void> {
  if (req.method !== "DELETE") {
    sendMethodNotAllowed(res, ["DELETE"]);
    return;
  }
  const item = await getItemById(referenceId);
  if (!item) {
    sendNotFound(res, "Reference not found");
    return;
  }
  const projectId = String(item.project_id);
  const access = await requireProjectAccess(req, res, projectId);
  if (!access) return;

  await deleteDocument(C.project_visual_style_items, referenceId);
  const root = await getOrCreateStyleRoot(projectId, access.userId);
  const items = await listItemsForStyle(root.id);
  const merged = await persistCompiledOutputs(root.id, root, items);
  sendJson(res, 200, {
    styleGuide: {
      ...styleRowToApi(merged),
      items: items.map((r) => itemRowToApi(r)),
    },
  });
}

async function handleReorder(
  req: RequestLike,
  res: ResponseLike,
  projectId: string,
): Promise<void> {
  const access = await requireProjectAccess(req, res, projectId);
  if (!access) return;
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }
  const body = await readJsonBody(req);
  const parsed = reorderReferencesBodySchema.safeParse(body);
  if (!parsed.success) {
    sendBadRequest(res, parsed.error.flatten().message || "Invalid body");
    return;
  }

  const root = await getOrCreateStyleRoot(projectId, access.userId);
  const ids = parsed.data.ordered_ids;
  for (let i = 0; i < ids.length; i++) {
    const ref = await getItemById(ids[i]);
    if (!ref || String(ref.visual_style_id) !== String(root.id)) {
      sendBadRequest(res, `Invalid reference id in order: ${ids[i]}`);
      return;
    }
    await updateDocument(C.project_visual_style_items, ids[i], {
      order_index: i,
    });
  }

  const items = await listItemsForStyle(root.id);
  const merged = await persistCompiledOutputs(root.id, root, items);
  sendJson(res, 200, {
    styleGuide: {
      ...styleRowToApi(merged),
      items: items.map((r) => itemRowToApi(r)),
    },
  });
}

async function handleExtractPalette(
  req: RequestLike,
  res: ResponseLike,
  referenceId: string,
): Promise<void> {
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }
  const item = await getItemById(referenceId);
  if (!item) {
    sendNotFound(res, "Reference not found");
    return;
  }
  const projectId = String(item.project_id);
  const access = await requireProjectAccess(req, res, projectId);
  if (!access) return;

  const body = await readJsonBody(req);
  const parsed = extractPaletteBodySchema.safeParse(body);
  if (!parsed.success) {
    sendBadRequest(res, parsed.error.flatten().message || "Invalid body");
    return;
  }

  const updated = await updateDocument(
    C.project_visual_style_items,
    referenceId,
    {
      extracted_palette_json: JSON.stringify(parsed.data.colors),
    },
  );

  const root = await getOrCreateStyleRoot(projectId, access.userId);
  const items = await listItemsForStyle(root.id);
  const merged = await persistCompiledOutputs(root.id, root, items);
  sendJson(res, 200, {
    item: itemRowToApi(updated),
    styleGuide: {
      ...styleRowToApi(merged),
      items: items.map((r) => itemRowToApi(r)),
    },
  });
}

async function handleBuildPrompt(
  req: RequestLike,
  res: ResponseLike,
  projectId: string,
): Promise<void> {
  const access = await requireProjectAccess(req, res, projectId);
  if (!access) return;
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }
  const root = await getOrCreateStyleRoot(projectId, access.userId);
  const items = await listItemsForStyle(root.id);
  const merged = await persistCompiledOutputs(root.id, root, items);
  sendJson(res, 200, {
    compactPrompt: merged.compact_prompt ?? "",
    styleGuide: {
      ...styleRowToApi(merged),
      items: items.map((r) => itemRowToApi(r)),
    },
  });
}

async function handleExport(
  req: RequestLike,
  res: ResponseLike,
  projectId: string,
): Promise<void> {
  const access = await requireProjectAccess(req, res, projectId);
  if (!access) return;
  if (req.method !== "POST") {
    sendMethodNotAllowed(res, ["POST"]);
    return;
  }
  const root = await getOrCreateStyleRoot(projectId, access.userId);
  const items = await listItemsForStyle(root.id);
  const payload = compileExportPayload(root, items);
  const merged = await persistCompiledOutputs(root.id, root, items);
  sendJson(res, 200, {
    exportPayload: payload,
    styleGuide: {
      ...styleRowToApi(merged),
      items: items.map((r) => itemRowToApi(r)),
    },
  });
}

async function dispatch(req: RequestLike, res: ResponseLike): Promise<void> {
  const pathname = getPathname(req);

  if (pathname === "/" || pathname === "/health") {
    sendJson(res, 200, {
      status: "ok",
      service: "scriptony-style-guide",
      provider: "appwrite",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Check for job context (from jobs-handler)
  const body = req.body || {};
  const jobContext = extractJobContext(body);
  
  // If running as a job, strip job fields and process async
  if (jobContext?.isJob) {
    // Immediately acknowledge job start
    await reportJobProgress(jobContext.jobId, 10);
    
    // Process the actual request (remove job wrapper)
    const actualBody = stripJobFields(body);
    req.body = actualBody;
    
    try {
      await reportJobProgress(jobContext.jobId, 20);
      
      // Route to appropriate handler based on action
      const action = actualBody.action as string;
      
      switch (action) {
        case "get": {
          const projectId = actualBody.projectId as string;
          const access = await requireProjectAccess(req, res, projectId);
          if (!access) {
            await failJob(jobContext.jobId, "Project access denied");
            return;
          }
          await reportJobProgress(jobContext.jobId, 50);
          const { root, items } = await loadStyleBundle(projectId, access.userId);
          await completeJob(jobContext.jobId, {
            styleGuide: {
              ...styleRowToApi(root),
              items: items.map((r) => itemRowToApi(r)),
            },
          });
          return;
        }
        
        case "createReference": {
          const { projectId, payload } = actualBody as { projectId: string; payload: unknown };
          // Reconstruct request with actual payload
          req.body = payload;
          
          await reportJobProgress(jobContext.jobId, 30);
          
          // Create a mock response to capture result
          let capturedResult: unknown;
          const mockRes = {
            status: (code: number) => ({
              json: (data: unknown) => {
                capturedResult = data;
              },
            }),
            json: (data: unknown) => {
              capturedResult = data;
            },
          } as ResponseLike;
          
          await handlePostReference(req, mockRes, projectId);
          
          await completeJob(jobContext.jobId, capturedResult);
          return;
        }
        
        case "extractPalette": {
          const { referenceId, colors } = actualBody as { referenceId: string; colors: string[] };
          req.body = { colors };
          
          await reportJobProgress(jobContext.jobId, 30);
          
          let capturedResult: unknown;
          const mockRes = {
            json: (data: unknown) => {
              capturedResult = data;
            },
          } as ResponseLike;
          
          await handleExtractPalette(req, mockRes, referenceId);
          
          await completeJob(jobContext.jobId, capturedResult);
          return;
        }
        
        case "deleteReference": {
          const { referenceId } = actualBody as { referenceId: string };
          
          let capturedResult: unknown;
          const mockRes = {
            json: (data: unknown) => {
              capturedResult = data;
            },
          } as ResponseLike;
          
          await handleDeleteReference(req, mockRes, referenceId);
          
          await completeJob(jobContext.jobId, capturedResult);
          return;
        }
        
        case "reorderReferences": {
          const { projectId, orderedIds } = actualBody as { projectId: string; orderedIds: string[] };
          req.body = { ordered_ids: orderedIds };
          
          let capturedResult: unknown;
          const mockRes = {
            json: (data: unknown) => {
              capturedResult = data;
            },
          } as ResponseLike;
          
          await handleReorder(req, mockRes, projectId);
          
          await completeJob(jobContext.jobId, capturedResult);
          return;
        }
        
        default: {
          await failJob(jobContext.jobId, `Unknown action: ${action}`);
          return;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await failJob(jobContext.jobId, errorMessage);
      // Send immediate response to prevent timeout
      sendJson(res, 202, { 
        jobId: jobContext.jobId, 
        status: "processing",
        message: "Job processing in background" 
      });
      return;
    }
  }

  // Regular (non-job) request handling
  try {
    const reorderMatch = pathname.match(
      /^\/style-guide\/([^/]+)\/references\/reorder$/,
    );
    if (reorderMatch) {
      await handleReorder(req, res, reorderMatch[1]);
      return;
    }

    const refCreateMatch = pathname.match(
      /^\/style-guide\/([^/]+)\/references$/,
    );
    if (refCreateMatch) {
      await handlePostReference(req, res, refCreateMatch[1]);
      return;
    }

    const buildMatch = pathname.match(/^\/style-guide\/([^/]+)\/build-prompt$/);
    if (buildMatch) {
      await handleBuildPrompt(req, res, buildMatch[1]);
      return;
    }

    const exportMatch = pathname.match(/^\/style-guide\/([^/]+)\/export$/);
    if (exportMatch) {
      await handleExport(req, res, exportMatch[1]);
      return;
    }

    const extractMatch = pathname.match(
      /^\/style-guide\/references\/([^/]+)\/extract-palette$/,
    );
    if (extractMatch) {
      await handleExtractPalette(req, res, extractMatch[1]);
      return;
    }

    const refItemMatch = pathname.match(/^\/style-guide\/references\/([^/]+)$/);
    if (refItemMatch) {
      const id = refItemMatch[1];
      if (req.method === "PATCH") {
        await handlePatchReference(req, res, id);
        return;
      }
      if (req.method === "DELETE") {
        await handleDeleteReference(req, res, id);
        return;
      }
      sendMethodNotAllowed(res, ["PATCH", "DELETE"]);
      return;
    }

    const projectMatch = pathname.match(/^\/style-guide\/([^/]+)$/);
    if (projectMatch) {
      const projectId = projectMatch[1];
      if (req.method === "GET") {
        await handleGetStyleGuide(req, res, projectId);
        return;
      }
      if (req.method === "PATCH") {
        await handlePatchStyleGuide(req, res, projectId);
        return;
      }
      sendMethodNotAllowed(res, ["GET", "PATCH"]);
      return;
    }

    sendNotFound(res, `Route not found in scriptony-style-guide: ${pathname}`);
  } catch (e) {
    sendServerError(res, e);
  }
}

export default createAppwriteHandler(dispatch);
