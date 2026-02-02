/**
 * 📊 SCRIPTONY STATS - Edge Function
 * 
 * ✅ ARCHITECTURE FIX: 2025-11-05
 * 🎯 CRITICAL: Shots are in 'shots' table, NOT timeline_nodes!
 * 
 * SCHEMA:
 * - timeline_nodes: Acts (level 1), Sequences (level 2), Scenes (level 3)
 * - shots: Separate table with scene_id → timeline_nodes(id)
 * - shots has columns: duration, camera_angle, framing, lens, etc.
 * 
 * PERFORMANCE:
 * - ⚡ Aggressive caching planned (90% faster target)
 * - 🚀 Batch queries for better performance
 * - 📊 Optimized COUNT queries with proper indexes
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

// =============================================================================
// SETUP
// =============================================================================

const app = new Hono().basePath("/scriptony-stats");

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
// HEALTH CHECK
// =============================================================================

app.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    function: "scriptony-stats",
    version: "3.0.0",
    fix: "Shots from shots table, not timeline_nodes!",
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// OVERVIEW STATS
// =============================================================================

/**
 * GET /stats/project/:id/overview
 * Basic project statistics overview
 * ⚡ FIXED: Shots from 'shots' table!
 */
app.get("/stats/project/:id/overview", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectId = c.req.param("id");
    console.log(`[Stats] Fetching overview for project ${projectId}`);

    // ⚡ PARALLEL QUERIES for speed!
    const [nodesResult, shotsResult, charactersResult, worldsResult, projectResult] = await Promise.all([
      // Timeline nodes (Acts, Sequences, Scenes)
      supabase
        .from("timeline_nodes")
        .select("level")
        .eq("project_id", projectId),
      
      // Shots (from shots table!)
      supabase
        .from("shots")
        .select("duration, shotlength_minutes, shotlength_seconds")
        .eq("project_id", projectId),
      
      // Characters
      supabase
        .from("characters")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
      
      // Worlds
      supabase
        .from("worlds")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
      
      // Project metadata
      supabase
        .from("projects")
        .select("type, genre, created_at, updated_at")
        .eq("id", projectId)
        .single(),
    ]);

    if (nodesResult.error) {
      console.error("[Stats] Error fetching nodes:", nodesResult.error);
      return c.json({ error: nodesResult.error.message }, 500);
    }

    // Count nodes per level
    const level_counts = { 1: 0, 2: 0, 3: 0 };
    (nodesResult.data || []).forEach(node => {
      if (node.level >= 1 && node.level <= 3) {
        level_counts[node.level as 1 | 2 | 3]++;
      }
    });

    // Calculate total duration from shots
    let totalDuration = 0;
    (shotsResult.data || []).forEach(shot => {
      // Prioritize duration, fallback to shotlength calculation
      if (shot.duration) {
        totalDuration += shot.duration;
      } else if (shot.shotlength_minutes || shot.shotlength_seconds) {
        totalDuration += (shot.shotlength_minutes || 0) * 60 + (shot.shotlength_seconds || 0);
      }
    });

    return c.json({
      timeline: {
        acts: level_counts[1] || 0,
        sequences: level_counts[2] || 0,
        scenes: level_counts[3] || 0,
        shots: shotsResult.data?.length || 0,  // ✅ FIXED: From shots table!
        total_duration: totalDuration,
      },
      content: {
        characters: charactersResult.count || 0,
        worlds: worldsResult.count || 0,
      },
      metadata: {
        type: projectResult.data?.type || "film",
        genre: projectResult.data?.genre || null,
        created_at: projectResult.data?.created_at || null,
        updated_at: projectResult.data?.updated_at || null,
      },
    });
  } catch (error: any) {
    console.error("[Stats] Overview error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// SHOT ANALYTICS
// =============================================================================

/**
 * GET /stats/project/:id/shots
 * Shot Analytics: Durations, Camera Angles, Framings, Lenses, Movements
 * ⚡ FIXED: Shots from 'shots' table!
 */
app.get("/stats/project/:id/shots", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectId = c.req.param("id");
    console.log(`[Stats] Fetching shot analytics for project ${projectId}`);

    // ✅ Get shots from shots table!
    const { data: shots, error: shotsError } = await supabase
      .from("shots")
      .select("duration, shotlength_minutes, shotlength_seconds, camera_angle, framing, lens, camera_movement")
      .eq("project_id", projectId);

    if (shotsError) {
      console.error("[Stats] Error fetching shots:", shotsError);
      return c.json({ error: shotsError.message }, 500);
    }

    if (!shots || shots.length === 0) {
      return c.json({
        total_shots: 0,
        duration_stats: { average: 0, min: 0, max: 0, total: 0 },
        camera_angles: {},
        framings: {},
        lenses: {},
        movements: {},
      });
    }

    // Calculate duration stats
    const durations = shots
      .map(s => {
        if (s.duration) return s.duration;
        if (s.shotlength_minutes || s.shotlength_seconds) {
          return (s.shotlength_minutes || 0) * 60 + (s.shotlength_seconds || 0);
        }
        return 0;
      })
      .filter(d => d > 0);

    const duration_stats = durations.length > 0 ? {
      average: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      min: Math.min(...durations),
      max: Math.max(...durations),
      total: durations.reduce((a, b) => a + b, 0),
    } : { average: 0, min: 0, max: 0, total: 0 };

    // Count camera angles
    const camera_angles: Record<string, number> = {};
    shots.forEach(shot => {
      const angle = shot.camera_angle || "Not Set";
      camera_angles[angle] = (camera_angles[angle] || 0) + 1;
    });

    // Count framings
    const framings: Record<string, number> = {};
    shots.forEach(shot => {
      const framing = shot.framing || "Not Set";
      framings[framing] = (framings[framing] || 0) + 1;
    });

    // Count lenses
    const lenses: Record<string, number> = {};
    shots.forEach(shot => {
      const lens = shot.lens || "Not Set";
      lenses[lens] = (lenses[lens] || 0) + 1;
    });

    // Count movements
    const movements: Record<string, number> = {};
    shots.forEach(shot => {
      const movement = shot.camera_movement || "Static";
      movements[movement] = (movements[movement] || 0) + 1;
    });

    return c.json({
      total_shots: shots.length,
      duration_stats,
      camera_angles,
      framings,
      lenses,
      movements,
    });
  } catch (error: any) {
    console.error("[Stats] Shots error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// CHARACTER ANALYTICS
// =============================================================================

/**
 * GET /stats/project/:id/characters
 * Character Analytics: Appearances via shot_characters
 */
app.get("/stats/project/:id/characters", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectId = c.req.param("id");
    console.log(`[Stats] Fetching character analytics for project ${projectId}`);

    // Get all characters for this project
    const { data: characters, error: charsError } = await supabase
      .from("characters")
      .select("id, name")
      .eq("project_id", projectId);

    if (charsError) {
      console.error("[Stats] Error fetching characters:", charsError);
      return c.json({ error: charsError.message }, 500);
    }

    // Get shot_characters counts
    const appearances = await Promise.all(
      (characters || []).map(async (char) => {
        const { count } = await supabase
          .from("shot_characters")
          .select("id", { count: "exact", head: true })
          .eq("character_id", char.id);

        return {
          character_id: char.id,
          name: char.name,
          shot_count: count || 0,
        };
      })
    );

    // Find most/least featured
    const sorted = [...appearances].sort((a, b) => b.shot_count - a.shot_count);
    const most_featured = sorted[0]?.shot_count > 0 ? sorted[0] : null;
    const least_featured = sorted[sorted.length - 1]?.shot_count > 0 ? sorted[sorted.length - 1] : null;

    return c.json({
      total_characters: characters?.length || 0,
      appearances,
      most_featured,
      least_featured,
    });
  } catch (error: any) {
    console.error("[Stats] Characters error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// MEDIA ANALYTICS
// =============================================================================

/**
 * GET /stats/project/:id/media
 * Media Analytics: Audio Files, Images
 */
app.get("/stats/project/:id/media", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectId = c.req.param("id");
    console.log(`[Stats] Fetching media analytics for project ${projectId}`);

    const [audioResult, imagesResult] = await Promise.all([
      // Audio files
      supabase
        .from("shot_audio")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
      
      // Images (shots with image_url or storyboard_url)
      supabase
        .from("shots")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId)
        .or("image_url.not.is.null,storyboard_url.not.is.null"),
    ]);

    return c.json({
      audio_files: audioResult.count || 0,
      images: imagesResult.count || 0,
      total_storage: "N/A",
    });
  } catch (error: any) {
    console.error("[Stats] Media error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// ACT STATS
// =============================================================================

/**
 * GET /stats/act/:id
 * Stats for a specific Act
 * ⚡ FIXED: Shots from shots table!
 */
app.get("/stats/act/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const actId = c.req.param("id");
    console.log(`[Stats] Fetching stats for act ${actId}`);

    // Get act node
    const { data: act, error: actError } = await supabase
      .from("timeline_nodes")
      .select("*")
      .eq("id", actId)
      .eq("level", 1)
      .single();

    if (actError || !act) {
      return c.json({ error: "Act not found" }, 404);
    }

    // Get sequences
    const { data: sequences } = await supabase
      .from("timeline_nodes")
      .select("id")
      .eq("parent_id", actId)
      .eq("level", 2);

    const sequenceIds = (sequences || []).map(s => s.id);
    let scenesCount = 0;
    let sceneIds: string[] = [];

    if (sequenceIds.length > 0) {
      // Get scenes
      const { data: scenes } = await supabase
        .from("timeline_nodes")
        .select("id")
        .in("parent_id", sequenceIds)
        .eq("level", 3);

      scenesCount = scenes?.length || 0;
      sceneIds = (scenes || []).map(s => s.id);
    }

    let shotsCount = 0;
    let totalDuration = 0;

    if (sceneIds.length > 0) {
      // ✅ Get shots from shots table!
      const { data: shots } = await supabase
        .from("shots")
        .select("duration, shotlength_minutes, shotlength_seconds")
        .in("scene_id", sceneIds);

      shotsCount = shots?.length || 0;
      totalDuration = (shots || []).reduce((sum, shot) => {
        if (shot.duration) return sum + shot.duration;
        if (shot.shotlength_minutes || shot.shotlength_seconds) {
          return sum + (shot.shotlength_minutes || 0) * 60 + (shot.shotlength_seconds || 0);
        }
        return sum;
      }, 0);
    }

    return c.json({
      sequences: sequenceIds.length,
      scenes: scenesCount,
      shots: shotsCount,
      total_duration: totalDuration,
      created_at: act.created_at,
      updated_at: act.updated_at,
    });
  } catch (error: any) {
    console.error("[Stats] Act error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// SEQUENCE STATS
// =============================================================================

/**
 * GET /stats/sequence/:id
 * Stats for a specific Sequence
 * ⚡ FIXED: Shots from shots table!
 */
app.get("/stats/sequence/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const sequenceId = c.req.param("id");
    console.log(`[Stats] Fetching stats for sequence ${sequenceId}`);

    // Get sequence node
    const { data: sequence, error: seqError } = await supabase
      .from("timeline_nodes")
      .select("*")
      .eq("id", sequenceId)
      .eq("level", 2)
      .single();

    if (seqError || !sequence) {
      return c.json({ error: "Sequence not found" }, 404);
    }

    // Get scenes
    const { data: scenes } = await supabase
      .from("timeline_nodes")
      .select("id")
      .eq("parent_id", sequenceId)
      .eq("level", 3);

    const scenesCount = scenes?.length || 0;
    const sceneIds = (scenes || []).map(s => s.id);

    let shotsCount = 0;
    let totalDuration = 0;

    if (sceneIds.length > 0) {
      // ✅ Get shots from shots table!
      const { data: shots } = await supabase
        .from("shots")
        .select("duration, shotlength_minutes, shotlength_seconds")
        .in("scene_id", sceneIds);

      shotsCount = shots?.length || 0;
      totalDuration = (shots || []).reduce((sum, shot) => {
        if (shot.duration) return sum + shot.duration;
        if (shot.shotlength_minutes || shot.shotlength_seconds) {
          return sum + (shot.shotlength_minutes || 0) * 60 + (shot.shotlength_seconds || 0);
        }
        return sum;
      }, 0);
    }

    return c.json({
      scenes: scenesCount,
      shots: shotsCount,
      total_duration: totalDuration,
      average_duration: shotsCount > 0 ? Math.round(totalDuration / shotsCount) : 0,
      created_at: sequence.created_at,
      updated_at: sequence.updated_at,
    });
  } catch (error: any) {
    console.error("[Stats] Sequence error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// SCENE STATS
// =============================================================================

/**
 * GET /stats/scene/:id
 * Stats for a specific Scene
 * ⚡ FIXED: Shots from shots table!
 */
app.get("/stats/scene/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const sceneId = c.req.param("id");
    console.log(`[Stats] Fetching stats for scene ${sceneId}`);

    // Get scene node
    const { data: scene, error: sceneError } = await supabase
      .from("timeline_nodes")
      .select("*")
      .eq("id", sceneId)
      .eq("level", 3)
      .single();

    if (sceneError || !scene) {
      return c.json({ error: "Scene not found" }, 404);
    }

    // ✅ Get shots from shots table!
    const { data: shots } = await supabase
      .from("shots")
      .select("id, duration, shotlength_minutes, shotlength_seconds")
      .eq("scene_id", sceneId);

    const shotsCount = shots?.length || 0;
    const totalDuration = (shots || []).reduce((sum, shot) => {
      if (shot.duration) return sum + shot.duration;
      if (shot.shotlength_minutes || shot.shotlength_seconds) {
        return sum + (shot.shotlength_minutes || 0) * 60 + (shot.shotlength_seconds || 0);
      }
      return sum;
    }, 0);

    // Get shot IDs for character count
    const shotIds = (shots || []).map(s => s.id);
    let charactersCount = 0;

    if (shotIds.length > 0) {
      const { data: shotChars } = await supabase
        .from("shot_characters")
        .select("character_id")
        .in("shot_id", shotIds);

      // Count unique characters
      const uniqueChars = new Set((shotChars || []).map(sc => sc.character_id));
      charactersCount = uniqueChars.size;
    }

    return c.json({
      shots: shotsCount,
      total_duration: totalDuration,
      average_duration: shotsCount > 0 ? Math.round(totalDuration / shotsCount) : 0,
      characters: charactersCount,
      created_at: scene.created_at,
      updated_at: scene.updated_at,
    });
  } catch (error: any) {
    console.error("[Stats] Scene error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// SHOT STATS (for individual shot)
// =============================================================================

/**
 * GET /stats/shot/:id
 * Stats for a specific Shot
 */
app.get("/stats/shot/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const shotId = c.req.param("id");
    console.log(`[Stats] Fetching stats for shot ${shotId}`);

    // ✅ Get shot from shots table!
    const { data: shot, error: shotError } = await supabase
      .from("shots")
      .select("*")
      .eq("id", shotId)
      .single();

    if (shotError || !shot) {
      return c.json({ error: "Shot not found" }, 404);
    }

    // Get characters in this shot
    const { data: shotChars } = await supabase
      .from("shot_characters")
      .select("character_id")
      .eq("shot_id", shotId);

    // Calculate duration
    let duration = 0;
    if (shot.duration) {
      duration = shot.duration;
    } else if (shot.shotlength_minutes || shot.shotlength_seconds) {
      duration = (shot.shotlength_minutes || 0) * 60 + (shot.shotlength_seconds || 0);
    }

    // Check for media
    const has_audio = shot.dialog !== null || shot.sound_notes !== null;
    const has_image = shot.image_url !== null || shot.storyboard_url !== null;
    const has_notes = shot.notes !== null && shot.notes !== "";

    return c.json({
      characters: shotChars?.length || 0,
      duration,
      has_dialog: shot.dialog !== null,
      has_notes,
      has_audio,
      has_image,
      camera_angle: shot.camera_angle,
      framing: shot.framing,
      lens: shot.lens,
      camera_movement: shot.camera_movement,
      created_at: shot.created_at,
      updated_at: shot.updated_at,
    });
  } catch (error: any) {
    console.error("[Stats] Shot error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// DETAILED STATS (for TimelineNodeStatsDialog)
// =============================================================================

/**
 * GET /stats/act/:id/detailed
 * Detailed stats for Act (currently returns placeholder)
 */
app.get("/stats/act/:id/detailed", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const actId = c.req.param("id");
    
    // TODO: Implement detailed analytics
    // For now, return empty structure
    return c.json({
      timeline_analytics: [],
      character_analytics: [],
      media_analytics: { audio: 0, images: 0 },
    });
  } catch (error: any) {
    console.error("[Stats] Act detailed error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /stats/sequence/:id/detailed
 * Detailed stats for Sequence (currently returns placeholder)
 */
app.get("/stats/sequence/:id/detailed", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const sequenceId = c.req.param("id");
    
    // TODO: Implement detailed analytics
    return c.json({
      timeline_analytics: [],
      character_analytics: [],
      media_analytics: { audio: 0, images: 0 },
    });
  } catch (error: any) {
    console.error("[Stats] Sequence detailed error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /stats/scene/:id/detailed
 * Detailed stats for Scene (currently returns placeholder)
 */
app.get("/stats/scene/:id/detailed", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const sceneId = c.req.param("id");
    
    // TODO: Implement detailed analytics
    return c.json({
      timeline_analytics: [],
      character_analytics: [],
      media_analytics: { audio: 0, images: 0 },
    });
  } catch (error: any) {
    console.error("[Stats] Scene detailed error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// START SERVER
// =============================================================================

console.log("📊 Scriptony Stats starting (ARCHITECTURE FIX - Shots from shots table!)...");
Deno.serve(app.fetch);
