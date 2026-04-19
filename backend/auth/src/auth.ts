import { Lucia } from "lucia";
import { PostgresJsAdapter } from "@lucia-auth/adapter-postgresql";
import postgres from "postgres";

// Database connection
const connectionString =
  process.env.DATABASE_URL ||
  "postgres://scriptony:scriptony_secret@localhost:5432/scriptony";
const sql = postgres(connectionString);

// Lucia adapter
const adapter = new PostgresJsAdapter(sql, {
  user: "auth_users",
  session: "auth_sessions",
});

// Lucia configuration
export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    },
  },
  getUserAttributes: (attributes) => {
    return {
      email: attributes.email,
      role: attributes.role,
    };
  },
});

// Type declarations
declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      email: string;
      role: string;
    };
  }
}
