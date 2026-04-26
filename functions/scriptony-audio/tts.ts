/**
 * 🔊 SCRIPTONY AUDIO TTS - Text-to-Speech Edge Function
 *
 * Speech Synthesis Service for Scriptony:
 * - Convert text to speech
 * - Multiple providers: OpenAI TTS, ElevenLabs, Google TTS
 * - Multiple voices and languages
 * - Audio format options (MP3, WAV, etc.)
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

export const app = new Hono();

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
const AUDIO_DB_ID = process.env.AUDIO_DATABASE_ID || "scriptony_audio";
const SYNTHESIS_COLLECTION = "synthesis";

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
    function: "scriptony-audio-tts",
    version: "1.0.0",
    message: "Scriptony Text-to-Speech Service",
    endpoints: [
      "POST /synthesize - Convert text to speech",
      "POST /synthesize/stream - Stream synthesis (for long texts)",
      "GET /voices - List available voices",
      "GET /history - Get synthesis history",
      "GET /providers - List TTS-capable providers",
      "GET /models - List available TTS models",
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
 * List all TTS-capable providers
 */
app.get("/providers", async (c) => {
  const { PROVIDER_CAPABILITIES, PROVIDER_DISPLAY_NAMES } = await import(
    "../_shared/ai-service/providers"
  );

  const ttsProviders = Object.entries(PROVIDER_CAPABILITIES)
    .filter(([_name, caps]) => caps.audio_tts)
    .map(([name, caps]) => ({
      id: name,
      name: PROVIDER_DISPLAY_NAMES[name] || name,
      capabilities: caps,
    }));

  return c.json({ providers: ttsProviders });
});

/**
 * GET /models
 * List all TTS models
 */
app.get("/models", async (c) => {
  const { getModelsForFeature } = await import("../_shared/ai-service/config");

  const models = getModelsForFeature("audio_tts");

  return c.json({ models });
});

// =============================================================================
// VOICES ROUTES
// =============================================================================

/**
 * GET /voices
 * List available voices for TTS
 */
app.get("/voices", async (c) => {
  const userId = await getUserIdFromAuth(c.req);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const provider = c.req.query("provider") || "openai"; // NOTE: ignored by synthesize() — resolved from feature config

  try {
    const { getVoices } = await import("../_shared/ai-service");

    const voices = await getVoices(userId, { provider });

    return c.json({ voices });
  } catch (_error: any) {
    // Return default voices if provider doesn't support voice listing
    const { OPENAI_TTS_VOICES } = await import(
      "../_shared/ai-service/services/tts"
    );
    const defaultVoices: Record<string, any> = {
      openai: OPENAI_TTS_VOICES.map((v) => ({ ...v, gender: "neutral" })),
      elevenlabs: [
        { id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", gender: "female" },
        { id: "AZnzlk1XvdvUkg3lJpIB", name: "Domi", gender: "male" },
        { id: "EXAVITQu4vrhnxnUiwQ0", name: "Bella", gender: "female" },
        { id: "VR6AewZ2W9e8O7y5iQ6I", name: "Antoni", gender: "male" },
        { id: "pNInz6obpgDQG4Oca3Ib", name: "Adam", gender: "male" },
      ],
      google: [
        { id: "en-US-Neural2-A", name: "Neural2-A (US)", gender: "female" },
        { id: "en-US-Neural2-C", name: "Neural2-C (US)", gender: "male" },
        { id: "en-GB-Neural2-A", name: "Neural2-A (UK)", gender: "female" },
        { id: "en-GB-Neural2-B", name: "Neural2-B (UK)", gender: "male" },
      ],
    };

    const voices = defaultVoices[provider] || [];
    return c.json({ voices });
  }
});

// =============================================================================
// SYNTHESIS ROUTES
// =============================================================================

/**
 * POST /synthesize
 * Convert text to speech
 */
app.post("/synthesize", async (c) => {
  const userId = await getUserIdFromAuth(c.req);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const {
    text,
    provider = "openai", // NOTE: ignored by synthesize() — resolved from feature config
    model = "tts-1", // NOTE: ignored by synthesize() — resolved from feature config
    voice = "alloy",
    speed = 1.0,
    format = "mp3",
    language,
    save_to_history = true,
  } = body;

  if (!text) {
    return c.json({ error: "Text required" }, 400);
  }

  if (text.length > 10000) {
    return c.json({ error: "Text too long (max 10000 characters)" }, 400);
  }

  try {
    const { synthesize } = await import("../_shared/ai-service");
    const responseFormat = format === "wav" || format === "pcm"
      ? format
      : "mp3";

    const result = await synthesize(userId, text, {
      provider,
      model,
      voice,
      speed,
      responseFormat,
      language,
    });
    const audioUrl = `data:audio/${result.format};base64,${
      result.audioBuffer.toString(
        "base64",
      )
    }`;

    // Save to history if requested
    if (save_to_history) {
      try {
        await databases.createDocument(
          AUDIO_DB_ID,
          SYNTHESIS_COLLECTION,
          "unique()",
          {
            user_id: userId,
            text_preview: text.substring(0, 200),
            text_length: text.length,
            provider,
            model,
            voice,
            audio_url: audioUrl,
            duration: result.duration,
            created_at: new Date().toISOString(),
          },
        );
      } catch (e) {
        console.log("Could not save synthesis:", e);
      }
    }

    return c.json({
      success: true,
      audio: {
        url: audioUrl,
        duration: result.duration,
        format: result.format,
        voice,
        provider,
      },
    });
  } catch (error: any) {
    console.error("Synthesis error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /synthesize/stream
 * Stream synthesis for long texts
 */
app.post("/synthesize/stream", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const {
    text_chunks,
    provider = "openai", // NOTE: ignored by synthesize() — resolved from feature config
    model = "tts-1", // NOTE: ignored by synthesize() — resolved from feature config
    voice = "alloy",
    format = "mp3",
  } = body;

  if (!text_chunks || !Array.isArray(text_chunks) || text_chunks.length === 0) {
    return c.json({ error: "text_chunks array required" }, 400);
  }

  if (text_chunks.length > 50) {
    return c.json({ error: "Maximum 50 chunks per request" }, 400);
  }

  try {
    const { synthesize } = await import("../_shared/ai-service");

    const results = await Promise.all(
      text_chunks.map(async (text: string, index: number) => {
        if (!text || text.length > 10000) {
          return {
            index,
            success: false,
            error: text ? "Text too long" : "Text required",
          };
        }

        try {
          const responseFormat = format === "wav" || format === "pcm"
            ? format
            : "mp3";
          const result = await synthesize(userId, text, {
            provider,
            model,
            voice,
            responseFormat,
          });
          return { index, success: true, ...result };
        } catch (error: any) {
          return { index, success: false, error: error.message };
        }
      }),
    );

    const successful = results.filter((r: any) => r.success);
    const failed = results.filter((r: any) => !r.success);

    return c.json({
      success: true,
      total: text_chunks.length,
      synthesized: successful.length,
      failed: failed.length,
      chunks: successful,
      errors: failed.length > 0 ? failed : undefined,
    });
  } catch (error: any) {
    console.error("Stream synthesis error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// HISTORY ROUTES
// =============================================================================

/**
 * GET /history
 * Get user's synthesis history
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
      AUDIO_DB_ID,
      SYNTHESIS_COLLECTION,
      [
        Query.equal("user_id", userId),
        Query.orderDesc("created_at"),
        Query.limit(limit),
        Query.offset(offset),
      ],
    );

    return c.json({
      synthesis: response.documents,
      total: response.total,
    });
  } catch (_error: any) {
    // Return empty history if DB doesn't exist
    return c.json({ synthesis: [], total: 0 });
  }
});

// =============================================================================
// START SERVER
// =============================================================================

console.log("🔊 Scriptony Audio TTS Service starting...");
export default createHonoAppwriteHandler(app);
