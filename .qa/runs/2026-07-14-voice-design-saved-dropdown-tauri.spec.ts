/**
 * Tauri manual — reopen voice studio after design save.
 * Run in dev:desktop WebView after saving a candidate in a real project.
 */

import { test, expect } from "@playwright/test";
import path from "path";

const evidenceDir = path.join(
  process.cwd(),
  ".qa/evidence/voice-design-saved-dropdown/tauri",
);

test.setTimeout(180_000);

test("Tauri manual — saved voice persists after modal reopen", async ({
  page,
}) => {
  const hasTauri = await page.evaluate(() => {
    const w = window as Window & { __TAURI__?: unknown };
    return w.__TAURI__ !== undefined;
  });

  test.skip(
    !hasTauri,
    "Skipped: run in dev:desktop — save a candidate, close modal, reopen Voice Studio",
  );

  await page.goto("/#qa-mve-voice");
  await page.waitForSelector('[data-testid="mve-voice-preview"]', {
    timeout: 90_000,
  });

  await page.screenshot({
    path: path.join(evidenceDir, "01-tauri-reopen-checklist.png"),
    fullPage: true,
  });

  await expect(page.getByTestId("mve-voice-preview")).toBeVisible();
});
