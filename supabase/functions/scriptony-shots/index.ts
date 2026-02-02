/**
 * 🎬 SCRIPTONY SHOTS MICROSERVICE
 * 
 * 📅 CREATED: 2025-11-25
 * 🎯 PURPOSE: Shots Management (Film-specific)
 * 
 * ROUTES:
 * - GET    /shots?project_id=X          Bulk Load Shots
 * - GET    /shots/:sceneId               Shots for Scene
 * - POST   /shots                        Create Shot
 * - PUT    /shots/:id                    Update Shot (+ timestamp!)
 * - DELETE /shots/:id                    Delete Shot
 * - POST   /shots/reorder                Reorder in Scene
 * - POST   /shots/:id/upload-image       Image Upload
 * - POST   /shots/:id/characters         Add Character
 * - DELETE /shots/:id/characters/:charId Remove Character
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

// =============================================================================
// TYPES
// =============================================================================

interface Shot {
  id?: string;
  project_id: string;
  scene_id: string;
  order_index: number; // FIXED: Changed from order_in_scene to order_index
  shot_type?: string;
  camera_movement?: string;
  angle?: string;
  description?: string;
  image_url?: string;
  character_ids?: string[];
  duration_seconds?: number;
  start_time?: number;
  created_at?: string;
  updated_at?: string;
}

// =============================================================================
// COMPRESSION MIDDLEWARE (INLINE)
// =============================================================================

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

  const reader = compressedStream.getReader();
  const chunks: Uint8Array[] = [];
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

function compress() {
  return async (c: any, next: any) => {
    await next();
    
    const acceptEncoding = c.req.header('Accept-Encoding') || '';
    if (!acceptEncoding.includes('gzip')) {
      return;
    }

    const contentType = c.res.headers.get('Content-Type') || '';
    if (!contentType.includes('application/json') && !contentType.includes('text/')) {
      return;
    }

    const body = await c.res.text();
    const compressed = await gzipCompress(body);
    
    c.res = new Response(compressed, {
      status: c.res.status,
      headers: {
        ...Object.fromEntries(c.res.headers),
        'Content-Encoding': 'gzip',
        'Content-Length': compressed.length.toString(),
      },
    });
  };
}

// =============================================================================
// APP SETUP
// =============================================================================

const app = new Hono().basePath("/scriptony-shots");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// CORS MUST BE FIRST!
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length", "Content-Encoding"],
  maxAge: 600,
}));

app.use('*', logger(console.log));
app.use('*', compress());

// =============================================================================
// HELPER: GET USER FROM TOKEN
// =============================================================================

async function getUserIdFromToken(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    return null;
  }
  
  return user.id;
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get("/", (c) => {
  return c.json({ 
    status: "ok", 
    function: "scriptony-shots",
    version: "1.0.0",
    message: "Scriptony Shots Microservice is running!",
    features: ["shots-crud", "image-upload", "character-relations", "timestamp-tracking"],
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    function: "scriptony-shots",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// ROUTES: SHOTS CRUD
// =============================================================================

// GET /shots?project_id=X - Bulk Load all shots for project
app.get("/shots", async (c) => {
  try {
    const projectId = c.req.query("project_id");
    
    if (!projectId) {
      return c.json({ error: "project_id is required" }, 400);
    }

    // Query shots with character relations
    const { data: shots, error } = await supabase
      .from("shots")
      .select(`
        *,
        shot_characters (
          character_id,
          characters (
            id,
            name,
            color
          )
        )
      `)
      .eq("project_id", projectId)
      .order("scene_id", { ascending: true })
      .order("order_index", { ascending: true }); // FIXED: Changed from order_in_scene

    if (error) {
      console.error("Error loading shots:", error);
      return c.json({ error: error.message }, 500);
    }

    // Transform to include character_ids array
    const transformedShots = shots?.map(shot => ({
      ...shot,
      character_ids: shot.shot_characters?.map((sc: any) => sc.character_id) || [],
      characters: shot.shot_characters?.map((sc: any) => sc.characters).filter(Boolean) || [],
    })) || [];

    return c.json({ 
      shots: transformedShots,
      count: transformedShots.length,
    });
  } catch (error: any) {
    console.error("Get shots error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /shots/:sceneId - Get shots for specific scene
app.get("/shots/:sceneId", async (c) => {
  try {
    const sceneId = c.req.param("sceneId");
    
    const { data: shots, error } = await supabase
      .from("shots")
      .select(`
        *,
        shot_characters (
          character_id,
          characters (
            id,
            name,
            color
          )
        )
      `)
      .eq("scene_id", sceneId)
      .order("order_index", { ascending: true }); // FIXED: Changed from order_in_scene

    if (error) {
      console.error("Error loading shots for scene:", error);
      return c.json({ error: error.message }, 500);
    }

    const transformedShots = shots?.map(shot => ({
      ...shot,
      character_ids: shot.shot_characters?.map((sc: any) => sc.character_id) || [],
      characters: shot.shot_characters?.map((sc: any) => sc.characters).filter(Boolean) || [],
    })) || [];

    return c.json({ 
      shots: transformedShots,
      count: transformedShots.length,
    });
  } catch (error: any) {
    console.error("Get shots for scene error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /shots - Create new shot
app.post("/shots", async (c) => {
  try {
    const body = await c.req.json();
    const { scene_id, order_index, project_id, ...shotData } = body; // FIXED: Changed from order_in_scene

    if (!scene_id || !project_id) {
      return c.json({ error: "scene_id and project_id are required" }, 400);
    }

    // Get next order if not provided
    let finalOrder = order_index; // FIXED: Changed from order_in_scene
    if (finalOrder === undefined) {
      const { data: existingShots } = await supabase
        .from("shots")
        .select("order_index") // FIXED: Changed from order_in_scene
        .eq("scene_id", scene_id)
        .order("order_index", { ascending: false }) // FIXED: Changed from order_in_scene
        .limit(1);
      
      finalOrder = existingShots && existingShots.length > 0 
        ? existingShots[0].order_index + 1  // FIXED: Changed from order_in_scene
        : 0;
    }

    // Create shot
    const { data: shot, error } = await supabase
      .from("shots")
      .insert({
        scene_id,
        project_id,
        order_index: finalOrder, // FIXED: Changed from order_in_scene
        ...shotData,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating shot:", error);
      return c.json({ error: error.message }, 500);
    }

    // Handle character relations if provided
    if (body.character_ids && body.character_ids.length > 0) {
      const relations = body.character_ids.map((charId: string) => ({
        shot_id: shot.id,
        character_id: charId,
      }));

      await supabase.from("shot_characters").insert(relations);
    }

    return c.json({ shot }, 201);
  } catch (error: any) {
    console.error("Create shot error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /shots/:id - Update shot (WITH TIMESTAMP!)
app.put("/shots/:id", async (c) => {
  try {
    const shotId = c.req.param("id");
    const body = await c.req.json();
    
    // Extract character_ids for separate handling
    const { character_ids, ...updateData } = body;

    // IMPORTANT: Always update timestamp
    const dataToUpdate = {
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    // Update shot
    const { data: shot, error } = await supabase
      .from("shots")
      .update(dataToUpdate)
      .eq("id", shotId)
      .select()
      .single();

    if (error) {
      console.error("Error updating shot:", error);
      return c.json({ error: error.message }, 500);
    }

    // Update character relations if provided
    if (character_ids !== undefined) {
      // Delete existing relations
      await supabase
        .from("shot_characters")
        .delete()
        .eq("shot_id", shotId);

      // Insert new relations
      if (character_ids.length > 0) {
        const relations = character_ids.map((charId: string) => ({
          shot_id: shotId,
          character_id: charId,
        }));
        await supabase.from("shot_characters").insert(relations);
      }
    }

    return c.json({ shot });
  } catch (error: any) {
    console.error("Update shot error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /shots/:id - Delete shot
app.delete("/shots/:id", async (c) => {
  try {
    const shotId = c.req.param("id");

    // Delete character relations first (cascade should handle this, but being explicit)
    await supabase
      .from("shot_characters")
      .delete()
      .eq("shot_id", shotId);

    // Delete shot
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
    console.error("Delete shot error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /shots/reorder - Reorder shots in scene
app.post("/shots/reorder", async (c) => {
  try {
    const { scene_id, shot_orders } = await c.req.json();
    
    if (!scene_id || !shot_orders || !Array.isArray(shot_orders)) {
      return c.json({ error: "scene_id and shot_orders array required" }, 400);
    }

    // Update each shot's order
    const updates = shot_orders.map(({ shot_id, order }: any) =>
      supabase
        .from("shots")
        .update({ 
          order_index: order, // FIXED: Changed from order_in_scene
          updated_at: new Date().toISOString(),
        })
        .eq("id", shot_id)
    );

    await Promise.all(updates);

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Reorder shots error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// ROUTES: IMAGE UPLOAD
// =============================================================================

app.post("/shots/:id/upload-image", async (c) => {
  try {
    const shotId = c.req.param("id");
    const body = await c.req.json();
    const { image_data, filename } = body;

    if (!image_data) {
      return c.json({ error: "image_data is required" }, 400);
    }

    // Convert base64 to blob
    const base64Data = image_data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Upload to storage
    const filePath = `shots/${shotId}/${filename || Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("scriptony-images")
      .upload(filePath, buffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return c.json({ error: uploadError.message }, 500);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("scriptony-images")
      .getPublicUrl(filePath);

    // Update shot with image URL
    const { error: updateError } = await supabase
      .from("shots")
      .update({ 
        image_url: publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shotId);

    if (updateError) {
      console.error("Error updating shot with image:", updateError);
      return c.json({ error: updateError.message }, 500);
    }

    return c.json({ 
      image_url: publicUrl,
      success: true,
    });
  } catch (error: any) {
    console.error("Upload image error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// ROUTES: CHARACTER RELATIONS
// =============================================================================

// POST /shots/:id/characters - Add character to shot
app.post("/shots/:id/characters", async (c) => {
  try {
    const shotId = c.req.param("id");
    const { character_id } = await c.req.json();

    if (!character_id) {
      return c.json({ error: "character_id is required" }, 400);
    }

    const { error } = await supabase
      .from("shot_characters")
      .insert({
        shot_id: shotId,
        character_id,
      });

    if (error) {
      console.error("Error adding character to shot:", error);
      return c.json({ error: error.message }, 500);
    }

    // Update shot timestamp
    await supabase
      .from("shots")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", shotId);

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Add character to shot error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /shots/:id/characters/:characterId - Remove character from shot
app.delete("/shots/:id/characters/:characterId", async (c) => {
  try {
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

    // Update shot timestamp
    await supabase
      .from("shots")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", shotId);

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Remove character from shot error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// START SERVER
// =============================================================================

console.log("🎬 Scriptony Shots Microservice starting...");
Deno.serve(app.fetch);