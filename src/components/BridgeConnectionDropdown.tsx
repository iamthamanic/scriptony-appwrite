import { useState, useEffect, useCallback, useRef } from "react";
import {
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  ChevronDown,
} from "lucide-react";
import { fetchBridgeHealth, type BridgeHealth } from "../lib/bridge-health";

export function BridgeConnectionDropdown() {
  const [health, setHealth] = useState<BridgeHealth | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await fetchBridgeHealth();
    setHealth(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const connected = health?.status === "ok";
  const connections = health?.connections;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setOpen(!open);
          if (!open) refresh();
        }}
        className={`
          flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium
          transition-colors shrink-0
          ${
            connected
              ? "border-green-800/50 bg-green-950/40 text-green-400 hover:bg-green-950/60"
              : "border-[#3b355a] bg-[#221f35] text-red-400 hover:bg-[#2a2645]"
          }
        `}
        aria-label="Bridge-Verbindungsstatus"
      >
        {connected ? (
          <Wifi className="size-3.5" />
        ) : (
          <WifiOff className="size-3.5" />
        )}
        <span className="hidden sm:inline">Bridge</span>
        <ChevronDown
          className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 w-72 rounded-md border border-[#3b355a] bg-[#1a1730]/98 shadow-xl backdrop-blur-sm">
          <div className="p-3 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2">
              {connected ? (
                <Wifi className="size-4 text-green-400" />
              ) : (
                <WifiOff className="size-4 text-red-400" />
              )}
              <span className="text-xs font-medium text-[#c7c0de]">
                {connected ? "Bridge verbunden" : "Bridge offline"}
              </span>
              <span className="text-[10px] text-[#6b6480] ml-auto">:9877</span>
            </div>

            {/* Connections */}
            {connections && (
              <div className="space-y-1.5">
                <ConnectionRow
                  ok={connections.appwriteRealtime}
                  label="Appwrite Realtime"
                  port=":80/v1"
                />
                <ConnectionRow
                  ok={connections.comfyUI}
                  label="ComfyUI"
                  port=":8188"
                />
                <ConnectionRow
                  ok={connections.blender}
                  label="Blender Addon"
                  port=":9876"
                />
              </div>
            )}

            {/* Jobs */}
            {health && (
              <div className="text-[10px] text-[#6b6480] border-t border-[#3b355a] pt-2">
                Jobs: {health.concurrency.running} aktiv /{" "}
                {health.concurrency.queued} wartend /{" "}
                {health.concurrency.activeJobs} gesamt
              </div>
            )}

            {/* Refresh */}
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="w-full text-center text-[10px] text-[#8a83a3] hover:text-[#c7c0de] transition-colors"
            >
              {loading ? "Prüfe..." : "Status aktualisieren"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectionRow({
  ok,
  label,
  port,
}: {
  ok: boolean;
  label: string;
  port: string;
}) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      {ok ? (
        <CheckCircle2 className="size-3.5 text-green-400" />
      ) : (
        <XCircle className="size-3.5 text-red-400" />
      )}
      <span
        className={`text-[11px] flex-1 ${ok ? "text-[#c7c0de]" : "text-[#8a83a3]"}`}
      >
        {label}
      </span>
      <code className="text-[10px] text-[#6b6480] bg-[#221f35] px-1.5 py-0.5 rounded">
        localhost{port}
      </code>
    </div>
  );
}
