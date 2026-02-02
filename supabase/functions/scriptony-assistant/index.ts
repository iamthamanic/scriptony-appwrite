/**
 * 🤖 SCRIPTONY ASSISTANT - Edge Function
 * 
 * 🕐 LAST UPDATED: 2025-10-25 14:30 UTC
 * 📝 STABLE VERSION - No recent changes
 * 
 * Handles all AI Assistant operations:
 * - AI Chat with multiple providers (OpenAI, Anthropic, OpenRouter, DeepSeek)
 * - Conversation management
 * - AI Settings (API keys, models, system prompts)
 * - RAG (Retrieval Augmented Generation)
 * - MCP (Model Context Protocol) tools
 * 
 * UNABHÄNGIG DEPLOYBAR - Assistant-Änderungen beeinflussen Timeline/Projects nicht!
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

// =============================================================================
// SETUP
// =============================================================================

// IMPORTANT: Supabase adds function name as prefix to all paths!
const app = new Hono().basePath("/scriptony-assistant");

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

app.get("/", (c) => {
  return c.json({ 
    status: "ok", 
    function: "scriptony-assistant",
    version: "1.0.0",
    message: "Scriptony AI Assistant Service is running!",
    features: ["ai-chat", "rag", "mcp-tools", "multi-provider"],
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", async (c) => {
  // Check if ai_chat_settings table exists
  let tableExists = false;
  try {
    const { data, error } = await supabase
      .from("ai_chat_settings")
      .select("id")
      .limit(1);
    tableExists = !error || error.code !== "42P01"; // 42P01 = undefined_table
  } catch (e) {
    console.error("[Health] Error checking table:", e);
  }

  return c.json({ 
    status: tableExists ? "ok" : "degraded", 
    function: "scriptony-assistant",
    version: "1.0.1",
    features: ["ai-chat", "rag", "mcp-tools", "multi-provider"],
    timestamp: new Date().toISOString(),
    database: {
      ai_chat_settings_table: tableExists ? "exists" : "missing - run migration 002"
    }
  });
});

// =============================================================================
// AI SETTINGS ROUTES
// =============================================================================

/**
 * GET /ai/settings
 * Get AI settings for user
 */
app.get("/ai/settings", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { data, error } = await supabase
      .from("ai_chat_settings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching AI settings:", error);
      
      // Special handling for missing table
      if (error.code === "42P01") {
        return c.json({ 
          error: "AI chat settings table not found. Please run migration 002 in Supabase Dashboard.",
          code: "TABLE_NOT_FOUND",
          hint: "Check DEPLOY_schema_refresh_fix.md for instructions"
        }, 500);
      }
      
      return c.json({ error: error.message }, 500);
    }

    return c.json({ settings: data });
  } catch (error: any) {
    console.error("AI settings GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /ai/settings
 * Create or update AI settings
 */
app.post("/ai/settings", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { provider, model, api_key, system_prompt } = body;

    // Check if settings exist
    const { data: existing } = await supabase
      .from("ai_chat_settings")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    let result;
    if (existing) {
      // Update
      result = await supabase
        .from("ai_chat_settings")
        .update({
          provider,
          model,
          api_key,
          system_prompt,
        })
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      // Insert
      result = await supabase
        .from("ai_chat_settings")
        .insert({
          user_id: userId,
          provider,
          model,
          api_key,
          system_prompt,
        })
        .select()
        .single();
    }

    if (result.error) {
      console.error("Error saving AI settings:", result.error);
      return c.json({ error: result.error.message }, 500);
    }

    return c.json({ settings: result.data });
  } catch (error: any) {
    console.error("AI settings POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// CONVERSATIONS ROUTES
// =============================================================================

/**
 * GET /conversations
 * Get all conversations for user + project
 */
app.get("/conversations", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectId = c.req.query("project_id");

    if (!projectId) {
      return c.json({ error: "project_id is required" }, 400);
    }

    const { data, error } = await supabase
      .from("ai_conversations")
      .select("*")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ conversations: data || [] });
  } catch (error: any) {
    console.error("Conversations GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /conversations
 * Create new conversation
 */
app.post("/conversations", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { project_id, title } = body;

    if (!project_id) {
      return c.json({ error: "project_id is required" }, 400);
    }

    const { data, error } = await supabase
      .from("ai_conversations")
      .insert({
        user_id: userId,
        project_id,
        title: title || "New Conversation",
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ conversation: data }, 201);
  } catch (error: any) {
    console.error("Conversations POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /conversations/:id
 * Delete conversation and all messages
 */
app.delete("/conversations/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const conversationId = c.req.param("id");

    const { error } = await supabase
      .from("ai_conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error deleting conversation:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });
  } catch (error: any) {
    console.error("Conversations DELETE error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// MESSAGES ROUTES
// =============================================================================

/**
 * GET /conversations/:id/messages
 * Get all messages in a conversation
 */
app.get("/conversations/:id/messages", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const conversationId = c.req.param("id");

    const { data, error } = await supabase
      .from("ai_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ messages: data || [] });
  } catch (error: any) {
    console.error("Messages GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /conversations/:id/messages
 * Add message to conversation (user message only, AI response via /ai/chat)
 */
app.post("/conversations/:id/messages", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const conversationId = c.req.param("id");
    const body = await c.req.json();
    const { role, content, tool_calls, tool_call_id } = body;

    const { data, error } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        role,
        content,
        tool_calls,
        tool_call_id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating message:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ message: data }, 201);
  } catch (error: any) {
    console.error("Messages POST error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// AI CHAT ROUTE (MAIN ENDPOINT)
// =============================================================================

/**
 * POST /ai/chat
 * Main AI chat endpoint - streams response
 * 
 * This is a placeholder that should integrate with:
 * - ai-provider-calls.tsx (OpenAI, Anthropic, OpenRouter, DeepSeek)
 * - RAG search
 * - MCP tools
 */
app.post("/ai/chat", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { conversation_id, message, project_id } = body;

    if (!conversation_id || !message) {
      return c.json({ error: "conversation_id and message are required" }, 400);
    }

    // TODO: Implement full AI chat logic
    // AI Chat implementation placeholder
    return c.json({ 
      message: "AI Chat implementation in progress.",
      conversation_id,
      project_id,
    });
  } catch (error: any) {
    console.error("AI chat error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// RAG ROUTES
// =============================================================================

/**
 * POST /rag/sync
 * Sync project content to RAG database
 */
app.post("/rag/sync", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const { project_id } = body;

    if (!project_id) {
      return c.json({ error: "project_id is required" }, 400);
    }

    // Queue RAG sync job
    const { data, error } = await supabase
      .from("rag_sync_queue")
      .insert({
        user_id: userId,
        project_id,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Error queueing RAG sync:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ 
      success: true,
      sync_job: data,
      message: "RAG sync queued"
    }, 202);
  } catch (error: any) {
    console.error("RAG sync error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /rag/search
 * Search RAG database
 */
app.get("/rag/search", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const query = c.req.query("q");
    const projectId = c.req.query("project_id");

    if (!query || !projectId) {
      return c.json({ error: "q and project_id are required" }, 400);
    }

    // TODO: Implement RAG search
    return c.json({ 
      results: [],
      message: "RAG search implementation in progress"
    });
  } catch (error: any) {
    console.error("RAG search error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// MCP TOOLS ROUTES
// =============================================================================

/**
 * GET /mcp/tools
 * Get available MCP tools
 */
app.get("/mcp/tools", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Return available tools
    const tools = [
      {
        name: "get_project_info",
        description: "Get information about a project",
        parameters: {
          type: "object",
          properties: {
            project_id: { type: "string" }
          },
          required: ["project_id"]
        }
      },
      {
        name: "get_characters",
        description: "Get all characters in a project",
        parameters: {
          type: "object",
          properties: {
            project_id: { type: "string" }
          },
          required: ["project_id"]
        }
      },
      {
        name: "get_scenes",
        description: "Get all scenes in a project",
        parameters: {
          type: "object",
          properties: {
            project_id: { type: "string" }
          },
          required: ["project_id"]
        }
      },
    ];

    return c.json({ tools });
  } catch (error: any) {
    console.error("MCP tools error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// START SERVER
// =============================================================================

console.log("🤖 Scriptony Assistant Function starting...");
Deno.serve(app.fetch);
