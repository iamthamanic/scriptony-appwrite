import { projectsApi, worldsApi, categoriesApi, itemsApi } from "./api";
import { backendConfig } from "../lib/env";
import { buildFunctionRouteUrl, EDGE_FUNCTIONS } from "../lib/api-gateway";

export async function seedTestUser() {
  try {
    console.log("🔗 Calling create-demo-user endpoint...");
    
    // Use the existing /create-demo-user endpoint
    const response = await fetch(
      buildFunctionRouteUrl(EDGE_FUNCTIONS.AUTH, "/create-demo-user"),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(backendConfig.publicAuthToken
            ? { Authorization: `Bearer ${backendConfig.publicAuthToken}` }
            : {}),
        },
      }
    );

    console.log("📡 Seed response status:", response.status, response.statusText);

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Demo user created:", result.email);
      return result;
    } else {
      const errorText = await response.text();
      
      // Check if user already exists - this is OK, not an error
      if (errorText.includes("already been registered") || response.status === 409) {
        console.log("ℹ️  Demo user already exists - skipping creation");
        return { email: "demo@scriptony.app", message: "User already exists" };
      }
      
      console.error("❌ Failed to seed demo user:", errorText);
      throw new Error(`Seed failed: ${errorText}`);
    }
  } catch (error) {
    console.error("❌ Error seeding demo user:", error);
    throw error;
  }
}

export async function seedInitialData() {
  try {
    console.log("⚠️ seedInitialData() is deprecated - no mock data will be created");
    console.log("ℹ️  Create your first project and world manually in the UI");
    return;
  } catch (error) {
    console.error("Error seeding data:", error);
    throw error;
  }
}
