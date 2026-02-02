/**
 * 🎨 SCRIPTONY INSPIRATION - VISUAL REFERENCE MANAGER
 * 
 * 📅 CREATED: 2025-11-04
 * 🎯 PURPOSE: Manage visual inspiration/reference images for projects
 * 
 * Use Cases:
 * - Film/Series screenshots for visual reference
 * - Concept art inspiration
 * - Color palette references
 * - Shot composition examples
 * - Lighting references
 * - Production design inspiration
 * 
 * ROUTES:
 * - GET    /                              Health check
 * - GET    /inspirations?project_id=X    Get all inspirations for project
 * - GET    /inspirations/:id              Get single inspiration
 * - POST   /inspirations                  Create inspiration
 * - PUT    /inspirations/:id              Update inspiration
 * - DELETE /inspirations/:id              Delete inspiration
 * - POST   /inspirations/reorder          Reorder inspirations
 * 
 * FEATURES:
 * ✅ Project-based organization
 * ✅ Image URL storage
 * ✅ Rich metadata (title, description, source)
 * ✅ Tagging system
 * ✅ Order management
 * ✅ Auth & RLS protection
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

// =============================================================================
// TYPES
// =============================================================================

interface ProjectInspiration {
  id: string;
  project_id: string;
  user_id: string;
  image_url: string;
  title?: string;
  description?: string;
  source?: string;
  tags?: string[];
  order_index: number;
  created_at: string;
  updated_at: string;
}

interface CreateInspirationRequest {
  project_id: string;
  projectId?: string; // camelCase alias
  image_url: string;
  imageUrl?: string; // camelCase alias
  title?: string;
  description?: string;
  source?: string;
  tags?: string[];
}

interface UpdateInspirationRequest {
  image_url?: string;
  imageUrl?: string; // camelCase alias
  title?: string;
  description?: string;
  source?: string;
  tags?: string[];
  order_index?: number;
  orderIndex?: number; // camelCase alias
}

// =============================================================================
// SETUP
// =============================================================================

const app = new Hono().basePath("/scriptony-inspiration");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
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

function toCamelCase(obj: Record<string, any>): Record<string, any> {
  return {
    id: obj.id,
    projectId: obj.project_id,
    userId: obj.user_id,
    imageUrl: obj.image_url,
    title: obj.title,
    description: obj.description,
    source: obj.source,
    tags: obj.tags,
    orderIndex: obj.order_index,
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
    function: "scriptony-inspiration",
    version: "1.0.0",
    message: "Scriptony Inspiration (Visual Reference Manager) is running!",
    features: ["visual-references", "project-organization", "tagging", "ordering"],
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    function: "scriptony-inspiration",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// INSPIRATIONS ROUTES
// =============================================================================

/**
 * GET /inspirations?project_id=X
 * Get all inspirations for a project
 */
app.get("/inspirations", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectId = c.req.query("project_id") || c.req.query("projectId");

    if (!projectId) {
      return c.json({ error: "project_id is required" }, 400);
    }

    console.log(`[INSPIRATIONS] Loading for project: ${projectId}`);

    const { data, error } = await supabase
      .from("project_inspirations")
      .select("*")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[INSPIRATIONS] Error fetching:", error);
      return c.json({ error: error.message }, 500);
    }

    const transformedData = (data || []).map(toCamelCase);
    console.log(`[INSPIRATIONS] Loaded ${transformedData.length} inspirations`);

    return c.json({ inspirations: transformedData });
  } catch (error: any) {
    console.error("[INSPIRATIONS] GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /inspirations/:id
 * Get single inspiration by ID
 */
app.get("/inspirations/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");

    const { data, error } = await supabase
      .from("project_inspirations")
      .select("*")
      .eq("id", id)
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("[INSPIRATIONS] Error fetching single:", error);
      return c.json({ error: error.message }, 500);
    }

    if (!data) {
      return c.json({ error: "Inspiration not found" }, 404);
    }

    return c.json({ inspiration: toCamelCase(data) });
  } catch (error: any) {
    console.error("[INSPIRATIONS] GET single error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /inspirations
 * Create new inspiration
 */
app.post("/inspirations", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body: CreateInspirationRequest = await c.req.json();

    // Support both snake_case and camelCase
    const projectId = body.project_id || body.projectId;
    const imageUrl = body.image_url || body.imageUrl;

    if (!projectId) {
      return c.json({ error: "project_id is required" }, 400);
    }

    if (!imageUrl) {
      return c.json({ error: "image_url is required" }, 400);
    }

    // Get highest order_index for this project
    const { data: existingInspirations } = await supabase
      .from("project_inspirations")
      .select("order_index")
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .order("order_index", { ascending: false })
      .limit(1);

    const nextOrderIndex = (existingInspirations?.[0]?.order_index ?? -1) + 1;

    console.log(`[INSPIRATIONS] Creating new inspiration for project: ${projectId}`);

    const { data, error } = await supabase
      .from("project_inspirations")
      .insert({
        project_id: projectId,
        user_id: userId,
        image_url: imageUrl,
        title: body.title,
        description: body.description,
        source: body.source,
        tags: body.tags || [],
        order_index: nextOrderIndex,
      })
      .select()
      .single();

    if (error) {
      console.error("[INSPIRATIONS] Error creating:", error);
      return c.json({ error: error.message }, 500);
    }

    console.log(`[INSPIRATIONS] Created inspiration: ${data.id}`);
    return c.json({ inspiration: toCamelCase(data) }, 201);
  } catch (error: any) {
    console.error("[INSPIRATIONS] POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /inspirations/:id
 * Update inspiration
 */
app.put("/inspirations/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");
    const updates: UpdateInspirationRequest = await c.req.json();

    // Build update object
    const dbUpdates: any = {
      updated_at: new Date().toISOString(),
    };

    // Support both snake_case and camelCase
    if (updates.image_url !== undefined || updates.imageUrl !== undefined) {
      dbUpdates.image_url = updates.image_url || updates.imageUrl;
    }
    if (updates.title !== undefined) {
      dbUpdates.title = updates.title;
    }
    if (updates.description !== undefined) {
      dbUpdates.description = updates.description;
    }
    if (updates.source !== undefined) {
      dbUpdates.source = updates.source;
    }
    if (updates.tags !== undefined) {
      dbUpdates.tags = updates.tags;
    }
    if (updates.order_index !== undefined || updates.orderIndex !== undefined) {
      dbUpdates.order_index = updates.order_index ?? updates.orderIndex;
    }

    console.log(`[INSPIRATIONS] Updating inspiration: ${id}`);

    const { data, error } = await supabase
      .from("project_inspirations")
      .update(dbUpdates)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("[INSPIRATIONS] Error updating:", error);
      return c.json({ error: error.message }, 500);
    }

    if (!data) {
      return c.json({ error: "Inspiration not found" }, 404);
    }

    console.log(`[INSPIRATIONS] Updated inspiration: ${id}`);
    return c.json({ inspiration: toCamelCase(data) });
  } catch (error: any) {
    console.error("[INSPIRATIONS] PUT error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /inspirations/:id
 * Delete inspiration
 */
app.delete("/inspirations/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const id = c.req.param("id");

    console.log(`[INSPIRATIONS] Deleting inspiration: ${id}`);

    const { error } = await supabase
      .from("project_inspirations")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("[INSPIRATIONS] Error deleting:", error);
      return c.json({ error: error.message }, 500);
    }

    console.log(`[INSPIRATIONS] Deleted inspiration: ${id}`);
    return c.json({ success: true });
  } catch (error: any) {
    console.error("[INSPIRATIONS] DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /inspirations/reorder
 * Reorder inspirations
 * Body: { inspirationIds: string[] } - Array of IDs in new order
 */
app.post("/inspirations/reorder", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const inspirationIds: string[] = body.inspirationIds || body.inspiration_ids || [];

    if (!Array.isArray(inspirationIds) || inspirationIds.length === 0) {
      return c.json({ error: "inspirationIds array is required" }, 400);
    }

    console.log(`[INSPIRATIONS] Reordering ${inspirationIds.length} inspirations`);

    // Update order_index for each inspiration
    const updates = inspirationIds.map((id, index) => 
      supabase
        .from("project_inspirations")
        .update({ 
          order_index: index,
          updated_at: new Date().toISOString()
        })
        .eq("id", id)
        .eq("user_id", userId)
    );

    await Promise.all(updates);

    console.log(`[INSPIRATIONS] Reordered ${inspirationIds.length} inspirations`);
    return c.json({ success: true, count: inspirationIds.length });
  } catch (error: any) {
    console.error("[INSPIRATIONS] Reorder error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// START SERVER
// =============================================================================

console.log("🎨 Scriptony Inspiration (Visual Reference Manager) starting...");
Deno.serve(app.fetch);
