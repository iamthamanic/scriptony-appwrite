/**
 * StorageSettingsSection
 *
 * Renders the "Speicher" tab content in Einstellungen. Each provider is
 * expandable to show storage usage and connection UI. Option A: Nhost only
 * on backend; other providers client-only when implemented.
 */

import { useState, useEffect, useMemo } from "react";
import { Cloud, HardDrive, Check, Search, ChevronDown, Link2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import {
  listStorageProviders,
  getSelectedStorageProviderId,
  setSelectedStorageProviderId,
  getStorageProviderMeta,
  getStorageOAuthAuthorizeUrl,
  getStoredStorageOAuthTokens,
  setStoredStorageOAuthTokens,
  clearStoredStorageOAuthTokens,
  parseStorageOAuthCallbackHash,
  clearStorageOAuthFromHash,
  OAUTH_PROVIDERS,
  type StorageProviderMeta,
} from "../lib/storage-provider";
import { toast } from "sonner@2.0.3";
import { useAuth } from "../hooks/useAuth";
import { getStorageUsage, formatBytes, STORAGE_LIMIT_BYTES } from "../utils/storage";

const providerIcons: Record<string, React.ReactNode> = {
  nhost: <Cloud className="size-4" />,
  google_drive: <Cloud className="size-4" />,
  dropbox: <Cloud className="size-4" />,
  onedrive: <Cloud className="size-4" />,
  kdrive: <Cloud className="size-4" />,
  hetzner: <Cloud className="size-4" />,
  local: <HardDrive className="size-4" />,
};

function filterProvidersBySearch(providers: StorageProviderMeta[], query: string): StorageProviderMeta[] {
  const q = query.trim().toLowerCase();
  if (!q) return providers;
  return providers.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q)
  );
}

export function StorageSettingsSection() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string>(() => getSelectedStorageProviderId());
  const [searchQuery, setSearchQuery] = useState("");
  const [storageUsage, setStorageUsage] = useState<{
    totalSize: number;
    fileCount: number;
    files: Array<{ name: string; size: number; createdAt: string }>;
  } | null>(null);
  const isDemoMode = typeof window !== "undefined" && localStorage.getItem("scriptony_demo_mode") === "true";
  const allProviders = listStorageProviders();
  const providers = useMemo(
    () => filterProvidersBySearch(allProviders, searchQuery),
    [allProviders, searchQuery]
  );

  useEffect(() => {
    setSelectedStorageProviderId(selectedId);
  }, [selectedId]);

  useEffect(() => {
    const tokens = parseStorageOAuthCallbackHash();
    if (tokens) {
      setStoredStorageOAuthTokens(tokens);
      clearStorageOAuthFromHash();
      const name = getStorageProviderMeta(tokens.provider)?.name ?? tokens.provider;
      toast.success(`${name} verbunden`, {
        description: "Speicheranbieter wurde erfolgreich verknüpft. Tokens sind nur lokal gespeichert.",
      });
    }
  }, []);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user || isDemoMode) {
      if (isDemoMode) setStorageUsage({ totalSize: 0, fileCount: 0, files: [] });
      return;
    }
    let cancelled = false;
    getStorageUsage(user.id)
      .then((usage) => { if (!cancelled) setStorageUsage(usage); })
      .catch(() => { if (!cancelled) setStorageUsage({ totalSize: 0, fileCount: 0, files: [] }); });
    return () => { cancelled = true; };
  }, [user?.id, isDemoMode]);

  const storagePercentage = storageUsage
    ? Math.min((storageUsage.totalSize / STORAGE_LIMIT_BYTES) * 100, 100)
    : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Cloud className="size-4" />
              Speicherort
            </CardTitle>
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Anbieter durchsuchen…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
                aria-label="Speicheranbieter durchsuchen"
              />
            </div>
          </div>
          <CardDescription className="text-xs">
            Wähle, wo deine Projekte und Dateien gespeichert werden. Aktuell:{" "}
            <strong>{getStorageProviderMeta(selectedId)?.name ?? "Scriptony Cloud (Nhost)"}</strong>.
            Weitere Anbieter kommen in Kürze – deine Datenhoheit bleibt gewährleistet.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          {providers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Keine Anbieter passen zu „{searchQuery.trim() || "…"}“.</p>
          ) : (
            providers.map((provider) => (
              <ProviderRowExpandable
                key={provider.id}
                provider={provider}
                isSelected={selectedId === provider.id}
                isExpanded={expandedId === provider.id}
                onOpenChange={(open) => setExpandedId(open ? provider.id : null)}
                onSelect={(e) => {
                  e.stopPropagation();
                  if (provider.comingSoon) return;
                  setSelectedId(provider.id);
                }}
                storageUsage={provider.id === "nhost" ? storageUsage : null}
                storagePercentage={provider.id === "nhost" ? storagePercentage : 0}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProviderRowExpandable({
  provider,
  isSelected,
  isExpanded,
  onOpenChange,
  onSelect,
  storageUsage,
  storagePercentage,
}: {
  provider: StorageProviderMeta;
  isSelected: boolean;
  isExpanded: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (e: React.MouseEvent) => void;
  storageUsage: { totalSize: number; fileCount: number } | null;
  storagePercentage: number;
}) {
  const icon = providerIcons[provider.id] ?? <Cloud className="size-4" />;
  const disabled = provider.comingSoon;

  return (
    <Collapsible open={isExpanded} onOpenChange={onOpenChange}>
      <div
        className={`rounded-lg border transition-colors ${
          disabled ? "border-muted bg-muted/30 opacity-80" : isSelected ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/50 disabled:cursor-default disabled:hover:bg-transparent"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              {icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-sm">{provider.name}</span>
                {provider.comingSoon && (
                  <Badge variant="secondary" className="text-xs">
                    In Kürze
                  </Badge>
                )}
                {isSelected && !provider.comingSoon && (
                  <Badge variant="default" className="text-xs">
                    <Check className="size-3 mr-1" />
                    Aktiv
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!disabled && (
                <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onSelect}>
                  Auswählen
                </Button>
              )}
              <ChevronDown
                className={`size-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
              />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t px-3 pb-3 pt-2 space-y-4">
            <ProviderUsageBlock
              provider={provider}
              storageUsage={storageUsage}
              storagePercentage={storagePercentage}
            />
            <ProviderConnectionBlock provider={provider} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function ProviderUsageBlock({
  provider,
  storageUsage,
  storagePercentage,
}: {
  provider: StorageProviderMeta;
  storageUsage: { totalSize: number; fileCount: number } | null;
  storagePercentage: number;
}) {
  const isNhost = provider.id === "nhost";

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <p className="text-sm font-medium">{provider.name} – Speichernutzung</p>
      {isNhost ? (
        storageUsage ? (
          <>
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span>{formatBytes(storageUsage.totalSize)} verwendet</span>
                <span className="text-muted-foreground">von 1 GB</span>
              </div>
              <Progress value={storagePercentage} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground">
              {storageUsage.fileCount} Dateien hochgeladen
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Lade Speichernutzung…</p>
        )
      ) : (
        <p className="text-xs text-muted-foreground">
          Wird angezeigt, sobald du den Anbieter verbunden hast.
        </p>
      )}
    </div>
  );
}

function ProviderConnectionBlock({ provider }: { provider: StorageProviderMeta }) {
  const isNhost = provider.id === "nhost";
  const isHetzner = provider.id === "hetzner";
  const [hetznerEndpoint, setHetznerEndpoint] = useState("");
  const [hetznerBucket, setHetznerBucket] = useState("");
  const [hetznerAccessKey, setHetznerAccessKey] = useState("");
  const [hetznerSecretKey, setHetznerSecretKey] = useState("");

  if (isNhost) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-3">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Link2 className="size-4" />
          Verbindung
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Immer verbunden über dein Scriptony-Konto. Keine weitere Anmeldung nötig.
        </p>
      </div>
    );
  }

  const isOAuthProvider = (OAUTH_PROVIDERS as readonly string[]).includes(provider.id);
  const storedTokens = getStoredStorageOAuthTokens(provider.id);

  if (isOAuthProvider) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-3 space-y-3">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Link2 className="size-4" />
          Verbindung
        </p>
        {storedTokens ? (
          <>
            <p className="text-xs text-muted-foreground">
              Mit {provider.name} verbunden. Tokens werden nur lokal in dieser Sitzung gespeichert.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                clearStoredStorageOAuthTokens(provider.id);
                toast.success("Verbindung getrennt");
              }}
            >
              Verbindung trennen
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Über OAuth mit {provider.name} verbinden. Du wirst zur Anmeldung weitergeleitet.
            </p>
            <Button
              size="sm"
              onClick={() => {
                window.location.href = getStorageOAuthAuthorizeUrl(provider.id);
              }}
            >
              Mit {provider.name} verbinden
            </Button>
          </>
        )}
      </div>
    );
  }

  if (provider.comingSoon && !isHetzner) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-3">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Link2 className="size-4" />
          Verbindung
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Verbindung für {provider.name} in Kürze verfügbar.
        </p>
      </div>
    );
  }

  if (isHetzner) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/20 p-3 space-y-3">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Link2 className="size-4" />
          Mit Hetzner verbinden
        </p>
        <p className="text-xs text-muted-foreground">
          Zugangsdaten aus dem Hetzner Robot bzw. Object-Storage-Dashboard. Werden nur lokal gespeichert.
        </p>
        <div className="grid gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Endpoint-URL</Label>
            <Input
              placeholder="https://fsn1.your-objectstorage.com"
              value={hetznerEndpoint}
              onChange={(e) => setHetznerEndpoint(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Bucket</Label>
            <Input
              placeholder="scriptony"
              value={hetznerBucket}
              onChange={(e) => setHetznerBucket(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Access Key</Label>
            <Input
              type="password"
              placeholder="Access Key"
              value={hetznerAccessKey}
              onChange={(e) => setHetznerAccessKey(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Secret Key</Label>
            <Input
              type="password"
              placeholder="Secret Key"
              value={hetznerSecretKey}
              onChange={(e) => setHetznerSecretKey(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>
        <Button size="sm" className="w-full sm:w-auto">
          Verbinden
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-dashed bg-muted/20 p-3">
      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Link2 className="size-4" />
        Verbindung
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        Mit {provider.name} verbinden – Anmeldung per OAuth (in Kürze).
      </p>
      <Button size="sm" variant="outline" className="mt-2" disabled>
        Mit {provider.name} verbinden (in Kürze)
      </Button>
    </div>
  );
}
