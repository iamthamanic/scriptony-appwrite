import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Server,
  Cpu,
  Monitor,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { backendConfig } from "../lib/env";

interface BridgeHealth {
  status: string;
  service: string;
  connections: {
    appwriteRealtime: boolean;
    comfyUI: boolean;
    blender: boolean;
  };
  concurrency: {
    running: number;
    queued: number;
    activeJobs: number;
  };
}

function StatusIcon({ ok }: { ok: boolean | null }) {
  if (ok === null) return <HelpCircle className="size-4 text-muted-foreground" />;
  if (ok) return <CheckCircle2 className="size-4 text-green-500" />;
  return <XCircle className="size-4 text-red-500" />;
}

function StatusBadge({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null)
    return (
      <Badge variant="secondary" className="gap-1">
        <HelpCircle className="size-3" />
        {label}
      </Badge>
    );
  if (ok)
    return (
      <Badge variant="default" className="gap-1 bg-green-600">
        <CheckCircle2 className="size-3" />
        {label}
      </Badge>
    );
  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="size-3" />
      {label}
    </Badge>
  );
}

async function fetchBridgeHealth(): Promise<BridgeHealth | null> {
  try {
    const res = await fetch("/bridge/health", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as BridgeHealth;
  } catch {
    return null;
  }
}

export function SystemStatusSection() {
  const [bridgeHealth, setBridgeHealth] = useState<BridgeHealth | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const health = await fetchBridgeHealth();
    setBridgeHealth(health);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connections = bridgeHealth
    ? [
        { label: "Appwrite Realtime", ok: bridgeHealth.connections.appwriteRealtime },
        { label: "ComfyUI", ok: bridgeHealth.connections.comfyUI },
        { label: "Blender Addon", ok: bridgeHealth.connections.blender },
      ]
    : [];

  const appwriteConfig = backendConfig.appwrite;

  return (
    <div className="space-y-4">
      {/* Bridge Status */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="size-4" />
              Local Bridge
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              disabled={loading}
              className="size-8"
            >
              <RefreshCw
                className={`size-4 ${loading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
          <CardDescription>
            Docker-Container der ComfyUI und Blender mit Appwrite verbindet
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          {bridgeHealth ? (
            <>
              <div className="flex items-center gap-2">
                <StatusIcon ok={true} />
                <span className="text-sm font-medium">Bridge erreichbar</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  Port 9877
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {connections.map((c) => (
                  <StatusBadge
                    key={c.label}
                    ok={c.ok}
                    label={c.ok ? `${c.label}: OK` : `${c.label}: Offline`}
                  />
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                Jobs: {bridgeHealth.concurrency.running} running /{" "}
                {bridgeHealth.concurrency.queued} queued /{" "}
                {bridgeHealth.concurrency.activeJobs} active
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <StatusIcon ok={false} />
              <span className="text-sm font-medium text-red-500">
                Bridge nicht erreichbar
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appwrite Configuration */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="size-4" />
            Appwrite
          </CardTitle>
          <CardDescription>
            Selbst-gehostete Appwrite-Instanz (Backend + Datenbank)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          {appwriteConfig ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Endpoint</span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded">
                  {appwriteConfig.endpoint}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Project ID
                </span>
                <code className="text-xs bg-muted px-2 py-0.5 rounded">
                  {appwriteConfig.projectId}
                </code>
              </div>
            </>
          ) : (
            <p className="text-sm text-red-500">
              Appwrite-Endpunkt nicht konfiguriert. Prüfe VITE_APPWRITE_ENDPOINT
              und VITE_APPWRITE_PROJECT_ID.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Cpu className="size-4" />
            Setup
          </CardTitle>
          <CardDescription>
            So startest du die lokale Infrastruktur
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
            <li>
              <code className="bg-muted px-1 rounded">
                cp infra/appwrite/.env.example infra/appwrite/.env
              </code>{" "}
              — Appwrite Secrets setzen
            </li>
            <li>
              <code className="bg-muted px-1 rounded">
                docker compose --env-file infra/appwrite/.env up -d
              </code>{" "}
              — Appwrite + Bridge + Frontend starten
            </li>
            <li>
              ComfyUI lokal starten (Port 8188) — bleibt auf dem Host wegen GPU
            </li>
            <li>
              Blender mit Scriptony-Addon starten (Port 9876) — Addon holt
              Appwrite-URL automatisch vom Bridge
            </li>
            <li>
              Integration-Token unter{" "}
              <span className="font-medium">Einstellungen → Integrationen</span>{" "}
              erstellen und im Blender-Addon eintragen
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Host Services */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Monitor className="size-4" />
            Host-Services
          </CardTitle>
          <CardDescription>
            ComfyUI und Blender laufen auf dem Host (GPU / Desktop)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">ComfyUI</span>
            <code className="text-xs bg-muted px-2 py-0.5 rounded">
              http://localhost:8188
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Blender Addon</span>
            <code className="text-xs bg-muted px-2 py-0.5 rounded">
              http://localhost:9876
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Bridge Health</span>
            <code className="text-xs bg-muted px-2 py-0.5 rounded">
              http://localhost:9877/health
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}