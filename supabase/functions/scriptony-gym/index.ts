/**
 * 💪 SCRIPTONY GYM - Edge Function
 * 
 * 🕐 LAST UPDATED: 2025-10-15 13:25 UTC
 * 📝 STABLE VERSION - No recent changes
 * 
 * Handles Creative Gym operations:
 * - Exercises/Challenges CRUD
 * - User progress tracking
 * - Achievements
 * - Leaderboards (future)
 * 
 * UNABHÄNGIG DEPLOYBAR - Gym-Änderungen beeinflussen Timeline/Projects nicht!
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

// =============================================================================
// SETUP
// =============================================================================

// IMPORTANT: Supabase adds function name as prefix to all paths!
const app = new Hono().basePath("/scriptony-gym");

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
    function: "scriptony-gym",
    version: "1.0.0",
    message: "Scriptony Creative Gym Service is running!",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (c) => {
  return c.json({ 
    status: "ok", 
    function: "scriptony-gym",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// =============================================================================
// EXERCISES ROUTES
// =============================================================================

/**
 * GET /exercises
 * Get all exercises/challenges
 */
app.get("/exercises", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const category = c.req.query("category");
    const difficulty = c.req.query("difficulty");

    // TODO: Implement exercises table
    // For now, return mock data
    const mockExercises = [
      {
        id: "1",
        title: "Character Development",
        description: "Create a detailed character backstory",
        category: "characters",
        difficulty: "medium",
        points: 50,
      },
      {
        id: "2",
        title: "Scene Description",
        description: "Write a vivid scene description",
        category: "scenes",
        difficulty: "easy",
        points: 25,
      },
      {
        id: "3",
        title: "Dialogue Master",
        description: "Write a compelling dialogue scene",
        category: "dialogue",
        difficulty: "hard",
        points: 100,
      },
    ];

    let filtered = mockExercises;
    
    if (category) {
      filtered = filtered.filter(e => e.category === category);
    }
    
    if (difficulty) {
      filtered = filtered.filter(e => e.difficulty === difficulty);
    }

    return c.json({ exercises: filtered });
  } catch (error: any) {
    console.error("Exercises GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * GET /exercises/:id
 * Get single exercise details
 */
app.get("/exercises/:id", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const exerciseId = c.req.param("id");

    // TODO: Implement exercises table
    return c.json({ 
      exercise: {
        id: exerciseId,
        title: "Exercise Title",
        description: "Exercise description",
        category: "characters",
        difficulty: "medium",
        points: 50,
        instructions: "Detailed instructions here...",
      }
    });
  } catch (error: any) {
    console.error("Exercise GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /exercises/:id/complete
 * Mark exercise as completed
 */
app.post("/exercises/:id/complete", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const exerciseId = c.req.param("id");
    const body = await c.req.json();
    const { submission } = body;

    // TODO: Implement user_exercise_progress table
    // For now, return mock response
    return c.json({ 
      success: true,
      points_earned: 50,
      total_points: 150,
      message: "Exercise completed! 🎉"
    });
  } catch (error: any) {
    console.error("Exercise complete error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// PROGRESS ROUTES
// =============================================================================

/**
 * GET /progress
 * Get user's gym progress
 */
app.get("/progress", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // TODO: Implement user_gym_progress table
    return c.json({ 
      progress: {
        total_points: 150,
        exercises_completed: 3,
        current_streak: 5,
        level: 2,
        achievements: [
          { id: "1", name: "First Steps", earned_at: "2025-01-01" }
        ]
      }
    });
  } catch (error: any) {
    console.error("Progress GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// ACHIEVEMENTS ROUTES
// =============================================================================

/**
 * GET /achievements
 * Get all available achievements
 */
app.get("/achievements", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // TODO: Implement achievements table
    const mockAchievements = [
      {
        id: "1",
        name: "First Steps",
        description: "Complete your first exercise",
        icon: "🎯",
        points: 10,
      },
      {
        id: "2",
        name: "Character Master",
        description: "Complete 10 character exercises",
        icon: "👤",
        points: 50,
      },
      {
        id: "3",
        name: "Week Warrior",
        description: "Maintain a 7-day streak",
        icon: "🔥",
        points: 100,
      },
    ];

    return c.json({ achievements: mockAchievements });
  } catch (error: any) {
    console.error("Achievements GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// CATEGORIES ROUTES
// =============================================================================

/**
 * GET /categories
 * Get all exercise categories
 */
app.get("/categories", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const categories = [
      { 
        id: "characters", 
        name: "Character Development",
        icon: "👤",
        count: 12 
      },
      { 
        id: "scenes", 
        name: "Scene Writing",
        icon: "🎬",
        count: 15 
      },
      { 
        id: "dialogue", 
        name: "Dialogue",
        icon: "💬",
        count: 10 
      },
      { 
        id: "worldbuilding", 
        name: "Worldbuilding",
        icon: "🌍",
        count: 8 
      },
      { 
        id: "plot", 
        name: "Plot Structure",
        icon: "📊",
        count: 14 
      },
    ];

    return c.json({ categories });
  } catch (error: any) {
    console.error("Categories GET error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// DAILY CHALLENGE ROUTES
// =============================================================================

/**
 * GET /daily-challenge
 * Get today's daily challenge
 */
app.get("/daily-challenge", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    const userId = await getUserIdFromAuth(authHeader);

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // TODO: Implement daily challenges
    const today = new Date().toISOString().split('T')[0];
    
    return c.json({ 
      challenge: {
        id: "daily-" + today,
        title: "Daily Challenge: Write a Twist",
        description: "Write a scene with an unexpected plot twist",
        category: "plot",
        difficulty: "medium",
        points: 75,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }
    });
  } catch (error: any) {
    console.error("Daily challenge error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// START SERVER
// =============================================================================

console.log("💪 Scriptony Gym Function starting...");
Deno.serve(app.fetch);
