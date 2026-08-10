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
  // If running in browser, route requests via /api/graphql server proxy
  // to avoid exposing any admin credentials or secrets in browser JS bundle
  const isBrowser = typeof window !== 'undefined';
  const endpoint = isBrowser ? '/api/graphql' : getNhostGraphQLUrl();

  try {
    const fetchHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // Forward session user claims from localStorage if present
    if (isBrowser) {
      const activeUserStr = localStorage.getItem('agentflow_active_user');
      const activeOrgId = localStorage.getItem('agentflow_active_org_id');
      const activeRole = localStorage.getItem('agentflow_active_role');
      if (activeUserStr) {
        try {
          const user = JSON.parse(activeUserStr);
          if (user?.id) fetchHeaders['x-hasura-user-id'] = user.id;
        } catch {}
      }
      if (activeOrgId) fetchHeaders['x-hasura-org-id'] = activeOrgId;
      if (activeRole) fetchHeaders['x-hasura-role'] = activeRole;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: fetchHeaders,
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
