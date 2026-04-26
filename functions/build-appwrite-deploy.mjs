import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(here);
const outRoot = join(repoRoot, ".appwrite-deploy");

const bundles = [
  {
    name: "scriptony-auth",
    entry: join(here, "scriptony-auth", "appwrite-entry.ts"),
  },
  {
    name: "scriptony-projects",
    entry: join(here, "scriptony-projects", "appwrite-entry.ts"),
  },
  {
    name: "scriptony-project-nodes",
    entry: join(here, "scriptony-project-nodes", "appwrite-entry.ts"),
  },
  {
    name: "scriptony-shots",
    entry: join(here, "scriptony-shots", "appwrite-entry.ts"),
  },
  {
    name: "scriptony-worldbuilding",
    entry: join(here, "scriptony-worldbuilding", "appwrite-entry.ts"),
  },
  {
    name: "scriptony-beats",
    entry: join(here, "scriptony-beats", "appwrite-entry.ts"),
  },
  {
    name: "scriptony-characters",
    entry: join(here, "scriptony-characters", "appwrite-entry.ts"),
  },
  {
    name: "scriptony-ai",
    entry: join(here, "scriptony-ai", "index.ts"),
    inject: [join(here, "scriptony-ai", "inject-node16-streams.cjs")],
  },
  {
    name: "scriptony-assistant",
    entry: join(here, "scriptony-assistant", "index.ts"),
  },
  {
    name: "scriptony-audio",
    entry: join(here, "scriptony-audio", "index.ts"),
  },
  {
    name: "scriptony-audio-story",
    entry: join(here, "scriptony-audio-story", "appwrite-entry.ts"),
  },
  { name: "scriptony-clips", entry: join(here, "scriptony-clips", "index.ts") },
  {
    name: "scriptony-editor-readmodel",
    entry: join(here, "scriptony-editor-readmodel", "index.ts"),
  },
  { name: "scriptony-gym", entry: join(here, "scriptony-gym", "index.ts") },
  { name: "scriptony-image", entry: join(here, "scriptony-image", "index.ts") },
  {
    name: "scriptony-jobs-handler",
    entry: join(here, "scriptony-jobs-handler", "index.ts"),
  },
  {
    name: "scriptony-mcp-appwrite",
    entry: join(here, "scriptony-mcp-appwrite", "index.ts"),
  },
  { name: "scriptony-stage", entry: join(here, "scriptony-stage", "index.ts") },
  {
    name: "scriptony-stage2d",
    entry: join(here, "scriptony-stage2d", "index.ts"),
  },
  {
    name: "scriptony-stage3d",
    entry: join(here, "scriptony-stage3d", "index.ts"),
  },
  { name: "scriptony-style", entry: join(here, "scriptony-style", "index.ts") },
  {
    name: "scriptony-style-guide",
    entry: join(here, "scriptony-style-guide", "index.ts"),
  },
  { name: "scriptony-sync", entry: join(here, "scriptony-sync", "index.ts") },
  { name: "scriptony-video", entry: join(here, "scriptony-video", "index.ts") },
  {
    name: "scriptony-script",
    entry: join(here, "scriptony-script", "appwrite-entry.ts"),
  },
  {
    name: "scriptony-assets",
    entry: join(here, "scriptony-assets", "appwrite-entry.ts"),
  },
];

function parseFilter() {
  const filterArg = process.argv.find((arg) => arg.startsWith("--filter="));
  if (!filterArg) return null;
  return new Set(
    filterArg
      .slice("--filter=".length)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

const filter = parseFilter();
const selectedBundles = filter
  ? bundles.filter((bundle) => filter.has(bundle.name))
  : bundles;

if (filter && selectedBundles.length === 0) {
  throw new Error(
    `No Appwrite function bundles matched --filter=${[...filter].join(",")}`,
  );
}

for (const bundle of selectedBundles) {
  const outDir = join(outRoot, bundle.name);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "package.json"),
    `${JSON.stringify({ name: bundle.name, dependencies: {} }, null, 2)}\n`,
  );

  await build({
    entryPoints: [bundle.entry],
    outfile: join(outDir, "index.js"),
    bundle: true,
    platform: "node",
    target: "node16",
    format: "cjs",
    legalComments: "none",
    inject: bundle.inject,
    logLevel: "info",
  });
}
