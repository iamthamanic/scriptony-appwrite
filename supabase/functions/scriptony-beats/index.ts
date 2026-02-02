/**
 * 🎬 SCRIPTONY BEATS - Story Beats Microservice
 * 📅 last updated: 2025-11-25

 * 
 * 🚀 PERFORMANCE-OPTIMIERT (Hono Framework)
 * 
 * CRUD Operations für Story Beats (Save the Cat, Hero's Journey, etc.):
 * - GET /beats?project_id=xxx - Liste aller Beats
 * - POST /beats - Neuen Beat erstellen
 * - PATCH /beats/:id - Beat aktualisieren
 * - DELETE /beats/:id - Beat löschen
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
// SETUP
// =============================================================================

const app = new Hono().basePath("/scriptony-beats");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Enable CORS (must be FIRST!), logger & compression
app.use("/*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
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
// HEALTH CHECK
// =============================================================================

app.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    function: "scriptony-beats",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// BEATS ROUTES
// =============================================================================

/**
 * GET /beats?project_id=xxx
 * Get all beats for a project
 */
app.get("/beats", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectId = c.req.query("project_id");
    
    if (!projectId) {
      return c.json({ error: "project_id query parameter required" }, 400);
    }

    console.log(`[scriptony-beats] 🔍 GET /beats for project: ${projectId}`);

    const { data: beats, error } = await supabase
      .from('story_beats')
      .select('*')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true });

    if (error) {
      console.error('[scriptony-beats] ❌ Error fetching beats:', error);
      return c.json({ error: error.message }, 500);
    }

    console.log(`[scriptony-beats] ✅ Found ${beats?.length || 0} beats`);
    return c.json({ beats: beats || [] });
  } catch (error: any) {
    console.error("Beats GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /beats
 * Create new beat
 */
app.post("/beats", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { 
      project_id, 
      label, 
      template_abbr,
      description,
      from_container_id, 
      to_container_id,
      pct_from,
      pct_to,
      color,
      notes,
      order_index,
    } = body;

    console.log('[scriptony-beats] 📝 POST /beats:', { 
      project_id, 
      label,
      user_id: userId 
    });

    // Validate required fields
    if (!project_id || !label || !from_container_id || !to_container_id) {
      return c.json({ 
        error: 'Missing required fields: project_id, label, from_container_id, to_container_id' 
      }, 400);
    }

    // Validate percentage ranges
    if (
      (pct_from !== undefined && (pct_from < 0 || pct_from > 100)) ||
      (pct_to !== undefined && (pct_to < 0 || pct_to > 100))
    ) {
      return c.json({ error: 'pct_from and pct_to must be between 0 and 100' }, 400);
    }

    // Verify project exists
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, organization_id, title')
      .eq('id', project_id)
      .single();

    if (projectError || !project) {
      console.error('[scriptony-beats] ❌ Project not found:', project_id);
      return c.json({ 
        error: 'Project not found',
        details: projectError?.message
      }, 404);
    }

    const { data: beat, error } = await supabase
      .from('story_beats')
      .insert({
        project_id,
        user_id: userId,
        label,
        template_abbr: template_abbr || null,
        description: description || null,
        from_container_id,
        to_container_id,
        pct_from: pct_from ?? 0,
        pct_to: pct_to ?? 0,
        color: color || null,
        notes: notes || null,
        order_index: order_index ?? 0,
      })
      .select()
      .single();

    if (error) {
      console.error('[scriptony-beats] ❌ Error creating beat:', error);
      return c.json({ error: error.message }, 500);
    }

    console.log('[scriptony-beats] ✅ Beat created:', beat.id);
    return c.json({ beat }, 201);
  } catch (error: any) {
    console.error("Beats POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PATCH /beats/:id
 * Update beat
 */
app.patch("/beats/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const beatId = c.req.param("id");
    const body = await c.req.json();

    console.log('[scriptony-beats] 🔄 PATCH /beats/:id:', { beatId });

    // Validate percentage ranges
    if (
      (body.pct_from !== undefined && (body.pct_from < 0 || body.pct_from > 100)) ||
      (body.pct_to !== undefined && (body.pct_to < 0 || body.pct_to > 100))
    ) {
      return c.json({ error: 'pct_from and pct_to must be between 0 and 100' }, 400);
    }

    // Verify beat exists
    const { data: existingBeat, error: fetchError } = await supabase
      .from('story_beats')
      .select('project_id')
      .eq('id', beatId)
      .single();

    if (fetchError || !existingBeat) {
      return c.json({ error: 'Beat not found' }, 404);
    }

    // Remove fields that shouldn't be updated
    const { id, project_id, user_id, created_at, updated_at, ...updateData } = body;

    const { data: beat, error } = await supabase
      .from('story_beats')
      .update(updateData)
      .eq('id', beatId)
      .select()
      .single();

    if (error) {
      console.error('[scriptony-beats] ❌ Error updating beat:', error);
      return c.json({ error: error.message }, 500);
    }

    console.log('[scriptony-beats] ✅ Beat updated:', beatId);
    return c.json({ beat });
  } catch (error: any) {
    console.error("Beats PATCH error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /beats/:id
 * Delete beat
 */
app.delete("/beats/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const beatId = c.req.param("id");

    console.log('[scriptony-beats] 🗑️ DELETE /beats/:id:', { beatId });

    // Verify beat exists
    const { data: existingBeat, error: fetchError } = await supabase
      .from('story_beats')
      .select('project_id')
      .eq('id', beatId)
      .single();

    if (fetchError || !existingBeat) {
      return c.json({ error: 'Beat not found' }, 404);
    }

    const { error } = await supabase
      .from('story_beats')
      .delete()
      .eq('id', beatId);

    if (error) {
      console.error('[scriptony-beats] ❌ Error deleting beat:', error);
      return c.json({ error: error.message }, 500);
    }

    console.log('[scriptony-beats] ✅ Beat deleted:', beatId);
    return c.json({ success: true });
  } catch (error: any) {
    console.error("Beats DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// START SERVER
// =============================================================================

console.log("🎬 Scriptony Beats Function starting...");
Deno.serve(app.fetch);
