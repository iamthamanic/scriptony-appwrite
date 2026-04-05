/**
 * 🖼️ SCRIPTONY IMAGE - Edge Function
 * 
 * Image Generation Service for Scriptony:
 * - Generate images from text prompts
 * - Multiple providers: OpenAI DALL·E, Google Imagen, Stability AI
 * - Image variations and edits
 * - Style presets
 * - History and favorites
 * 
 * Uses centralized AI service from _shared/ai-service/
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { Client, Databases, Query } from "npm:@appwrite/node-sdk";

// =============================================================================
// SETUP
// =============================================================================

const app = new Hono().basePath("/scriptony-image");

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(Deno.env.get("APPWRITE_FUNCTION_API_ENDPOINT")!)
  .setProject(Deno.env.get("APPWRITE_FUNCTION_PROJECT_ID")!);

const databases = new Databases(client);

// Database IDs
const IMAGE_DB_ID = Deno.env.get("IMAGE_DATABASE_ID") || "scriptony_images";
const GENERATIONS_COLLECTION = "generations";
const PRESETS_COLLECTION = "presets";

// =============================================================================
// MIDDLEWARE
// =============================================================================

app.use("*", cors({
  origin: "*",
  allowHeaders: ["Content-Type", "Authorization", "X-Appwrite-Key"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  maxAge: 600,
}));

// Auth middleware
async function getUserIdFromAuth(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  
  try {
    const token = authHeader.substring(7);
    return token; // Placeholder
  } catch {
    return null;
  }
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get("/", (c) => {
  return c.json({ 
    status: "ok", 
    function: "scriptony-image",
    version: "1.0.0",
    message: "Scriptony Image Generation Service",
    endpoints: [
      "POST /generate - Generate image from prompt",
      "POST /generate/batch - Generate multiple images",
      "POST /edit - Edit existing image",
      "POST /variations - Create image variations",
      "GET /history - Get generation history",
      "GET /presets - Get style presets",
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
 * List all image-capable providers
 */
app.get("/providers", async (c) => {
  const { PROVIDER_CAPABILITIES, PROVIDER_DISPLAY_NAMES } = await import("../_shared/ai-service/providers");
  
  const imageProviders = Object.entries(PROVIDER_CAPABILITIES)
    .filter(([name, caps]) => caps.image)
    .map(([name, caps]) => ({
      id: name,
      name: PROVIDER_DISPLAY_NAMES[name] || name,
      capabilities: caps,
    }));
  
  return c.json({ providers: imageProviders });
});

/**
 * GET /models
 * List all image models
 */
app.get("/models", async (c) => {
  const { getModelsForFeature } = await import("../_shared/ai-service/config");
  
  const models = getModelsForFeature("image");
  
  return c.json({ models });
});

// =============================================================================
// GENERATION ROUTES
// =============================================================================

/**
 * POST /generate
 * Generate a single image from prompt
 */
app.post("/generate", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const body = await c.req.json();
  const { 
    prompt, 
    provider = "openai",
    model = "dall-e-3",
    size = "1024x1024",
    quality = "standard",
    style = "vivid",
    negative_prompt,
    style_preset,
    save_to_history = true,
  } = body;
  
  if (!prompt) {
    return c.json({ error: "Prompt required" }, 400);
  }
  
  try {
    const { generateImage } = await import("../_shared/ai-service");
    
    const result = await generateImage(userId, prompt, {
      provider,
      model,
      size: size as "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792",
      quality: quality as "standard" | "hd",
      style: style as "vivid" | "natural",
      negative_prompt,
      style_preset,
    });
    
    // Save to history if requested
    if (save_to_history) {
      try {
        await databases.createDocument(
          IMAGE_DB_ID,
          GENERATIONS_COLLECTION,
          "unique()",
          {
            user_id: userId,
            prompt,
            provider,
            model,
            image_url: result.url,
            revised_prompt: result.revised_prompt,
            created_at: new Date().toISOString(),
          }
        );
      } catch (e) {
        console.log("Could not save to history:", e);
      }
    }
    
    return c.json({
      success: true,
      image: {
        url: result.url,
        revised_prompt: result.revised_prompt,
        model: result.model,
        provider,
      },
    });
  } catch (error: any) {
    console.error("Image generation error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /generate/batch
 * Generate multiple images from prompts
 */
app.post("/generate/batch", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const body = await c.req.json();
  const { prompts, provider = "openai", model = "dall-e-3", ...options } = body;
  
  if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
    return c.json({ error: "Prompts array required" }, 400);
  }
  
  if (prompts.length > 10) {
    return c.json({ error: "Maximum 10 prompts per batch" }, 400);
  }
  
  try {
    const { generateImage } = await import("../_shared/ai-service");
    
    const results = await Promise.all(
      prompts.map(async (prompt: string) => {
        try {
          const result = await generateImage(userId, prompt, {
            provider,
            model,
            ...options,
          });
          return { prompt, success: true, ...result };
        } catch (error: any) {
          return { prompt, success: false, error: error.message };
        }
      })
    );
    
    const successful = results.filter((r: any) => r.success);
    const failed = results.filter((r: any) => !r.success);
    
    return c.json({
      success: true,
      total: prompts.length,
      generated: successful.length,
      failed: failed.length,
      images: successful,
      errors: failed.length > 0 ? failed : undefined,
    });
  } catch (error: any) {
    console.error("Batch generation error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /edit
 * Edit an existing image (DALL·E 2 only)
 */
app.post("/edit", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const body = await c.req.json();
  const { 
    image_url, 
    mask_url, 
    prompt,
    provider = "openai",
    model = "dall-e-2",
    size = "1024x1024",
  } = body;
  
  if (!image_url || !prompt) {
    return c.json({ error: "Image URL and prompt required" }, 400);
  }
  
  // Note: DALL·E 3 doesn't support edits, only DALL·E 2
  if (model === "dall-e-3") {
    return c.json({ 
      error: "DALL·E 3 does not support edits. Use DALL·E 2 or use variations instead." 
    }, 400);
  }
  
  try {
    const { generateImage } = await import("../_shared/ai-service");
    
    // TODO: Implement edit endpoint in AI service
    // For now, return not implemented
    return c.json({ 
      error: "Image editing not yet implemented. Use /variations instead." 
    }, 501);
  } catch (error: any) {
    console.error("Image edit error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /variations
 * Create variations of an image (DALL·E 2 only)
 */
app.post("/variations", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const body = await c.req.json();
  const { 
    image_url, 
    n = 1,
    size = "1024x1024",
    provider = "openai",
  } = body;
  
  if (!image_url) {
    return c.json({ error: "Image URL required" }, 400);
  }
  
  try {
    // TODO: Implement variations endpoint in AI service
    return c.json({ 
      error: "Image variations not yet implemented" 
    }, 501);
  } catch (error: any) {
    console.error("Image variations error:", error);
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
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");
  
  try {
    const response = await databases.listDocuments(
      IMAGE_DB_ID,
      GENERATIONS_COLLECTION,
      [
        Query.equal("user_id", userId),
        Query.orderDesc("created_at"),
        Query.limit(limit),
        Query.offset(offset),
      ]
    );
    
    return c.json({
      generations: response.documents,
      total: response.total,
    });
  } catch (error: any) {
    // Return empty history if DB doesn't exist
    return c.json({ generations: [], total: 0 });
  }
});

/**
 * DELETE /history/:id
 * Delete a generation from history
 */
app.delete("/history/:id", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const generationId = c.req.param("id");
  
  try {
    // Verify ownership
    const doc = await databases.getDocument(
      IMAGE_DB_ID,
      GENERATIONS_COLLECTION,
      generationId
    );
    
    if (doc.user_id !== userId) {
      return c.json({ error: "Forbidden" }, 403);
    }
    
    await databases.deleteDocument(
      IMAGE_DB_ID,
      GENERATIONS_COLLECTION,
      generationId
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
 * Get all style presets
 */
app.get("/presets", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  // Default presets
  const defaultPresets = [
    {
      id: "cinematic",
      name: "Cinematic",
      description: "Movie-style dramatic lighting",
      prompt_suffix: ", cinematic lighting, dramatic atmosphere, movie still",
      negative_prompt: "cartoon, anime, illustration",
      model_recommendations: ["dall-e-3", "imagen-3"],
    },
    {
      id: "anime",
      name: "Anime",
      description: "Japanese anime style",
      prompt_suffix: ", anime style, manga art, vibrant colors",
      negative_prompt: "realistic, photo, 3d render",
      model_recommendations: ["dall-e-3", "stable-diffusion"],
    },
    {
      id: "realistic",
      name: "Photorealistic",
      description: "Ultra-realistic photography",
      prompt_suffix: ", photorealistic, 8k, ultra hd, detailed",
      negative_prompt: "cartoon, illustration, painting",
      model_recommendations: ["dall-e-3", "imagen-3"],
    },
    {
      id: "oil-painting",
      name: "Oil Painting",
      description: "Classical oil painting style",
      prompt_suffix: ", oil painting, classical art, masterpiece",
      negative_prompt: "photo, realistic, digital",
      model_recommendations: ["dall-e-3", "stable-diffusion"],
    },
    {
      id: "watercolor",
      name: "Watercolor",
      description: "Soft watercolor painting",
      prompt_suffix: ", watercolor painting, soft colors, artistic",
      negative_prompt: "photo, realistic, sharp",
      model_recommendations: ["dall-e-3", "stable-diffusion"],
    },
    {
      id: "3d-render",
      name: "3D Render",
      description: "3D rendered scene",
      prompt_suffix: ", 3d render, octane render, unreal engine",
      negative_prompt: "photo, 2d, flat",
      model_recommendations: ["dall-e-3", "stable-diffusion"],
    },
    {
      id: "minimalist",
      name: "Minimalist",
      description: "Clean minimalist design",
      prompt_suffix: ", minimalist, clean, simple, modern",
      negative_prompt: "complex, detailed, cluttered",
      model_recommendations: ["dall-e-3"],
    },
    {
      id: "fantasy",
      name: "Fantasy",
      description: "Epic fantasy illustration",
      prompt_suffix: ", epic fantasy, magical, ethereal",
      negative_prompt: "modern, realistic, photo",
      model_recommendations: ["dall-e-3", "stable-diffusion"],
    },
  ];
  
  try {
    // Get user custom presets
    const customPresets = await databases.listDocuments(
      IMAGE_DB_ID,
      PRESETS_COLLECTION,
      [Query.equal("user_id", userId)]
    );
    
    return c.json({
      presets: [...defaultPresets, ...customPresets.documents],
      default_presets: defaultPresets,
      custom_presets: customPresets.documents,
    });
  } catch (error: any) {
    // Return just default presets if DB doesn't exist
    return c.json({ presets: defaultPresets });
  }
});

/**
 * POST /presets
 * Create custom style preset
 */
app.post("/presets", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const body = await c.req.json();
  const { name, description, prompt_suffix, negative_prompt, model_recommendations } = body;
  
  if (!name || !prompt_suffix) {
    return c.json({ error: "Name and prompt_suffix required" }, 400);
  }
  
  try {
    const preset = await databases.createDocument(
      IMAGE_DB_ID,
      PRESETS_COLLECTION,
      "unique()",
      {
        user_id: userId,
        name,
        description: description || "",
        prompt_suffix,
        negative_prompt: negative_prompt || "",
        model_recommendations: model_recommendations || [],
        created_at: new Date().toISOString(),
      }
    );
    
    return c.json({ success: true, preset });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// START SERVER
// =============================================================================

console.log("🖼️ Scriptony Image Generation Service starting...");
Deno.serve(app.fetch);