"use strict";
// ============================================================
// Hasura Admin GraphQL Helper for Nhost Functions
// Executes GraphQL operations with full admin privileges in serverless functions
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHasuraAdminEndpoint = getHasuraAdminEndpoint;
exports.getHasuraAdminSecret = getHasuraAdminSecret;
exports.adminGraphQLRequest = adminGraphQLRequest;
function getHasuraAdminEndpoint() {
    if (process.env.NHOST_BACKEND_URL) {
        return `${process.env.NHOST_BACKEND_URL}/v1/graphql`;
    }
    if (process.env.NHOST_SUBDOMAIN && process.env.NHOST_REGION) {
        return `https://${process.env.NHOST_SUBDOMAIN}.graphql.${process.env.NHOST_REGION}.nhost.run/v1/graphql`;
    }
    return process.env.HASURA_GRAPHQL_URL || 'http://localhost:8080/v1/graphql';
}
function getHasuraAdminSecret() {
    return process.env.NHOST_ADMIN_SECRET || process.env.HASURA_GRAPHQL_ADMIN_SECRET || 'nhost-admin-secret';
}
async function adminGraphQLRequest(query, variables = {}) {
    const endpoint = getHasuraAdminEndpoint();
    const secret = getHasuraAdminSecret();
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': secret,
        },
        body: JSON.stringify({ query, variables }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hasura GraphQL Error (${response.status}): ${errorText}`);
    }
    const result = await response.json();
    if (result.errors && result.errors.length > 0) {
        throw new Error(`GraphQL Query Failure: ${result.errors.map((e) => e.message).join(', ')}`);
    }
    return result.data;
}
