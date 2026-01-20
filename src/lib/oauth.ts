import { NodeOAuthClient } from '@atproto/oauth-client-node'
import { firestoreStateStore, firestoreSessionStore } from './firestore'

const getBaseUrl = () => {
  // APP_URL for server-side (Cloud Run), VITE_APP_URL for client-side (Vite)
  return process.env.APP_URL || process.env.VITE_APP_URL || 'http://localhost:3000'
}

declare global {
  var __oauthClient: NodeOAuthClient | null | undefined
}

let oauthClient: NodeOAuthClient | null = globalThis.__oauthClient ?? null

export async function getOAuthClient(): Promise<NodeOAuthClient> {
  if (oauthClient) return oauthClient

  const baseUrl = getBaseUrl()

  oauthClient = new NodeOAuthClient({
    clientMetadata: {
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
    },
    stateStore: firestoreStateStore,
    sessionStore: firestoreSessionStore,
  })

  globalThis.__oauthClient = oauthClient
  return oauthClient
}

// Helper to get an authenticated agent for a user
export async function getSessionAgent(did: string) {
  const client = await getOAuthClient()
  try {
    const session = await client.restore(did)
    return session
  } catch {
    return null
  }
}
