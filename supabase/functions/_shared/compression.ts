/**
 * 🗜️ COMPRESSION MIDDLEWARE
 * 
 * Automatically compress responses with gzip/brotli
 * McMaster-Carr level performance optimization
 */

import { Context, Next } from "npm:hono";

/**
 * Compress middleware for Hono
 * Supports gzip and deflate (brotli not widely supported in Deno yet)
 */
export async function compress(c: Context, next: Next) {
  await next();

  // Only compress JSON responses
  const contentType = c.res.headers.get('Content-Type');
  if (!contentType || !contentType.includes('application/json')) {
    return;
  }

  // Check if client accepts compression
  const acceptEncoding = c.req.header('Accept-Encoding') || '';
  
  // Get response body
  const body = await c.res.text();
  
  // Skip compression for small responses (<1KB)
  if (body.length < 1024) {
    c.res = new Response(body, {
      status: c.res.status,
      headers: c.res.headers,
    });
    return;
  }

  // Compress with gzip (best browser support)
  if (acceptEncoding.includes('gzip')) {
    const compressed = await gzipCompress(body);
    c.res = new Response(compressed, {
      status: c.res.status,
      headers: new Headers({
        ...Object.fromEntries(c.res.headers),
        'Content-Encoding': 'gzip',
        'Content-Length': compressed.byteLength.toString(),
        'Vary': 'Accept-Encoding',
      }),
    });
    
    console.log(`[Compression] Compressed ${body.length} → ${compressed.byteLength} bytes (${Math.round((1 - compressed.byteLength / body.length) * 100)}% savings)`);
    return;
  }

  // Fallback: no compression
  c.res = new Response(body, {
    status: c.res.status,
    headers: c.res.headers,
  });
}

/**
 * Gzip compression using CompressionStream API
 */
async function gzipCompress(text: string): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    }
  });

  const compressedStream = stream.pipeThrough(
    new CompressionStream('gzip')
  );

  const chunks: Uint8Array[] = [];
  const reader = compressedStream.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // Concatenate chunks
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}
