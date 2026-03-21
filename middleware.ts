/**
 * Vercel Edge Middleware: block known AI crawler user-agents to avoid
 * unnecessary backend and edge usage from training/citation bots.
 * Does not block normal browsers or search engine crawlers (e.g. Googlebot).
 */
import { next } from "@vercel/functions";

const AI_BOT_PATTERN =
  /GPTBot|ClaudeBot|anthropic-ai|Google-Extended|Meta-ExternalAgent|Bytespider|CCBot|PerplexityBot|ChatGPT-User|Cohere-ai|Amazonbot/i;

export const config = {
  matcher: ["/(.*)"],
};

export default function middleware(request: Request): Response {
  const ua = request.headers.get("user-agent") ?? "";
  if (AI_BOT_PATTERN.test(ua)) {
    return new Response("Forbidden", { status: 403 });
  }
  return next();
}
