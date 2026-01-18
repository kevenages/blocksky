import { cookies } from 'next/headers';
import { AtpAgent } from '@atproto/api';
import { OAuthSession } from '@atproto/oauth-client-node';
import { getOAuthClient, sessionStore } from './oauthClient';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

interface JwtPayload {
  exp?: number;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch {
    return null;
  }
}

function isTokenExpired(token: string, thresholdSeconds = 60): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp - now <= thresholdSeconds;
}

/**
 * Get the current authentication method.
 */
export async function getAuthMethod(): Promise<'oauth' | 'password' | null> {
  const cookieStore = await cookies();
  const authMethod = cookieStore.get('auth_method')?.value;
  if (authMethod === 'oauth') return 'oauth';

  // Check for password-based auth
  const accessToken = cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;
  if (accessToken || refreshToken) return 'password';

  return null;
}

/**
 * Get a valid access token for password-based auth, refreshing if necessary.
 * Returns null for OAuth sessions (use getAuthenticatedAgent instead).
 */
export async function getServerAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const authMethod = cookieStore.get('auth_method')?.value;

  // OAuth sessions don't expose tokens directly
  if (authMethod === 'oauth') {
    return null;
  }

  let accessToken = cookieStore.get('access_token')?.value;
  const refreshToken = cookieStore.get('refresh_token')?.value;

  // If access token is valid, return it
  if (accessToken && !isTokenExpired(accessToken)) {
    return accessToken;
  }

  // Try to refresh
  if (refreshToken && !isTokenExpired(refreshToken, 0)) {
    try {
      const response = await fetch('https://bsky.social/xrpc/com.atproto.server.refreshSession', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${refreshToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Update cookies with new tokens
        cookieStore.set('access_token', data.accessJwt, {
          ...COOKIE_OPTIONS,
          maxAge: 60 * 60 * 2,
        });

        cookieStore.set('refresh_token', data.refreshJwt, {
          ...COOKIE_OPTIONS,
          maxAge: 60 * 60 * 24 * 30,
        });

        return data.accessJwt;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }
  }

  return null;
}

/**
 * Create a SessionManager adapter for OAuth sessions.
 */
function createOAuthSessionManager(oauthSession: OAuthSession) {
  return {
    get did() {
      return oauthSession.did;
    },
    fetchHandler(url: string, init?: RequestInit): Promise<Response> {
      return oauthSession.fetchHandler(url, init);
    },
  };
}

/**
 * Get an authenticated AtpAgent for server-side use.
 * Works with both OAuth and password-based auth.
 */
export async function getAuthenticatedAgent(): Promise<AtpAgent | null> {
  const cookieStore = await cookies();
  const authMethod = cookieStore.get('auth_method')?.value;
  const userDid = cookieStore.get('user_did')?.value;

  // Handle OAuth sessions
  if (authMethod === 'oauth' && userDid) {
    try {
      const client = getOAuthClient();

      // First, try to restore session from cookie if not in memory
      const oauthSessionCookie = cookieStore.get('oauth_session')?.value;
      if (oauthSessionCookie) {
        try {
          const savedSession = JSON.parse(oauthSessionCookie);
          // Re-populate the in-memory store from the cookie
          await sessionStore.set(userDid, savedSession);
        } catch (e) {
          console.error('Failed to parse oauth_session cookie:', e);
        }
      }

      const oauthSession = await client.restore(userDid, 'auto');

      // Create a SessionManager adapter from the OAuth session
      const sessionManager = createOAuthSessionManager(oauthSession);

      // Use the Agent class which accepts a SessionManager
      const { Agent } = await import('@atproto/api');
      const agent = new Agent(sessionManager);

      return agent as unknown as AtpAgent;
    } catch (error) {
      console.error('OAuth session restore failed:', error);
      return null;
    }
  }

  // Handle password-based auth
  const token = await getServerAccessToken();
  if (!token) return null;

  const agent = new AtpAgent({ service: 'https://bsky.social' });
  agent.setHeader('Authorization', `Bearer ${token}`);
  return agent;
}

/**
 * Get user info from cookies.
 */
export async function getServerUserInfo(): Promise<{ handle: string; did: string } | null> {
  const cookieStore = await cookies();
  const handle = cookieStore.get('user_handle')?.value;
  const did = cookieStore.get('user_did')?.value;

  if (!handle || !did) return null;
  return { handle, did };
}
