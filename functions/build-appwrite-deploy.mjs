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
  { name: "scriptony-ai", entry: join(here, "scriptony-ai", "index.ts") },
];

for (const bundle of bundles) {
  const outDir = join(outRoot, bundle.name);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "package.json"),
    JSON.stringify({ name: bundle.name, dependencies: {} }),
  );

  await build({
    entryPoints: [bundle.entry],
    outfile: join(outDir, "index.js"),
    bundle: true,
    platform: "node",
    target: "node16",
    format: "cjs",
    legalComments: "none",
    logLevel: "info",
  });
}
