import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const GIT_CMD =
  process.env.GIT_CMD || (existsSync("/usr/bin/git") ? "/usr/bin/git" : "git");

const KNOWN_FUNCTIONS = new Set([
  "scriptony-ai",
  "scriptony-assistant",
  "scriptony-audio",
  "scriptony-audio-story",
  "scriptony-auth",
  "scriptony-beats",
  "scriptony-characters",
  "scriptony-clips",
  "scriptony-editor-readmodel",
  "scriptony-gym",
  "scriptony-image",
  "scriptony-jobs-handler",
  "scriptony-mcp-appwrite",
  "scriptony-project-nodes",
  "scriptony-projects",
  "scriptony-shots",
  "scriptony-stage",
  "scriptony-stage2d",
  "scriptony-stage3d",
  "scriptony-assets",
  "scriptony-script",
  "scriptony-style",
  "scriptony-style-guide",
  "scriptony-sync",
  "scriptony-video",
  "scriptony-worldbuilding",
]);

const LEGACY_UNSUPPORTED_FUNCTIONS = new Set(["jobs-handler"]);

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.stdio || "pipe",
  });
}

function gitLines(args) {
  const result = run(GIT_CMD, args);
  if (result.status !== 0) return [];
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function hasGitRef(ref) {
  return run(GIT_CMD, ["rev-parse", "--verify", ref]).status === 0;
}

function collectChangedFiles() {
  if (process.env.SHIM_CHANGED_FILES) {
    return process.env.SHIM_CHANGED_FILES.split(/[,\n]/)
      .map((file) => file.trim())
      .filter(Boolean)
      .sort();
  }

  if (process.env.SHIM_CHANGED_FILES_FILE) {
    try {
      return readFileSync(process.env.SHIM_CHANGED_FILES_FILE, "utf8")
        .split(/\r?\n/)
        .map((file) => file.trim())
        .filter(Boolean)
        .sort();
    } catch {
      // Fall through to git-based detection.
    }
  }

  const files = new Set([
    ...gitLines(["diff", "--name-only", "--diff-filter=ACMR"]),
    ...gitLines(["diff", "--name-only", "--cached", "--diff-filter=ACMR"]),
    ...gitLines(["ls-files", "--others", "--exclude-standard"]),
  ]);

  if (hasGitRef("origin/main")) {
    for (const file of gitLines([
      "diff",
      "--name-only",
      "--diff-filter=ACMR",
      "origin/main...HEAD",
    ])) {
      files.add(file);
    }
  }

  return [...files].sort();
}

function isIncrementalMode() {
  const mode = (process.env.CHECK_MODE || "").toLowerCase();
  return mode === "snippet" || mode === "commit" || mode === "diff";
}

function functionNameFromPath(filePath) {
  const match = filePath.match(/^functions\/([^/]+)\//);
  if (!match) return null;
  return KNOWN_FUNCTIONS.has(match[1]) ? match[1] : null;
}

function selectFunctions() {
  if (!isIncrementalMode()) return [...KNOWN_FUNCTIONS].sort();

  const changedFiles = collectChangedFiles();
  const changedFunctionFiles = changedFiles.filter((file) =>
    file.startsWith("functions/"),
  );
  const buildInfrastructureChanged = changedFiles.some((file) =>
    [
      "functions/build-appwrite-deploy.mjs",
      "functions/package.json",
      "functions/package-lock.json",
      "scripts/check-appwrite-functions-build.mjs",
    ].includes(file),
  );
  const sharedChanged = changedFunctionFiles.some((file) =>
    file.startsWith("functions/_shared/"),
  );

  if (buildInfrastructureChanged || sharedChanged)
    return [...KNOWN_FUNCTIONS].sort();

  const selected = new Set();
  for (const file of changedFunctionFiles) {
    const functionName = functionNameFromPath(file);
    if (functionName) selected.add(functionName);
    const legacyName = file.match(/^functions\/([^/]+)\//)?.[1];
    if (LEGACY_UNSUPPORTED_FUNCTIONS.has(legacyName)) {
      console.log(
        `Skipping legacy function build for ${legacyName}: no Node/esbuild contract is defined.`,
      );
    }
  }

  return [...selected].sort();
}

const selectedFunctions = selectFunctions();

if (selectedFunctions.length === 0) {
  console.log(
    "Skipping Appwrite function build: no changed function sources detected.",
  );
  process.exit(0);
}

console.log(`Building Appwrite functions: ${selectedFunctions.join(", ")}`);

const args = ["--prefix", "functions", "run", "build:appwrite-deploy"];
if (selectedFunctions.length < KNOWN_FUNCTIONS.size) {
  args.push("--", `--filter=${selectedFunctions.join(",")}`);
}

const result = run("npm", args, { stdio: "inherit" });
process.exit(result.status ?? 1);
