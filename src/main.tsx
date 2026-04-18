import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/safe-area.css";
import {
  hydrateNativeSessionStorage,
  installCapacitorUrlListener,
} from "./lib/capacitor/platform";
import { client } from "./lib/appwrite/appwrite";

async function bootstrap() {
  await hydrateNativeSessionStorage();
  await installCapacitorUrlListener();

  void client
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

  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
