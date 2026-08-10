import { NextRequest, NextResponse } from 'next/server';

function getHasuraAdminEndpoint(): string {
  const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN || process.env.NHOST_SUBDOMAIN || 'local';
  const region = process.env.NEXT_PUBLIC_NHOST_REGION || process.env.NHOST_REGION || 'local';

  if (subdomain === 'local') {
    return process.env.HASURA_GRAPHQL_URL || process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL || 'http://localhost:8080/v1/graphql';
  }

  return `https://${subdomain}.graphql.${region}.nhost.run/v1/graphql`;
}

function getHasuraAdminSecret(): string {
  return process.env.HASURA_GRAPHQL_ADMIN_SECRET || process.env.NHOST_ADMIN_SECRET || 'nhost-admin-secret';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, variables } = body;

    if (!query) {
      return NextResponse.json({ errors: [{ message: 'GraphQL query is required' }] }, { status: 400 });
    }

    const endpoint = getHasuraAdminEndpoint();
    const secret = getHasuraAdminSecret();

    // Collect user session claims from request headers if available
    const reqHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': secret,
    };

    const userId = req.headers.get('x-hasura-user-id');
    const orgId = req.headers.get('x-hasura-org-id');
    const role = req.headers.get('x-hasura-role');

    if (userId) reqHeaders['x-hasura-user-id'] = userId;
    if (orgId) reqHeaders['x-hasura-org-id'] = orgId;
    if (role) reqHeaders['x-hasura-role'] = role;

    const authHeader = req.headers.get('authorization');
    if (authHeader) reqHeaders['authorization'] = authHeader;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify({ query, variables }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { errors: [{ message: `Hasura HTTP Error (${res.status}): ${errText}` }] },
        { status: res.status }
      );
    }

    const json = await res.json();
    return NextResponse.json(json);
  } catch (err: unknown) {
    return NextResponse.json(
      { errors: [{ message: err instanceof Error ? err.message : String(err) }] },
      { status: 500 }
    );
  }
}
