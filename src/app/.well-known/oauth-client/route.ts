import { NextResponse } from 'next/server';

const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

export async function GET() {
  const baseUrl = getBaseUrl();

  const clientMetadata = {
    client_id: `${baseUrl}/.well-known/oauth-client`,
    client_name: 'BlockSky',
    client_uri: baseUrl,
    redirect_uris: [`${baseUrl}/api/auth/oauth/callback`],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scope: 'atproto transition:generic',
    token_endpoint_auth_method: 'none',
    application_type: 'web',
    dpop_bound_access_tokens: true,
  };

  return NextResponse.json(clientMetadata, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
