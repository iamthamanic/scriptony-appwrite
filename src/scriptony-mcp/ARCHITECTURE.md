# Scriptony internal MCP-style layers

This is **not** a public MCP (stdio/SSE) server. It is a **canonical capability layer** inside the monorepo: tools, registry, policies, and stable result shapes. A separate **runtime** orchestrates invocation, approval, and (later) LLM/provider loops. **Appwrite** only hosts HTTP — no tool definitions in the handler.

## `src/scriptony-mcp` (capability layer)

- **Owns:** tool contract (`InternalTool`), JSON-schema-shaped `inputSchema`, policy category, risk, `ToolResult` envelope, `ToolRegistry`, built-in tool modules that depend only on `ScriptonyMcpInfra` (interface).
- **Does not own:** HTTP, JWT, GraphQL, Appwrite SDK, provider API keys, or LLM streaming.

### SOLID / DRY / KISS (extension)

- **Dependency inversion:** capabilities depend on `ScriptonyMcpInfra` and `input-helpers`, never on the Appwrite host.
- **Open/closed:** add a tool by `registry.register(...)` and add one entry to `DECLARATIVE_TOOL_INPUT_RULES` in [`schemas/validate.ts`](schemas/validate.ts) when the tool needs shared required-field checks; do not change [`registry/registry.ts`](registry/registry.ts) or [`scriptony-runtime/tool-loop.ts`](../scriptony-runtime/tool-loop.ts) for normal extensions.
- **DRY:** body parsing uses [`schemas/input-helpers.ts`](schemas/input-helpers.ts) so validation and `execute()` agree on `project_id` / request context resolution.

## `src/scriptony-runtime` (orchestration)

- **Owns:** `RuntimeContext`, `ProviderRouter` scaffold, approval gate, single-step tool loop, `orchestrator` entry for “run this tool with this context”.
- **Does not own:** concrete DB access — receives `ScriptonyMcpInfra` from the host.

## `functions/scriptony-mcp-appwrite` (host)

- **Owns:** request parsing, `requireUserBootstrap`, building `ScriptonyMcpInfra` (GraphQL/Appwrite-backed), calling `runMcpInvocation` / orchestrator, JSON response.
- **Does not own:** registry plumbing internals or duplicate business rules — delegates to `scriptony-mcp` + `scriptony-runtime`.

## External MCP protocol (future)

A **public** MCP server (stdio, Streamable HTTP, or SSE per spec) is **not** implemented here. When needed, add a **separate adapter** that:

1. Reuses `ToolRegistry` / tool descriptors for `tools/list`.
2. Maps MCP `tools/call` to the same contracts as `POST /invoke` (auth must be explicit for non-browser clients).
3. Keeps transport out of `scriptony-mcp` — capability shapes stay stable; only the adapter changes.
