/**
 * Capacitor root configuration for the Scriptony mobile shell.
 *
 * This keeps the app runnable as a Vite web app while enabling iOS/Android
 * shells with a stable URL scheme for auth callbacks.
 */

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ai.scriptony.app",
  appName: "Scriptony",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    androidScheme: "https",
  },
  plugins: {
    App: {
      disableBackButtonHandler: false,
    },
  },
};

export default config;
