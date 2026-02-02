/**
 * 🎯 SCRIPTONY MAIN SERVER
 * 
 * Unified server for all Scriptony routes.
 * All routes are prefixed with /make-server-3b52693b
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

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
// HELPER: Get User from Token
// =====================================================

async function getUserFromToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    console.error('❌ Auth error:', error?.message);
    return null;
  }
  
  return user.id;
}

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/make-server-3b52693b/health", async (c) => {
  try {
    const { data, error } = await supabase.from("projects").select("id").limit(1);
    
    const tables = [];
    
    if (!error) {
      tables.push("projects");
    }
    
    return c.json({
      status: "ok",
      database: error ? "error" : "connected",
      tables,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return c.json({
      status: "error",
      database: "disconnected",
      error: error.message,
    }, 500);
  }
});

// =====================================================
// PROJECTS ROUTES
// =====================================================

// GET /projects - Get all projects for user
app.get("/make-server-3b52693b/projects", async (c) => {
  try {
    const userId = await getUserFromToken(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return c.json(projects || []);
  } catch (error: any) {
    console.error('❌ Error fetching projects:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /projects/:id - Get single project
app.get("/make-server-3b52693b/projects/:id", async (c) => {
  try {
    const userId = await getUserFromToken(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const projectId = c.req.param('id');

    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (error || !project) {
      return c.json({ error: 'Project not found or access denied' }, 404);
    }

    return c.json(project);
  } catch (error: any) {
    console.error('❌ Error fetching project:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /projects - Create new project
app.post("/make-server-3b52693b/projects", async (c) => {
  try {
    const userId = await getUserFromToken(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        ...body,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return c.json(project);
  } catch (error: any) {
    console.error('❌ Error creating project:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /projects/:id - Update project
app.put("/make-server-3b52693b/projects/:id", async (c) => {
  try {
    const userId = await getUserFromToken(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const projectId = c.req.param('id');
    const body = await c.req.json();

    // Verify ownership
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return c.json({ error: 'Project not found or access denied' }, 404);
    }

    const { data: project, error } = await supabase
      .from('projects')
      .update(body)
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw error;

    return c.json(project);
  } catch (error: any) {
    console.error('❌ Error updating project:', error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /projects/:id - Delete project
app.delete("/make-server-3b52693b/projects/:id", async (c) => {
  try {
    const userId = await getUserFromToken(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const projectId = c.req.param('id');

    // Verify ownership
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return c.json({ error: 'Project not found or access denied' }, 404);
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) throw error;

    return c.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error deleting project:', error);
    return c.json({ error: error.message }, 500);
  }
});

// =====================================================
// WORLDS ROUTES
// =====================================================

// GET /worlds - Get all worlds for user
app.get("/make-server-3b52693b/worlds", async (c) => {
  try {
    const userId = await getUserFromToken(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: worlds, error } = await supabase
      .from('worlds')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return c.json(worlds || []);
  } catch (error: any) {
    console.error('❌ Error fetching worlds:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /worlds/:id - Get single world
app.get("/make-server-3b52693b/worlds/:id", async (c) => {
  try {
    const userId = await getUserFromToken(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const worldId = c.req.param('id');

    const { data: world, error } = await supabase
      .from('worlds')
      .select('*')
      .eq('id', worldId)
      .eq('user_id', userId)
      .single();

    if (error || !world) {
      return c.json({ error: 'World not found or access denied' }, 404);
    }

    return c.json(world);
  } catch (error: any) {
    console.error('❌ Error fetching world:', error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /worlds - Create new world
app.post("/make-server-3b52693b/worlds", async (c) => {
  try {
    const userId = await getUserFromToken(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();

    const { data: world, error } = await supabase
      .from('worlds')
      .insert({
        ...body,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;

    return c.json(world);
  } catch (error: any) {
    console.error('❌ Error creating world:', error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /worlds/:id - Update world
app.put("/make-server-3b52693b/worlds/:id", async (c) => {
  try {
    const userId = await getUserFromToken(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const worldId = c.req.param('id');
    const body = await c.req.json();

    // Verify ownership
    const { data: existing } = await supabase
      .from('worlds')
      .select('id')
      .eq('id', worldId)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return c.json({ error: 'World not found or access denied' }, 404);
    }

    const { data: world, error } = await supabase
      .from('worlds')
      .update(body)
      .eq('id', worldId)
      .select()
      .single();

    if (error) throw error;

    return c.json(world);
  } catch (error: any) {
    console.error('❌ Error updating world:', error);
    return c.json({ error: error.message }, 500);
  }
});

// DELETE /worlds/:id - Delete world
app.delete("/make-server-3b52693b/worlds/:id", async (c) => {
  try {
    const userId = await getUserFromToken(c.req.header('Authorization'));
    if (!userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const worldId = c.req.param('id');
    const body = await c.req.json();
    const password = body?.password;

    // Verify ownership
    const { data: existing } = await supabase
      .from('worlds')
      .select('id')
      .eq('id', worldId)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      return c.json({ error: 'World not found or access denied' }, 404);
    }

    // TODO: Verify password if needed
    // For now, skip password verification

    const { error } = await supabase
      .from('worlds')
      .delete()
      .eq('id', worldId);

    if (error) throw error;

    return c.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error deleting world:', error);
    return c.json({ error: error.message }, 500);
  }
});

// =====================================================
// START SERVER
// =====================================================

console.log("⚠️  Scriptony MAIN Server starting...");
console.log("🚨 All routes are unified in this server");
console.log("✅ Health check available at /make-server-3b52693b/health");
Deno.serve(app.fetch);