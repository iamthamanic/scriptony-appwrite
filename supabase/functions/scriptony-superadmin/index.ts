/**
 * 🔐 SCRIPTONY SUPERADMIN SERVICE
 * 
 * 🕐 LAST UPDATED: 2025-10-05 08:30 UTC
 * 📝 STABLE VERSION - No recent changes
 * 
 * Admin-only routes for system monitoring and management.
 * 
 * Routes:
 * - GET  /stats          - System statistics
 * - GET  /users          - All users
 * - GET  /organizations  - All organizations  
 * - GET  /analytics      - System analytics
 */

import { Hono } from "npm:hono@4";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";

// =====================================================
// SETUP
// =====================================================

const app = new Hono();

// CORS - Open for all origins
app.use("*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Logging
app.use("*", logger(console.log));

// Create Supabase Admin Client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// =====================================================
// AUTH HELPERS
// =====================================================

/**
 * Get user ID from auth token and verify superadmin role
 */
async function requireSuperadmin(authHeader: string | undefined): Promise<string> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Unauthorized - No token provided");
  }

  const token = authHeader.split(" ")[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    throw new Error("Unauthorized - Invalid token");
  }

  // Check if user has superadmin role
  const role = user.user_metadata?.role;
  if (role !== "superadmin") {
    throw new Error("Forbidden - Superadmin access required");
  }

  return user.id;
}

// =====================================================
// ROOT ROUTE
// =====================================================

// Health check handler
const healthCheck = (c: any) => {
  return c.json({
    status: "ok",
    function: "scriptony-superadmin",
    version: "1.0.0",
    message: "Scriptony Superadmin Service is running!",
    timestamp: new Date().toISOString(),
  });
};

// Root route (/)
app.get("/", healthCheck);

// Function name route (/scriptony-superadmin) - Supabase adds this automatically
app.get("/scriptony-superadmin", healthCheck);

// =====================================================
// STATS ROUTE
// =====================================================

app.get("/stats", async (c) => {
  try {
    await requireSuperadmin(c.req.header("Authorization"));

    // Get stats from database
    const [
      { count: totalUsers },
      { count: totalOrganizations },
      { count: totalProjects },
      { count: totalWorlds },
    ] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("organizations").select("*", { count: "exact", head: true }),
      supabase.from("projects").select("*", { count: "exact", head: true }),
      supabase.from("worlds").select("*", { count: "exact", head: true }),
    ]);

    return c.json({
      stats: {
        totalUsers: totalUsers || 0,
        totalOrganizations: totalOrganizations || 0,
        totalProjects: totalProjects || 0,
        totalWorlds: totalWorlds || 0,
      },
    });
  } catch (error: any) {
    console.error("❌ Error loading stats:", error);
    return c.json({ error: error.message }, error.message.includes("Forbidden") ? 403 : 401);
  }
});

// =====================================================
// USERS ROUTE
// =====================================================

app.get("/users", async (c) => {
  try {
    await requireSuperadmin(c.req.header("Authorization"));

    // Get all users via Admin API
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Failed to load users: ${authError.message}`);
    }

    // Get profiles data
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*");

    // Merge data
    const users = authUsers.users.map((authUser) => {
      const profile = profiles?.find((p) => p.id === authUser.id);
      
      return {
        id: authUser.id,
        email: authUser.email || "unknown",
        name: profile?.name || authUser.user_metadata?.name || "Unknown",
        role: authUser.user_metadata?.role || "user",
        lastSignIn: authUser.last_sign_in_at,
        createdAt: authUser.created_at,
        emailConfirmed: authUser.email_confirmed_at !== null,
      };
    });

    return c.json({ users });
  } catch (error: any) {
    console.error("❌ Error loading users:", error);
    return c.json({ error: error.message }, error.message.includes("Forbidden") ? 403 : 401);
  }
});

// =====================================================
// ORGANIZATIONS ROUTE
// =====================================================

app.get("/organizations", async (c) => {
  try {
    await requireSuperadmin(c.req.header("Authorization"));

    // Get all organizations with counts
    const { data: orgs, error } = await supabase
      .from("organizations")
      .select(`
        id,
        name,
        slug,
        created_at,
        owner_id,
        profiles!organizations_owner_id_fkey (
          email
        )
      `);

    if (error) {
      throw new Error(`Failed to load organizations: ${error.message}`);
    }

    // Get counts for each organization
    const organizations = await Promise.all(
      orgs.map(async (org) => {
        const [
          { count: memberCount },
          { count: projectCount },
          { count: worldCount },
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.id),
          supabase
            .from("projects")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.id),
          supabase
            .from("worlds")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", org.id),
        ]);

        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          ownerEmail: (org.profiles as any)?.email || "unknown",
          memberCount: memberCount || 0,
          projectCount: projectCount || 0,
          worldCount: worldCount || 0,
          createdAt: org.created_at,
        };
      })
    );

    return c.json({ organizations });
  } catch (error: any) {
    console.error("❌ Error loading organizations:", error);
    return c.json({ error: error.message }, error.message.includes("Forbidden") ? 403 : 401);
  }
});

// =====================================================
// ANALYTICS ROUTE
// =====================================================

app.get("/analytics", async (c) => {
  try {
    await requireSuperadmin(c.req.header("Authorization"));

    // For now, return mock analytics
    // In production, these would come from real analytics tables/logs
    const analytics = {
      totalEvents: 0, // Would come from event tracking
      activeUsers24h: 0, // Would come from session tracking
      activeUsers7d: 0, // Would come from session tracking
      activeOrganizations: 0, // Would come from activity logs
    };

    return c.json({ analytics });
  } catch (error: any) {
    console.error("❌ Error loading analytics:", error);
    return c.json({ error: error.message }, error.message.includes("Forbidden") ? 403 : 401);
  }
});

// =====================================================
// START SERVER
// =====================================================

console.log("🔐 Scriptony Superadmin Service starting...");
console.log("📍 Routes: /stats, /users, /organizations, /analytics");

Deno.serve(app.fetch);
