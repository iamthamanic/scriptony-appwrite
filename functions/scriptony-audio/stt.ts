/**
 * 🎤 SCRIPTONY AUDIO STT - Speech-to-Text Edge Function
 *
 * Transcription Service for Scriptony:
 * - Transcribe audio files
 * - Multiple providers: OpenAI Whisper, Google STT, HuggingFace
 * - Timestamps support
 * - Multiple languages
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
const TRANSCRIPTIONS_COLLECTION = "transcriptions";

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
    function: "scriptony-audio-stt",
    version: "1.0.0",
    message: "Scriptony Speech-to-Text Service",
    endpoints: [
      "POST /transcribe - Transcribe audio file",
      "POST /transcribe/url - Transcribe from URL",
      "POST /transcribe/batch - Batch transcription",
      "GET /history - Get transcription history",
      "GET /providers - List STT-capable providers",
      "GET /models - List available STT models",
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
 * List all STT-capable providers
 */
app.get("/providers", async (c) => {
  const { PROVIDER_CAPABILITIES, PROVIDER_DISPLAY_NAMES } = await import(
    "../_shared/ai-service/providers"
  );

  const sttProviders = Object.entries(PROVIDER_CAPABILITIES)
    .filter(([_name, caps]) => caps.audio_stt)
    .map(([name, caps]) => ({
      id: name,
      name: PROVIDER_DISPLAY_NAMES[name] || name,
      capabilities: caps,
    }));

  return c.json({ providers: sttProviders });
});

/**
 * GET /models
 * List all STT models
 */
app.get("/models", async (c) => {
  const { getModelsForFeature } = await import("../_shared/ai-service/config");

  const models = getModelsForFeature("audio_stt");

  return c.json({ models });
});

// =============================================================================
// TRANSCRIPTION ROUTES
// =============================================================================

/**
 * POST /transcribe
 * Transcribe an uploaded audio file
 */
app.post("/transcribe", async (c) => {
  const userId = await getUserIdFromAuth(c.req);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const contentType = c.req.header("Content-Type") || "";

  // Handle multipart/form-data
  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData();
    const audioFile = formData.get("audio") as File;
    const provider = formData.get("provider")?.toString() || "openai"; // NOTE: ignored by transcribe() — resolved from feature config
    const model = formData.get("model")?.toString() || "whisper-1"; // NOTE: ignored by transcribe() — resolved from feature config
    const language = formData.get("language")?.toString();
    const timestamps = formData.get("timestamps") === "true";

    if (!audioFile) {
      return c.json({ error: "Audio file required" }, 400);
    }

    try {
      // Convert file to buffer
      const audioBuffer = await audioFile.arrayBuffer();

      // Create a URL for the audio (in production, upload to storage first)
      const audioUrl = URL.createObjectURL(
        new Blob([audioBuffer], { type: audioFile.type }),
      );

      const { transcribe } = await import("../_shared/ai-service");

      const result = await transcribe(userId, audioUrl, {
        provider,
        model,
        language,
        timestamps,
      });

      // Revoke the object URL
      URL.revokeObjectURL(audioUrl);

      // Save transcription to history
      try {
        await databases.createDocument(
          AUDIO_DB_ID,
          TRANSCRIPTIONS_COLLECTION,
          "unique()",
          {
            user_id: userId,
            file_name: audioFile.name,
            provider,
            model,
            language: result.language || language || "unknown",
            text: result.text,
            duration: result.duration,
            created_at: new Date().toISOString(),
          },
        );
      } catch (e) {
        console.log("Could not save transcription:", e);
      }

      return c.json({
        success: true,
        transcription: {
          text: result.text,
          language: result.language,
          duration: result.duration,
          segments: result.segments,
        },
      });
    } catch (error: any) {
      console.error("Transcription error:", error);
      return c.json({ error: error.message }, 500);
    }
  }

  // Handle JSON body
  const body = await c.req.json();
  const {
    audio_url,
    provider = "openai", // NOTE: ignored by transcribe() — resolved from feature config
    model = "whisper-1", // NOTE: ignored by transcribe() — resolved from feature config
    language,
    timestamps = false,
  } = body;

  if (!audio_url) {
    return c.json({ error: "audio_url required" }, 400);
  }

  try {
    const { transcribe } = await import("../_shared/ai-service");

    const result = await transcribe(userId, audio_url, {
      provider,
      model,
      language,
      timestamps,
    });

    return c.json({
      success: true,
      transcription: {
        text: result.text,
        language: result.language,
        duration: result.duration,
        segments: result.segments,
      },
    });
  } catch (error: any) {
    console.error("Transcription error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /transcribe/url
 * Transcribe from URL
 */
app.post("/transcribe/url", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const {
    audio_url,
    provider = "openai", // NOTE: ignored by transcribe() — resolved from feature config
    model = "whisper-1", // NOTE: ignored by transcribe() — resolved from feature config
    language,
    timestamps = false,
  } = body;

  if (!audio_url) {
    return c.json({ error: "audio_url required" }, 400);
  }

  try {
    const { transcribe } = await import("../_shared/ai-service");

    const result = await transcribe(userId, audio_url, {
      provider,
      model,
      language,
      timestamps,
    });

    return c.json({
      success: true,
      transcription: {
        text: result.text,
        language: result.language,
        duration: result.duration,
        segments: result.segments,
      },
    });
  } catch (error: any) {
    console.error("Transcription error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /transcribe/batch
 * Batch transcription (max 10 files)
 */
app.post("/transcribe/batch", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);

  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const {
    audio_urls,
    provider = "openai",
    model = "whisper-1",
    ...options
  } = body;

  if (!audio_urls || !Array.isArray(audio_urls) || audio_urls.length === 0) {
    return c.json({ error: "audio_urls array required" }, 400);
  }

  if (audio_urls.length > 10) {
    return c.json({ error: "Maximum 10 files per batch" }, 400);
  }

  try {
    const { transcribe } = await import("../_shared/ai-service");

    const results = await Promise.all(
      audio_urls.map(async (audio_url: string) => {
        try {
          const result = await transcribe(userId, audio_url, {
            provider,
            model,
            ...options,
          });
          return { audio_url, success: true, ...result };
        } catch (error: any) {
          return { audio_url, success: false, error: error.message };
        }
      }),
    );

    const successful = results.filter((r: any) => r.success);
    const failed = results.filter((r: any) => !r.success);

    return c.json({
      success: true,
      total: audio_urls.length,
      transcribed: successful.length,
      failed: failed.length,
      results: successful,
      errors: failed.length > 0 ? failed : undefined,
    });
  } catch (error: any) {
    console.error("Batch transcription error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// HISTORY ROUTES
// =============================================================================

/**
 * GET /history
 * Get user's transcription history
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
      TRANSCRIPTIONS_COLLECTION,
      [
        Query.equal("user_id", userId),
        Query.orderDesc("created_at"),
        Query.limit(limit),
        Query.offset(offset),
      ],
    );

    return c.json({
      transcriptions: response.documents,
      total: response.total,
    });
  } catch (_error: any) {
    // Return empty history if DB doesn't exist
    return c.json({ transcriptions: [], total: 0 });
  }
});

// =============================================================================
// START SERVER
// =============================================================================

console.log("🎤 Scriptony Audio STT Service starting...");
export default createHonoAppwriteHandler(app);
