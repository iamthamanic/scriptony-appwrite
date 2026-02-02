/**
 * 🌍 SCRIPTONY WORLDBUILDING - Edge Function
 * 
 * 🕐 LAST UPDATED: 2025-10-22 09:15 UTC
 * 📝 STABLE VERSION - No recent changes
 * 
 * Handles all Worldbuilding operations:
 * - Worlds CRUD
 * - Characters CRUD
 * - Locations CRUD
 * - Relationships & References
 * 
 * UNABHÄNGIG DEPLOYBAR - Worldbuilding-Änderungen beeinflussen Timeline/Assistant nicht!
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

// =============================================================================
// SETUP
// =============================================================================

// IMPORTANT: Supabase adds function name as prefix to all paths!
const app = new Hono().basePath("/scriptony-worldbuilding");

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

async function getUserOrganization(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", userId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data.organization_id;
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get("/", (c) => {
  return c.json({ 
    status: "ok", 
    function: "scriptony-worldbuilding",
    version: "1.0.0",
    message: "Scriptony Worldbuilding Service is running!",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    function: "scriptony-worldbuilding",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// WORLDS ROUTES
// =============================================================================

/**
 * GET /worlds
 * Get all worlds for user's organization
 */
app.get("/worlds", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get user's organization
    const orgId = await getUserOrganization(userId);
    if (!orgId) {
      return c.json({ error: "User has no organization" }, 403);
    }

    // Get worlds for organization
    const { data, error } = await supabase
      .from("worlds")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching worlds:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ worlds: data || [] });
  } catch (error: any) {
    console.error("Worlds GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /worlds/:id
 * Get single world by ID
 */
app.get("/worlds/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const worldId = c.req.param("id");

    const { data, error } = await supabase
      .from("worlds")
      .select("*")
      .eq("id", worldId)
      .single();

    if (error) {
      console.error("Error fetching world:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ world: data });
  } catch (error: any) {
    console.error("World GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /worlds
 * Create new world
 */
app.post("/worlds", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get user's organization
    const orgId = await getUserOrganization(userId);
    if (!orgId) {
      return c.json({ error: "User has no organization" }, 403);
    }

    const body = await c.req.json();
    const { name, description, lore, image_url } = body;

    if (!name) {
      return c.json({ error: "name is required" }, 400);
    }

    const { data, error } = await supabase
      .from("worlds")
      .insert({
        organization_id: orgId,
        name,
        description,
        lore,
        image_url,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating world:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ world: data }, 201);
  } catch (error: any) {
    console.error("Worlds POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /worlds/:id
 * Update world
 */
app.put("/worlds/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const worldId = c.req.param("id");
    const updates = await c.req.json();

    const { data, error } = await supabase
      .from("worlds")
      .update(updates)
      .eq("id", worldId)
      .select()
      .single();

    if (error) {
      console.error("Error updating world:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ world: data });
  } catch (error: any) {
    console.error("Worlds PUT error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /worlds/:id
 * Delete world
 */
app.delete("/worlds/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const worldId = c.req.param("id");

    const { error } = await supabase
      .from("worlds")
      .delete()
      .eq("id", worldId);

    if (error) {
      console.error("Error deleting world:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Worlds DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// CHARACTERS ROUTES
// =============================================================================

/**
 * GET /characters
 * Get all characters for user's organization
 */
app.get("/characters", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get user's organization
    const orgId = await getUserOrganization(userId);
    if (!orgId) {
      return c.json({ error: "User has no organization" }, 403);
    }

    const worldId = c.req.query("world_id");

    let query = supabase
      .from("characters")
      .select("*")
      .eq("organization_id", orgId);

    if (worldId) {
      query = query.eq("world_id", worldId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching characters:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ characters: data || [] });
  } catch (error: any) {
    console.error("Characters GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /characters/:id
 * Get single character by ID
 */
app.get("/characters/:id", async (c) => {
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

    return c.json({ character: data });
  } catch (error: any) {
    console.error("Character GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /characters
 * Create new character
 */
app.post("/characters", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get user's organization
    const orgId = await getUserOrganization(userId);
    if (!orgId) {
      return c.json({ error: "User has no organization" }, 403);
    }

    const body = await c.req.json();
    const { 
      world_id, 
      name, 
      description, 
      backstory, 
      personality,
      image_url,
      color 
    } = body;

    if (!name) {
      return c.json({ error: "name is required" }, 400);
    }

    const { data, error } = await supabase
      .from("characters")
      .insert({
        organization_id: orgId,
        world_id,
        name,
        description,
        backstory,
        personality,
        image_url,
        color,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating character:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ character: data }, 201);
  } catch (error: any) {
    console.error("Characters POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /characters/:id
 * Update character
 */
app.put("/characters/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const characterId = c.req.param("id");
    const updates = await c.req.json();

    const { data, error } = await supabase
      .from("characters")
      .update(updates)
      .eq("id", characterId)
      .select()
      .single();

    if (error) {
      console.error("Error updating character:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ character: data });
  } catch (error: any) {
    console.error("Characters PUT error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /characters/:id
 * Delete character
 */
app.delete("/characters/:id", async (c) => {
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
    console.error("Characters DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// LOCATIONS ROUTES (Future)
// =============================================================================

/**
 * GET /locations
 * Get all locations for a project
 */
app.get("/locations", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // TODO: Implement locations table
    return c.json({ 
      locations: [],
      message: "Locations feature coming soon"
    });
  } catch (error: any) {
    console.error("Locations GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// IMAGE UPLOAD
// =============================================================================

/**
 * POST /worlds/:id/upload-image
 * Upload world cover image to storage
 */
app.post("/worlds/:id/upload-image", async (c) => {
  try {
    console.log(`[Worldbuilding] Image upload starting`);
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const worldId = c.req.param("id");
    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "File is required" }, 400);
    }

    // Check file size (max 5MB)
    const maxSizeMB = 5;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return c.json({ 
        error: `File too large: ${(file.size / 1024 / 1024).toFixed(2)} MB (Max: ${maxSizeMB} MB)` 
      }, 400);
    }

    // Create bucket if not exists
    const bucketName = "make-3b52693b-world-images";
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { 
        public: false, 
        fileSizeLimit: 10485760 // 10MB
      });
      console.log(`[Worldbuilding] Created image bucket`);
    }

    // Upload file
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${worldId}-cover-${Date.now()}.${fileExt}`;
    const filePath = `covers/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { 
        contentType: file.type || 'image/jpeg',
        upsert: true 
      });

    if (uploadError) {
      console.error("[Worldbuilding] Upload error:", uploadError);
      return c.json({ error: uploadError.message }, 500);
    }

    // Get signed URL (1 year)
    const { data: urlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 31536000);

    if (!urlData) {
      return c.json({ error: "Failed to get signed URL" }, 500);
    }

    // Update world with image URL
    const { error: dbError } = await supabase
      .from("worlds")
      .update({ 
        cover_image_url: urlData.signedUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", worldId);

    if (dbError) {
      console.error("[Worldbuilding] DB update error:", dbError);
      return c.json({ error: dbError.message }, 500);
    }

    console.log(`[Worldbuilding] Image uploaded successfully: ${fileName}`);
    return c.json({ imageUrl: urlData.signedUrl });
  } catch (error: any) {
    console.error("[Worldbuilding] Image upload error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// START SERVER
// =============================================================================

console.log("🌍 Scriptony Worldbuilding Function starting...");
Deno.serve(app.fetch);
