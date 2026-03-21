/**
 * Storage Provider Registry
 *
 * Central list of storage providers for the Speicher tab. Scriptony Cloud is
 * the backend-supported provider; others are client-only when implemented.
 */

import type { StorageProviderMeta } from "./types";

const PROVIDERS: StorageProviderMeta[] = [
  {
    id: "scriptony_cloud",
    name: "Scriptony Cloud",
    description:
      "Projekte und Dateien werden in der Scriptony-Cloud gespeichert. Standard für alle Nutzer.",
    backendSupported: true,
    comingSoon: false,
  },
  {
    id: "google_drive",
    name: "Google Drive",
    description: "Projekte in deinem Google Drive speichern – volle Datenhoheit.",
    backendSupported: false,
    comingSoon: true,
  },
  {
    id: "dropbox",
    name: "Dropbox",
    description: "Projekte in deinem Dropbox-Ordner speichern.",
    backendSupported: false,
    comingSoon: true,
  },
  {
    id: "onedrive",
    name: "OneDrive",
    description: "Projekte in Microsoft OneDrive speichern.",
    backendSupported: false,
    comingSoon: true,
  },
  {
    id: "kdrive",
    name: "KDrive (Infomaniak)",
    description:
      "Projekte in deinem KDrive-Cloudspeicher (Infomaniak) speichern – europäische Server.",
    backendSupported: false,
    comingSoon: true,
  },
  {
    id: "hetzner",
    name: "Hetzner Cloud Storage",
    description: "S3-kompatibler Object Storage von Hetzner – Verbindung per Access Key.",
    backendSupported: false,
    comingSoon: true,
  },
  {
    id: "local",
    name: "Lokal (Dieser Rechner)",
    description: "Projekte nur auf diesem Gerät speichern – z. B. in einem Ordner deiner Wahl.",
    backendSupported: false,
    comingSoon: true,
  },
];

const DEFAULT_PROVIDER_ID = "scriptony_cloud";

const STORAGE_PREF_KEY = "scriptony_storage_provider_id";

export function listStorageProviders(): StorageProviderMeta[] {
  return [...PROVIDERS];
}

export function getStorageProviderMeta(id: string): StorageProviderMeta | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export function getDefaultStorageProviderId(): string {
  return DEFAULT_PROVIDER_ID;
}

/** Currently selected provider id (persisted in localStorage). */
export function getSelectedStorageProviderId(): string {
  if (typeof window === "undefined") return DEFAULT_PROVIDER_ID;
  const saved = localStorage.getItem(STORAGE_PREF_KEY);
  const normalized =
    saved === "nhost" ? DEFAULT_PROVIDER_ID : saved;
  if (normalized && PROVIDERS.some((p) => p.id === normalized)) return normalized;
  return DEFAULT_PROVIDER_ID;
}

export function setSelectedStorageProviderId(providerId: string): void {
  if (!PROVIDERS.some((p) => p.id === providerId)) return;
  localStorage.setItem(STORAGE_PREF_KEY, providerId);
}
