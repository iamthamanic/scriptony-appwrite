/**
 * 🔐 SCRIPTONY AUTH EDGE FUNCTION
 * 
 * 🕐 LAST UPDATED: 2025-10-10 10:50 UTC
 * 📝 STABLE VERSION - No recent changes
 * 
 * Handles:
 * - Custom Signup with Organization Creation
 * - Organization Management (CRUD)
 * - Team Management (Members, Invites)
 * - Storage Usage Tracking
 * - User Profile Management
 * 
 * @version 1.0.0
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

// IMPORTANT: Supabase adds function name as prefix to all paths!
// So requests to /scriptony-auth/* need to be handled
const app = new Hono().basePath("/scriptony-auth");

// Supabase Client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Logger
app.use('*', logger(console.log));

// CORS
app.use('*', cors({
  origin: '*',
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'apikey'],
}));

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get User ID from Auth Token
 */
async function getUserIdFromAuth(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    console.error("[AUTH] Error getting user from token:", error);
    return null;
  }

  return user.id;
}

/**
 * Get or Create Default Organization for User
 */
async function getOrCreateUserOrganization(userId: string): Promise<string | null> {
  try {
    // Check if user already has an organization
    const { data: existingMemberships } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", userId)
      .limit(1);

    if (existingMemberships && existingMemberships.length > 0) {
      console.log(`[ORG] User ${userId} already has organization: ${existingMemberships[0].organization_id}`);
      return existingMemberships[0].organization_id;
    }

    // Get user details
    const { data: { user } } = await supabase.auth.admin.getUserById(userId);
    
    const orgName = user?.user_metadata?.name 
      ? `${user.user_metadata.name}'s Organization`
      : user?.email?.split('@')[0] 
        ? `${user.email.split('@')[0]}'s Organization`
        : "My Organization";
    
    const orgSlug = `org-${userId.substring(0, 8)}`;

    // Create new organization
    const { data: newOrg, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: orgName,
        slug: orgSlug,
        owner_id: userId,
      })
      .select()
      .single();

    if (orgError || !newOrg) {
      console.error("[ORG] Error creating organization:", orgError);
      return null;
    }

    console.log(`[ORG] Created organization ${newOrg.id} for user ${userId}`);

    // Add user as owner
    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: newOrg.id,
        user_id: userId,
        role: "owner",
      });

    if (memberError) {
      console.error("[ORG] Error adding user to organization:", memberError);
      return null;
    }

    console.log(`[ORG] Added user ${userId} as owner of organization ${newOrg.id}`);

    return newOrg.id;
  } catch (error: any) {
    console.error("[ORG] Error in getOrCreateUserOrganization:", error);
    return null;
  }
}

/**
 * Get User's Organizations
 */
async function getUserOrganizations(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId);
  
  if (error || !data) {
    console.error("[ORG] Error fetching user organizations:", error);
    return [];
  }

  return data.map(m => m.organization_id);
}

// =====================================================
// HEALTH CHECK (NO AUTH REQUIRED)
// =====================================================

// Root handler (catch-all for health checks)
app.get("/", async (c) => {
  return c.json({
    status: "ok",
    service: "scriptony-auth",
    version: "1.0.0",
    message: "Scriptony Auth Service is running!",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", async (c) => {
  try {
    // Test database connection (use service role key, no user auth needed)
    const { error } = await supabase.from("organizations").select("id").limit(1);
    
    return c.json({
      status: "ok",
      service: "scriptony-auth",
      version: "1.0.0",
      database: error ? "error" : "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[HEALTH] Error:", error);
    return c.json({
      status: "error",
      service: "scriptony-auth",
      database: "disconnected",
      error: error.message,
      timestamp: new Date().toISOString(),
    }, 500);
  }
});

// =====================================================
// SIGNUP
// =====================================================

/**
 * POST /signup
 * 
 * Custom signup endpoint that creates:
 * 1. Auth user (via Supabase Auth Admin)
 * 2. User profile in public.users
 * 3. Default organization
 * 4. Organization membership
 */
app.post("/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password are required" }, 400);
    }

    console.log(`[SIGNUP] Creating user: ${email}`);

    // Create auth user
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since email server not configured
      user_metadata: { name: name || email.split('@')[0] },
    });

    if (error) {
      console.error("[SIGNUP] Error creating auth user:", error);
      return c.json({ error: error.message }, 400);
    }

    if (!data.user) {
      return c.json({ error: "User creation failed" }, 500);
    }

    console.log(`[SIGNUP] Auth user created: ${data.user.id}`);

    // Create default organization
    const orgId = await getOrCreateUserOrganization(data.user.id);
    
    if (!orgId) {
      console.error("[SIGNUP] Failed to create organization");
      return c.json({ error: "Organization creation failed" }, 500);
    }

    console.log(`[SIGNUP] Organization created: ${orgId}`);

    // Create user profile
    const { error: profileError } = await supabase
      .from("users")
      .insert({
        id: data.user.id,
        name: name || email.split('@')[0],
        email: email,
        organization_id: orgId,
      });

    if (profileError) {
      console.error("[SIGNUP] Error creating user profile:", profileError);
      // Non-fatal - auth user exists
    }

    return c.json({ 
      success: true,
      user_id: data.user.id,
      organization_id: orgId,
    });

  } catch (error: any) {
    console.error("[SIGNUP] Unexpected error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /create-demo-user
 * 
 * Creates a hardcoded demo user for testing
 */
app.post("/create-demo-user", async (c) => {
  try {
    console.log("[DEMO] Creating demo user");

    const { data, error } = await supabase.auth.admin.createUser({
      email: "iamthamanic@gmail.com",
      password: "123456",
      email_confirm: true,
      user_metadata: { name: "Demo User" },
    });

    if (error) {
      console.error("[DEMO] Error creating demo user:", error);
      return c.json({ error: error.message }, 400);
    }

    if (!data.user) {
      return c.json({ error: "Demo user creation failed" }, 500);
    }

    // Create organization
    const orgId = await getOrCreateUserOrganization(data.user.id);

    return c.json({ 
      success: true,
      user_id: data.user.id,
      organization_id: orgId,
      email: "iamthamanic@gmail.com",
      password: "123456",
    });

  } catch (error: any) {
    console.error("[DEMO] Unexpected error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =====================================================
// PROFILE MANAGEMENT
// =====================================================

/**
 * GET /profile
 * 
 * Get current user's profile with organization info
 */
app.get("/profile", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c.req.header("Authorization"));
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Get user profile with organization
    const { data, error } = await supabase
      .from("users")
      .select(`
        *,
        organizations (
          id,
          name,
          slug,
          owner_id,
          created_at
        )
      `)
      .eq("id", userId)
      .single();

    if (error) {
      console.error("[PROFILE] Error fetching profile:", error);
      return c.json({ error: error.message }, 500);
    }

    // Get user's organization memberships
    const { data: memberships } = await supabase
      .from("organization_members")
      .select(`
        role,
        organizations (
          id,
          name,
          slug,
          owner_id
        )
      `)
      .eq("user_id", userId);

    return c.json({ 
      profile: data,
      organizations: memberships || [],
    });

  } catch (error: any) {
    console.error("[PROFILE] Unexpected error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /profile
 * 
 * Update current user's profile
 */
app.put("/profile", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c.req.header("Authorization"));
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const updates = await c.req.json();

    // Only allow updating specific fields
    const allowedFields = ['name', 'avatar_url', 'bio'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {} as Record<string, any>);

    if (Object.keys(filteredUpdates).length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }

    // Update profile
    const { data, error } = await supabase
      .from("users")
      .update(filteredUpdates)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("[PROFILE] Error updating profile:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ profile: data });

  } catch (error: any) {
    console.error("[PROFILE] Unexpected error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =====================================================
// ORGANIZATION MANAGEMENT
// =====================================================

/**
 * GET /organizations
 * 
 * Get all organizations the user belongs to
 */
app.get("/organizations", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c.req.header("Authorization"));
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { data, error } = await supabase
      .from("organization_members")
      .select(`
        role,
        organizations (
          id,
          name,
          slug,
          owner_id,
          created_at
        )
      `)
      .eq("user_id", userId);

    if (error) {
      console.error("[ORG] Error fetching organizations:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ organizations: data || [] });

  } catch (error: any) {
    console.error("[ORG] Unexpected error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /organizations/:id
 * 
 * Get specific organization details
 */
app.get("/organizations/:id", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c.req.header("Authorization"));
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const orgId = c.req.param("id");

    // Check if user is member
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .single();

    if (!membership) {
      return c.json({ error: "Not a member of this organization" }, 403);
    }

    // Get organization details
    const { data, error } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", orgId)
      .single();

    if (error) {
      console.error("[ORG] Error fetching organization:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ organization: data, role: membership.role });

  } catch (error: any) {
    console.error("[ORG] Unexpected error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /organizations
 * 
 * Create a new organization
 */
app.post("/organizations", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c.req.header("Authorization"));
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { name, slug } = await c.req.json();

    if (!name) {
      return c.json({ error: "Organization name is required" }, 400);
    }

    // Generate slug if not provided
    const orgSlug = slug || `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`;

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name,
        slug: orgSlug,
        owner_id: userId,
      })
      .select()
      .single();

    if (orgError) {
      console.error("[ORG] Error creating organization:", orgError);
      return c.json({ error: orgError.message }, 500);
    }

    // Add creator as owner
    const { error: memberError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: org.id,
        user_id: userId,
        role: "owner",
      });

    if (memberError) {
      console.error("[ORG] Error adding owner to organization:", memberError);
      return c.json({ error: memberError.message }, 500);
    }

    return c.json({ organization: org });

  } catch (error: any) {
    console.error("[ORG] Unexpected error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * PUT /organizations/:id
 * 
 * Update organization (owner only)
 */
app.put("/organizations/:id", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c.req.header("Authorization"));
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const orgId = c.req.param("id");

    // Check if user is owner
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .single();

    if (!membership || membership.role !== "owner") {
      return c.json({ error: "Only organization owners can update settings" }, 403);
    }

    const updates = await c.req.json();

    // Only allow updating specific fields
    const allowedFields = ['name', 'slug'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {} as Record<string, any>);

    if (Object.keys(filteredUpdates).length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }

    // Update organization
    const { data, error } = await supabase
      .from("organizations")
      .update(filteredUpdates)
      .eq("id", orgId)
      .select()
      .single();

    if (error) {
      console.error("[ORG] Error updating organization:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ organization: data });

  } catch (error: any) {
    console.error("[ORG] Unexpected error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /organizations/:id
 * 
 * Delete organization (owner only)
 */
app.delete("/organizations/:id", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c.req.header("Authorization"));
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const orgId = c.req.param("id");

    // Check if user is owner
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .single();

    if (!membership || membership.role !== "owner") {
      return c.json({ error: "Only organization owners can delete" }, 403);
    }

    // Delete organization (cascade will delete members)
    const { error } = await supabase
      .from("organizations")
      .delete()
      .eq("id", orgId);

    if (error) {
      console.error("[ORG] Error deleting organization:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });

  } catch (error: any) {
    console.error("[ORG] Unexpected error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =====================================================
// TEAM MANAGEMENT (Members)
// =====================================================

/**
 * GET /organizations/:id/members
 * 
 * Get all members of an organization
 */
app.get("/organizations/:id/members", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c.req.header("Authorization"));
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const orgId = c.req.param("id");

    // Check if user is member
    const { data: membership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .single();

    if (!membership) {
      return c.json({ error: "Not a member of this organization" }, 403);
    }

    // Get all members
    const { data, error } = await supabase
      .from("organization_members")
      .select(`
        role,
        user_id,
        users (
          id,
          name,
          email,
          avatar_url
        )
      `)
      .eq("organization_id", orgId);

    if (error) {
      console.error("[TEAM] Error fetching members:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ members: data || [] });

  } catch (error: any) {
    console.error("[TEAM] Unexpected error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /organizations/:id/members
 * 
 * Invite a user to the organization (owner/admin only)
 */
app.post("/organizations/:id/members", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c.req.header("Authorization"));
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const orgId = c.req.param("id");
    const { user_id, role = "member" } = await c.req.json();

    if (!user_id) {
      return c.json({ error: "user_id is required" }, 400);
    }

    // Check if requester is owner/admin
    const { data: requesterMembership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .single();

    if (!requesterMembership || !["owner", "admin"].includes(requesterMembership.role)) {
      return c.json({ error: "Only owners and admins can invite members" }, 403);
    }

    // Add member
    const { data, error } = await supabase
      .from("organization_members")
      .insert({
        organization_id: orgId,
        user_id: user_id,
        role: role,
      })
      .select()
      .single();

    if (error) {
      console.error("[TEAM] Error adding member:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ member: data });

  } catch (error: any) {
    console.error("[TEAM] Unexpected error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * DELETE /organizations/:id/members/:user_id
 * 
 * Remove a member from the organization (owner/admin only)
 */
app.delete("/organizations/:id/members/:user_id", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c.req.header("Authorization"));
    
    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const orgId = c.req.param("id");
    const targetUserId = c.req.param("user_id");

    // Check if requester is owner/admin
    const { data: requesterMembership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .single();

    if (!requesterMembership || !["owner", "admin"].includes(requesterMembership.role)) {
      return c.json({ error: "Only owners and admins can remove members" }, 403);
    }

    // Can't remove the owner
    const { data: targetMembership } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", targetUserId)
      .single();

    if (targetMembership?.role === "owner") {
      return c.json({ error: "Cannot remove the organization owner" }, 403);
    }

    // Remove member
    const { error } = await supabase
      .from("organization_members")
      .delete()
      .eq("organization_id", orgId)
      .eq("user_id", targetUserId);

    if (error) {
      console.error("[TEAM] Error removing member:", error);
      return c.json({ error: error.message }, 500);
    }

    return c.json({ success: true });

  } catch (error: any) {
    console.error("[TEAM] Unexpected error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =====================================================
// STORAGE MANAGEMENT
// =====================================================

/**
 * GET /storage/usage
 * 
 * Get current user's storage usage
 */
app.get("/storage/usage", async (c) => {
  try {
    const userId = await getUserIdFromAuth(c.req.header("Authorization"));

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const bucketName = "make-3b52693b-storage";

    // List all files for user
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list(`uploads/${userId}`, {
        limit: 1000,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      console.warn("[STORAGE] No files found or bucket doesn't exist:", error);
      return c.json({ 
        totalSize: 0,
        fileCount: 0,
        files: [],
      });
    }

    const totalSize = files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0);

    return c.json({
      totalSize,
      fileCount: files.length,
      files: files.map(f => ({
        name: f.name,
        size: f.metadata?.size || 0,
        createdAt: f.created_at,
      })),
    });

  } catch (error: any) {
    console.error("[STORAGE] Error getting storage usage:", error);
    // Return empty usage instead of error to prevent UI breaking
    return c.json({ 
      totalSize: 0,
      fileCount: 0,
      files: [],
    });
  }
});

// =====================================================
// START SERVER
// =====================================================

console.log("🔐 Scriptony Auth Service Started!");
console.log("📍 Routes:");
console.log("  - POST /signup");
console.log("  - POST /create-demo-user");
console.log("  - GET  /profile");
console.log("  - PUT  /profile");
console.log("  - GET  /organizations");
console.log("  - GET  /organizations/:id");
console.log("  - POST /organizations");
console.log("  - PUT  /organizations/:id");
console.log("  - DELETE /organizations/:id");
console.log("  - GET  /organizations/:id/members");
console.log("  - POST /organizations/:id/members");
console.log("  - DELETE /organizations/:id/members/:user_id");
console.log("  - GET  /storage/usage");

Deno.serve(app.fetch);
