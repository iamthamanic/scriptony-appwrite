/* Injected at the very top of the bundle (before undici). Appwrite Node 16 executor. */
const web = require("node:stream/web");
const g = globalThis;
if (typeof g.ReadableStream === "undefined") {
  g.ReadableStream = web.ReadableStream;
  g.WritableStream = web.WritableStream;
  g.TransformStream = web.TransformStream;
  g.ByteLengthQueuingStrategy = web.ByteLengthQueuingStrategy;
  g.CountQueuingStrategy = web.CountQueuingStrategy;
}
