import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { resolve, basename, dirname } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Client, Functions } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { getMissingAppwriteServerEnvKeys, loadAppwriteCliEnv } from "./load-appwrite-cli-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS_ROOT = resolve(__dirname, "..");

function printUsage() {
  console.log(
    "Usage: node functions/scripts/deploy-appwrite-function.mjs " +
      "--function-id <id> --source-dir <dir> --entrypoint <file> " +
      "[--commands <commands>] [--timeout <seconds>] [--poll-ms <ms>] [--wait-ms <ms>] " +
      "[--sync-default-server-env] [--create-if-missing] [--runtime <runtime>]"
  );
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const out = {
    commands: "",
    pollMs: 2500,
    waitMs: 300000,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      out.help = true;
      continue;
    }
    if (arg === "--sync-default-server-env") {
      out.syncDefaultServerEnv = true;
      continue;
    }
    if (arg === "--create-if-missing") {
      out.createIfMissing = true;
      continue;
    }
    if (!arg.startsWith("--")) {
      fail(`unexpected argument: ${arg}`);
    }
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      fail(`missing value for --${key}`);
    }
    i += 1;
    if (key === "poll-ms" || key === "wait-ms" || key === "timeout") {
      out[toCamel(key)] = Number(value);
      continue;
    }
    out[toCamel(key)] = value;
  }

  return out;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

function tarDirectory(sourceDir, archivePath) {
  const tar = spawnSync("tar", ["-czf", archivePath, "-C", sourceDir, "."], {
    stdio: "inherit",
  });
  if (tar.status !== 0) {
    fail(`tar packaging failed for ${sourceDir}`);
  }
}

async function waitForDeployment(functions, functionId, deploymentId, pollMs, waitMs) {
  const startedAt = Date.now();
  while (true) {
    const deployment = await functions.getDeployment({ functionId, deploymentId });
    const status = String(deployment.status || "");
    if (status === "ready") {
      return deployment;
    }
    if (["failed", "canceled"].includes(status)) {
      fail(`deployment ${deploymentId} finished with status ${status}`);
    }
    if (Date.now() - startedAt > waitMs) {
      fail(`deployment ${deploymentId} did not reach ready within ${waitMs}ms`);
    }
    await new Promise((resolveSleep) => setTimeout(resolveSleep, pollMs));
  }
}

async function maybeUpdateTimeout(functions, functionId, timeoutSeconds) {
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0) {
    return;
  }
  const current = await functions.get({ functionId });
  await functions.update({
    functionId,
    name: current.name,
    execute: Array.isArray(current.execute) ? current.execute : undefined,
    timeout: timeoutSeconds,
  });
  console.log(`Timeout updated to ${timeoutSeconds}s.`);
}

async function ensureFunctionExists(functions, functionId, entrypoint, commands, runtime) {
  try {
    return await functions.get({ functionId });
  } catch (error) {
    const code = error && typeof error === "object" ? error.code : undefined;
    if (code !== 404) {
      throw error;
    }
  }

  console.log(`Function ${functionId} missing. Creating definition…`);
  return functions.create({
    functionId,
    name: functionId,
    runtime: runtime || "node-16.0",
    execute: ["any"],
    entrypoint,
    commands,
  });
}

async function syncDefaultServerEnv(functions, functionId) {
  const desired = [
    { key: "APPWRITE_ENDPOINT", secret: false },
    { key: "APPWRITE_PROJECT_ID", secret: false },
    { key: "APPWRITE_API_KEY", secret: true },
  ];

  const current = await functions.listVariables({ functionId });
  const currentByKey = new Map((current.variables || []).map((entry) => [entry.key, entry]));

  for (const item of desired) {
    const value = process.env[item.key]?.trim();
    if (!value) {
      fail(`missing required env for variable sync: ${item.key}`);
    }

    const existing = currentByKey.get(item.key);
    if (existing) {
      await functions.updateVariable({
        functionId,
        variableId: existing.$id,
        key: item.key,
        value,
        secret: item.secret,
      });
      console.log(`Synced variable ${item.key} (updated).`);
      continue;
    }

    await functions.createVariable({
      functionId,
      key: item.key,
      value,
      secret: item.secret,
    });
    console.log(`Synced variable ${item.key} (created).`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  const functionId = args.functionId?.trim();
  const sourceDir = args.sourceDir?.trim();
  const entrypoint = args.entrypoint?.trim();

  if (!functionId) fail("missing --function-id");
  if (!sourceDir) fail("missing --source-dir");
  if (!entrypoint) fail("missing --entrypoint");

  const absoluteSourceDir = resolve(FUNCTIONS_ROOT, sourceDir);
  const absoluteEntrypoint = resolve(absoluteSourceDir, entrypoint);
  if (!existsSync(absoluteSourceDir)) fail(`source directory not found: ${absoluteSourceDir}`);
  if (!existsSync(absoluteEntrypoint)) fail(`entrypoint not found: ${absoluteEntrypoint}`);

  loadAppwriteCliEnv();
  const missingEnv = getMissingAppwriteServerEnvKeys();
  if (missingEnv.length > 0) {
    fail(`missing Appwrite env: ${missingEnv.join(", ")}`);
  }

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const functions = new Functions(client);
  const tempDir = mkdtempSync(resolve(tmpdir(), `appwrite-${functionId}-`));
  const archivePath = resolve(tempDir, `${functionId}.tar.gz`);

  try {
    if (args.createIfMissing) {
      await ensureFunctionExists(
        functions,
        functionId,
        entrypoint,
        args.commands ?? "",
        args.runtime?.trim() || process.env.APPWRITE_FUNCTIONS_RUNTIME?.trim() || "node-16.0"
      );
    }

    if (args.syncDefaultServerEnv) {
      await syncDefaultServerEnv(functions, functionId);
    }

    console.log(`Packaging ${functionId} from ${absoluteSourceDir}…`);
    tarDirectory(absoluteSourceDir, archivePath);

    console.log(`Uploading ${basename(archivePath)} to Appwrite…`);
    const deployment = await functions.createDeployment({
      functionId,
      code: InputFile.fromPath(archivePath, basename(archivePath)),
      activate: true,
      entrypoint,
      commands: args.commands ?? "",
    });

    console.log(`Deployment created: ${deployment.$id}`);
    const readyDeployment = await waitForDeployment(
      functions,
      functionId,
      deployment.$id,
      args.pollMs,
      args.waitMs
    );

    console.log(`Deployment ${readyDeployment.$id} is ready.`);
    await maybeUpdateTimeout(functions, functionId, args.timeout);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

await main();
