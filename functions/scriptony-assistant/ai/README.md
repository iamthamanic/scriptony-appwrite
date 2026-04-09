# Deprecated: Assistant `ai/` HTTP handlers

Legacy route implementations for `/ai/settings`, `/ai/chat`, `/ai/conversations/*`, etc. are **bundled and served from `scriptony-ai`** (`functions/scriptony-ai/assistant-legacy.ts`). Deploy **`scriptony-ai`** only; the gateway routes `/ai` to that function.

These files remain in the repo so the shared GraphQL-backed logic stays in one place and is imported by the Hono adapter. Do not add new standalone deployments that expect `scriptony-assistant` for `/ai/*`.
