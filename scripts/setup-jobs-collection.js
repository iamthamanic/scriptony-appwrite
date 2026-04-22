#!/usr/bin/env node
/**
 * Setup Script: Create jobs collection in Appwrite
 * Usage: node scripts/setup-jobs-collection.js
 */

const https = require("https");
const http = require("http");

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "http://localhost/v1";
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "scriptony-local";
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || "";
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "scriptony-dev";

if (!APPWRITE_API_KEY) {
  console.error("❌ APPWRITE_API_KEY environment variable required");
  console.log("\nUsage:");
  console.log("  APPWRITE_API_KEY=your-key node scripts/setup-jobs-collection.js");
  console.log("\nOr create .env file with:");
  console.log("  APPWRITE_ENDPOINT=http://localhost/v1");
  console.log("  APPWRITE_PROJECT_ID=scriptony-local");
  console.log("  APPWRITE_API_KEY=your-api-key");
  console.log("  APPWRITE_DATABASE_ID=scriptony-dev");
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
      method: method,
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
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on("error", reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function main() {
  console.log("🔧 Setting up jobs collection...");
  console.log(`   Endpoint: ${APPWRITE_ENDPOINT}`);
  console.log(`   Project: ${APPWRITE_PROJECT_ID}`);
  console.log(`   Database: ${DATABASE_ID}\n`);

  try {
    // Check if database exists
    console.log("📋 Checking database...");
    const dbCheck = await makeRequest("GET", `/databases/${DATABASE_ID}`);
    if (dbCheck.status === 404) {
      console.log("❌ Database not found. Creating database first...");
      const createDb = await makeRequest("POST", "/databases", {
        databaseId: DATABASE_ID,
        name: DATABASE_ID,
        documentSecurity: false,
      });
      if (createDb.status >= 400) {
        throw new Error(`Failed to create database: ${JSON.stringify(createDb.data)}`);
      }
      console.log("✅ Database created");
    } else {
      console.log("✅ Database exists");
    }

    // Check if collection exists
    console.log("📋 Checking collection...");
    const colCheck = await makeRequest("GET", `/databases/${DATABASE_ID}/collections/jobs`);
    
    if (colCheck.status === 200) {
      console.log("✅ jobs collection already exists");
      console.log("\n⚠️  To recreate, delete it first in Appwrite Console");
      return;
    }

    // Create collection
    console.log("📝 Creating jobs collection...");
    const createCol = await makeRequest("POST", `/databases/${DATABASE_ID}/collections`, {
      collectionId: "jobs",
      name: "jobs",
      documentSecurity: false,
    });

    if (createCol.status >= 400) {
      throw new Error(`Failed to create collection: ${JSON.stringify(createCol.data)}`);
    }
    console.log("✅ Collection created");

    // Create attributes
    console.log("📝 Creating attributes...");
    const attributes = [
      { key: "function_name", type: "string", size: 255, required: true },
      { key: "status", type: "string", size: 50, required: true, default: "pending" },
      { key: "payload_json", type: "string", size: 1000000, required: false },
      { key: "result_json", type: "string", size: 1000000, required: false },
      { key: "error", type: "string", size: 2000, required: false },
      { key: "progress", type: "integer", min: 0, max: 100, required: false },
      { key: "user_id", type: "string", size: 255, required: true },
      { key: "created_at", type: "datetime", required: true },
      { key: "updated_at", type: "datetime", required: true },
      { key: "completed_at", type: "datetime", required: false },
    ];

    for (const attr of attributes) {
      const attrRes = await makeRequest(
        "POST",
        `/databases/${DATABASE_ID}/collections/jobs/attributes/${attr.type}`,
        attr
      );
      if (attrRes.status >= 400) {
        console.error(`⚠️  Failed to create attribute ${attr.key}:`, attrRes.data);
      } else {
        console.log(`   ✅ ${attr.key}`);
      }
      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 200));
    }

    // Create indexes
    console.log("📇 Creating indexes...");
    const indexes = [
      { key: "idx_jobs_status", type: "key", attributes: ["status"] },
      { key: "idx_jobs_user", type: "key", attributes: ["user_id"] },
      { key: "idx_jobs_updated", type: "key", attributes: ["updated_at"] },
    ];

    for (const idx of indexes) {
      const idxRes = await makeRequest(
        "POST",
        `/databases/${DATABASE_ID}/collections/jobs/indexes`,
        idx
      );
      if (idxRes.status >= 400) {
        console.error(`⚠️  Failed to create index ${idx.key}:`, idxRes.data);
      } else {
        console.log(`   ✅ ${idx.key}`);
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    console.log("\n✅ Setup complete!");
    console.log("\nNext steps:");
    console.log("  1. Deploy the function: npm run appwrite:deploy:jobs");
    console.log("  2. Start using async jobs in your code");
    
  } catch (error) {
    console.error("\n❌ Setup failed:", error.message);
    process.exit(1);
  }
}

main();
