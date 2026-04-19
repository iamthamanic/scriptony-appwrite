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
  Download,
  Info,
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
import { Input } from "./ui/input";
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip";
import { backendConfig } from "../lib/env";
import { fetchBridgeHealth, type BridgeHealth } from "../lib/bridge-health";

const HOST_PORT_DEFAULTS = {
  comfyui: 8188,
  blender: 9876,
  bridge: 9877,
} as const;

type HostPortKeys = keyof typeof HOST_PORT_DEFAULTS;
type HostPorts = Record<HostPortKeys, number>;

function isValidPort(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0 && v < 65536;
}

function parseStoredPorts(raw: string | null): Partial<HostPorts> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Partial<HostPorts> = {};
    for (const key of Object.keys(HOST_PORT_DEFAULTS)) {
      if (isValidPort(parsed[key])) {
        result[key as HostPortKeys] = parsed[key] as number;
      }
    }
    return result;
  } catch {
    return {};
  }
}

function useHostPorts() {
  const [ports, setPorts] = useState<HostPorts>(() => {
    const stored = localStorage.getItem("scriptony-host-ports");
    return { ...HOST_PORT_DEFAULTS, ...parseStoredPorts(stored) };
  });

  const updatePort = (key: HostPortKeys, value: number) => {
    setPorts((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem("scriptony-host-ports", JSON.stringify(next));
      } catch {
        /* localStorage unavailable — ignore */
      }
      return next;
    });
  };

  return { ports, updatePort };
}

interface ConnectionStatus {
  label: string;
  ok: boolean | null;
}

function PortInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => {
        const v = parseInt(e.target.value, 10);
        if (!isNaN(v) && v > 0 && v < 65536) onChange(v);
      }}
      className="w-[4.5rem] h-7 text-xs px-2 py-0"
    />
  );
}

function StatusIcon({ ok }: { ok: boolean | null }) {
  if (ok === null)
    return <HelpCircle className="size-4 text-muted-foreground" />;
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

export function SystemStatusSection() {
  const [bridgeHealth, setBridgeHealth] = useState<BridgeHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const { ports, updatePort } = useHostPorts();

  const refresh = useCallback(async () => {
    setLoading(true);
    const health = await fetchBridgeHealth();
    setBridgeHealth(health);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const connections: ConnectionStatus[] = bridgeHealth
    ? [
        {
          label: "Appwrite Realtime",
          ok: bridgeHealth.connections.appwriteRealtime,
        },
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
                  Port {ports.bridge}
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
      <HostServicesCard ports={ports} updatePort={updatePort} />
    </div>
  );
}

function HostServicesCard({
  ports,
  updatePort,
}: {
  ports: HostPorts;
  updatePort: (key: HostPortKeys, value: number) => void;
}) {
  return (
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
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-3 items-center">
          {/* ComfyUI — label */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm">ComfyUI</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3.5 text-muted-foreground shrink-0 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-left">
                <p className="font-medium mb-1">ComfyUI — Bildgenerierung</p>
                <p>
                  ComfyUI muss lokal auf dem Host gestartet werden, da es
                  direkten GPU-Zugriff benötigt. Standard-Port ist 8188.
                </p>
                <p className="mt-1">
                  Start:{" "}
                  <code className="bg-muted/20 px-1 rounded">
                    python main.py --listen 0.0.0.0 --port 8188
                  </code>
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          {/* ComfyUI — value */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              localhost:
            </span>
            <PortInput
              value={ports.comfyui}
              onChange={(v) => updatePort("comfyui", v)}
            />
          </div>

          {/* Blender Addon — label */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm">Blender Addon</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3.5 text-muted-foreground shrink-0 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-left">
                <p className="font-medium mb-1">Scriptony Blender Addon</p>
                <ol className="list-decimal list-inside space-y-0.5">
                  <li>Legacy- oder Extension-ZIP herunterladen</li>
                  <li>Blender öffnen</li>
                  <li>Edit → Preferences → Add-ons</li>
                  <li>
                    Legacy: Install… → `scriptony_blender_addon.zip` auswählen
                  </li>
                  <li>Extension: Blender 4.2+ Extensions-Flow nutzen</li>
                  <li>Nach &quot;Scriptony&quot; suchen → Häkchen setzen</li>
                  <li>3D Viewport → Sidebar (N-Taste) → Scriptony Panel</li>
                  <li>Cloud-URL + Integration-Token eintragen</li>
                </ol>
                <p className="mt-1">
                  Token erstellen: Einstellungen → Integrationen
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          {/* Blender Addon — value */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              localhost:
            </span>
            <PortInput
              value={ports.blender}
              onChange={(v) => updatePort("blender", v)}
            />
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <a
                href="/scriptony-blender-addon.zip"
                download
                title="Legacy Blender add-on ZIP herunterladen"
                aria-label="Legacy Blender add-on ZIP herunterladen"
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-primary hover:bg-accent hover:text-accent-foreground whitespace-nowrap"
              >
                <Download className="size-3" />
                Legacy ZIP
              </a>
              <a
                href="/scriptony_blender_extension.zip"
                download
                title="Blender Extension ZIP herunterladen"
                aria-label="Blender Extension ZIP herunterladen"
                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs text-primary hover:bg-accent hover:text-accent-foreground whitespace-nowrap"
              >
                <Download className="size-3" />
                Extension ZIP
              </a>
            </div>
          </div>

          {/* Bridge Health — label */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm">Bridge Health</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="size-3.5 text-muted-foreground shrink-0 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-left">
                <p className="font-medium mb-1">
                  Local Bridge — Dienst-Verbindung
                </p>
                <p>
                  Die Bridge ist ein Docker-Container, der ComfyUI und Blender
                  mit Appwrite verbindet. Sie vermittelt Render-Jobs und
                  Sync-Daten zwischen den Services.
                </p>
                <p className="mt-1">
                  Health-Check:{" "}
                  <code className="bg-muted/20 px-1 rounded">
                    http://localhost:{ports.bridge}/health
                  </code>
                </p>
                <p className="mt-1">
                  Start:{" "}
                  <code className="bg-muted/20 px-1 rounded">
                    docker compose up -d
                  </code>
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          {/* Bridge Health — value */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              localhost:
            </span>
            <PortInput
              value={ports.bridge}
              onChange={(v) => updatePort("bridge", v)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
