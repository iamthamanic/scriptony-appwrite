import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { lucia } from "./auth";
import { generateId } from "lucia";
import { Database } from "./db";

const app = new Hono();
const db = new Database();

// Health check
app.get("/health", (c) => c.json({ status: "ok", service: "auth" }));

// Register
app.post("/auth/register", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password required" }, 400);
    }

    // Check if user exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return c.json({ error: "User already exists" }, 409);
    }

    // Create user
    const userId = generateId(15);
    const hashedPassword = await Bun.password.hash(password);

    await db.createUser({
      id: userId,
      email,
      password: hashedPassword,
      role: "user",
    });

    // Create session
    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    return c.json(
      {
        success: true,
        user: { id: userId, email, role: "user" },
      },
      201,
      {
        "Set-Cookie": sessionCookie.serialize(),
      },
    );
  } catch (error) {
    console.error("Registration error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Login
app.post("/auth/login", async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email and password required" }, 400);
    }

    // Get user
    const user = await db.getUserByEmail(email);
    if (!user) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Verify password
    const validPassword = await Bun.password.verify(password, user.password);
    if (!validPassword) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    // Create session
    const session = await lucia.createSession(user.id, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    return c.json(
      {
        success: true,
        user: { id: user.id, email: user.email, role: user.role },
      },
      200,
      {
        "Set-Cookie": sessionCookie.serialize(),
      },
    );
  } catch (error) {
    console.error("Login error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Logout
app.post("/auth/logout", async (c) => {
  try {
    const sessionId =
      c.req.header("Authorization")?.replace("Bearer ", "") ||
      c.req.cookie("auth_session");

    if (sessionId) {
      await lucia.invalidateSession(sessionId);
    }

    const blankCookie = lucia.createBlankSessionCookie();

    return c.json({ success: true }, 200, {
      "Set-Cookie": blankCookie.serialize(),
    });
  } catch (error) {
    console.error("Logout error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get current user
app.get("/auth/me", async (c) => {
  try {
    const sessionId =
      c.req.header("Authorization")?.replace("Bearer ", "") ||
      c.req.cookie("auth_session");

    if (!sessionId) {
      return c.json({ error: "Not authenticated" }, 401);
    }

    const { session, user } = await lucia.validateSession(sessionId);

    if (!session) {
      return c.json({ error: "Session expired" }, 401);
    }

    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Session validation error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Start server
const port = process.env.PORT || 3001;
console.log(`Auth service starting on port ${port}`);

serve({
  fetch: app.fetch,
  port: Number(port),
});
