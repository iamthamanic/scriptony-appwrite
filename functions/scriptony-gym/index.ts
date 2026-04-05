/**
 * 💪 SCRIPTONY GYM - Edge Function
 * 
 * Creative Gym for Scriptony:
 * - Exercises/Challenges CRUD
 * - User progress tracking
 * - Achievements
 * - Daily challenges
 * - AI-powered features:
 *   - Generate custom exercises
 *   - AI feedback on submissions
 *   - Personalized suggestions
 * 
 * Uses centralized AI service from _shared/ai-service/
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { Client, Databases, Query } from "npm:@appwrite/node-sdk";

// =============================================================================
// SETUP
// =============================================================================

const app = new Hono().basePath("/scriptony-gym");

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(Deno.env.get("APPWRITE_FUNCTION_API_ENDPOINT")!)
  .setProject(Deno.env.get("APPWRITE_FUNCTION_PROJECT_ID")!);

const databases = new Databases(client);

// Database IDs
const GYM_DB_ID = Deno.env.get("GYM_DATABASE_ID") || "scriptony_gym";
const EXERCISES_COLLECTION = "exercises";
const PROGRESS_COLLECTION = "user_progress";
const ACHIEVEMENTS_COLLECTION = "achievements";
const CATEGORIES_COLLECTION = "categories";
const SUBMISSIONS_COLLECTION = "submissions";

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
    // TODO: Verify JWT with Appwrite
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
    function: "scriptony-gym",
    version: "1.0.0",
    message: "Scriptony Creative Gym Service",
    endpoints: [
      "GET /exercises - List all exercises",
      "GET /exercises/:id - Get exercise details",
      "POST /exercises/:id/complete - Complete exercise",
      "GET /progress - Get user progress",
      "GET /achievements - List achievements",
      "GET /categories - List categories",
      "GET /daily - Get daily challenge",
      "POST /ai/generate - Generate AI exercise",
      "POST /ai/feedback - Get AI feedback",
      "POST /ai/suggest - Get personalized suggestions",
    ],
  });
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// =============================================================================
// EXERCISES ROUTES
// =============================================================================

/**
 * GET /exercises
 * List all exercises with optional filters
 */
app.get("/exercises", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const category = c.req.query("category");
  const difficulty = c.req.query("difficulty");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");
  
  try {
    const queries: any[] = [
      Query.limit(limit),
      Query.offset(offset),
    ];
    
    if (category) {
      queries.push(Query.equal("category", category));
    }
    
    if (difficulty) {
      queries.push(Query.equal("difficulty", difficulty));
    }
    
    const response = await databases.listDocuments(
      GYM_DB_ID,
      EXERCISES_COLLECTION,
      queries
    );
    
    return c.json({ 
      exercises: response.documents,
      total: response.total,
    });
  } catch (error: any) {
    // Return mock data if DB doesn't exist yet
    console.log("DB not ready, returning mock data");
    
    const mockExercises = [
      {
        id: "char-dev-1",
        title: "Character Development: The Reluctant Hero",
        description: "Create a detailed character backstory for a hero who never wanted to be one.",
        category: "characters",
        difficulty: "medium",
        points: 50,
        estimated_time: 30,
        tags: ["character", "protagonist", "backstory"],
        instructions: "Write a 500-word backstory for a character who becomes a hero by accident. Include: childhood, turning point, current motivation.",
        tips: ["Start with a defining moment", "Show don't tell", "Include flaws"],
      },
      {
        id: "scene-1",
        title: "Scene Writing: The Quiet Moment",
        description: "Write a scene where everything changes in silence.",
        category: "scenes",
        difficulty: "easy",
        points: 25,
        estimated_time: 20,
        tags: ["scene", "dialogue-free", "emotion"],
        instructions: "Write a 2-page scene with no dialogue that shows a character receiving life-changing news.",
        tips: ["Use body language", "Focus on details", "Let silence speak"],
      },
      {
        id: "dialogue-1",
        title: "Dialogue Master: The Argument",
        description: "Write a compelling dialogue between two characters who disagree.",
        category: "dialogue",
        difficulty: "hard",
        points: 100,
        estimated_time: 45,
        tags: ["dialogue", "conflict", "subtext"],
        instructions: "Write a 3-page dialogue where two characters argue about something important. Each should have a valid point.",
        tips: ["Give each character a unique voice", "Use subtext", "Show power dynamics"],
      },
    ];
    
    let filtered = mockExercises;
    
    if (category) {
      filtered = filtered.filter(e => e.category === category);
    }
    
    if (difficulty) {
      filtered = filtered.filter(e => e.difficulty === difficulty);
    }
    
    return c.json({ exercises: filtered, total: filtered.length });
  }
});

/**
 * GET /exercises/:id
 * Get single exercise details
 */
app.get("/exercises/:id", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const exerciseId = c.req.param("id");
  
  try {
    const exercise = await databases.getDocument(
      GYM_DB_ID,
      EXERCISES_COLLECTION,
      exerciseId
    );
    
    return c.json({ exercise });
  } catch (error: any) {
    // Mock data fallback
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
  }
});

/**
 * POST /exercises/:id/complete
 * Mark exercise as completed
 */
app.post("/exercises/:id/complete", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const exerciseId = c.req.param("id");
  const body = await c.req.json();
  const { submission, time_spent } = body;
  
  try {
    // Create submission record
    const submissionRecord = await databases.createDocument(
      GYM_DB_ID,
      SUBMISSIONS_COLLECTION,
      "unique()",
      {
        user_id: userId,
        exercise_id: exerciseId,
        submission,
        time_spent: time_spent || 0,
        completed_at: new Date().toISOString(),
      }
    );
    
    // Update user progress
    // TODO: Implement progress tracking
    
    // Calculate points
    const pointsEarned = 50; // TODO: Get from exercise
    
    return c.json({ 
      success: true,
      submission_id: submissionRecord.$id,
      points_earned: pointsEarned,
      message: "Exercise completed! 🎉"
    });
  } catch (error: any) {
    // Mock response
    return c.json({ 
      success: true,
      points_earned: 50,
      total_points: 150,
      message: "Exercise completed! 🎉"
    });
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
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const response = await databases.listDocuments(
      GYM_DB_ID,
      PROGRESS_COLLECTION,
      [Query.equal("user_id", userId)]
    );
    
    return c.json({ progress: response.documents[0] || null });
  } catch (error: any) {
    // Mock data
    return c.json({ 
      progress: {
        total_points: 150,
        exercises_completed: 3,
        current_streak: 5,
        level: 2,
        achievements: [
          { id: "1", name: "First Steps", earned_at: "2025-01-01" }
        ],
        categories: {
          characters: { completed: 2, total: 12 },
          scenes: { completed: 1, total: 15 },
          dialogue: { completed: 0, total: 10 },
          worldbuilding: { completed: 0, total: 8 },
          plot: { completed: 0, total: 14 },
        }
      }
    });
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
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const response = await databases.listDocuments(
      GYM_DB_ID,
      ACHIEVEMENTS_COLLECTION
    );
    
    return c.json({ achievements: response.documents });
  } catch (error: any) {
    // Mock data
    const mockAchievements = [
      {
        id: "first-steps",
        name: "First Steps",
        description: "Complete your first exercise",
        icon: "🎯",
        points: 10,
        requirement: { type: "exercises_completed", count: 1 },
      },
      {
        id: "character-master",
        name: "Character Master",
        description: "Complete 10 character exercises",
        icon: "👤",
        points: 50,
        requirement: { type: "category_completed", category: "characters", count: 10 },
      },
      {
        id: "week-warrior",
        name: "Week Warrior",
        description: "Maintain a 7-day streak",
        icon: "🔥",
        points: 100,
        requirement: { type: "streak", count: 7 },
      },
      {
        id: "dialogue-expert",
        name: "Dialogue Expert",
        description: "Write 5000 words of dialogue",
        icon: "💬",
        points: 75,
        requirement: { type: "words_written", category: "dialogue", count: 5000 },
      },
      {
        id: "perfectionist",
        name: "Perfectionist",
        description: "Complete 10 exercises with perfect scores",
        icon: "⭐",
        points: 150,
        requirement: { type: "perfect_scores", count: 10 },
      },
    ];
    
    return c.json({ achievements: mockAchievements });
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
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  try {
    const response = await databases.listDocuments(
      GYM_DB_ID,
      CATEGORIES_COLLECTION
    );
    
    return c.json({ categories: response.documents });
  } catch (error: any) {
    // Mock data
    const categories = [
      { 
        id: "characters", 
        name: "Character Development",
        description: "Build compelling characters with depth",
        icon: "👤",
        count: 12,
        color: "#FF6B6B",
      },
      { 
        id: "scenes", 
        name: "Scene Writing",
        description: "Master the art of scene construction",
        icon: "🎬",
        count: 15,
        color: "#4ECDC4",
      },
      { 
        id: "dialogue", 
        name: "Dialogue",
        description: "Write natural, engaging dialogue",
        icon: "💬",
        count: 10,
        color: "#45B7D1",
      },
      { 
        id: "worldbuilding", 
        name: "Worldbuilding",
        description: "Create immersive worlds and settings",
        icon: "🌍",
        count: 8,
        color: "#96CEB4",
      },
      { 
        id: "plot", 
        name: "Plot Structure",
        description: "Structure compelling narratives",
        icon: "📊",
        count: 14,
        color: "#FFEAA7",
      },
      {
        id: "theme",
        name: "Theme & Meaning",
        description: "Explore deeper themes in your writing",
        icon: "🎭",
        count: 6,
        color: "#DDA0DD",
      },
    ];
    
    return c.json({ categories });
  }
});

// =============================================================================
// DAILY CHALLENGE ROUTES
// =============================================================================

/**
 * GET /daily
 * Get today's daily challenge
 */
app.get("/daily", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // TODO: Get daily challenge from DB based on date
    return c.json({ 
      challenge: {
        id: "daily-" + today,
        title: "Daily Challenge: Write a Twist",
        description: "Write a scene with an unexpected plot twist",
        category: "plot",
        difficulty: "medium",
        points: 75,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        instructions: "Write a 1-page scene where the reader discovers something unexpected.",
        tips: ["Misdirection is key", "Set up early", "Pay off late"],
      }
    });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// AI-POWERED FEATURES
// =============================================================================

/**
 * POST /ai/generate
 * Generate a custom AI exercise
 */
app.post("/ai/generate", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const body = await c.req.json();
  const { category, difficulty, focus } = body;
  
  try {
    // Import AI service
    const { chat } = await import("../_shared/ai-service");
    
    const systemPrompt = `You are a creative writing exercise generator for Scriptony Gym.
Generate a unique, engaging writing exercise with the following structure:
{
  "title": "Exercise title (catchy)",
  "description": "Brief description of the exercise",
  "instructions": "Detailed step-by-step instructions",
  "tips": ["Array of 3-5 helpful tips"],
  "estimated_time": 30,
  "points": 50
}

Be creative and specific. Focus on actionable exercises.`;

    const messages = [
      {
        role: "user",
        content: `Generate a ${difficulty || "medium"} difficulty ${category || "characters"} exercise${focus ? ` focusing on ${focus}` : ""}. Make it unique and engaging.`,
      },
    ];
    
    const response = await chat(userId, messages, "creative_gym", {
      systemPrompt,
      temperature: 0.9,
    });
    
    // Parse AI response as JSON
    let exercise;
    try {
      exercise = JSON.parse(response.content);
    } catch {
      // If AI didn't return valid JSON, create a structured response
      exercise = {
        title: "AI-Generated Exercise",
        description: response.content,
        instructions: "Follow the AI's suggestions above.",
        tips: ["Be creative", "Take your time", "Have fun"],
        estimated_time: 30,
        points: 50,
      };
    }
    
    return c.json({ 
      exercise: {
        id: "ai-" + Date.now(),
        category: category || "characters",
        difficulty: difficulty || "medium",
        ...exercise,
        is_ai_generated: true,
      }
    });
  } catch (error: any) {
    console.error("AI generate error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /ai/feedback
 * Get AI feedback on submission
 */
app.post("/ai/feedback", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const body = await c.req.json();
  const { exercise_id, submission } = body;
  
  if (!submission) {
    return c.json({ error: "Submission required" }, 400);
  }
  
  try {
    const { chat } = await import("../_shared/ai-service");
    
    const systemPrompt = `You are a creative writing coach. Provide constructive, encouraging feedback.
Your feedback should be structured as:
{
  "score": 85,
  "strengths": ["What the writer did well"],
  "improvements": ["Specific, actionable suggestions"],
  "overall": "A brief encouraging summary",
  "next_steps": ["Suggested next exercises or topics"]
}

Be specific, supportive, and actionable. Focus on growth.`;

    const messages = [
      {
        role: "user",
        content: `Please provide feedback on this writing submission:\n\n${submission}`,
      },
    ];
    
    const response = await chat(userId, messages, "creative_gym", {
      systemPrompt,
      temperature: 0.7,
    });
    
    let feedback;
    try {
      feedback = JSON.parse(response.content);
    } catch {
      feedback = {
        score: 75,
        strengths: ["Good effort!"],
        improvements: ["Keep practicing"],
        overall: response.content,
        next_steps: ["Try another exercise"],
      };
    }
    
    return c.json({ feedback });
  } catch (error: any) {
    console.error("AI feedback error:", error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * POST /ai/suggest
 * Get personalized exercise suggestions
 */
app.post("/ai/suggest", async (c) => {
  const authHeader = c.req.header("Authorization");
  const userId = await getUserIdFromAuth(authHeader);
  
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const body = await c.req.json();
  const { progress, interests } = body;
  
  try {
    const { chat } = await import("../_shared/ai-service");
    
    const systemPrompt = `You are a creative writing coach. Suggest personalized exercises.
Return 3 exercise suggestions as:
[
  {
    "category": "characters|scenes|dialogue|worldbuilding|plot|theme",
    "title": "Exercise title",
    "reason": "Why this exercise fits the user's needs",
    "difficulty": "easy|medium|hard"
  }
]`;

    const messages = [
      {
        role: "user",
        content: `Suggest exercises for a writer with this progress: ${JSON.stringify(progress || {})}
Interests: ${interests?.join(", ") || "general improvement"}`,
      },
    ];
    
    const response = await chat(userId, messages, "creative_gym", {
      systemPrompt,
      temperature: 0.8,
    });
    
    let suggestions;
    try {
      suggestions = JSON.parse(response.content);
    } catch {
      suggestions = [
        {
          category: "characters",
          title: "Character Development: Inner Conflict",
          reason: "Great for deepening character understanding",
          difficulty: "medium",
        },
      ];
    }
    
    return c.json({ suggestions });
  } catch (error: any) {
    console.error("AI suggest error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// =============================================================================
// START SERVER
// =============================================================================

console.log("💪 Scriptony Gym Function starting...");
Deno.serve(app.fetch);