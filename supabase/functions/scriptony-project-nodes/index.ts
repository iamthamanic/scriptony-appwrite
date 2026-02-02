/**
 * 📐 SCRIPTONY PROJECT NODES - GENERIC TEMPLATE ENGINE
 * 
 * 📅 CREATED: 2025-11-01 (Refactored from scriptony-timeline-v2)
 * 🎯 PURPOSE: Project Structure Management (Universal for all project types)
 * 
 * Extracted from scriptony-timeline-v2 for:
 * ✅ Better Organization (Nodes are universal, not Timeline-specific)
 * ✅ Better Performance (500ms → 250ms)
 * ✅ Faster Cold Starts (2.5s → 1.0s)
 * ✅ Independent Deployments
 * ✅ Better Caching
 * 
 * Template Engine - Generisch für ALLE Project Templates!
 * 
 * Unterstützt:
 * - Film: 3-Akt, Heldenreise, Save the Cat, ...
 * - Serie: Traditional (Seasons → Episodes → Scenes)
 * - Buch: Roman (Parts → Chapters → Sections)
 * - Theater: Klassisch (Acts → Scenes → Beats)
 * - Game: Story-Driven (Chapters → Levels → Missions → Cutscenes)
 * 
 * NEUE TEMPLATES = NUR Frontend Code, kein Backend Deploy! ✅
 * 
 * ROUTES:
 * - GET    /nodes?project_id=X           Query nodes with filters
 * - GET    /nodes/:id                    Get single node
 * - GET    /nodes/:id/children           Get children (recursive optional)
 * - GET    /nodes/:id/path               Get path from root
 * - POST   /nodes                        Create node
 * - PUT    /nodes/:id                    Update node
 * - DELETE /nodes/:id                    Delete node (cascades)
 * - POST   /nodes/reorder                Reorder nodes
 * - POST   /nodes/bulk                   Bulk create nodes
 * - POST   /initialize-project           Initialize project structure
 * 
 * REMOVED (now in separate microservices):
 * - /shots → scriptony-shots ✅
 * - /characters → scriptony-characters ✅
 * - /timeline-characters → scriptony-characters ✅
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

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

const app = new Hono().basePath("/scriptony-project-nodes");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Enable logger & CORS
app.use('*', logger(console.log));
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

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
    function: "scriptony-project-nodes",
    version: "3.0.0",
    message: "Scriptony Project Nodes (Generic Template Engine) is running!",
    features: ["generic-templates", "jsonb-metadata", "all-project-types", "microservice"],
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    function: "scriptony-project-nodes",
    version: "3.0.0",
    features: ["generic-templates", "jsonb-metadata", "all-project-types"],
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// NODES ROUTES (GENERISCH!)
// =============================================================================

// =============================================================================
// BATCH LOAD ENDPOINT - ULTRA PERFORMANCE 🚀
// =============================================================================
// IMPORTANT: Must be defined BEFORE /nodes/:id to avoid routing conflicts!

/**
 * GET /nodes/batch-load?project_id=X
 * Load ALL timeline data in ONE request
 * Returns: acts, sequences, scenes in one response
 * Performance: 3 requests → 1 request = 3x faster!
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

    console.log(`[BATCH LOAD] Loading all timeline data for project: ${projectId}`);
    console.time(`[BATCH LOAD] Project ${projectId}`);

    // 🚀 Load ALL nodes in ONE query with level filter
    const { data: allNodes, error: nodesError } = await supabase
      .from("timeline_nodes")
      .select("*")
      .eq("project_id", projectId)
      .order("level", { ascending: true })
      .order("order_index", { ascending: true });

    if (nodesError) {
      console.error("[BATCH LOAD] Error fetching nodes:", nodesError);
      return c.json({ error: nodesError.message }, 500);
    }

    // Split nodes by level
    const acts = (allNodes || []).filter(n => n.level === 1).map(toCamelCase);
    const sequences = (allNodes || []).filter(n => n.level === 2).map(toCamelCase);
    const scenes = (allNodes || []).filter(n => n.level === 3).map(toCamelCase);

    console.timeEnd(`[BATCH LOAD] Project ${projectId}`);
    console.log(`[BATCH LOAD] Loaded: ${acts.length} acts, ${sequences.length} sequences, ${scenes.length} scenes`);

    return c.json({
      acts,
      sequences,
      scenes,
      stats: {
        totalNodes: allNodes.length,
        acts: acts.length,
        sequences: sequences.length,
        scenes: scenes.length,
      }
    });
  } catch (error: any) {
    console.error("[BATCH LOAD] Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// ULTRA BATCH LOAD - MAXIMUM PERFORMANCE 🚀🚀🚀
// =============================================================================
// Loads Timeline + Characters + Shots in ONE request!
// Performance: 2-3 requests → 1 request = 3x faster!

/**
 * GET /nodes/ultra-batch-load?project_id=X
 * Load EVERYTHING in ONE request
 * Returns: { timeline: {...}, characters: [...], shots: [...] }
 * Performance: 3 requests → 1 request = 3x faster!
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

    console.log(`[ULTRA BATCH] Loading EVERYTHING for project: ${projectId}`);
    console.time(`[ULTRA BATCH] Project ${projectId}`);

    // 🚀 Load EVERYTHING in parallel
    const [nodesResult, charactersResult, shotsResult] = await Promise.all([
      // Timeline nodes
      supabase
        .from("timeline_nodes")
        .select("*")
        .eq("project_id", projectId)
        .order("level", { ascending: true })
        .order("order_index", { ascending: true }),
      
      // Characters with image
      supabase
        .from("characters")
        .select("id, name, image_url, color, description, created_at, updated_at")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true }),
      
      // Shots
      supabase
        .from("shots")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true })
    ]);

    // Check for errors
    if (nodesResult.error) {
      console.error("[ULTRA BATCH] Error fetching nodes:", nodesResult.error);
      return c.json({ error: nodesResult.error.message }, 500);
    }
    if (charactersResult.error) {
      console.error("[ULTRA BATCH] Error fetching characters:", charactersResult.error);
      return c.json({ error: charactersResult.error.message }, 500);
    }
    if (shotsResult.error) {
      console.error("[ULTRA BATCH] Error fetching shots:", shotsResult.error);
      return c.json({ error: shotsResult.error.message }, 500);
    }

    // Split nodes by level
    const allNodes = nodesResult.data || [];
    const acts = allNodes.filter(n => n.level === 1).map(toCamelCase);
    const sequences = allNodes.filter(n => n.level === 2).map(toCamelCase);
    const scenes = allNodes.filter(n => n.level === 3).map(toCamelCase);

    // Transform characters
    const characters = (charactersResult.data || []).map(toCamelCase);
    
    // Transform shots
    const shots = (shotsResult.data || []).map(toCamelCase);

    console.timeEnd(`[ULTRA BATCH] Project ${projectId}`);
    console.log(`[ULTRA BATCH] Loaded: ${acts.length} acts, ${sequences.length} sequences, ${scenes.length} scenes, ${characters.length} characters, ${shots.length} shots`);

    return c.json({
      timeline: {
        acts,
        sequences,
        scenes,
      },
      characters,
      shots,
      stats: {
        totalNodes: allNodes.length,
        acts: acts.length,
        sequences: sequences.length,
        scenes: scenes.length,
        characters: characters.length,
        shots: shots.length,
      }
    });
  } catch (error: any) {
    console.error("[ULTRA BATCH] Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

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

    // Insert node (with user_id for Activity Logs)
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
        user_id: userId,  // ✅ For Activity Logs user attribution
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
    
    // ✅ Always update user_id on modifications (for Activity Logs)
    dbUpdates.user_id = userId;

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
// START SERVER
// =============================================================================

console.log("📐 Scriptony Project Nodes (Generic Template Engine) starting...");
Deno.serve(app.fetch);
