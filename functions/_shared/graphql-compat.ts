/**
 * GraphQL-shaped compatibility layer: parses operation names from query strings and
 * dispatches to Appwrite-backed handlers (no Hasura / remote GraphQL server).
 *
 * Location: functions/_shared/graphql-compat.ts
 */

import { dispatchGraphqlOperation } from "./graphql-operations/index";

export function extractOperationName(query: string): string {
  const cleaned = query.replace(/#[^\n\r]*/g, " ").replace(/\s+/g, " ");
  const m = cleaned.match(/\b(query|mutation)\s+(\w+)/);
  if (!m) {
    throw new Error("Could not parse GraphQL operation name from query");
  }
  return m[2];
}

export async function requestGraphql<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const name = extractOperationName(query);
  const result = await dispatchGraphqlOperation(name, variables);
  return result as T;
}
