/**
 * 🎯 SCRIPTONY PROJECTS - Edge Function
 * 
 * 🕐 LAST UPDATED: 2025-11-25 (Added episode_layout & season_engine for Series)
 * 
 * Handles all Project-related operations:
 * - Project CRUD (all types: Film, Series, Book, Theater, Game, ...)
 * - Project initialization with templates
 * - Project statistics
 * - Narrative Structure & Beat Template support
 * - Episode Layout & Season Engine (Series only)
 * 
 * UNABHÄNGIG DEPLOYBAR - Änderungen hier beeinflussen Timeline/Assistant/etc. nicht!
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

// IMPORTANT: Supabase adds function name as prefix to all paths!
const app = new Hono().basePath("/scriptony-projects");

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

app.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    function: "scriptony-projects",
    version: "1.1.0",
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// PROJECTS ROUTES
// =============================================================================

/**
 * GET /projects
 * Get all projects for user's organization
 */
app.get("/projects", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    console.log('[scriptony-projects] 🔍 GET /projects for user:', userId);

    const orgId = await getUserOrganization(userId);
    console.log('[scriptony-projects] 📋 User organization:', orgId);

    // ROBUST FIX: Query by organization_id OR user_id
    // This ensures we get:
    // 1. Projects in user's organization
    // 2. Legacy projects created by this user (even if org is wrong/missing)
    let query = supabase
      .from("projects")
      .select("*");

    if (orgId) {
      // User has organization: Get projects from org OR created by user
      query = query.or(`organization_id.eq.${orgId},user_id.eq.${userId}`);
      console.log('[scriptony-projects] 🔍 Querying with OR: org_id OR user_id');
    } else {
      // No organization: Get only projects created by user
      query = query.eq("user_id", userId);
      console.log('[scriptony-projects] ⚠️ No organization, querying by user_id only');
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("[scriptony-projects] ❌ Error fetching projects:", error);
      return c.json({ error: error.message }, 500);
    }

    // Filter out deleted projects (client-side because Supabase OR doesn't work with multiple ORs)
    const filteredProjects = (data || []).filter(p => !p.is_deleted);

    console.log(`[scriptony-projects] ✅ Found ${data?.length || 0} projects (${filteredProjects.length} after filtering deleted)`);
    if (filteredProjects && filteredProjects.length > 0) {
      console.log('[scriptony-projects] 📋 Projects:', filteredProjects.map(p => ({ 
        id: p.id, 
        title: p.title, 
        type: p.type, 
        org_id: p.organization_id, 
        user_id: p.user_id 
      })));
    }

    return c.json({ projects: filteredProjects });
  } catch (error: any) {
    console.error("Projects GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /projects/:id
 * Get single project by ID
 */
app.get("/projects/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectId = c.req.param("id");

    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (error) {
      console.error("Error fetching project:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ project: data });
  } catch (error: any) {
    console.error("Project GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /projects
 * Create new project
 */
app.post("/projects", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const orgId = await getUserOrganization(userId);
    if (!orgId) {
      return c.json({ error: "User has no organization" }, 403);
    }

    const body = await c.req.json();
    const { 
      title, 
      description, 
      type, 
      logline, 
      genre, 
      duration, 
      world_id, 
      cover_image_url, 
      narrative_structure, 
      beat_template,
      episode_layout,
      season_engine,
    } = body;

    if (!title) {
      return c.json({ error: "title is required" }, 400);
    }

    const { data, error } = await supabase
      .from("projects")
      .insert({
        title,
        logline: logline || description,
        genre,
        type: type || 'film',
        duration: duration || null,
        world_id: world_id || null,
        cover_image_url: cover_image_url || null,
        narrative_structure: narrative_structure || null,
        beat_template: beat_template || null,
        episode_layout: episode_layout || null,
        season_engine: season_engine || null,
        organization_id: orgId,
        user_id: userId, // Add user_id to project
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating project:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ project: data }, 201);
  } catch (error: any) {
    console.error("Projects POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /projects/:id
 * Update project
 */
app.put("/projects/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const orgId = await getUserOrganization(userId);
    if (!orgId) {
      return c.json({ error: "User has no organization" }, 403);
    }

    const projectId = c.req.param("id");
    const updates = await c.req.json();

    // Verify project belongs to user's organization
    const { data: existingProject, error: fetchError } = await supabase
      .from("projects")
      .select("id, organization_id")
      .eq("id", projectId)
      .eq("organization_id", orgId)
      .single();

    if (fetchError || !existingProject) {
      return c.json({ error: "Project not found or access denied" }, 404);
    }

    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", projectId)
      .select()
      .single();

    if (error) {
      console.error("Error updating project:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ project: data });
  } catch (error: any) {
    console.error("Projects PUT error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /projects/:id
 * Delete project (cascades to timeline nodes, worlds, characters, etc.)
 */
app.delete("/projects/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const orgId = await getUserOrganization(userId);
    if (!orgId) {
      return c.json({ error: "User has no organization" }, 403);
    }

    const projectId = c.req.param("id");

    // Verify project belongs to user's organization
    const { data: existingProject, error: fetchError } = await supabase
      .from("projects")
      .select("id, organization_id")
      .eq("id", projectId)
      .eq("organization_id", orgId)
      .single();

    if (fetchError || !existingProject) {
      return c.json({ error: "Project not found or access denied" }, 404);
    }

    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId);

    if (error) {
      console.error("Error deleting project:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Projects DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /projects/:id/init
 * Initialize project structure based on template
 * Creates default timeline hierarchy
 */
app.post("/projects/:id/init", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectId = c.req.param("id");
    const body = await c.req.json();
    const { template_id, structure, predefined_nodes } = body;

    // This would typically call scriptony-timeline's /initialize-project endpoint
    // For now, we just return success and let the timeline function handle it
    
    return c.json({ 
      success: true,
      message: "Project initialization delegated to scriptony-timeline",
      project_id: projectId,
      template_id,
    }, 201);
  } catch (error: any) {
    console.error("Project init error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /projects/:id/stats
 * Get project statistics
 */
app.get("/projects/:id/stats", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectId = c.req.param("id");

    // Get counts from timeline_nodes if it exists, otherwise from old tables
    const { data: nodes, error: nodesError } = await supabase
      .from("timeline_nodes")
      .select("level")
      .eq("project_id", projectId);

    let stats;
    
    if (!nodesError && nodes) {
      // New timeline_nodes table
      stats = {
        level_1: nodes.filter(n => n.level === 1).length,
        level_2: nodes.filter(n => n.level === 2).length,
        level_3: nodes.filter(n => n.level === 3).length,
        level_4: nodes.filter(n => n.level === 4).length,
      };
    } else {
      // Fallback to old tables
      const [
        { count: acts },
        { count: sequences },
        { count: scenes },
        { count: shots },
      ] = await Promise.all([
        supabase.from("acts").select("*", { count: "exact", head: true }).eq("project_id", projectId),
        supabase.from("sequences").select("*", { count: "exact", head: true }).eq("project_id", projectId),
        supabase.from("scenes").select("*", { count: "exact", head: true }).eq("project_id", projectId),
        supabase.from("shots").select("*", { count: "exact", head: true }).eq("project_id", projectId),
      ]);

      stats = {
        acts: acts || 0,
        sequences: sequences || 0,
        scenes: scenes || 0,
        shots: shots || 0,
      };
    }

    // Get worlds count
    const { count: worlds } = await supabase
      .from("worlds")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);

    // Get characters count
    const { count: characters } = await supabase
      .from("characters")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId);

    return c.json({ 
      stats: {
        ...stats,
        worlds: worlds || 0,
        characters: characters || 0,
      }
    });
  } catch (error: any) {
    console.error("Project stats error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// BOOK METRICS - Calculate Word Count
// =============================================================================

/**
 * POST /projects/:id/calculate-words
 * Calculate total word count for book projects by counting words in all section descriptions
 */
app.post("/projects/:id/calculate-words", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectId = c.req.param("id");

    // Verify project exists and is a book project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("type, organization_id")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return c.json({ error: "Project not found" }, 404);
    }

    if (project.type !== "book") {
      return c.json({ error: "Only book projects support word counting" }, 400);
    }

    // Verify user has access to organization
    const userOrgId = await getUserOrganization(userId);
    if (!userOrgId || userOrgId !== project.organization_id) {
      return c.json({ error: "Unauthorized - not member of organization" }, 403);
    }

    let totalWords = 0;

    // Fetch all sections (level 3 = Abschnitt) for this book project
    const { data: sections, error: sectionsError } = await supabase
      .from("timeline_nodes")
      .select("metadata")
      .eq("project_id", projectId)
      .eq("level", 3); // Level 3 = Abschnitt (Section)

    if (sectionsError) {
      console.error("Error fetching sections:", sectionsError);
      return c.json({ error: sectionsError.message }, 500);
    }

    // Count words in each section's content (stored in metadata.content)
    if (sections && sections.length > 0) {
      for (const section of sections) {
        if (section.metadata?.content) {
          const content = section.metadata.content;
          
          // Extract text from TipTap JSON format
          let textContent = '';
          
          if (content.type === 'doc' && content.content) {
            for (const node of content.content) {
              if (node.content) {
                for (const textNode of node.content) {
                  if (textNode.text) {
                    textContent += textNode.text + ' ';
                  }
                }
              }
            }
          }
          
          // Count words (split by whitespace, filter empty strings)
          if (textContent.trim()) {
            const words = textContent.trim().split(/\s+/).filter(w => w.length > 0);
            totalWords += words.length;
          }
        }
      }
    }

    // Update project with calculated word count
    const { error: updateError } = await supabase
      .from("projects")
      .update({ 
        current_words: totalWords,
        updated_at: new Date().toISOString()
      })
      .eq("id", projectId);

    if (updateError) {
      console.error("Error updating word count:", updateError);
      return c.json({ error: updateError.message }, 500);
    }

    console.log(`📊 [BOOK METRICS] Calculated ${totalWords} words for project ${projectId} from ${sections?.length || 0} sections`);
    
    return c.json({ 
      success: true, 
      current_words: totalWords,
      sections_count: sections?.length || 0,
      message: `Calculated ${totalWords} words across ${sections?.length || 0} sections`
    });
  } catch (error: any) {
    console.error("Calculate words error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// IMAGE UPLOAD
// =============================================================================

/**
 * POST /projects/:id/upload-image
 * Upload project cover image to storage
 */
app.post("/projects/:id/upload-image", async (c) => {
  try {
    console.log(`[Projects] Image upload starting`);
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectId = c.req.param("id");
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
    const bucketName = "make-3b52693b-project-images";
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      await supabase.storage.createBucket(bucketName, { 
        public: false, 
        fileSizeLimit: 10485760 // 10MB
      });
      console.log(`[Projects] Created image bucket`);
    }

    // Upload file
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${projectId}-cover-${Date.now()}.${fileExt}`;
    const filePath = `covers/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { 
        contentType: file.type || 'image/jpeg',
        upsert: true 
      });

    if (uploadError) {
      console.error("[Projects] Upload error:", uploadError);
      return c.json({ error: uploadError.message }, 500);
    }

    // Get signed URL (1 year)
    const { data: urlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 31536000);

    if (!urlData) {
      return c.json({ error: "Failed to get signed URL" }, 500);
    }

    // Update project with image URL
    const { error: dbError } = await supabase
      .from("projects")
      .update({ 
        cover_image_url: urlData.signedUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", projectId);

    if (dbError) {
      console.error("[Projects] DB update error:", dbError);
      return c.json({ error: dbError.message }, 500);
    }

    console.log(`[Projects] Image uploaded successfully: ${fileName}`);
    return c.json({ imageUrl: urlData.signedUrl });
  } catch (error: any) {
    console.error("[Projects] Image upload error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// START SERVER
// =============================================================================

console.log("🎯 Scriptony Projects Function starting...");
Deno.serve(app.fetch);