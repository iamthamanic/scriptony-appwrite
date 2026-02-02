/**
 * 🎵 SCRIPTONY AUDIO EDGE FUNCTION
 * 
 * 🕐 LAST UPDATED: 2025-10-28 11:20 UTC
 * 📝 STABLE VERSION - No recent changes
 * 
 * Handles all audio-related operations for shots
 * 
 * Routes:
 * - POST   /shots/:id/upload-audio     → Upload audio file
 * - PATCH  /shots/audio/:id            → Update audio metadata
 * - DELETE /shots/audio/:id            → Delete audio file
 * - GET    /shots/audio/:id/waveform   → Generate/retrieve waveform
 * - GET    /shots/:id/audio            → Get all audio for shot
 */

import { Hono } from "npm:hono@4.6.14";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";

const app = new Hono();

// ============================================
// SUPABASE CLIENT SETUP
// ============================================
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

// ============================================
// MIDDLEWARE
// ============================================

// Logging - MUST be before CORS
app.use("*", logger(console.log));

// CORS - MUST be "*" for proper preflight handling
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "X-Client-Info", "apikey"],
  exposeHeaders: ["Content-Length", "X-JSON"],
  credentials: false,
}));

// ============================================
// AUTH HELPER
// ============================================

async function getUserIdFromAuth(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader) {
    console.error("[Auth] No authorization header provided");
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.error("[Auth] Failed to get user:", error);
      return null;
    }

    return user.id;
  } catch (error) {
    console.error("[Auth] Error verifying token:", error);
    return null;
  }
}

// ============================================
// ROUTES
// ============================================

// 🚨 IMPORTANT: All routes MUST include /scriptony-audio/ prefix
// because Supabase adds the function name to the path!

/**
 * GET /scriptony-audio/shots/:id/audio
 * Get all audio files for a shot
 */
app.get("/scriptony-audio/shots/:id/audio", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const shotId = c.req.param("id");
    console.log(`[Audio API] Getting audio for shot:`, shotId);

    const { data: audioFiles, error } = await supabase
      .from("shot_audio")
      .select("*")
      .eq("shot_id", shotId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Audio API] Error fetching audio:", error);
      return c.json({ error: error.message }, 500);
    }

    // Generate signed URLs for all audio files
    const bucketName = "make-3b52693b-audio-files";
    const audioWithSignedUrls = await Promise.all(
      (audioFiles || []).map(async (audio) => {
        const urlMatch = audio.file_url?.match(/\/audio\/[^?]+/);
        let signedUrl = audio.file_url;

        if (urlMatch) {
          const filePath = urlMatch[0].substring(1); // Remove leading /
          const { data: urlData } = await supabase.storage
            .from(bucketName)
            .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

          if (urlData?.signedUrl) {
            signedUrl = urlData.signedUrl;
          }
        }

        return {
          id: audio.id,
          shotId: audio.shot_id,
          type: audio.type,
          fileName: audio.file_name,
          label: audio.label,
          fileUrl: signedUrl,
          fileSize: audio.file_size,
          startTime: audio.start_time,
          endTime: audio.end_time,
          fadeIn: audio.fade_in,
          fadeOut: audio.fade_out,
          waveformData: audio.waveform_data,
          duration: audio.audio_duration,
          createdAt: audio.created_at,
        };
      })
    );

    return c.json({ audio: audioWithSignedUrls });
  } catch (error: any) {
    console.error("[Audio API] Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /scriptony-audio/shots/:id/upload-audio
 * Upload audio file to storage and create database record
 */
app.post("/scriptony-audio/shots/:id/upload-audio", async (c) => {
  try {
    console.log(`[Audio Upload] Starting upload for shot`);
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      console.error(`[Audio Upload] Unauthorized - no userId`);
      return c.json({ error: "Unauthorized" }, 401);
    }

    const shotId = c.req.param("id");
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const type = formData.get("type") as string;
    const label = formData.get("label") as string | undefined;

    console.log(`[Audio Upload] Request params:`, { shotId, type, label, fileName: file?.name, fileSize: file?.size });

    if (!file || !type) {
      console.error(`[Audio Upload] Missing file or type:`, { hasFile: !!file, type });
      return c.json({ error: "File and type are required" }, 400);
    }

    const bucketName = "make-3b52693b-audio-files";
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      // Increased to 100MB for WAV files which are typically 30-50MB for 3 minutes
      await supabase.storage.createBucket(bucketName, { public: false, fileSizeLimit: 104857600 });
      console.log(`[Audio Upload] Created bucket with 100MB limit`);
    } else {
      // Update existing bucket to 100MB limit (WAV files support)
      try {
        await supabase.storage.updateBucket(bucketName, { public: false, fileSizeLimit: 104857600 });
        console.log(`[Audio Upload] Updated bucket to 100MB limit`);
      } catch (error) {
        console.error(`[Audio Upload] Failed to update bucket size:`, error);
      }
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${shotId}-${type}-${Date.now()}.${fileExt}`;
    const filePath = `audio/${fileName}`;

    // Determine content type for WAV files explicitly
    let contentType = file.type;
    if (!contentType && fileExt?.toLowerCase() === 'wav') {
      contentType = 'audio/wav';
    } else if (!contentType && fileExt?.toLowerCase() === 'mp3') {
      contentType = 'audio/mpeg';
    }

    console.log(`[Audio Upload] File: ${file.name}, Size: ${file.size} bytes, Type: ${contentType}, Extension: ${fileExt}`);

    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, { contentType: contentType || 'audio/mpeg', upsert: true });

    if (uploadError) {
      console.error("Audio upload error:", uploadError);
      return c.json({ error: uploadError.message }, 500);
    }

    const { data: urlData } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(filePath, 31536000);

    if (!urlData) {
      return c.json({ error: "Failed to get signed URL" }, 500);
    }

    // Save to database
    const audioId = crypto.randomUUID();
    const { error: dbError } = await supabase
      .from("shot_audio")
      .insert({
        id: audioId,
        shot_id: shotId,
        type,
        file_url: urlData.signedUrl,
        file_name: file.name,
        label: label || file.name,
        file_size: file.size,
      });

    if (dbError) {
      console.error("Database insert error:", dbError);
      return c.json({ error: dbError.message }, 500);
    }

    const audioData = {
      id: audioId,
      shotId,
      type,
      fileName: file.name,
      label: label || file.name,
      fileUrl: urlData.signedUrl,
      createdAt: new Date().toISOString(),
    };

    return c.json({ audio: audioData });
  } catch (error: any) {
    console.error("Audio upload error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PATCH /scriptony-audio/shots/audio/:id
 * Update audio metadata (label, trim, fade)
 */
app.patch("/scriptony-audio/shots/audio/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const audioId = c.req.param("id");
    const updates = await c.req.json();

    console.log(`[Audio Update] Updating audio ${audioId}:`, updates);

    // Build update object with snake_case fields
    const dbUpdates: Record<string, any> = {};
    if (updates.label !== undefined) dbUpdates.label = updates.label;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    if (updates.fadeIn !== undefined) dbUpdates.fade_in = updates.fadeIn;
    if (updates.fadeOut !== undefined) dbUpdates.fade_out = updates.fadeOut;
    if (updates.peaks !== undefined) dbUpdates.waveform_data = updates.peaks;
    if (updates.duration !== undefined) dbUpdates.audio_duration = updates.duration;
    
    // Set waveform generation timestamp if waveform data was provided
    if (updates.peaks !== undefined) {
      dbUpdates.waveform_generated_at = new Date().toISOString();
    }

    const { data: audioData, error: updateError } = await supabase
      .from("shot_audio")
      .update(dbUpdates)
      .eq("id", audioId)
      .select()
      .single();

    if (updateError) {
      console.error("Audio update error:", updateError);
      return c.json({ error: updateError.message }, 500);
    }

    // Get signed URL for the updated audio
    const bucketName = "make-3b52693b-audio-files";
    const urlMatch = audioData.file_url?.match(/\/audio\/[^?]+/);
    let signedUrl = audioData.file_url;

    if (urlMatch) {
      const filePath = urlMatch[0].substring(1);
      const { data: urlData } = await supabase.storage
        .from(bucketName)
        .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

      if (urlData?.signedUrl) {
        signedUrl = urlData.signedUrl;
      }
    }

    const audio = {
      id: audioData.id,
      shotId: audioData.shot_id,
      fileName: audioData.file_name,
      label: audioData.label,
      fileUrl: signedUrl,
      type: audioData.type,
      startTime: audioData.start_time,
      endTime: audioData.end_time,
      fadeIn: audioData.fade_in,
      fadeOut: audioData.fade_out,
      waveformData: audioData.waveform_data,
      duration: audioData.audio_duration,
      createdAt: audioData.created_at,
    };

    return c.json({ audio });
  } catch (error: any) {
    console.error("Audio update error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /scriptony-audio/shots/audio/:id/waveform
 * Generate or retrieve cached waveform data
 */
app.get("/scriptony-audio/shots/audio/:id/waveform", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const audioId = c.req.param("id");
    console.log(`[Waveform] Generating waveform for audio:`, audioId);

    // Check if waveform is already cached
    const { data: audioData, error: fetchError } = await supabase
      .from("shot_audio")
      .select("waveform_data, waveform_generated_at, audio_duration, file_url")
      .eq("id", audioId)
      .single();

    if (fetchError || !audioData) {
      console.error("[Waveform] Audio not found:", fetchError);
      return c.json({ error: "Audio not found" }, 404);
    }

    // Return cached waveform if available and recent (less than 24h old)
    if (audioData.waveform_data && audioData.waveform_generated_at) {
      const cacheAge = Date.now() - new Date(audioData.waveform_generated_at).getTime();
      const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours

      if (cacheAge < maxCacheAge) {
        console.log(`[Waveform] Returning cached waveform (age: ${Math.round(cacheAge / 1000 / 60)}min)`);
        return c.json({
          peaks: audioData.waveform_data,
          duration: audioData.audio_duration,
          cached: true,
        });
      }
    }

    // For now, return empty and let client generate via Web Worker
    // TODO: Implement server-side waveform generation with ffmpeg
    console.log(`[Waveform] No cache available, client will generate via Web Worker`);
    
    return c.json({
      peaks: [],
      duration: 0,
      cached: false,
      message: "Use client-side Web Worker for waveform generation",
    });

  } catch (error: any) {
    console.error("[Waveform] Generation error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /scriptony-audio/shots/audio/:id
 * Delete audio file from storage and database
 */
app.delete("/scriptony-audio/shots/audio/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const audioId = c.req.param("id");

    // Get audio info to find storage path
    const { data: audioData, error: fetchError } = await supabase
      .from("shot_audio")
      .select("file_url, shot_id, type")
      .eq("id", audioId)
      .single();

    if (fetchError || !audioData) {
      console.error("Audio not found:", fetchError);
      return c.json({ error: "Audio not found" }, 404);
    }

    // Extract file path from URL
    const bucketName = "make-3b52693b-audio-files";
    const urlMatch = audioData.file_url?.match(/\/audio\/[^?]+/);
    
    if (urlMatch) {
      const filePath = urlMatch[0].substring(1); // Remove leading /
      
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from(bucketName)
        .remove([filePath]);

      if (storageError) {
        console.error("Storage deletion error:", storageError);
        // Continue anyway - delete from DB even if storage fails
      }
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("shot_audio")
      .delete()
      .eq("id", audioId);

    if (deleteError) {
      console.error("Database deletion error:", deleteError);
      return c.json({ error: deleteError.message }, 500);
    }

    console.log(`[Audio Delete] Deleted audio ${audioId} from shot ${audioData.shot_id}`);

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Audio deletion error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /scriptony-audio/shots/audio/batch?shot_ids=id1,id2,id3
 * Get audio for multiple shots in one request (BATCH)
 * Returns: { shotId: [audio1, audio2, ...], ... }
 */
app.get("/scriptony-audio/shots/audio/batch", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const shotIdsParam = c.req.query("shot_ids");
    if (!shotIdsParam) {
      return c.json({ error: "shot_ids query parameter is required" }, 400);
    }

    const shotIds = shotIdsParam.split(",").map(id => id.trim()).filter(Boolean);
    console.log(`[Audio Batch] Getting audio for ${shotIds.length} shots`);

    if (shotIds.length === 0) {
      return c.json({ audio: {} });
    }

    // Fetch all audio for these shots in ONE query
    const { data: audioFiles, error } = await supabase
      .from("shot_audio")
      .select("*")
      .in("shot_id", shotIds)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[Audio Batch] Error fetching audio:", error);
      return c.json({ error: error.message }, 500);
    }

    // Generate signed URLs and group by shot_id
    const bucketName = "make-3b52693b-audio-files";
    const audioByShot: Record<string, any[]> = {};

    // Initialize empty arrays for all shot IDs
    shotIds.forEach(id => {
      audioByShot[id] = [];
    });

    // Process audio files and group by shot
    for (const audio of audioFiles || []) {
      const urlMatch = audio.file_url?.match(/\/audio\/[^?]+/);
      let signedUrl = audio.file_url;

      if (urlMatch) {
        const filePath = urlMatch[0].substring(1); // Remove leading /
        const { data: urlData } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days

        if (urlData?.signedUrl) {
          signedUrl = urlData.signedUrl;
        }
      }

      const transformedAudio = {
        id: audio.id,
        shotId: audio.shot_id,
        type: audio.type,
        fileName: audio.file_name,
        label: audio.label,
        fileUrl: signedUrl,
        fileSize: audio.file_size,
        startTime: audio.start_time,
        endTime: audio.end_time,
        fadeIn: audio.fade_in,
        fadeOut: audio.fade_out,
        waveformData: audio.waveform_data,
        duration: audio.audio_duration,
        createdAt: audio.created_at,
      };

      if (!audioByShot[audio.shot_id]) {
        audioByShot[audio.shot_id] = [];
      }
      audioByShot[audio.shot_id].push(transformedAudio);
    }

    console.log(`[Audio Batch] Returning audio for ${Object.keys(audioByShot).length} shots`);

    return c.json({ audio: audioByShot });
  } catch (error: any) {
    console.error("[Audio Batch] Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get("/scriptony-audio/health", (c) => {
  return c.json({ 
    status: "ok", 
    service: "scriptony-audio",
    timestamp: new Date().toISOString() 
  });
});

// ============================================
// START SERVER
// ============================================

Deno.serve(app.fetch);
