import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  const baseUrl = process.env.APP_URL || process.env.VITE_APP_URL || 'http://localhost:3000'

  return {
    client_id: `${baseUrl}/.well-known/oauth-client.json`,
    client_name: 'BlockSky',
    client_uri: baseUrl,
    redirect_uris: [`${baseUrl}/auth/callback`],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scope: 'atproto transition:generic',
    token_endpoint_auth_method: 'none',
    application_type: 'web',
    dpop_bound_access_tokens: true,
  }
})
