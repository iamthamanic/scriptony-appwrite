/**
 * Shared Hasura GraphQL helper for Nhost functions.
 *
 * All privileged data access goes through the injected Nhost admin secret.
 */

import { getAdminSecret, getGraphqlUrl } from "./env";

interface GraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

export async function requestGraphql<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(getGraphqlUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": getAdminSecret(),
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = (await response.json()) as GraphqlResponse<T>;

  if (!response.ok) {
    throw new Error(
      payload.errors?.map((entry) => entry.message).join(", ") ||
        `GraphQL request failed with status ${response.status}`
    );
  }

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((entry) => entry.message).join(", "));
  }

  if (!payload.data) {
    throw new Error("GraphQL request returned no data");
  }

  return payload.data;
}
