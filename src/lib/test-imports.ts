/**
 * Test file to check if all imports work
 */

// Test formatter imports
try {
  const date = require("./formatters/date");
  console.log("✅ Date formatter loaded");
} catch (e) {
  console.error("❌ Date formatter error:", e);
}

try {
  const number = require("./formatters/number");
  console.log("✅ Number formatter loaded");
} catch (e) {
  console.error("❌ Number formatter error:", e);
}

try {
  const text = require("./formatters/text");
  console.log("✅ Text formatter loaded");
} catch (e) {
  console.error("❌ Text formatter error:", e);
}

try {
  const validators = require("./validators/input");
  console.log("✅ Validators loaded");
} catch (e) {
  console.error("❌ Validators error:", e);
}
