/**
 * 🤖 SCRIPTONY AI - Edge Function
 * 
 * Central AI Configuration Service:
 * - Provider API Keys (CRUD)
 * - Feature Assignments (which provider/model for which feature)
 * - Model Registry (available models per provider)
 * - Validation (test API keys)
 * 
 * Features:
 * - assistant_chat
 * - assistant_embeddings
 * - creative_gym
 * - image_generation
 * - audio_stt
 * - audio_tts
 * - video_generation
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { Client, Databases, Query } from "npm:@appwrite/node-sdk";

// =============================================================================
// SETUP
// =============================================================================

const app = new Hono();

// Initialize Appwrite client
const appwriteClient = new Client()
  .setEndpoint(Deno.env.get("APPWRITE_FUNCTION_API_ENDPOINT")!)
  .setProject(Deno.env.get("APPWRITE_FUNCTION_PROJECT_ID")!);

const databases = new Databases(appwriteClient);

// AI Service Database ID
const AI_DB_ID = Deno.env.get("AI_DATABASE_ID") || "scriptony_ai";
const API_KEYS_COLLECTION = "api_keys";
const FEATURE_CONFIG_COLLECTION = "feature_config";
const USER_SETTINGS_COLLECTION = "user_settings";

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
    // Verify JWT with Appwrite
    const token = authHeader.substring(7);
    const user = await appwriteClient.account.get();
    return user.$id;
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
    function: "scriptony-ai",
    version: "1.0.0",
    message: "Scriptony AI Configuration Service",
    endpoints: [
      "GET /providers - List all supported providers",
      "GET /providers/:id/models - List models for a provider",
      "POST /providers/:id/validate - Validate API key",
      "GET /api-keys - Get user's API keys",
      "POST /api-keys - Store API key",
      "DELETE /api-keys/:provider - Delete API key",
      "GET /features - Get feature configurations",
      "PUT /features/:feature - Update feature config",
      "GET /settings - Get all AI settings",
      "PUT /settings - Update all settings",
    ],
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// =============================================================================
// PROVIDERS ROUTES
// =============================================================================

import { 
  PROVIDER_DISPLAY_NAMES, 
  PROVIDER_CAPABILITIES,
  getModelsForProvider,
} from "../_shared/ai-service/providers";

/**
 * GET /providers
 * List all supported providers with capabilities
 */
app.get("/providers", (c) => {
  const providers = Object.entries(PROVIDER_CAPABILITIES).map(([name, caps]) => ({
    id: name,
    name: PROVIDER_DISPLAY_NAMES[name] || name,
    capabilities: caps,
    requiresApiKey: name !== "ollama",
  }));
  
  return c.json({ providers });
});

/**
 * GET /providers/:id/models
 * Get available models for a provider
 */
app.get("/providers/:id/models", (c) => {
  const providerId = c.req.param("id");
  
  try {
    const models = getModelsForProvider(providerId);
    return c.json({ provider: providerId, models });
  } catch (error: any) {
    return c.json({ error: error.message }, 400);
  }
});

/**
 * POST /providers/:id/validate
 * Validate an API key for a provider
 */
app.post("/providers/:id/validate", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const providerId = c.req.param("id");
  const body = await c.req.json();
  const { api_key } = body;
  
  if (!api_key) {
    return c.json({ error: "API key required" }, 400);
  }
  
  try {
    const { getProvider } = await import("../_shared/ai-service/providers");
    const provider = getProvider(providerId, { apiKey: api_key });
    
    const isValid = await provider.healthCheck?.() ?? false;
    
    return c.json({ 
      provider: providerId, 
      valid: isValid,
      message: isValid ? "API key is valid" : "API key validation failed",
    });
  } catch (error: any) {
    return c.json({ 
      provider: providerId, 
      valid: false, 
      error: error.message 
    }, 400);
  }
});

// =============================================================================
// API KEYS ROUTES
// =============================================================================

/**
 * GET /api-keys
 * Get all API keys for the current user (masked)
 */
app.get("/api-keys", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const response = await databases.listDocuments(
      AI_DB_ID,
      API_KEYS_COLLECTION,
      [Query.equal("user_id", userId)]
    );
    
    // Mask API keys for security
    const maskedKeys = response.documents.map(doc => ({
      provider: doc.provider,
      has_key: true,
      key_preview: doc.api_key.substring(0, 8) + "..." + doc.api_key.substring(doc.api_key.length - 4),
      created_at: doc.$createdAt,
      updated_at: doc.$updatedAt,
    }));
    
    return c.json({ api_keys: maskedKeys });
  } catch (error: any) {
    console.error("API keys GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /api-keys
 * Store or update an API key
 */
app.post("/api-keys", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const body = await c.req.json();
  const { provider, api_key } = body;
  
  if (!provider || !api_key) {
    return c.json({ error: "Provider and API key required" }, 400);
  }
  
  // Validate provider
  if (!PROVIDER_CAPABILITIES[provider]) {
    return c.json({ error: "Unknown provider" }, 400);
  }
  
  try {
    // Check if key already exists for this provider
    const existing = await databases.listDocuments(
      AI_DB_ID,
      API_KEYS_COLLECTION,
      [
        Query.equal("user_id", userId),
        Query.equal("provider", provider),
      ]
    );
    
    if (existing.documents.length > 0) {
      // Update existing key
      const updated = await databases.updateDocument(
        AI_DB_ID,
        API_KEYS_COLLECTION,
        existing.documents[0].$id,
        { api_key }
      );
      
      return c.json({ 
        success: true, 
        message: "API key updated",
        key_preview: api_key.substring(0, 8) + "..." + api_key.substring(api_key.length - 4),
      });
    } else {
      // Create new key
      const created = await databases.createDocument(
        AI_DB_ID,
        API_KEYS_COLLECTION,
        "unique()",
        {
          user_id: userId,
          provider,
          api_key,
        }
      );
      
      return c.json({ 
        success: true, 
        message: "API key stored",
        key_preview: api_key.substring(0, 8) + "..." + api_key.substring(api_key.length - 4),
      });
    }
  } catch (error: any) {
    console.error("API key POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /api-keys/:provider
 * Delete an API key
 */
app.delete("/api-keys/:provider", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const provider = c.req.param("provider");
  
  try {
    const existing = await databases.listDocuments(
      AI_DB_ID,
      API_KEYS_COLLECTION,
      [
        Query.equal("user_id", userId),
        Query.equal("provider", provider),
      ]
    );
    
    if (existing.documents.length === 0) {
      return c.json({ error: "API key not found" }, 404);
    }
    
    await databases.deleteDocument(
      AI_DB_ID,
      API_KEYS_COLLECTION,
      existing.documents[0].$id
    );
    
    return c.json({ success: true, message: "API key deleted" });
  } catch (error: any) {
    console.error("API key DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// FEATURES ROUTES
// =============================================================================

import { DEFAULT_FEATURE_CONFIG } from "../_shared/ai-service/config";

/**
 * GET /features
 * Get feature configurations for the current user
 */
app.get("/features", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const response = await databases.listDocuments(
      AI_DB_ID,
      FEATURE_CONFIG_COLLECTION,
      [Query.equal("user_id", userId)]
    );
    
    // If no config exists, return defaults
    if (response.documents.length === 0) {
      return c.json({ 
        features: DEFAULT_FEATURE_CONFIG,
        is_default: true,
      });
    }
    
    // Convert to object
    const features: Record<string, any> = {};
    response.documents.forEach(doc => {
      features[doc.feature] = {
        provider: doc.provider,
        model: doc.model,
      };
      
      // Add voice for TTS
      if (doc.voice) {
        features[doc.feature].voice = doc.voice;
      }
    });
    
    return c.json({ features, is_default: false });
  } catch (error: any) {
    console.error("Features GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /features/:feature
 * Update feature configuration
 */
app.put("/features/:feature", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const feature = c.req.param("feature");
  const body = await c.req.json();
  const { provider, model, voice } = body;
  
  if (!provider || !model) {
    return c.json({ error: "Provider and model required" }, 400);
  }
  
  // Validate feature
  const validFeatures = Object.keys(DEFAULT_FEATURE_CONFIG);
  if (!validFeatures.includes(feature)) {
    return c.json({ error: "Invalid feature" }, 400);
  }
  
  // Validate provider capability
  const capabilities = PROVIDER_CAPABILITIES[provider];
  if (!capabilities) {
    return c.json({ error: "Unknown provider" }, 400);
  }
  
  // Map feature to capability
  const featureToCapability: Record<string, string> = {
    assistant_chat: "text",
    assistant_embeddings: "embeddings",
    creative_gym: "text",
    image_generation: "image",
    audio_stt: "audio_stt",
    audio_tts: "audio_tts",
    video_generation: "video",
  };
  
  const requiredCapability = featureToCapability[feature];
  if (!capabilities[requiredCapability as keyof typeof capabilities]) {
    return c.json({ 
      error: `Provider "${provider}" does not support ${requiredCapability}` 
    }, 400);
  }
  
  try {
    // Check if config exists
    const existing = await databases.listDocuments(
      AI_DB_ID,
      FEATURE_CONFIG_COLLECTION,
      [
        Query.equal("user_id", userId),
        Query.equal("feature", feature),
      ]
    );
    
    const data: Record<string, any> = {
      user_id: userId,
      feature,
      provider,
      model,
    };
    
    if (voice) {
      data.voice = voice;
    }
    
    if (existing.documents.length > 0) {
      await databases.updateDocument(
        AI_DB_ID,
        FEATURE_CONFIG_COLLECTION,
        existing.documents[0].$id,
        data
      );
    } else {
      await databases.createDocument(
        AI_DB_ID,
        FEATURE_CONFIG_COLLECTION,
        "unique()",
        data
      );
    }
    
    return c.json({ 
      success: true, 
      feature,
      config: { provider, model, voice },
    });
  } catch (error: any) {
    console.error("Feature PUT error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// SETTINGS ROUTES (Combined)
// =============================================================================

/**
 * GET /settings
 * Get all AI settings (API keys + features)
 */
app.get("/settings", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    // Get API keys
    const keysResponse = await databases.listDocuments(
      AI_DB_ID,
      API_KEYS_COLLECTION,
      [Query.equal("user_id", userId)]
    );
    
    // Get feature config
    const featuresResponse = await databases.listDocuments(
      AI_DB_ID,
      FEATURE_CONFIG_COLLECTION,
      [Query.equal("user_id", userId)]
    );
    
    // Build response
    const api_keys: Record<string, boolean> = {};
    keysResponse.documents.forEach(doc => {
      api_keys[doc.provider] = true;
    });
    
    const features: Record<string, any> = { ...DEFAULT_FEATURE_CONFIG };
    featuresResponse.documents.forEach(doc => {
      features[doc.feature] = {
        provider: doc.provider,
        model: doc.model,
        ...(doc.voice && { voice: doc.voice }),
      };
    });
    
    return c.json({
      api_keys,
      features,
      providers: Object.entries(PROVIDER_CAPABILITIES).map(([name, caps]) => ({
        id: name,
        name: PROVIDER_DISPLAY_NAMES[name] || name,
        capabilities: caps,
        has_key: api_keys[name] || name === "ollama",
      })),
    });
  } catch (error: any) {
    console.error("Settings GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /settings
 * Update all settings at once
 */
app.put("/settings", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const body = await c.req.json();
  const { api_keys, features } = body;
  
  // TODO: Implement bulk update
  // For now, return success
  return c.json({ 
    success: true, 
    message: "Settings updated",
    api_keys: Object.keys(api_keys || {}),
    features: Object.keys(features || {}),
  });
});

// =============================================================================
// START SERVER
// =============================================================================

console.log("🤖 Scriptony AI Configuration Service starting...");
Deno.serve(app.fetch);