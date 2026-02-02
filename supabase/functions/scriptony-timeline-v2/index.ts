/**
 * 🎬 SCRIPTONY TIMELINE V2 - GENERISCHE EDGE FUNCTION
 * 
 * 🕐 LAST UPDATED: 2025-11-25 19:11 UTC
 *
 * 
 * Template Engine - Generisch für ALLE Project Templates!
 * 
 * Unterstützt:
 * - Film: 3-Akt, Heldenreise, Save the Cat, ...
 * - Serie: Traditional (Seasons → Episodes → Scenes → Shots)
 * - Buch: Roman (Parts → Chapters → Sections)
 * - Theater: Klassisch (Acts → Scenes → Beats)
 * - Game: Story-Driven (Chapters → Levels → Missions → Cutscenes)
 * 
 * NEUE TEMPLATES = NUR Frontend Code, kein Backend Deploy! ✅
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Context, Next } from "npm:hono";

// =============================================================================
// COMPRESSION MIDDLEWARE (INLINE)
// =============================================================================

/**
 * 🗜️ Gzip compression using CompressionStream API
 */
async function gzipCompress(text: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    }
  });

  const compressedStream = stream.pipeThrough(
    new CompressionStream('gzip')
  );

  const chunks: Uint8Array[] = [];
  const reader = compressedStream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // Concatenate chunks
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

/**
 * Compress middleware for Hono - Automatically compress responses with gzip
 */
async function compress(c: Context, next: Next) {
  await next();

  // Only compress JSON responses
  const contentType = c.res.headers.get('Content-Type');
  if (!contentType || !contentType.includes('application/json')) {
    return;
  }

  // Check if client accepts compression
  const acceptEncoding = c.req.header('Accept-Encoding') || '';
  
  // Get response body
  const body = await c.res.text();
  
  // Skip compression for small responses (<1KB)
  if (body.length < 1024) {
    c.res = new Response(body, {
      status: c.res.status,
      headers: c.res.headers,
    });
    return;
  }

  // Compress with gzip (best browser support)
  if (acceptEncoding.includes('gzip')) {
    const compressed = await gzipCompress(body);
    c.res = new Response(compressed, {
      status: c.res.status,
      headers: new Headers({
        ...Object.fromEntries(c.res.headers),
        'Content-Encoding': 'gzip',
        'Content-Length': compressed.byteLength.toString(),
        'Vary': 'Accept-Encoding',
      }),
    });
    
    console.log(`[Compression] Compressed ${body.length} → ${compressed.byteLength} bytes (${Math.round((1 - compressed.byteLength / body.length) * 100)}% savings)`);
    return;
  }

  // Fallback: no compression
  c.res = new Response(body, {
    status: c.res.status,
    headers: c.res.headers,
  });
}

// =============================================================================
// TYPES
// =============================================================================

interface TimelineNode {
  id: string;
  project_id: string;
  template_id: string;
  level: number;
  parent_id: string | null;
  node_number: number;
  title: string;
  description?: string;
  color?: string;
  order_index: number;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

interface CreateNodeRequest {
  project_id: string;
  template_id: string;
  level: number;
  parent_id?: string | null;
  node_number: number;
  title: string;
  description?: string;
  color?: string;
  metadata?: Record<string, any>;
}

interface UpdateNodeRequest {
  node_number?: number;
  title?: string;
  description?: string;
  color?: string;
  order_index?: number;
  parent_id?: string | null;
  metadata?: Record<string, any>;
}

// =============================================================================
// SETUP
// =============================================================================

// IMPORTANT: Supabase adds function name as prefix to all paths!
const app = new Hono().basePath("/scriptony-timeline-v2");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Enable CORS (must be FIRST!), logger & compression
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length", "Content-Encoding"],
  maxAge: 600,
}));
app.use('*', logger(console.log));
app.use('*', compress); // 🗜️ PERFORMANCE: Enable gzip compression

// =============================================================================
// AUTH HELPER
// =============================================================================

async function getUserIdFromAuth(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }
  
  return user.id;
}

// =============================================================================
// TRANSFORM HELPERS
// =============================================================================

function toSnakeCase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = value;
  }
  return result;
}

function toCamelCase(obj: Record<string, any>): Record<string, any> {
  return {
    id: obj.id,
    projectId: obj.project_id,
    templateId: obj.template_id,
    level: obj.level,
    parentId: obj.parent_id,
    nodeNumber: obj.node_number,
    title: obj.title,
    description: obj.description,
    color: obj.color,
    orderIndex: obj.order_index,
    metadata: obj.metadata,
    createdAt: obj.created_at,
    updatedAt: obj.updated_at,
  };
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get("/", (c) => {
  return c.json({ 
    status: "ok", 
    function: "scriptony-timeline-v2",
    version: "2.0.0",
    message: "Scriptony Timeline V2 (Generic Template Engine) is running!",
    features: ["generic-templates", "jsonb-metadata", "all-project-types"],
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    function: "scriptony-timeline-v2",
    version: "2.0.0",
    features: ["generic-templates", "jsonb-metadata", "all-project-types"],
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// NODES ROUTES (GENERISCH!)
// =============================================================================

/**
 * GET /nodes
 * Query nodes with filters
 * 
 * Query params:
 * - project_id (required): Filter by project
 * - level (optional): Filter by level (1, 2, 3, 4)
 * - parent_id (optional): Filter by parent (use "null" for root nodes)
 * - template_id (optional): Filter by template
 */
app.get("/nodes", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectId = c.req.query("project_id");
    const level = c.req.query("level");
    const parentId = c.req.query("parent_id");
    const templateId = c.req.query("template_id");

    if (!projectId) {
      return c.json({ error: "project_id is required" }, 400);
    }

    // Build query
    let query = supabase
      .from("timeline_nodes")
      .select("*")
      .eq("project_id", projectId);

    if (level) {
      query = query.eq("level", parseInt(level));
    }

    if (parentId) {
      if (parentId === "null") {
        query = query.is("parent_id", null);
      } else {
        query = query.eq("parent_id", parentId);
      }
    }

    if (templateId) {
      query = query.eq("template_id", templateId);
    }

    query = query.order("order_index", { ascending: true });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching nodes:", error);
      return c.json({ error: error.message }, 500);
    }

    // Transform to camelCase
    const transformedNodes = (data || []).map(toCamelCase);

    return c.json({ nodes: transformedNodes });
  } catch (error: any) {
    console.error("Nodes GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /nodes/:id
 * Get single node by ID
 */
app.get("/nodes/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const nodeId = c.req.param("id");

    const { data, error } = await supabase
      .from("timeline_nodes")
      .select("*")
      .eq("id", nodeId)
      .single();

    if (error) {
      console.error("Error fetching node:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ node: toCamelCase(data) });
  } catch (error: any) {
    console.error("Node GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /nodes/:id/children
 * Get all children of a node (recursive optional)
 */
app.get("/nodes/:id/children", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const nodeId = c.req.param("id");
    const recursive = c.req.query("recursive") === "true";

    if (recursive) {
      // Use helper function for recursive query
      const { data, error } = await supabase
        .rpc("get_node_descendants", { node_id: nodeId });

      if (error) {
        console.error("Error fetching descendants:", error);
        return c.json({ error: error.message }, 500);
      }

      return c.json({ children: data || [] });
    } else {
      // Direct children only
      const { data, error } = await supabase
        .from("timeline_nodes")
        .select("*")
        .eq("parent_id", nodeId)
        .order("order_index", { ascending: true });

      if (error) {
        console.error("Error fetching children:", error);
        return c.json({ error: error.message }, 500);
      }

      const transformedChildren = (data || []).map(toCamelCase);
      return c.json({ children: transformedChildren });
    }
  } catch (error: any) {
    console.error("Children GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /nodes/:id/path
 * Get node path (from root to this node)
 */
app.get("/nodes/:id/path", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const nodeId = c.req.param("id");

    const { data, error } = await supabase
      .rpc("get_node_path", { node_id: nodeId });

    if (error) {
      console.error("Error fetching node path:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ path: data || [] });
  } catch (error: any) {
    console.error("Path GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /nodes
 * Create new node
 */
app.post("/nodes", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body: CreateNodeRequest = await c.req.json();

    // Validate required fields
    if (!body.project_id && !body.projectId) {
      return c.json({ error: "project_id is required" }, 400);
    }
    if (!body.template_id && !body.templateId) {
      return c.json({ error: "template_id is required" }, 400);
    }
    if (!body.level) {
      return c.json({ error: "level is required" }, 400);
    }
    if (!body.node_number && body.node_number !== 0 && !body.nodeNumber && body.nodeNumber !== 0) {
      return c.json({ error: "node_number is required" }, 400);
    }
    if (!body.title) {
      return c.json({ error: "title is required" }, 400);
    }

    // Convert camelCase to snake_case
    const projectId = body.project_id || body.projectId;
    const templateId = body.template_id || body.templateId;
    const parentId = body.parent_id || body.parentId || null;
    const nodeNumber = body.node_number || body.nodeNumber;

    // Get highest order_index for this parent
    let query = supabase
      .from("timeline_nodes")
      .select("order_index")
      .eq("project_id", projectId);

    if (parentId) {
      query = query.eq("parent_id", parentId);
    } else {
      query = query.is("parent_id", null);
    }

    const { data: existingNodes } = await query
      .order("order_index", { ascending: false })
      .limit(1);

    const nextOrderIndex = (existingNodes?.[0]?.order_index ?? -1) + 1;

    // Insert node
    const { data, error } = await supabase
      .from("timeline_nodes")
      .insert({
        project_id: projectId,
        template_id: templateId,
        level: body.level,
        parent_id: parentId,
        node_number: nodeNumber,
        title: body.title,
        description: body.description,
        color: body.color,
        order_index: nextOrderIndex,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Error creating node:", {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        body: {
          projectId,
          templateId,
          level: body.level,
          parentId,
          nodeNumber,
          title: body.title,
        }
      });
      return c.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      }, 500);
    }

    return c.json({ node: toCamelCase(data) }, 201);
  } catch (error: any) {
    console.error("❌ Nodes POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /nodes/:id
 * Update node
 */
app.put("/nodes/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const nodeId = c.req.param("id");
    const updates: UpdateNodeRequest = await c.req.json();

    // Build update object
    const dbUpdates: any = {};
    if (updates.nodeNumber !== undefined || updates.node_number !== undefined) {
      dbUpdates.node_number = updates.nodeNumber || updates.node_number;
    }
    if (updates.title !== undefined) {
      dbUpdates.title = updates.title;
    }
    if (updates.description !== undefined) {
      dbUpdates.description = updates.description;
    }
    if (updates.color !== undefined) {
      dbUpdates.color = updates.color;
    }
    if (updates.orderIndex !== undefined || updates.order_index !== undefined) {
      dbUpdates.order_index = updates.orderIndex ?? updates.order_index;
    }
    if (updates.parentId !== undefined || updates.parent_id !== undefined) {
      dbUpdates.parent_id = updates.parentId ?? updates.parent_id;
    }
    if (updates.metadata !== undefined) {
      dbUpdates.metadata = updates.metadata;
    }

    // Validate that we have updates to apply
    if (Object.keys(dbUpdates).length === 0) {
      console.warn("No updates provided for node:", nodeId);
      // Just return the current node
      const { data: currentNode, error: fetchError } = await supabase
        .from("timeline_nodes")
        .select()
        .eq("id", nodeId)
        .single();
      
      if (fetchError || !currentNode) {
        return c.json({ error: "Node not found" }, 404);
      }
      
      return c.json({ node: toCamelCase(currentNode) });
    }

    console.log("Updating node:", nodeId, "with:", dbUpdates);

    const { data, error } = await supabase
      .from("timeline_nodes")
      .update(dbUpdates)
      .eq("id", nodeId)
      .select()
      .single();

    if (error) {
      console.error("❌ Error updating node:", {
        nodeId,
        updates: dbUpdates,
        error,
        errorMessage: error.message,
        errorDetails: error.details,
        errorHint: error.hint,
      });
      return c.json({ error: error.message }, 500);
    }

    if (!data) {
      console.error("❌ No data returned after update - node might not exist:", nodeId);
      return c.json({ error: "Node not found" }, 404);
    }

    console.log("✅ Node updated successfully:", nodeId);
    return c.json({ node: toCamelCase(data) });
  } catch (error: any) {
    console.error("Nodes PUT error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /nodes/:id
 * Delete node (cascades to children via DB constraint)
 */
app.delete("/nodes/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const nodeId = c.req.param("id");

    const { error } = await supabase
      .from("timeline_nodes")
      .delete()
      .eq("id", nodeId);

    if (error) {
      console.error("Error deleting node:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Nodes DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /nodes/reorder
 * Reorder nodes within a parent
 */
app.post("/nodes/reorder", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const nodeIds: string[] = body.nodeIds || body.node_ids || [];

    if (!Array.isArray(nodeIds) || nodeIds.length === 0) {
      return c.json({ error: "nodeIds array is required" }, 400);
    }

    // Update order_index for each node
    const updates = nodeIds.map((nodeId, index) => 
      supabase
        .from("timeline_nodes")
        .update({ order_index: index })
        .eq("id", nodeId)
    );

    await Promise.all(updates);

    return c.json({ success: true, count: nodeIds.length });
  } catch (error: any) {
    console.error("Reorder error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /nodes/bulk
 * Bulk create nodes (useful for initializing project structure)
 */
app.post("/nodes/bulk", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const nodes: CreateNodeRequest[] = body.nodes || [];

    if (!Array.isArray(nodes) || nodes.length === 0) {
      return c.json({ error: "nodes array is required" }, 400);
    }

    // Convert to snake_case and add order_index
    const dbNodes = nodes.map((node, index) => ({
      project_id: node.project_id || node.projectId,
      template_id: node.template_id || node.templateId,
      level: node.level,
      parent_id: node.parent_id || node.parentId || null,
      node_number: node.node_number || node.nodeNumber,
      title: node.title,
      description: node.description,
      color: node.color,
      order_index: index,
      metadata: node.metadata || {},
    }));

    const { data, error } = await supabase
      .from("timeline_nodes")
      .insert(dbNodes)
      .select();

    if (error) {
      console.error("Error bulk creating nodes:", error);
      return c.json({ error: error.message }, 500);
    }

    const transformedNodes = (data || []).map(toCamelCase);
    return c.json({ nodes: transformedNodes, count: transformedNodes.length }, 201);
  } catch (error: any) {
    console.error("Bulk create error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /nodes/batch-load
 * Load all timeline nodes for a project in ONE request
 */
app.get("/nodes/batch-load", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectId = c.req.query("project_id");
    if (!projectId) {
      return c.json({ error: "project_id is required" }, 400);
    }

    console.log("🚀 Batch loading timeline for project:", projectId);

    // Fetch ALL nodes for project
    const { data, error } = await supabase
      .from("timeline_nodes")
      .select("*")
      .eq("project_id", projectId)
      .order("order_index", { ascending: true });

    if (error) {
      console.error("Error batch loading nodes:", error);
      return c.json({ error: error.message }, 500);
    }

    const nodes = (data || []).map(toCamelCase);

    // Group by level
    const acts = nodes.filter((n: any) => n.level === 1);
    const sequences = nodes.filter((n: any) => n.level === 2);
    const scenes = nodes.filter((n: any) => n.level === 3);

    return c.json({
      acts,
      sequences,
      scenes,
      stats: {
        totalNodes: nodes.length,
        acts: acts.length,
        sequences: sequences.length,
        scenes: scenes.length,
      }
    });
  } catch (error: any) {
    console.error("Batch load error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /nodes/ultra-batch-load
 * Load EVERYTHING (Timeline + Characters + Shots) in ONE request
 */
app.get("/nodes/ultra-batch-load", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectId = c.req.query("project_id");
    if (!projectId) {
      return c.json({ error: "project_id is required" }, 400);
    }

    console.log("🚀🚀🚀 ULTRA Batch loading project:", projectId);

    // 1. Fetch Project Info (to get world_id for characters)
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("world_id, organization_id")
      .eq("id", projectId)
      .single();
      
    if (projectError) {
      console.error("Error fetching project:", projectError);
      return c.json({ error: projectError.message }, 500);
    }

    // PARALLEL QUERIES for maximum speed
    const [nodesResult, shotsResult, charactersResult] = await Promise.all([
      // 1. Timeline Nodes
      supabase
        .from("timeline_nodes")
        .select("*")
        .eq("project_id", projectId)
        .order("order_index", { ascending: true }),
        
      // 2. Shots (with Audio & Characters)
      supabase
        .from("shots")
        .select(`
          *,
          shot_audio (
            id, shot_id, type, file_url, file_name, label, 
            file_size, start_time, end_time, fade_in, fade_out, 
            waveform_data, audio_duration, created_at
          ),
          shot_characters (
            character_id,
            characters (
              id, name, image_url, description
            )
          )
        `)
        .eq("project_id", projectId)
        .order("order_index", { ascending: true }),
        
      // 3. Characters
      supabase
        .from("characters")
        .select("*")
        .or(
          project?.world_id 
            ? `project_id.eq.${projectId},and(world_id.eq.${project.world_id},organization_id.eq.${project.organization_id})`
            : `project_id.eq.${projectId},organization_id.eq.${project.organization_id}`
        )
        .order("name", { ascending: true })
    ]);

    // Check for errors
    if (nodesResult.error) throw new Error(`Nodes error: ${nodesResult.error.message}`);
    if (shotsResult.error) throw new Error(`Shots error: ${shotsResult.error.message}`);
    if (charactersResult.error) throw new Error(`Characters error: ${charactersResult.error.message}`);

    // Process Nodes
    const nodes = (nodesResult.data || []).map(toCamelCase);
    const acts = nodes.filter((n: any) => n.level === 1);
    const sequences = nodes.filter((n: any) => n.level === 2);
    const scenes = nodes.filter((n: any) => n.level === 3);

    // Process Characters
    const characters = (charactersResult.data || []).map((char: any) => ({
      id: char.id,
      projectId: char.project_id || projectId,
      worldId: char.world_id,
      name: char.name,
      description: char.description,
      imageUrl: char.image_url,
      color: char.color,
      createdAt: char.created_at,
      updatedAt: char.updated_at,
    }));

    // Process Shots
    const shots = (shotsResult.data || []).map((shot: any) => ({
      id: shot.id,
      projectId: shot.project_id,
      sceneId: shot.scene_id,
      shotNumber: shot.shot_number,
      description: shot.description,
      cameraAngle: shot.camera_angle,
      cameraMovement: shot.camera_movement,
      framing: shot.framing,
      lens: shot.lens,
      duration: shot.duration,
      shotlengthMinutes: shot.shotlength_minutes,
      shotlengthSeconds: shot.shotlength_seconds,
      composition: shot.composition,
      lightingNotes: shot.lighting_notes,
      imageUrl: shot.image_url,
      soundNotes: shot.sound_notes,
      storyboardUrl: shot.storyboard_url,
      referenceImageUrl: shot.reference_image_url,
      dialog: shot.dialog,
      notes: shot.notes,
      orderIndex: shot.order_index,
      createdAt: shot.created_at,
      updatedAt: shot.updated_at,
      audioFiles: (shot.shot_audio || []).map((audio: any) => ({
        id: audio.id,
        shotId: audio.shot_id,
        type: audio.type,
        fileUrl: audio.file_url,
        fileName: audio.file_name,
        label: audio.label,
        fileSize: audio.file_size,
        startTime: audio.start_time,
        endTime: audio.end_time,
        fadeIn: audio.fade_in,
        fadeOut: audio.fade_out,
        waveformData: audio.waveform_data,
        duration: audio.audio_duration,
        createdAt: audio.created_at,
      })),
      characters: (shot.shot_characters || [])
        .map((sc: any) => sc.characters)
        .filter(Boolean)
        .map((char: any) => ({
          id: char.id,
          name: char.name,
          imageUrl: char.image_url,
          description: char.description,
        })),
    }));

    return c.json({
      timeline: {
        acts,
        sequences,
        scenes,
      },
      characters,
      shots,
      stats: {
        totalNodes: nodes.length,
        acts: acts.length,
        sequences: sequences.length,
        scenes: scenes.length,
        characters: characters.length,
        shots: shots.length,
      }
    });

  } catch (error: any) {
    console.error("ULTRA Batch load error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// PROJECT INITIALIZATION HELPER
// =============================================================================

/**
 * POST /initialize-project
 * Initialize project structure based on template
 * Creates default hierarchy based on template's defaultStructure
 */
app.post("/initialize-project", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const projectId = body.project_id || body.projectId;
    const templateId = body.template_id || body.templateId;
    const structure = body.structure; // { level_1_count, level_2_per_parent, ... }
    const predefinedNodes = body.predefined_nodes || body.predefinedNodes; // Optional

    if (!projectId || !templateId) {
      return c.json({ error: "project_id and template_id are required" }, 400);
    }

    if (!structure || !structure.level_1_count) {
      return c.json({ error: "structure with level_1_count is required" }, 400);
    }

    const createdNodes: any[] = [];

    // Create Level 1 nodes
    for (let i = 1; i <= structure.level_1_count; i++) {
      const predefined = predefinedNodes?.level_1?.find((n: any) => n.number === i);
      
      const { data: level1Node, error: error1 } = await supabase
        .from("timeline_nodes")
        .insert({
          project_id: projectId,
          template_id: templateId,
          level: 1,
          parent_id: null,
          node_number: i,
          title: predefined?.title || `Node ${i}`,
          description: predefined?.description,
          order_index: i - 1,
          metadata: {},
        })
        .select()
        .single();

      if (error1) {
        console.error("Error creating level 1 node:", error1);
        continue;
      }

      createdNodes.push(level1Node);

      // Create Level 2 nodes if specified
      if (structure.level_2_per_parent) {
        for (let j = 1; j <= structure.level_2_per_parent; j++) {
          const { data: level2Node, error: error2 } = await supabase
            .from("timeline_nodes")
            .insert({
              project_id: projectId,
              template_id: templateId,
              level: 2,
              parent_id: level1Node.id,
              node_number: j,
              title: `Node ${j}`,
              order_index: j - 1,
              metadata: {},
            })
            .select()
            .single();

          if (error2) {
            console.error("Error creating level 2 node:", error2);
            continue;
          }

          createdNodes.push(level2Node);

          // Create Level 3 nodes if specified
          if (structure.level_3_per_parent) {
            for (let k = 1; k <= structure.level_3_per_parent; k++) {
              const { data: level3Node, error: error3 } = await supabase
                .from("timeline_nodes")
                .insert({
                  project_id: projectId,
                  template_id: templateId,
                  level: 3,
                  parent_id: level2Node.id,
                  node_number: k,
                  title: `Node ${k}`,
                  order_index: k - 1,
                  metadata: {},
                })
                .select()
                .single();

              if (error3) {
                console.error("Error creating level 3 node:", error3);
                continue;
              }

              createdNodes.push(level3Node);

              // Create Level 4 nodes if specified
              if (structure.level_4_per_parent) {
                for (let l = 1; l <= structure.level_4_per_parent; l++) {
                  const { data: level4Node, error: error4 } = await supabase
                    .from("timeline_nodes")
                    .insert({
                      project_id: projectId,
                      template_id: templateId,
                      level: 4,
                      parent_id: level3Node.id,
                      node_number: l,
                      title: `Node ${l}`,
                      order_index: l - 1,
                      metadata: {},
                    })
                    .select()
                    .single();

                  if (error4) {
                    console.error("Error creating level 4 node:", error4);
                    continue;
                  }

                  createdNodes.push(level4Node);
                }
              }
            }
          }
        }
      }
    }

    return c.json({ 
      success: true, 
      count: createdNodes.length,
      nodes: createdNodes.map(toCamelCase),
    }, 201);
  } catch (error: any) {
    console.error("Initialize project error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// SHOTS ROUTES (Film-Specific, separate table)
// =============================================================================

/**
 * GET /shots?project_id=X
 * Get all shots for a project (BULK LOADER for performance)
 * 
 * OR
 * 
 * GET /shots/:sceneId
 * Get all shots for a scene
 */
app.get("/shots/:sceneId?", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Check if this is a bulk request (query param) or scene-specific (path param)
    const projectId = c.req.query("project_id");
    const sceneId = c.req.param("sceneId");

    // JOIN with shot_audio and shot_characters to include all related data
    // This allows the Timeline server to read audio and character data
    let query = supabase
      .from("shots")
      .select(`
        *,
        shot_audio (
          id,
          shot_id,
          type,
          file_url,
          file_name,
          label,
          file_size,
          start_time,
          end_time,
          fade_in,
          fade_out,
          waveform_data,
          audio_duration,
          created_at
        ),
        shot_characters (
          character_id,
          characters (
            id,
            name,
            image_url,
            description
          )
        )
      `);

    if (projectId) {
      // Bulk request: Get all shots for project
      query = query.eq("project_id", projectId);
    } else if (sceneId) {
      // Scene-specific request
      query = query.eq("scene_id", sceneId);
    } else {
      return c.json({ error: "project_id or sceneId is required" }, 400);
    }

    const { data, error } = await query.order("order_index", { ascending: true });

    if (error) {
      console.error("Error fetching shots:", error);
      return c.json({ error: error.message }, 500);
    }

    // Transform to camelCase and include audio files + characters
    const transformedShots = (data || []).map(shot => ({
      id: shot.id,
      projectId: shot.project_id,
      sceneId: shot.scene_id,
      shotNumber: shot.shot_number,
      description: shot.description,
      cameraAngle: shot.camera_angle,
      cameraMovement: shot.camera_movement,
      framing: shot.framing,
      lens: shot.lens,
      duration: shot.duration,
      shotlengthMinutes: shot.shotlength_minutes,
      shotlengthSeconds: shot.shotlength_seconds,
      composition: shot.composition,
      lightingNotes: shot.lighting_notes,
      imageUrl: shot.image_url,
      soundNotes: shot.sound_notes,
      storyboardUrl: shot.storyboard_url,
      referenceImageUrl: shot.reference_image_url,
      dialog: shot.dialog,
      notes: shot.notes,
      orderIndex: shot.order_index,
      createdAt: shot.created_at,
      updatedAt: shot.updated_at,
      // Audio files (read from shot_audio table)
      audioFiles: (shot.shot_audio || []).map((audio: any) => ({
        id: audio.id,
        shotId: audio.shot_id,
        type: audio.type,
        fileUrl: audio.file_url,
        fileName: audio.file_name,
        label: audio.label,
        fileSize: audio.file_size,
        startTime: audio.start_time,
        endTime: audio.end_time,
        fadeIn: audio.fade_in,
        fadeOut: audio.fade_out,
        waveformData: audio.waveform_data,
        duration: audio.audio_duration,
        createdAt: audio.created_at,
      })),
      // Characters (read from shot_characters join table)
      characters: (shot.shot_characters || [])
        .map((sc: any) => sc.characters)
        .filter(Boolean)
        .map((char: any) => ({
          id: char.id,
          name: char.name,
          imageUrl: char.image_url,
          description: char.description,
        })),
    }));

    return c.json({ shots: transformedShots });
  } catch (error: any) {
    console.error("Shots GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /shots
 * Create a new shot
 */
app.post("/shots", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const scene_id = body.scene_id || body.sceneId;
    const shot_number = body.shot_number || body.shotNumber;

    if (!scene_id || !shot_number) {
      return c.json({ error: "scene_id and shot_number are required" }, 400);
    }

    // Get project_id from scene node
    // 🛡️ RETRY LOGIC: Scene might not be visible immediately after creation due to replication lag
    let sceneNode = null;
    let sceneError = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries && !sceneNode) {
      const result = await supabase
        .from("timeline_nodes")
        .select("project_id")
        .eq("id", scene_id)
        .single();
      
      sceneNode = result.data;
      sceneError = result.error;
      
      if (!sceneNode && retryCount < maxRetries - 1) {
        console.log(`⏳ Scene not found, retrying (${retryCount + 1}/${maxRetries})...`);
        // Wait 100ms before retry
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      retryCount++;
    }

    if (sceneError || !sceneNode) {
      console.error("❌ Scene not found in timeline_nodes after retries:", {
        scene_id,
        error: sceneError,
        sceneNode,
        retriesAttempted: retryCount,
      });
      return c.json({ 
        error: "Cannot create shot: Scene does not exist in database",
        details: sceneError?.message || "Scene ID does not exist in timeline_nodes",
      }, 400);
    }
    
    console.log(`✅ Scene found after ${retryCount} attempt(s):`, scene_id);

    // Get highest order_index
    const { data: existingShots } = await supabase
      .from("shots")
      .select("order_index")
      .eq("scene_id", scene_id)
      .order("order_index", { ascending: false })
      .limit(1);

    const nextOrderIndex = (existingShots?.[0]?.order_index ?? -1) + 1;

    const { data, error } = await supabase
      .from("shots")
      .insert({
        project_id: sceneNode.project_id,
        scene_id,
        shot_number,
        description: body.description,
        camera_angle: body.camera_angle || body.cameraAngle,
        camera_movement: body.camera_movement || body.cameraMovement,
        framing: body.framing,
        lens: body.lens,
        duration: body.duration,
        shotlength_minutes: body.shotlength_minutes || body.shotlengthMinutes,
        shotlength_seconds: body.shotlength_seconds || body.shotlengthSeconds,
        composition: body.composition,
        lighting_notes: body.lighting_notes || body.lightingNotes,
        image_url: body.image_url || body.imageUrl,
        sound_notes: body.sound_notes || body.soundNotes,
        storyboard_url: body.storyboard_url || body.storyboardUrl,
        reference_image_url: body.reference_image_url || body.referenceImageUrl,
        dialog: body.dialog,
        notes: body.notes,
        order_index: nextOrderIndex,
      })
      .select()
      .single();

    if (error) {
      console.error("❌ Error creating shot:", {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        sceneId: scene_id,
        shotNumber: shot_number,
        sceneNodeExists: !!sceneNode,
        projectId: sceneNode?.project_id,
      });
      
      // Special handling for foreign key errors
      if (error.code === '23503') {
        return c.json({ 
          error: "Cannot create shot: Scene does not exist in database",
          details: "The scene you're trying to add a shot to wasn't found. This can happen if the scene creation failed. Please refresh the page and try again.",
          technical: error.message,
        }, 400);
      }
      
      return c.json({ 
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      }, 500);
    }

    // Transform to camelCase
    const transformedShot = {
      id: data.id,
      projectId: data.project_id,
      sceneId: data.scene_id,
      shotNumber: data.shot_number,
      description: data.description,
      cameraAngle: data.camera_angle,
      cameraMovement: data.camera_movement,
      framing: data.framing,
      lens: data.lens,
      duration: data.duration,
      shotlengthMinutes: data.shotlength_minutes,
      shotlengthSeconds: data.shotlength_seconds,
      composition: data.composition,
      lightingNotes: data.lighting_notes,
      imageUrl: data.image_url,
      soundNotes: data.sound_notes,
      storyboardUrl: data.storyboard_url,
      referenceImageUrl: data.reference_image_url,
      dialog: data.dialog,
      notes: data.notes,
      orderIndex: data.order_index,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return c.json({ shot: transformedShot }, 201);
  } catch (error: any) {
    console.error("Shots POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /shots/:id
 * Update a shot
 */
app.put("/shots/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const shotId = c.req.param("id");
    const updates = await c.req.json();

    console.log("📝 Shot PUT request:", { shotId, updates });

    const dbUpdates: any = {};
    if (updates.shot_number !== undefined || updates.shotNumber !== undefined) {
      dbUpdates.shot_number = updates.shot_number || updates.shotNumber;
    }
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.camera_angle !== undefined || updates.cameraAngle !== undefined) {
      dbUpdates.camera_angle = updates.camera_angle || updates.cameraAngle;
    }
    if (updates.camera_movement !== undefined || updates.cameraMovement !== undefined) {
      dbUpdates.camera_movement = updates.camera_movement || updates.cameraMovement;
    }
    if (updates.framing !== undefined) dbUpdates.framing = updates.framing;
    if (updates.lens !== undefined) dbUpdates.lens = updates.lens;
    if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
    if (updates.shotlength_minutes !== undefined || updates.shotlengthMinutes !== undefined) {
      dbUpdates.shotlength_minutes = updates.shotlength_minutes || updates.shotlengthMinutes;
    }
    if (updates.shotlength_seconds !== undefined || updates.shotlengthSeconds !== undefined) {
      dbUpdates.shotlength_seconds = updates.shotlength_seconds || updates.shotlengthSeconds;
    }
    if (updates.composition !== undefined) dbUpdates.composition = updates.composition;
    if (updates.lighting_notes !== undefined || updates.lightingNotes !== undefined) {
      dbUpdates.lighting_notes = updates.lighting_notes || updates.lightingNotes;
    }
    if (updates.image_url !== undefined || updates.imageUrl !== undefined) {
      dbUpdates.image_url = updates.image_url || updates.imageUrl;
    }
    if (updates.sound_notes !== undefined || updates.soundNotes !== undefined) {
      dbUpdates.sound_notes = updates.sound_notes || updates.soundNotes;
    }
    if (updates.storyboard_url !== undefined || updates.storyboardUrl !== undefined) {
      dbUpdates.storyboard_url = updates.storyboard_url || updates.storyboardUrl;
    }
    if (updates.reference_image_url !== undefined || updates.referenceImageUrl !== undefined) {
      dbUpdates.reference_image_url = updates.reference_image_url || updates.referenceImageUrl;
    }
    
    // ✅ DIALOG & NOTES: Accept both JSON object and string (backward compatibility)
    if (updates.dialog !== undefined) {
      let dialog = updates.dialog;
      // If it's a string, try to parse it (legacy data)
      if (typeof dialog === 'string') {
        try {
          dialog = JSON.parse(dialog);
        } catch {
          // Keep as string if not valid JSON
        }
      }
      dbUpdates.dialog = dialog;
    }
    
    if (updates.notes !== undefined) {
      let notes = updates.notes;
      // If it's a string, try to parse it (legacy data)
      if (typeof notes === 'string') {
        try {
          notes = JSON.parse(notes);
        } catch {
          // Keep as string if not valid JSON
        }
      }
      dbUpdates.notes = notes;
    }
    if (updates.orderIndex !== undefined) dbUpdates.order_index = updates.orderIndex;
    
    // ✅ TIMESTAMP: Accept updated_at from client for last modified tracking
    if (updates.updated_at !== undefined || updates.updatedAt !== undefined) {
      dbUpdates.updated_at = updates.updated_at || updates.updatedAt;
    }

    console.log("📊 DB Updates object:", { dbUpdates, hasUpdates: Object.keys(dbUpdates).length > 0 });

    const { data, error } = await supabase
      .from("shots")
      .update(dbUpdates)
      .eq("id", shotId)
      .select()
      .single();

    if (error) {
      console.error("❌ Error updating shot:", {
        error,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        shotId,
        updates,
        dbUpdates,
      });
      return c.json({ error: error.message }, 500);
    }

    console.log("✅ Shot updated successfully:", { shotId, data });

    // Transform to camelCase
    const transformedShot = {
      id: data.id,
      projectId: data.project_id,
      sceneId: data.scene_id,
      shotNumber: data.shot_number,
      description: data.description,
      cameraAngle: data.camera_angle,
      cameraMovement: data.camera_movement,
      framing: data.framing,
      lens: data.lens,
      duration: data.duration,
      shotlengthMinutes: data.shotlength_minutes,
      shotlengthSeconds: data.shotlength_seconds,
      composition: data.composition,
      lightingNotes: data.lighting_notes,
      imageUrl: data.image_url,
      soundNotes: data.sound_notes,
      storyboardUrl: data.storyboard_url,
      referenceImageUrl: data.reference_image_url,
      dialog: data.dialog,
      notes: data.notes,
      orderIndex: data.order_index,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return c.json({ shot: transformedShot });
  } catch (error: any) {
    console.error("Shots PUT error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /shots/:id
 * Delete a shot
 */
app.delete("/shots/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const shotId = c.req.param("id");

    const { error } = await supabase
      .from("shots")
      .delete()
      .eq("id", shotId);

    if (error) {
      console.error("Error deleting shot:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Shots DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /shots/reorder
 * Reorder shots within a scene
 */
app.post("/shots/reorder", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { scene_id, shot_ids } = await c.req.json();

    if (!scene_id || !shot_ids || !Array.isArray(shot_ids)) {
      return c.json({ error: "scene_id and shot_ids array are required" }, 400);
    }

    // Update order_index for each shot
    for (let i = 0; i < shot_ids.length; i++) {
      await supabase
        .from("shots")
        .update({ order_index: i })
        .eq("id", shot_ids[i])
        .eq("scene_id", scene_id);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Shots reorder error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /shots/:id/upload-image
 * Upload image for a shot
 */
app.post("/shots/:id/upload-image", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const shotId = c.req.param("id");
    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    const bucketName = "make-3b52693b-shots";
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { public: false, fileSizeLimit: 5242880 });
    } else {
      // Ensure bucket has correct size limit
      try {
        await supabase.storage.updateBucket(bucketName, { public: false, fileSizeLimit: 5242880 });
      } catch (error) {
        console.error(`[Image Upload] Failed to update bucket:`, error);
      }
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${shotId}-${Date.now()}.${fileExt}`;
    const filePath = `shots/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { contentType: file.type, upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return c.json({ error: uploadError.message }, 500);
    }

    const { data: urlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 31536000);

    if (!urlData) {
      return c.json({ error: "Failed to get signed URL" }, 500);
    }

    await supabase.from("shots").update({ image_url: urlData.signedUrl }).eq("id", shotId);

    return c.json({ imageUrl: urlData.signedUrl });
  } catch (error: any) {
    console.error("Image upload error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /shots/:id/characters
 * Add character to shot
 */
app.post("/shots/:id/characters", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const shotId = c.req.param("id");
    const { character_id } = await c.req.json();

    if (!character_id) {
      return c.json({ error: "character_id is required" }, 400);
    }

    // Add character to shot
    const { error } = await supabase
      .from("shot_characters")
      .insert({
        shot_id: shotId,
        character_id: character_id,
      });

    if (error) {
      console.error("Error adding character to shot:", error);
      return c.json({ error: error.message }, 500);
    }

    // Fetch the updated shot with all characters
    const { data: shotData, error: fetchError } = await supabase
      .from("shots")
      .select(`
        *,
        shot_characters (
          character_id,
          characters (
            id,
            name,
            image_url,
            description
          )
        )
      `)
      .eq("id", shotId)
      .single();

    if (fetchError || !shotData) {
      console.error("Error fetching updated shot:", fetchError);
      return c.json({ error: "Failed to fetch updated shot" }, 500);
    }

    // Transform to camelCase
    const transformedShot = {
      id: shotData.id,
      projectId: shotData.project_id,
      sceneId: shotData.scene_id,
      characters: (shotData.shot_characters || [])
        .map((sc: any) => sc.characters)
        .filter(Boolean)
        .map((char: any) => ({
          id: char.id,
          name: char.name,
          imageUrl: char.image_url,
          description: char.description,
        })),
    };

    return c.json({ shot: transformedShot });
  } catch (error: any) {
    console.error("Add character to shot error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /shots/:id/characters/:characterId
 * Remove character from shot
 */
app.delete("/shots/:id/characters/:characterId", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const shotId = c.req.param("id");
    const characterId = c.req.param("characterId");

    const { error } = await supabase
      .from("shot_characters")
      .delete()
      .eq("shot_id", shotId)
      .eq("character_id", characterId);

    if (error) {
      console.error("Error removing character from shot:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Remove character from shot error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// CHARACTERS ROUTES (for @-mentions in shots)
// =============================================================================

/**
 * GET /timeline-characters?project_id=X
 * Get all characters for a project
 */
app.get("/timeline-characters", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectId = c.req.query("project_id");

    if (!projectId) {
      return c.json({ error: "project_id is required" }, 400);
    }

    // First, get the project to find its world_id
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("world_id, organization_id")
      .eq("id", projectId)
      .single();

    if (projectError) {
      console.error("Error fetching project:", projectError);
      return c.json({ error: projectError.message }, 500);
    }

    // Now fetch characters - try both project_id and world_id/organization_id
    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .or(
        project?.world_id 
          ? `project_id.eq.${projectId},and(world_id.eq.${project.world_id},organization_id.eq.${project.organization_id})`
          : `project_id.eq.${projectId},organization_id.eq.${project.organization_id}`
      )
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching characters:", error);
      return c.json({ error: error.message }, 500);
    }

    console.log(`[timeline-characters] Found ${data?.length || 0} characters for project ${projectId}`);

    // Transform to camelCase
    const transformedCharacters = (data || []).map(char => ({
      id: char.id,
      projectId: char.project_id || projectId, // Use projectId if not set
      worldId: char.world_id,
      name: char.name,
      description: char.description,
      imageUrl: char.image_url,
      color: char.color,
      createdAt: char.created_at,
      updatedAt: char.updated_at,
    }));

    return c.json({ characters: transformedCharacters });
  } catch (error: any) {
    console.error("Characters GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /timeline-characters/:id
 * Get a single character by ID
 */
app.get("/timeline-characters/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const characterId = c.req.param("id");

    const { data, error } = await supabase
      .from("characters")
      .select("*")
      .eq("id", characterId)
      .single();

    if (error) {
      console.error("Error fetching character:", error);
      return c.json({ error: error.message }, 500);
    }

    // Transform to camelCase
    const transformedCharacter = {
      id: data.id,
      projectId: data.project_id,
      name: data.name,
      description: data.description,
      imageUrl: data.image_url,
      color: data.color,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return c.json({ character: transformedCharacter });
  } catch (error: any) {
    console.error("Character GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /timeline-characters
 * Create a new character
 */
app.post("/timeline-characters", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const projectId = body.project_id || body.projectId;

    if (!projectId) {
      return c.json({ error: "project_id is required" }, 400);
    }

    if (!body.name) {
      return c.json({ error: "name is required" }, 400);
    }

    const { data, error } = await supabase
      .from("characters")
      .insert({
        project_id: projectId,
        name: body.name,
        description: body.description,
        image_url: body.image_url || body.imageUrl,
        color: body.color,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating character:", error);
      return c.json({ error: error.message }, 500);
    }

    // Transform to camelCase
    const transformedCharacter = {
      id: data.id,
      projectId: data.project_id,
      name: data.name,
      description: data.description,
      imageUrl: data.image_url,
      color: data.color,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return c.json({ character: transformedCharacter }, 201);
  } catch (error: any) {
    console.error("Character POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /timeline-characters/:id
 * Update a character
 */
app.put("/timeline-characters/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const characterId = c.req.param("id");
    const updates = await c.req.json();

    // Build update object
    const dbUpdates: any = {};
    if (updates.name !== undefined) {
      dbUpdates.name = updates.name;
    }
    if (updates.description !== undefined) {
      dbUpdates.description = updates.description;
    }
    if (updates.imageUrl !== undefined || updates.image_url !== undefined) {
      dbUpdates.image_url = updates.imageUrl ?? updates.image_url;
    }
    if (updates.color !== undefined) {
      dbUpdates.color = updates.color;
    }

    const { data, error } = await supabase
      .from("characters")
      .update(dbUpdates)
      .eq("id", characterId)
      .select()
      .single();

    if (error) {
      console.error("Error updating character:", error);
      return c.json({ error: error.message }, 500);
    }

    // Transform to camelCase
    const transformedCharacter = {
      id: data.id,
      projectId: data.project_id,
      name: data.name,
      description: data.description,
      imageUrl: data.image_url,
      color: data.color,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return c.json({ character: transformedCharacter });
  } catch (error: any) {
    console.error("Character PUT error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /timeline-characters/:id
 * Delete a character
 */
app.delete("/timeline-characters/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const characterId = c.req.param("id");

    const { error } = await supabase
      .from("characters")
      .delete()
      .eq("id", characterId);

    if (error) {
      console.error("Error deleting character:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Character DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// START SERVER
// =============================================================================

console.log("🎬 Scriptony Timeline V2 (Generic Template Engine) starting...");
Deno.serve(app.fetch);
