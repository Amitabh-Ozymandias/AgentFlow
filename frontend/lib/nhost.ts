// ============================================================
// Nhost & Hasura GraphQL Client Helper
// Connects frontend to Hasura GraphQL API on Nhost
// ============================================================

export function getNhostGraphQLUrl(): string {
  const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN || 'local';
  const region = process.env.NEXT_PUBLIC_NHOST_REGION || 'local';

  if (subdomain === 'local') {
    return process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL || 'http://localhost:8080/v1/graphql';
  }

  return `https://${subdomain}.graphql.${region}.nhost.run/v1/graphql`;
}

export function getNhostFunctionsUrl(): string {
  const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN || 'local';
  const region = process.env.NEXT_PUBLIC_NHOST_REGION || 'local';

  if (subdomain === 'local') {
    return process.env.NEXT_PUBLIC_NHOST_FUNCTIONS_URL || 'http://localhost:3550/v1/functions';
  }

  return `https://${subdomain}.functions.${region}.nhost.run/v1`;
}

export async function hasuraGraphQLFetch<T>(
  query: string,
  variables: Record<string, unknown> = {},
  headers: Record<string, string> = {}
): Promise<{ data?: T; errors?: Array<{ message: string }> }> {
  const endpoint = getNhostGraphQLUrl();
  const adminSecret = process.env.NEXT_PUBLIC_HASURA_ADMIN_SECRET || 'nhost-admin-secret';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': adminSecret,
        ...headers,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { errors: [{ message: `HTTP ${res.status}: ${text}` }] };
    }

    const json = await res.json();
    return json;
  } catch (err: unknown) {
    return { errors: [{ message: err instanceof Error ? err.message : String(err) }] };
  }
}
