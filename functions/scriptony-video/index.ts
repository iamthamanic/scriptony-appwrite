/**
 * 🎬 SCRIPTONY VIDEO - Edge Function
 *
 * Video Generation Service for Scriptony:
 * - Generate videos from text prompts
 * - Multiple providers: Runway, Pika, Stable Video Diffusion
 * - Video-to-video editing
 * - Status tracking for async generation
 * - History and favorites
 *
 * Uses centralized AI service from _shared/ai-service/
 */

import "../_shared/fetch-polyfill";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { Client, Databases, Query } from "node-appwrite";
import { type AuthSource, requireAuthenticatedUser } from "../_shared/auth";
import { createHonoAppwriteHandler } from "../_shared/hono-appwrite-handler";
import process from "node:process";

// =============================================================================
// SETUP
// =============================================================================

const app = new Hono();

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(
    process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
      process.env.APPWRITE_ENDPOINT ||
      "",
  )
  .setProject(
    process.env.APPWRITE_FUNCTION_PROJECT_ID ||
      process.env.APPWRITE_PROJECT_ID ||
      "",
  );

const databases = new Databases(client);

// Database IDs
const VIDEO_DB_ID = process.env.VIDEO_DATABASE_ID || "scriptony_videos";
const GENERATIONS_COLLECTION = "video_generations";
const PRESETS_COLLECTION = "video_presets";

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Appwrite-Key"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Auth middleware
async function getUserIdFromAuth(
  authSource: AuthSource,
): Promise<string | null> {
  const user = await requireAuthenticatedUser(authSource);
  return user?.id || null;
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get("/", (c) => {
  return c.json({
    status: "ok",
    function: "scriptony-video",
    version: "1.0.0",
    message: "Scriptony Video Generation Service",
    endpoints: [
      "POST /generate - Generate video from prompt",
      "POST /generate/short - Generate short video (5-10s)",
      "POST /generate/landscape - Generate landscape video",
      "POST /generate/from-image - Generate from image",
      "GET /status/:id - Check generation status",
      "GET /history - Get generation history",
      "GET /presets - Get video presets",
      "POST /presets - Create custom preset",
      "GET /providers - List available providers",
      "GET /models - List available models",
    ],
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// =============================================================================
// PROVIDERS ROUTES
// =============================================================================

/**
 * GET /providers
 * List all video-capable providers
 */
app.get("/providers", async (c) => {
  const { PROVIDER_CAPABILITIES, PROVIDER_DISPLAY_NAMES } = await import(
    "../_shared/ai-service/providers"
  );

  const videoProviders = Object.entries(PROVIDER_CAPABILITIES)
    .filter(([_name, caps]) => caps.video)
    .map(([name, caps]) => ({
      id: name,
      name: PROVIDER_DISPLAY_NAMES[name] || name,
      capabilities: caps,
    }));

  return c.json({ providers: videoProviders });
});

/**
 * GET /models
 * List all video models
 */
app.get("/models", async (c) => {
  const { getModelsForFeature } = await import("../_shared/ai-service/config");

  const models = getModelsForFeature("video");

  return c.json({ models });
});

// =============================================================================
// GENERATION ROUTES
// =============================================================================

/**
 * POST /generate
 * Generate a video from prompt
 */
app.post("/generate", async (c) => {
  const userId = await getUserIdFromAuth(c.req);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const {
    prompt,
    // NOTE: provider and model are ignored by generateVideo() — resolved from feature config
    provider: _provider = "openrouter",
    model: _model = "runway-gen3",
    duration = 5,
    aspect_ratio = "16:9",
    fps = 24,
    resolution = "1080p",
    style_preset,
    negative_prompt,
    save_to_history = true,
    webhook_url: _webhook_url,
  } = body;

  if (!prompt) {
    return c.json({ error: "Prompt required" }, 400);
  }

  try {
    const { generateVideo } = await import("../_shared/ai-service");

    const result = await generateVideo(userId, prompt, {
      // NOTE: provider/model resolved from feature config, not request body
      duration,
      aspect_ratio: aspect_ratio as "16:9" | "9:16" | "1:1",
      fps,
      resolution: resolution as "720p" | "1080p" | "4k",
      style_preset,
      negative_prompt,
    });

    // Save to history if requested
    if (save_to_history) {
      try {
        await databases.createDocument(
          VIDEO_DB_ID,
          GENERATIONS_COLLECTION,
          "unique()",
          {
            user_id: userId,
            prompt,
            // Provider/model come from feature config, not request body
            video_id: result.id,
            status: result.status,
            created_at: new Date().toISOString(),
          },
        );
      } catch (e) {
        console.log("Could not save to history:", e);
      }
    }

    return c.json({
      success: true,
      video: {
        id: result.id,
        status: result.status,
        estimated_time: result.estimated_time,
      },
    });
  } catch (error: any) {
    console.error("Video generation error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /generate/short
 * Generate a short video (5-10 seconds)
 */
app.post("/generate/short", async (c) => {
  const userId = await getUserIdFromAuth(c.req);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const {
    prompt,
    provider: _provider2 = "openrouter",
    model: _model2 = "pika-v1",
    aspect_ratio = "9:16",
  } = body;

  if (!prompt) {
    return c.json({ error: "Prompt required" }, 400);
  }

  try {
    const { generateShortVideo } = await import("../_shared/ai-service");

    const result = await generateShortVideo(userId, prompt, {
      // NOTE: provider/model resolved from feature config
      aspect_ratio: aspect_ratio as "16:9" | "9:16" | "1:1",
    });

    return c.json({
      success: true,
      video: result,
    });
  } catch (error: any) {
    console.error("Short video generation error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /generate/landscape
 * Generate a landscape video (16:9)
 */
app.post("/generate/landscape", async (c) => {
  const userId = await getUserIdFromAuth(c.req);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const {
    prompt,
    provider: _provider3 = "openrouter",
    model: _model3 = "runway-gen3",
    duration = 10,
  } = body;

  if (!prompt) {
    return c.json({ error: "Prompt required" }, 400);
  }

  try {
    const { generateVideoLandscape } = await import("../_shared/ai-service");

    const result = await generateVideoLandscape(userId, prompt, {
      // NOTE: provider/model resolved from feature config
      duration,
    });

    return c.json({
      success: true,
      video: result,
    });
  } catch (error: any) {
    console.error("Landscape video generation error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /generate/from-image
 * Generate video from an image
 */
app.post("/generate/from-image", async (c) => {
  const userId = await getUserIdFromAuth(c.req);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const {
    image_url,
    prompt: _prompt,
    // NOTE: provider/model resolved from feature config
    provider: _provider4 = "runway",
    model: _model4 = "runway-gen3",
    duration: _duration = 5,
  } = body;

  if (!image_url) {
    return c.json({ error: "Image URL required" }, 400);
  }

  try {
    // TODO: Implement image-to-video in AI service
    return c.json(
      {
        error: "Image-to-video not yet implemented",
      },
      501,
    );
  } catch (error: any) {
    console.error("Image-to-video generation error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// STATUS ROUTES
// =============================================================================

/**
 * GET /status/:id
 * Check video generation status
 */
app.get("/status/:id", async (c) => {
  const userId = await getUserIdFromAuth(c.req);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const videoId = c.req.param("id");

  try {
    const { getVideoStatus } = await import("../_shared/ai-service");

    const result = await getVideoStatus(userId, videoId);

    return c.json({
      success: true,
      video: result,
    });
  } catch (error: any) {
    console.error("Video status error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /status/batch
 * Check status of multiple videos
 */
app.get("/status/batch", async (c) => {
  const userId = await getUserIdFromAuth(c.req);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const ids = c.req.query("ids")?.split(",") || [];

  if (ids.length === 0) {
    return c.json({ error: "Video IDs required" }, 400);
  }

  if (ids.length > 20) {
    return c.json({ error: "Maximum 20 videos per batch" }, 400);
  }

  try {
    const { getVideoStatus } = await import("../_shared/ai-service");

    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const status = await getVideoStatus(userId, id);
          return { id, ...status };
        } catch (error: any) {
          return { id, error: error.message };
        }
      }),
    );

    return c.json({
      success: true,
      videos: results,
    });
  } catch (error: any) {
    console.error("Batch status error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// HISTORY ROUTES
// =============================================================================

/**
 * GET /history
 * Get user's generation history
 */
app.get("/history", async (c) => {
  const userId = await getUserIdFromAuth(c.req);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");
  const status = c.req.query("status"); // pending, processing, completed, failed

  try {
    const queries: any[] = [
      Query.equal("user_id", userId),
      Query.orderDesc("created_at"),
      Query.limit(limit),
      Query.offset(offset),
    ];

    if (status) {
      queries.push(Query.equal("status", status));
    }

    const response = await databases.listDocuments(
      VIDEO_DB_ID,
      GENERATIONS_COLLECTION,
      queries,
    );

    return c.json({
      generations: response.documents,
      total: response.total,
    });
  } catch (_error: any) {
    // Return empty history if DB doesn't exist
    return c.json({ generations: [], total: 0 });
  }
});

/**
 * DELETE /history/:id
 * Delete a generation from history
 */
app.delete("/history/:id", async (c) => {
  const userId = await getUserIdFromAuth(c.req);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const generationId = c.req.param("id");

  try {
    // Verify ownership
    const doc = await databases.getDocument(
      VIDEO_DB_ID,
      GENERATIONS_COLLECTION,
      generationId,
    );

    if (doc.user_id !== userId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    await databases.deleteDocument(
      VIDEO_DB_ID,
      GENERATIONS_COLLECTION,
      generationId,
    );

    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// PRESETS ROUTES
// =============================================================================

/**
 * GET /presets
 * Get all video style presets
 */
app.get("/presets", async (c) => {
  // Default video presets
  const defaultPresets = [
    {
      id: "cinematic",
      name: "Cinematic",
      description: "Movie-quality cinematic video",
      prompt_suffix: ", cinematic, movie quality, dramatic lighting, film look",
      recommended_duration: [5, 10],
      recommended_aspect: ["16:9", "21:9"],
      model_recommendations: ["runway-gen3", "pika-v1"],
    },
    {
      id: "anime",
      name: "Anime",
      description: "Japanese anime style video",
      prompt_suffix: ", anime style, manga animation, vibrant colors",
      recommended_duration: [5, 10],
      recommended_aspect: ["16:9", "9:16"],
      model_recommendations: ["runway-gen3", "stable-video"],
    },
    {
      id: "realistic",
      name: "Realistic",
      description: "Photorealistic video",
      prompt_suffix: ", photorealistic, ultra realistic, 8k quality",
      recommended_duration: [5, 15],
      recommended_aspect: ["16:9"],
      model_recommendations: ["runway-gen3"],
    },
    {
      id: "documentary",
      name: "Documentary",
      description: "Documentary style footage",
      prompt_suffix: ", documentary style, natural lighting, authentic",
      recommended_duration: [10, 30],
      recommended_aspect: ["16:9"],
      model_recommendations: ["runway-gen3"],
    },
    {
      id: "social-media",
      name: "Social Media",
      description: "Short-form social media video",
      prompt_suffix: ", vertical video, social media, trending",
      recommended_duration: [5, 15],
      recommended_aspect: ["9:16"],
      model_recommendations: ["pika-v1"],
    },
    {
      id: "abstract",
      name: "Abstract",
      description: "Abstract artistic video",
      prompt_suffix: ", abstract art, artistic, experimental",
      recommended_duration: [5, 10],
      recommended_aspect: ["1:1", "16:9"],
      model_recommendations: ["runway-gen3", "stable-video"],
    },
    {
      id: "nature",
      name: "Nature",
      description: "Nature and landscape footage",
      prompt_suffix: ", nature footage, landscape, scenic, beautiful",
      recommended_duration: [10, 30],
      recommended_aspect: ["16:9"],
      model_recommendations: ["runway-gen3"],
    },
    {
      id: "urban",
      name: "Urban",
      description: "Urban city footage",
      prompt_suffix: ", urban city, street footage, modern architecture",
      recommended_duration: [5, 15],
      recommended_aspect: ["16:9", "9:16"],
      model_recommendations: ["runway-gen3"],
    },
  ];

  try {
    const userId = await getUserIdFromAuth(c.req);

    // Get user custom presets
    const customPresets = await databases.listDocuments(
      VIDEO_DB_ID,
      PRESETS_COLLECTION,
      [Query.equal("user_id", userId)],
    );

    return c.json({
      presets: [...defaultPresets, ...customPresets.documents],
      default_presets: defaultPresets,
      custom_presets: customPresets.documents,
    });
  } catch (_error: any) {
    // Return just default presets if DB doesn't exist or no auth
    return c.json({ presets: defaultPresets });
  }
});

/**
 * POST /presets
 * Create custom video preset
 */
app.post("/presets", async (c) => {
  const userId = await getUserIdFromAuth(c.req);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const {
    name,
    description,
    prompt_suffix,
    recommended_duration,
    recommended_aspect,
    model_recommendations,
  } = body;

  if (!name || !prompt_suffix) {
    return c.json({ error: "Name and prompt_suffix required" }, 400);
  }

  try {
    const preset = await databases.createDocument(
      VIDEO_DB_ID,
      PRESETS_COLLECTION,
      "unique()",
      {
        user_id: userId,
        name,
        description: description || "",
        prompt_suffix,
        recommended_duration: recommended_duration || [5, 10],
        recommended_aspect: recommended_aspect || ["16:9"],
        model_recommendations: model_recommendations || [],
        created_at: new Date().toISOString(),
      },
    );

    return c.json({ success: true, preset });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// START SERVER
// =============================================================================

console.log("🎬 Scriptony Video Generation Service starting...");
export default createHonoAppwriteHandler(app);
