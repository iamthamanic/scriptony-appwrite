/**
 * Loose JSON-schema-shaped description for tool inputs (LLM-facing).
 * No runtime validator in v1 — host may add validation later.
 */

export type JsonSchema = Record<string, unknown>;
