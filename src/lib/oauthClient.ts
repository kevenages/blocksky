import { NodeOAuthClient, NodeSavedSession, NodeSavedState } from '@atproto/oauth-client-node';

const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

// In-memory stores for OAuth state and sessions
// Note: In production with multiple instances, use Redis or a database
const stateStore = new Map<string, NodeSavedState>();
const sessionStore = new Map<string, NodeSavedSession>();

let oauthClient: NodeOAuthClient | null = null;

export function getOAuthClient(): NodeOAuthClient {
  if (oauthClient) {
    return oauthClient;
  }

  const baseUrl = getBaseUrl();
  const clientId = `${baseUrl}/.well-known/oauth-client`;

  oauthClient = new NodeOAuthClient({
    clientMetadata: {
      client_id: clientId,
      client_name: 'BlockSky',
      client_uri: baseUrl,
      redirect_uris: [`${baseUrl}/api/auth/oauth/callback`],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: 'atproto transition:generic',
      token_endpoint_auth_method: 'none',
      application_type: 'web',
      dpop_bound_access_tokens: true,
    },
    responseMode: 'query',
    stateStore: {
      async get(key: string) {
        return stateStore.get(key);
      },
      async set(key: string, value: NodeSavedState) {
        stateStore.set(key, value);
      },
      async del(key: string) {
        stateStore.delete(key);
      },
    },
    sessionStore: {
      async get(key: string) {
        return sessionStore.get(key);
      },
      async set(key: string, value: NodeSavedSession) {
        sessionStore.set(key, value);
      },
      async del(key: string) {
        sessionStore.delete(key);
      },
    },
  });

  return oauthClient;
}

export async function getOAuthSession(did: string) {
  const client = getOAuthClient();
  try {
    return await client.restore(did);
  } catch {
    return null;
  }
}

export { stateStore, sessionStore };
