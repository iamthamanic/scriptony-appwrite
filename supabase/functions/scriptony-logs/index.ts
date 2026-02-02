/**
 * 📝 SCRIPTONY LOGS - Edge Function
 * 
 * ✅ PHASE 2: COMPLETE IMPLEMENTATION (SCHEMA FIXED + TIMELINE NODE ROUTES)
 * 📅 Created: 2025-11-02
 * 🔄 Updated: 2025-11-08 (Added Children Logs Support for Acts)
 * 
 * Activity Logging & Audit Trail System
 * 
 * FEATURES:
 * - Read Activity Logs from database (auto-generated via DB triggers)
 * - Entity-Specific Logs (timeline_node, character, world, project)
 * - Timeline Node Logs (act, sequence, scene, shot)
 * - Children Logs for Acts (includes all Sequence logs)
 * - User Activity Tracking
 * - Action Types (created, updated, deleted, reordered)
 * - Change Details (old vs new values)
 * - Pagination support
 * 
 * NOTE: Logs are created automatically via database triggers in Migration 021
 * SCHEMA FIX: activity_logs uses 'created_at', not 'timestamp'
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

// =============================================================================
// SETUP
// =============================================================================

const app = new Hono().basePath("/scriptony-logs");

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
// HIERARCHY HELPER - Build parent path for timeline nodes
// =============================================================================

/**
 * Recursively builds the parent hierarchy path for a timeline node
 * Example: "Act 1 → Sequence 2: Intro → Scene 3: Opening"
 */
async function buildParentPath(entityId: string, entityType: string): Promise<string | null> {
  try {
    // Only build path for timeline nodes
    if (!['Act', 'Sequence', 'Scene', 'Shot'].includes(entityType)) {
      return null;
    }

    // Get the node
    const { data: node, error } = await supabase
      .from('timeline_nodes')
      .select('id, title, level, parent_id')
      .eq('id', entityId)
      .single();

    if (error || !node) {
      console.error('[buildParentPath] Error fetching node:', error);
      return null;
    }

    // Build path recursively
    const path: string[] = [];
    let currentNode = node;

    // Add current node to path
    const nodeTypeLabel = entityType;
    path.unshift(`${nodeTypeLabel}: ${currentNode.title}`);

    // Walk up the parent chain
    while (currentNode.parent_id) {
      const { data: parentNode, error: parentError } = await supabase
        .from('timeline_nodes')
        .select('id, title, level, parent_id')
        .eq('id', currentNode.parent_id)
        .single();

      if (parentError || !parentNode) {
        break;
      }

      // Determine parent type
      const parentType = parentNode.level === 1 ? 'Act' : 
                         parentNode.level === 2 ? 'Sequence' : 
                         parentNode.level === 3 ? 'Scene' : 'Node';
      
      path.unshift(`${parentType}: ${parentNode.title}`);
      currentNode = parentNode;
    }

    return path.join(' → ');
  } catch (error) {
    console.error('[buildParentPath] Exception:', error);
    return null;
  }
}

// =============================================================================
// HEALTH CHECK
// =============================================================================

app.get("/health", async (c) => {
  // Check if activity_logs table exists
  let tableExists = false;
  try {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("id")
      .limit(1);
    tableExists = !error || error.code !== "42P01"; // 42P01 = undefined_table
  } catch (e) {
    console.error("[Health] Error checking table:", e);
  }

  return c.json({ 
    status: tableExists ? "ok" : "degraded", 
    function: "scriptony-logs",
    version: "3.0.0",
    phase: "3 (Enhanced Details + Hierarchy Context)",
    timestamp: new Date().toISOString(),
    database: {
      activity_logs_table: tableExists ? "exists" : "missing - run migration 021"
    },
    features: {
      hierarchy_context: "enabled",
      enhanced_shot_tracking: "enabled",
      scene_tracking: "enabled"
    },
    routes: {
      project_logs: "/logs/project/:id/recent",
      entity_logs: "/logs/entity/:type/:id",
      timeline_node_logs: "/logs/:nodeType/:id/recent (act|sequence|scene|shot)",
      user_activity: "/logs/user/activity"
    }
  });
});

// =============================================================================
// GET RECENT LOGS FOR PROJECT
// =============================================================================

/**
 * GET /logs/project/:id/recent
 * Get recent activity logs for a specific project
 * Query params:
 * - limit: number of logs to return (default: 50, max: 100)
 * - entity_type: filter by entity type (optional)
 * - action: filter by action type (optional)
 */
app.get("/logs/project/:id/recent", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const projectId = c.req.param("id");
    const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
    const entityTypeFilter = c.req.query("entity_type");
    const actionFilter = c.req.query("action");

    console.log(`[Logs] Fetching recent logs for project ${projectId} (limit: ${limit})`);

    // Build query (use created_at, not timestamp)
    let query = supabase
      .from("activity_logs")
      .select(`
        id,
        created_at,
        user_id,
        entity_type,
        entity_id,
        action,
        details
      `)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit);

    // Apply filters
    if (entityTypeFilter) {
      query = query.eq("entity_type", entityTypeFilter);
    }
    if (actionFilter) {
      query = query.eq("action", actionFilter);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) {
      console.error("[Logs] Error fetching logs:", logsError);
      
      // Special handling for missing table
      if (logsError.code === "42P01") {
        return c.json({ 
          error: "Activity logs table not found. Please run migration 021 in Supabase Dashboard.",
          code: "TABLE_NOT_FOUND",
          hint: "Check DEPLOY_schema_refresh_fix.md for instructions"
        }, 500);
      }
      
      return c.json({ error: logsError.message }, 500);
    }

    // Fetch user info for each unique user_id
    const uniqueUserIds = [...new Set(logs?.map(log => log.user_id).filter(Boolean) || [])];
    
    let usersMap: Record<string, any> = {};
    if (uniqueUserIds.length > 0) {
      const { data: users } = await supabase.auth.admin.listUsers();
      if (users?.users) {
        usersMap = Object.fromEntries(
          users.users
            .filter(u => uniqueUserIds.includes(u.id))
            .map(u => [u.id, {
              id: u.id,
              email: u.email,
              name: u.user_metadata?.name || u.email,
            }])
        );
      }
    }

    // Enrich logs with user data + hierarchy path
    const enrichedLogs = await Promise.all((logs || []).map(async (log) => {
      // Build parent path for timeline nodes
      const parentPath = await buildParentPath(log.entity_id, log.entity_type);
      
      return {
        id: log.id,
        timestamp: log.created_at,
        user: log.user_id ? usersMap[log.user_id] || null : null,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        action: log.action,
        details: log.details,
        parent_path: parentPath, // NEW: Hierarchie-Pfad
      };
    }));

    return c.json({
      logs: enrichedLogs,
      count: enrichedLogs.length,
    });
  } catch (error: any) {
    console.error("[Logs] Error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// GET LOGS FOR SPECIFIC ENTITY
// =============================================================================

/**
 * GET /logs/entity/:type/:id
 * Get activity logs for a specific entity
 * Query params:
 * - limit: number of logs to return (default: 20, max: 50)
 */
app.get("/logs/entity/:type/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const entityType = c.req.param("type");
    const entityId = c.req.param("id");
    const limit = Math.min(parseInt(c.req.query("limit") || "20"), 50);

    console.log(`[Logs] Fetching logs for ${entityType}/${entityId}`);

    const { data: logs, error: logsError } = await supabase
      .from("activity_logs")
      .select(`
        id,
        created_at,
        user_id,
        entity_type,
        entity_id,
        action,
        details
      `)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (logsError) {
      console.error("[Logs] Error fetching entity logs:", logsError);
      return c.json({ error: logsError.message }, 500);
    }

    // Fetch user info
    const uniqueUserIds = [...new Set(logs?.map(log => log.user_id).filter(Boolean) || [])];
    
    let usersMap: Record<string, any> = {};
    if (uniqueUserIds.length > 0) {
      const { data: users } = await supabase.auth.admin.listUsers();
      if (users?.users) {
        usersMap = Object.fromEntries(
          users.users
            .filter(u => uniqueUserIds.includes(u.id))
            .map(u => [u.id, {
              id: u.id,
              email: u.email,
              name: u.user_metadata?.name || u.email,
            }])
        );
      }
    }

    // Enrich logs with user data
    const enrichedLogs = (logs || []).map(log => ({
      id: log.id,
      timestamp: log.created_at,
      user: log.user_id ? usersMap[log.user_id] || null : null,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      action: log.action,
      details: log.details,
    }));

    return c.json({
      logs: enrichedLogs,
      count: enrichedLogs.length,
    });
  } catch (error: any) {
    console.error("[Logs] Entity logs error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// GET LOGS FOR TIMELINE NODES (ACT/SEQUENCE/SCENE/SHOT)
// =============================================================================

/**
 * GET /logs/{act|sequence|scene|shot}/:id/recent
 * Get recent activity logs for a specific timeline node
 * Query params:
 * - limit: number of logs to return (default: 20, max: 50)
 * - include_children: include logs from child nodes (default: true for acts)
 */
app.get("/logs/:nodeType/:id/recent", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const nodeType = c.req.param("nodeType");
    const nodeId = c.req.param("id");
    const limit = Math.min(parseInt(c.req.query("limit") || "20"), 50);
    const includeChildren = c.req.query("include_children") !== "false"; // Default true

    console.log(`[Logs] Fetching logs for ${nodeType}/${nodeId} (includeChildren: ${includeChildren})`);

    // Map nodeType to entity_type (based on Migration 026 schema)
    const entityTypeMap: Record<string, string> = {
      'act': 'Act',
      'sequence': 'Sequence',
      'scene': 'Scene',
      'shot': 'Shot',
    };

    const entityType = entityTypeMap[nodeType];
    if (!entityType) {
      console.error(`[Logs] Invalid nodeType: ${nodeType}`);
      return c.json({ error: `Invalid nodeType: ${nodeType}` }, 400);
    }

    console.log(`[Logs] Looking for entity_type="${entityType}", entity_id="${nodeId}"`);

    let allLogs: any[] = [];

    // For Acts, include logs from child Sequences if includeChildren is true
    if (nodeType === 'act' && includeChildren) {
      console.log(`[Logs] 🎬 Act detected - fetching children logs...`);
      
      // 1. Get logs for the Act itself
      const { data: actLogs, error: actLogsError } = await supabase
        .from("activity_logs")
        .select(`
          id,
          created_at,
          user_id,
          entity_type,
          entity_id,
          action,
          details
        `)
        .eq("entity_type", "Act")
        .eq("entity_id", nodeId)
        .order("created_at", { ascending: false });

      if (actLogsError) {
        console.error(`[Logs] ❌ Error fetching Act logs:`, actLogsError);
        return c.json({ error: actLogsError.message }, 500);
      }

      console.log(`[Logs] ✅ Found ${actLogs?.length || 0} logs for Act itself`);

      // 2. Find all child Sequences of this Act
      const { data: sequences, error: seqError } = await supabase
        .from("timeline_nodes")
        .select("id")
        .eq("parent_id", nodeId)
        .eq("level", 2); // Sequences are level 2

      if (seqError) {
        console.error(`[Logs] ⚠️ Error fetching sequences:`, seqError);
        // Continue anyway with just Act logs
      }

      const sequenceIds = sequences?.map(s => s.id) || [];
      console.log(`[Logs] 🔍 Found ${sequenceIds.length} sequences under Act ${nodeId}`);

      // 3. Get logs for all child Sequences
      let sequenceLogs: any[] = [];
      if (sequenceIds.length > 0) {
        const { data: seqLogs, error: seqLogsError } = await supabase
          .from("activity_logs")
          .select(`
            id,
            created_at,
            user_id,
            entity_type,
            entity_id,
            action,
            details
          `)
          .eq("entity_type", "Sequence")
          .in("entity_id", sequenceIds)
          .order("created_at", { ascending: false });

        if (seqLogsError) {
          console.error(`[Logs] ❌ Error fetching Sequence logs:`, seqLogsError);
        } else {
          sequenceLogs = seqLogs || [];
          console.log(`[Logs] ✅ Found ${sequenceLogs.length} logs for child Sequences`);
        }
      }

      // Combine and sort all logs
      allLogs = [...(actLogs || []), ...sequenceLogs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);

      console.log(`[Logs] 🎉 Total combined logs: ${allLogs.length}`);
    } else {
      // For non-Acts or when includeChildren is false, just get direct logs
      const { data: logs, error: logsError } = await supabase
        .from("activity_logs")
        .select(`
          id,
          created_at,
          user_id,
          entity_type,
          entity_id,
          action,
          details
        `)
        .eq("entity_type", entityType)
        .eq("entity_id", nodeId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (logsError) {
        console.error(`[Logs] Error fetching ${nodeType} logs:`, logsError);
        
        // Special handling for missing table
        if (logsError.code === "42P01") {
          return c.json({ 
            error: "Activity logs table not found. Please run migration 021 in Supabase Dashboard.",
            code: "TABLE_NOT_FOUND",
            hint: "Check DEPLOY_schema_refresh_fix.md for instructions"
          }, 500);
        }
        
        return c.json({ error: logsError.message }, 500);
      }

      allLogs = logs || [];
    }

    // Fetch user info for each unique user_id
    const uniqueUserIds = [...new Set(allLogs.map(log => log.user_id).filter(Boolean))];
    
    let usersMap: Record<string, any> = {};
    if (uniqueUserIds.length > 0) {
      const { data: users } = await supabase.auth.admin.listUsers();
      if (users?.users) {
        usersMap = Object.fromEntries(
          users.users
            .filter(u => uniqueUserIds.includes(u.id))
            .map(u => [u.id, {
              id: u.id,
              email: u.email,
              name: u.user_metadata?.name || u.email,
            }])
        );
      }
    }

    // Enrich logs with user data + hierarchy path
    const enrichedLogs = await Promise.all(allLogs.map(async (log) => {
      // Build parent path for timeline nodes
      const parentPath = await buildParentPath(log.entity_id, log.entity_type);
      
      return {
        id: log.id,
        timestamp: log.created_at,
        user: log.user_id ? usersMap[log.user_id] || null : null,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        action: log.action,
        details: log.details,
        parent_path: parentPath, // NEW: Hierarchie-Pfad
      };
    }));

    return c.json({
      logs: enrichedLogs,
      count: enrichedLogs.length,
    });
  } catch (error: any) {
    console.error(`[Logs] Timeline node logs error:`, error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// GET USER ACTIVITY
// =============================================================================

/**
 * GET /logs/user/activity
 * Get current user's recent activity across all projects
 * Query params:
 * - limit: number of logs to return (default: 50, max: 100)
 */
app.get("/logs/user/activity", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);

    console.log(`[Logs] Fetching activity for user ${userId}`);

    const { data: logs, error: logsError } = await supabase
      .from("activity_logs")
      .select(`
        id,
        created_at,
        project_id,
        entity_type,
        entity_id,
        action,
        details
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (logsError) {
      console.error("[Logs] Error fetching user activity:", logsError);
      return c.json({ error: logsError.message }, 500);
    }

    return c.json({
      logs: logs || [],
      count: logs?.length || 0,
    });
  } catch (error: any) {
    console.error("[Logs] User activity error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// START SERVER
// =============================================================================

console.log("📝 Scriptony Logs Function starting (PHASE 3 - Enhanced Details + Hierarchy Context)...");
Deno.serve(app.fetch);
