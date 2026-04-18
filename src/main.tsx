import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/safe-area.css";
import {
  hydrateNativeSessionStorage,
  installCapacitorUrlListener,
} from "./lib/capacitor/platform";
import { client } from "./lib/appwrite/appwrite";

// Render immediately — never block on async setup
createRoot(document.getElementById("root")!).render(<App />);

// Run non-critical async setup in the background
void (async () => {
  try {
    await hydrateNativeSessionStorage();
    await installCapacitorUrlListener();
  } catch {
    // Non-critical — app works without these
  }
})();

// Health check: fire and forget, never blocks rendering
client
  .ping()
  .then(() => {
    console.log("[Appwrite] ping OK — SDK reachability check passed.");
  })
  .catch((err: unknown) => {
    console.warn(
      "[Appwrite] ping failed (check endpoint / CORS / network):",
      err,
    );
  });
