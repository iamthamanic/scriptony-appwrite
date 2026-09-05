/**
 * Voice Studio — design-saved dropdown + save flow (verify-ui).
 * Acceptance: .qa/acceptance/voice-design-saved-dropdown.md
 */

import { test, expect, type Page } from "@playwright/test";
import path from "path";

const evidenceDir = path.join(
  process.cwd(),
  ".qa/evidence/voice-design-saved-dropdown",
);

const CLUTTER_PROFILES = [
  {
    id: "vb-qa-verify",
    name: "QA Verify Test — designt",
    language: "de",
    voice_type: "designed",
  },
  {
    id: "vb-pazulu-sohee",
    name: "Pazulu — Sohee",
    language: "de",
    voice_type: "preset",
  },
  {
    id: "vb-ccc",
    name: "Ccc",
    language: "de",
    voice_type: "cloned",
  },
  {
    id: "vb-p1",
    name: "Bella",
    language: "de",
    default_engine: "kokoro",
  },
];

let profilePostCount = 0;

async function resetQaStore(page: Page, seedLegacy = false) {
  await page.goto("/#qa-mve-voice");
  await page.waitForSelector('[data-testid="mve-voice-preview"]', {
    timeout: 60_000,
  });
  await page.evaluate(() => {
    (
      window as Window & {
        __QA_RESET_MVE_VOICE_PREVIEW_STORE__?: () => void;
      }
    ).__QA_RESET_MVE_VOICE_PREVIEW_STORE__?.();
  });
  if (seedLegacy) {
    await page.evaluate(() => {
      (
        window as Window & {
          __QA_SEED_LEGACY_DESIGN_VOICE__?: () => void;
        }
      ).__QA_SEED_LEGACY_DESIGN_VOICE__?.();
    });
  }
}

async function mockVoicebox(page: Page, options?: { designFlow?: boolean }) {
  profilePostCount = 0;

  await page.addInitScript(() => {
    (window as unknown as { __TAURI__: unknown }).__TAURI__ = {
      core: {
        invoke: async (cmd: string) => {
          if (cmd === "start_voicebox_app") return "launched";
          return null;
        },
      },
    };
  });

  await page.route(/\/__voicebox\/health$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        status: "healthy",
        model_loaded: true,
        model_downloaded: true,
        gpu_available: true,
      },
    });
  });

  await page.route(/\/__voicebox\/profiles$/, async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        contentType: "application/json",
        json: CLUTTER_PROFILES,
      });
      return;
    }
    if (options?.designFlow && route.request().method() === "POST") {
      profilePostCount += 1;
      const body = route.request().postDataJSON() as Record<string, string>;
      await route.fulfill({
        contentType: "application/json",
        json: {
          id: `vb-preview-${profilePostCount}`,
          name: body.name,
          language: "de",
          voice_type: "designed",
        },
      });
      return;
    }
    await route.continue();
  });

  await page.route(/\/__voicebox\/profiles\/[^/]+$/, async (route) => {
    const method = route.request().method();
    const id = route.request().url().split("/").pop() ?? "vb-mock";
    if (method === "PUT" || method === "PATCH") {
      await route.fulfill({
        contentType: "application/json",
        json: {
          id,
          name: "Feenschimmer",
          language: "de",
          voice_type: "designed",
        },
      });
      return;
    }
    if (method === "DELETE") {
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    await route.continue();
  });

  await page.route(/\/__voicebox\/generate$/, async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        id: `gen-${Date.now()}`,
        status: "completed",
        audio_path: "generations/mock.wav",
        duration: 1.2,
      },
    });
  });

  await page.route(/\/__voicebox\/audio\//, async (route) => {
    const wavHeader = new Uint8Array(44);
    await route.fulfill({
      status: 200,
      contentType: "audio/wav",
      body: Buffer.from(wavHeader),
    });
  });

  await page.route(
    /\/__voicebox\/profiles\/presets\/qwen_custom_voice$/,
    async (route) => {
      await route.fulfill({
        contentType: "application/json",
        json: { voices: [] },
      });
    },
  );
}

async function openUnassignedVoiceStudio(page: Page) {
  await page
    .getByTestId("voice-row-unassigned")
    .getByRole("button", { name: "Charakterstimme bearbeiten" })
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Charakterstimme — Max Weber")).toBeVisible();
  return dialog;
}

async function openLegacyVoiceStudio(page: Page) {
  await page
    .getByTestId("voice-row-design-legacy")
    .getByRole("button", { name: "Charakterstimme bearbeiten" })
    .click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Charakterstimme — Max Weber")).toBeVisible();
  return dialog;
}

test.beforeEach(async ({ page }) => {
  await mockVoicebox(page);
});

test("voice studio hides global voicebox clutter when no design save", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await resetQaStore(page);
  const dialog = await openUnassignedVoiceStudio(page);

  await expect(page.getByTestId("voice-design-saved-empty-hint")).toBeVisible({
    timeout: 30_000,
  });

  await dialog.screenshot({
    path: path.join(evidenceDir, "01-voice-studio-empty-design-dropdown.png"),
  });

  await page.getByTestId("character-voice-select-trigger").click();
  const content = page.getByTestId("character-voice-select-content");
  await expect(content.getByText("QA Verify Test — designt")).toHaveCount(0);
  await expect(
    content.getByText("Noch keine gespeicherte Design-Stimme"),
  ).toBeVisible();
  await page.keyboard.press("Escape");
});

test("save design candidate updates dropdown with saved voice only", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await mockVoicebox(page, { designFlow: true });
  await resetQaStore(page);
  const dialog = await openUnassignedVoiceStudio(page);

  await dialog.getByTestId("mve-voice-desc").fill("feenhafte Frauenstimme hoch");
  await page.getByTestId("voice-studio-design").click();

  await expect(page.getByText("Drei Kandidaten bereit")).toBeVisible({
    timeout: 60_000,
  });

  await page.getByTestId("voice-design-save-0").click();
  await expect(page.getByTestId("voice-design-save-dialog")).toBeVisible();
  await page.getByTestId("voice-design-save-name-input").fill("Feenschimmer");
  await page.getByTestId("voice-design-save-dialog")
    .getByTestId("voice-design-save-confirm")
    .click();

  await expect(page.getByText("Stimme gespeichert: Feenschimmer")).toBeVisible({
    timeout: 30_000,
  });

  await page.getByTestId("character-voice-select-trigger").click();
  const content = page.getByTestId("character-voice-select-content");
  await expect(content.getByText("Max Weber — Feenschimmer")).toBeVisible();
  await expect(content.getByText("QA Verify Test — designt")).toHaveCount(0);
  await page.keyboard.press("Escape");

  await dialog.screenshot({
    path: path.join(evidenceDir, "02-voice-studio-after-save-dropdown.png"),
  });
});

test("legacy design-saved voice appears in dropdown", async ({ page }) => {
  test.setTimeout(60_000);
  await resetQaStore(page, true);
  const dialog = await openLegacyVoiceStudio(page);

  await page.getByTestId("character-voice-select-trigger").click();
  const content = page.getByTestId("character-voice-select-content");
  await expect(content.getByText("Max Weber — Legacy Designt")).toBeVisible();
  await expect(content.getByText("QA Verify Test — designt")).toHaveCount(0);
  await page.keyboard.press("Escape");

  await dialog.screenshot({
    path: path.join(evidenceDir, "03-legacy-design-saved-dropdown.png"),
  });
});

test("catalog suggest profile is hidden from design-saved dropdown", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await resetQaStore(page);
  await page.evaluate(() => {
    (
      window as Window & {
        __QA_SEED_CATALOG_SUGGEST_VOICE__?: () => void;
      }
    ).__QA_SEED_CATALOG_SUGGEST_VOICE__?.();
  });

  const dialog = await openUnassignedVoiceStudio(page);
  await expect(page.getByTestId("voice-design-saved-empty-hint")).toBeVisible();
  await page.getByTestId("character-voice-select-trigger").click();
  await expect(
    page.getByTestId("character-voice-select-content").getByText(
      "Max Weber — generiert",
    ),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await dialog.screenshot({
    path: path.join(evidenceDir, "04-catalog-suggest-hidden.png"),
  });
});

test("preview play works after save", async ({ page }) => {
  test.setTimeout(120_000);
  await mockVoicebox(page, { designFlow: true });
  await resetQaStore(page);
  const dialog = await openUnassignedVoiceStudio(page);

  await dialog.getByTestId("mve-voice-desc").fill("warme Erzählerstimme");
  await page.getByTestId("voice-studio-design").click();
  await expect(page.getByText("Drei Kandidaten bereit")).toBeVisible({
    timeout: 60_000,
  });

  await page.getByTestId("voice-design-save-0").click();
  await page.getByTestId("voice-design-save-name-input").fill("Erzähler QA");
  await page.getByTestId("voice-design-save-dialog")
    .getByTestId("voice-design-save-confirm")
    .click();
  await expect(page.getByText("Stimme gespeichert: Erzähler QA")).toBeVisible({
    timeout: 30_000,
  });

  await dialog.getByLabel("Vorschau abspielen").click();
  await expect(dialog.getByLabel("Vorschau abspielen")).toBeEnabled({
    timeout: 30_000,
  });
});

test("characters panel row still resolves voicebox catalog label", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await resetQaStore(page, true);

  const assigned = page.getByTestId("voice-row-assigned");
  await expect(assigned.getByText(/Bella/)).toBeVisible({ timeout: 30_000 });

  await assigned.screenshot({
    path: path.join(
      evidenceDir,
      "05-characters-panel-catalog-unchanged.png",
    ),
  });
});
