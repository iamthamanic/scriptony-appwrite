/**
 * Local Bridge entry point.
 *
 * Starts the daemon, connects to Appwrite Realtime and ComfyUI,
 * and processes render jobs.
 *
 * Graceful shutdown drains in-flight jobs before exiting.
 */

import "dotenv/config";
import { start, stop } from "./bridge-orchestrator.js";

let _shuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (_shuttingDown) return;
  _shuttingDown = true;

  console.log(`Received ${signal}, shutting down gracefully...`);
  try {
    await stop();
  } catch (err) {
    console.error("Error during shutdown:", err);
  }
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("uncaughtException", async (err) => {
  console.error("Uncaught exception:", err);
  if (!_shuttingDown) {
    await gracefulShutdown("uncaughtException").catch(() => process.exit(1));
  }
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  // Log but don't exit — the bridge should be resilient to individual job failures.
  // If core infrastructure (Realtime, WS) fails, the health endpoint will report it.
});

// Start the bridge
start().catch((err) => {
  console.error("Failed to start Local Bridge:", err);
  process.exit(1);
});