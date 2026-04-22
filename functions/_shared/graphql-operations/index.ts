/**
 * Dispatches legacy GraphQL operation names to Appwrite Databases implementations.
 */

import { allHandlers } from "./handlers-all";

export async function dispatchGraphqlOperation(
  name: string,
  variables?: Record<string, unknown>,
): Promise<unknown> {
  const fn = allHandlers[name];
  if (!fn) {
    throw new Error(
      `Unimplemented GraphQL operation: ${name}. Add it in functions/_shared/graphql-operations/handlers-all.ts`,
    );
  }
  return fn(variables || {});
}
