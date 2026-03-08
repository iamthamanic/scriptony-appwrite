
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./index.css";
  import {
    hydrateNativeSessionStorage,
    installCapacitorUrlListener,
  } from "./lib/capacitor/platform";

  async function bootstrap() {
    await hydrateNativeSessionStorage();
    await installCapacitorUrlListener();

    createRoot(document.getElementById("root")!).render(<App />);
  }

  void bootstrap();
  