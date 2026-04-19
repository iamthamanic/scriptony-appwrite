import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Settings,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { fetchBridgeHealth, type BridgeHealth } from "../lib/bridge-health";

type BridgeState = "connected" | "disconnected" | "checking";

function ConnectionBadge({ ok, label }: { ok: boolean; label: string }) {
  if (ok) {
    return (
      <Badge className="gap-1 text-[10px] px-1.5 py-0 bg-green-100 text-green-700">
        <CheckCircle2 className="size-3" />
        {label}
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 text-[10px] px-1.5 py-0 bg-red-100 text-red-700">
      <XCircle className="size-3" />
      {label}
    </Badge>
  );
}

export function BridgeStatusBar() {
  const [health, setHealth] = useState<BridgeHealth | null>(null);
  const [state, setState] = useState<BridgeState>("checking");
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await fetchBridgeHealth();
    setHealth(result);
    setState(result ? "connected" : "disconnected");
    setLoading(false);
  }, []);

  // Initial check + periodic polling every 30s
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (state === "checking") {
    return (
      <div className="flex items-center gap-2 text-[11px] text-[#8a83a3]">
        <HelpCircle className="size-3.5 animate-pulse" />
        <span>Bridge-Status wird geprüft...</span>
      </div>
    );
  }

  if (state === "disconnected") {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <WifiOff className="size-4 text-red-400" />
          <span className="text-[11px] font-medium text-red-400">
            Bridge nicht erreichbar
          </span>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="ml-1"
            aria-label="Bridge-Status aktualisieren"
          >
            <RefreshCw
              className={`size-3 text-[#8a83a3] hover:text-[#c7c0de] ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
        <div className="text-[10px] text-[#6b6480] space-y-1">
          <p>
            Die Bridge verbindet Blender und ComfyUI mit Appwrite. Ohne Bridge
            stehen keine Render-Jobs oder Blender-Sync-Daten zur Verfügung.
          </p>
          <ol className="list-decimal list-inside space-y-0.5">
            <li>
              <code className="bg-[#221f35] px-1 rounded text-[9px]">
                docker compose up -d
              </code>{" "}
              — Bridge starten
            </li>
            <li>
              ComfyUI auf{" "}
              <code className="bg-[#221f35] px-1 rounded text-[9px]">
                localhost:8188
              </code>{" "}
              starten
            </li>
            <li>
              Blender mit Scriptony-Addon auf{" "}
              <code className="bg-[#221f35] px-1 rounded text-[9px]">
                localhost:9876
              </code>{" "}
              starten
            </li>
            <li>
              Integration-Token unter{" "}
              <button
                type="button"
                className="underline hover:text-[#c7c0de]"
                onClick={() => {
                  window.location.hash = "#einstellungen";
                }}
              >
                Einstellungen → Integrationen
              </button>{" "}
              erstellen
            </li>
          </ol>
        </div>
      </div>
    );
  }

  // Connected
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Wifi className="size-4 text-green-400" />
        <span className="text-[11px] font-medium text-green-400">
          Bridge verbunden
        </span>
        <span className="text-[10px] text-[#6b6480] ml-1">Port 9877</span>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="ml-1"
          aria-label="Bridge-Status aktualisieren"
        >
          <RefreshCw
            className={`size-3 text-[#8a83a3] hover:text-[#c7c0de] ${loading ? "animate-spin" : ""}`}
          />
        </button>
        <button
          type="button"
          className="ml-auto text-[#8a83a3] hover:text-[#c7c0de]"
          onClick={() => {
            window.location.hash = "#einstellungen";
          }}
          aria-label="Bridge-Einstellungen"
        >
          <Settings className="size-3" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <ConnectionBadge
          ok={health?.connections.appwriteRealtime ?? false}
          label="Appwrite"
        />
        <ConnectionBadge
          ok={health?.connections.comfyUI ?? false}
          label="ComfyUI"
        />
        <ConnectionBadge
          ok={health?.connections.blender ?? false}
          label="Blender"
        />
      </div>

      {health && (
        <div className="text-[10px] text-[#6b6480]">
          Jobs: {health.concurrency.running} aktiv / {health.concurrency.queued}{" "}
          wartend / {health.concurrency.activeJobs} gesamt
        </div>
      )}
    </div>
  );
}
