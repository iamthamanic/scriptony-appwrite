import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import path from "path";
import fs from "node:fs";

type ManualChunkGroup = {
  name: string;
  includes: string[];
};

const MANUAL_CHUNK_GROUPS: ManualChunkGroup[] = [
  {
    name: "vendor-appwrite",
    includes: ["/node_modules/appwrite/"],
  },
  {
    name: "vendor-ui",
    includes: [
      "/node_modules/@radix-ui/",
      "/node_modules/lucide-react/",
      "/node_modules/sonner/",
      "/node_modules/cmdk/",
      "/node_modules/vaul/",
      "/node_modules/input-otp/",
      "/node_modules/react-day-picker/",
      "/node_modules/embla-carousel-react/",
    ],
  },
  {
    name: "vendor-motion-dnd",
    includes: [
      "/node_modules/motion/",
      "/node_modules/react-dnd/",
      "/node_modules/react-dnd-html5-backend/",
      "/node_modules/dnd-core/",
      "/node_modules/@react-dnd/",
    ],
  },
  {
    name: "vendor-charts",
    includes: ["/node_modules/recharts/", "/node_modules/d3-"],
  },
  {
    name: "vendor-pdf",
    includes: ["/node_modules/pdfjs-dist/"],
  },
  {
    name: "vendor-audio-media",
    includes: ["/node_modules/wavesurfer.js/"],
  },
  {
    name: "vendor-doc-import",
    includes: ["/node_modules/mammoth/"],
  },
  {
    name: "vendor-html-export",
    includes: ["/node_modules/html2canvas/", "/node_modules/dompurify/"],
  },
  {
    name: "vendor-jspdf",
    includes: ["/node_modules/jspdf/"],
  },
];

function getManualChunkName(id: string): string | undefined {
  const normalizedId = id.replace(/\\/g, "/");
  const match = MANUAL_CHUNK_GROUPS.find((group) =>
    group.includes.some((segment) => normalizedId.includes(segment)),
  );
  return match?.name;
}

/** Dev: append NDJSON from VideoEditorTimeline debug fetch → .cursor/debug-47af82.log */
const scriptonyDebugIngestPlugin: import("vite").Plugin = {
  name: "scriptony-debug-ingest",
  configureServer(server) {
    const logPath = path.join(process.cwd(), ".cursor", "debug-47af82.log");
    server.middlewares.use("/__scriptony-debug-ingest", (req, res, next) => {
      if (req.method === "OPTIONS") {
        res.statusCode = 204;
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader(
          "Access-Control-Allow-Headers",
          "Content-Type, X-Debug-Session-Id",
        );
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        return void res.end();
      }
      if (req.method !== "POST") return next();
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        try {
          const body = Buffer.concat(chunks).toString("utf8");
          const dir = path.dirname(logPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.appendFileSync(logPath, body.endsWith("\n") ? body : `${body}\n`);
        } catch (e) {
          console.warn("[scriptony-debug-ingest]", e);
        }
        res.statusCode = 204;
        res.end();
      });
    });
  },
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // ── Dev proxy: route ALL function domains through localhost to avoid CORS ──
  // Appwrite's executor can return errors without CORS headers (cold starts, crashes).
  // By proxying through Vite's dev server, requests stay same-origin → no CORS issues.
  const proxy: Record<string, import("vite").ProxyOptions> = {};

  /**
   * Image generation often needs several minutes. http-proxy defaults (e.g. 120s proxyTimeout) or
   * intermediate values can yield 408/HTML before Appwrite returns — use 0 to disable these timeouts in dev.
   */
  const longRunningProxyOpts = {
    timeout: 300000,  // 5 Minuten
    proxyTimeout: 300000,  // 5 Minuten
  } as const;

  // Parse VITE_BACKEND_FUNCTION_DOMAIN_MAP and create a proxy entry for every function.
  const domainMapRaw = env.VITE_BACKEND_FUNCTION_DOMAIN_MAP?.trim();
  if (domainMapRaw) {
    try {
      const domainMap: Record<string, string> = JSON.parse(domainMapRaw);
      for (const [funcName, target] of Object.entries(domainMap)) {
        if (!funcName || !target) continue;
        const cleanTarget = target.replace(/\/+$/, "");
        proxy[`/__dev-proxy/${funcName}`] = {
          target: cleanTarget,
          changeOrigin: true,
          secure: false,
          ...longRunningProxyOpts,
          rewrite: (p) => {
            const stripped = p.replace(
              new RegExp(`^/__dev-proxy/${funcName}`),
              "",
            );
            return stripped.length > 0 ? stripped : "/";
          },
        };
      }
    } catch {
      console.warn(
        "[vite.config] Could not parse VITE_BACKEND_FUNCTION_DOMAIN_MAP for dev proxy",
      );
    }
  }

  // Legacy: single-function proxy override (kept for backwards compatibility)
  const assistantProxyTarget =
    env.VITE_DEV_PROXY_SCRIPTONY_ASSISTANT_TARGET?.trim() ||
    env.DEV_PROXY_SCRIPTONY_ASSISTANT_TARGET?.trim();
  if (assistantProxyTarget) {
    proxy["/__dev-proxy/scriptony-assistant"] = {
      target: assistantProxyTarget.replace(/\/+$/, ""),
      changeOrigin: true,
      secure: false,
      ...longRunningProxyOpts,
      rewrite: (p) => {
        const stripped = p.replace(/^\/__dev-proxy\/scriptony-assistant/, "");
        return stripped.length > 0 ? stripped : "/";
      },
    };
  }

  // Bridge proxy for System Status page (works in dev; production uses nginx)
  const bridgeTarget = env.VITE_BRIDGE_URL?.trim() || "http://127.0.0.1:9877";
  proxy["/bridge/health"] = {
    target: bridgeTarget,
    changeOrigin: true,
    secure: false,
  };
  proxy["/bridge/config"] = {
    target: bridgeTarget,
    changeOrigin: true,
    secure: false,
  };

  return {
    plugins: [react(), wasm(), topLevelAwait(), scriptonyDebugIngestPlugin],
    resolve: {
      extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
      /** One copy of React — avoids "Invalid hook call" / useState from null in dev. */
      dedupe: ["react", "react-dom", "scheduler", "sonner"],
      alias: {
        buffer: path.resolve(__dirname, "node_modules/buffer"),
        react: path.resolve(__dirname, "node_modules/react"),
        "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
        "wavesurfer.js@7.8.10": "wavesurfer.js",
        "vaul@1.1.2": "vaul",
        "sonner@2.0.3": "sonner",
        "recharts@2.15.2": "recharts",
        "react-resizable-panels@2.1.7": "react-resizable-panels",
        "react-hook-form@7.55.0": "react-hook-form",
        "react-easy-crop@5.0.8": "react-easy-crop",
        "react-day-picker@8.10.1": "react-day-picker",
        "lucide-react@0.487.0": "lucide-react",
        "input-otp@1.4.2": "input-otp",
        "hono@4.6.14": "hono",
        "hono@4": "hono",
        "figma:asset/f457350c3280dabb6ea90d22b03423bcf23f5ad9.png":
          path.resolve(
            __dirname,
            "./src/assets/f457350c3280dabb6ea90d22b03423bcf23f5ad9.png",
          ),
        "figma:asset/762fa3b0c4bc468cb3c0661e6181aee92a01370d.png":
          path.resolve(
            __dirname,
            "./src/assets/762fa3b0c4bc468cb3c0661e6181aee92a01370d.png",
          ),
        "figma:asset/5bbfb6c934162456ce6c992c152322cee414939e.png":
          path.resolve(
            __dirname,
            "./src/assets/5bbfb6c934162456ce6c992c152322cee414939e.png",
          ),
        "figma:asset/44d55a83c8fdb84cc42417330166e084e82bbcea.png":
          path.resolve(
            __dirname,
            "./src/assets/44d55a83c8fdb84cc42417330166e084e82bbcea.png",
          ),
        "embla-carousel-react@8.6.0": "embla-carousel-react",
        "cmdk@1.1.1": "cmdk",
        "class-variance-authority@0.7.1": "class-variance-authority",
        "@radix-ui/react-tooltip@1.1.8": "@radix-ui/react-tooltip",
        "@radix-ui/react-toggle@1.1.2": "@radix-ui/react-toggle",
        "@radix-ui/react-toggle-group@1.1.2": "@radix-ui/react-toggle-group",
        "@radix-ui/react-tabs@1.1.3": "@radix-ui/react-tabs",
        "@radix-ui/react-switch@1.1.3": "@radix-ui/react-switch",
        "@radix-ui/react-slot@1.1.2": "@radix-ui/react-slot",
        "@radix-ui/react-slider@1.2.3": "@radix-ui/react-slider",
        "@radix-ui/react-separator@1.1.2": "@radix-ui/react-separator",
        "@radix-ui/react-select@2.1.6": "@radix-ui/react-select",
        "@radix-ui/react-scroll-area@1.2.3": "@radix-ui/react-scroll-area",
        "@radix-ui/react-radio-group@1.2.3": "@radix-ui/react-radio-group",
        "@radix-ui/react-popover@1.1.6": "@radix-ui/react-popover",
        "@radix-ui/react-navigation-menu@1.2.5":
          "@radix-ui/react-navigation-menu",
        "@radix-ui/react-menubar@1.1.6": "@radix-ui/react-menubar",
        "@radix-ui/react-label@2.1.2": "@radix-ui/react-label",
        "@radix-ui/react-hover-card@1.1.6": "@radix-ui/react-hover-card",
        "@radix-ui/react-dropdown-menu@2.1.6": "@radix-ui/react-dropdown-menu",
        "@radix-ui/react-dialog@1.1.6": "@radix-ui/react-dialog",
        "@radix-ui/react-context-menu@2.2.6": "@radix-ui/react-context-menu",
        "@radix-ui/react-collapsible@1.1.3": "@radix-ui/react-collapsible",
        "@radix-ui/react-checkbox@1.1.4": "@radix-ui/react-checkbox",
        "@radix-ui/react-avatar@1.1.3": "@radix-ui/react-avatar",
        "@radix-ui/react-aspect-ratio@1.1.2": "@radix-ui/react-aspect-ratio",
        "@radix-ui/react-alert-dialog@1.1.6": "@radix-ui/react-alert-dialog",
        "@radix-ui/react-accordion@1.2.3": "@radix-ui/react-accordion",
        "@": path.resolve(__dirname, "./src"),
      },
    },
    publicDir: "public",
    optimizeDeps: {
      include: ["react", "react-dom", "scheduler", "mammoth", "pdfjs-dist"],
      exclude: ["@jsquash/webp"],
    },
    build: {
      target: "esnext",
      outDir: "build",
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            return getManualChunkName(id);
          },
        },
      },
    },
    server: {
      port: 3000,
      open: true,
      proxy,
    },
  };
});
