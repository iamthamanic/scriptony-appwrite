/**
 * Capacitor platform helpers.
 *
 * These functions keep native/mobile concerns isolated from the rest of the app.
 */

import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Preferences } from "@capacitor/preferences";
import { backendConfig } from "../env";

export const NHOST_SESSION_STORAGE_KEY = "nhostSession";

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

export function getNativePlatform(): string {
  return Capacitor.getPlatform();
}

export async function hydrateNativeSessionStorage(): Promise<void> {
  if (!isNativePlatform() || typeof window === "undefined") {
    return;
  }

  try {
    const { value } = await Preferences.get({ key: NHOST_SESSION_STORAGE_KEY });
    if (value && !window.localStorage.getItem(NHOST_SESSION_STORAGE_KEY)) {
      window.localStorage.setItem(NHOST_SESSION_STORAGE_KEY, value);
    }
  } catch (error) {
    console.warn("[Capacitor] Failed to hydrate native session storage:", error);
  }
}

export async function persistNativeSessionStorage(value: string | null): Promise<void> {
  if (!isNativePlatform()) {
    return;
  }

  try {
    if (value) {
      await Preferences.set({ key: NHOST_SESSION_STORAGE_KEY, value });
    } else {
      await Preferences.remove({ key: NHOST_SESSION_STORAGE_KEY });
    }
  } catch (error) {
    console.warn("[Capacitor] Failed to persist native session storage:", error);
  }
}

export function mapNativeUrlToWebUrl(nativeUrl: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const parsed = new URL(nativeUrl);
    const callbackHost = backendConfig.capacitor.callbackHost;
    const path =
      parsed.host && parsed.host !== callbackHost
        ? `/${parsed.host}${parsed.pathname === "/" ? "" : parsed.pathname}`
        : parsed.pathname === "/"
          ? ""
          : parsed.pathname;

    return `${window.location.origin}${path}${parsed.search}${parsed.hash}`;
  } catch (error) {
    console.warn("[Capacitor] Failed to map native URL:", nativeUrl, error);
    return null;
  }
}

export async function installCapacitorUrlListener(): Promise<void> {
  if (!isNativePlatform() || typeof window === "undefined") {
    return;
  }

  await App.addListener("appUrlOpen", ({ url }) => {
    const targetUrl = mapNativeUrlToWebUrl(url);
    if (targetUrl) {
      window.location.replace(targetUrl);
    }
  });
}
