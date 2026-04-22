#!/usr/bin/env node
/**
 * Create jobs-handler function in Appwrite
 */

const https = require("https");
const http = require("http");

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "http://localhost/v1";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || "";

if (!APPWRITE_API_KEY || !APPWRITE_PROJECT_ID) {
  console.error("❌ APPWRITE_API_KEY and APPWRITE_PROJECT_ID required");
  process.exit(1);
}

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const isHttps = APPWRITE_ENDPOINT.startsWith("https");
    const client = isHttps ? https : http;
    const url = new URL(APPWRITE_ENDPOINT + path);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": APPWRITE_PROJECT_ID,
        "X-Appwrite-Key": APPWRITE_API_KEY,
      },
    };

    const req = client.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on("error", reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log("Creating scriptony-jobs-handler function...\n");

  const result = await makeRequest("POST", "/functions", {
    functionId: "scriptony-jobs-handler",
    name: "scriptony-jobs-handler",
    runtime: "node-16.0",
    execute: ["users"],
    events: [],
    schedule: "",
    timeout: 300,
    enabled: true,
    logging: true,
    entrypoint: "index.js",
    commands: "npm install",
    scopes: ["collections.read", "collections.write", "documents.read", "documents.write", "files.read"],
  });

  if (result.status >= 400) {
    console.error("❌ Failed to create function:", result.data);
    process.exit(1);
  }

  console.log("✅ Function created successfully!");
  console.log("Function ID:", result.data.$id);
  console.log("\nNow deploy with:");
  console.log("  npm run appwrite:deploy:jobs");
}

main();
