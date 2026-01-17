// src/lib/tokenManager.ts
import Cookies from 'js-cookie';

const REFRESH_THRESHOLD_SECONDS = 60; // Refresh if token expires within 60 seconds

interface JwtPayload {
  exp?: number;
  iat?: number;
  sub?: string;
}

interface RefreshResponse {
  accessJwt: string;
  refreshJwt: string;
  handle: string;
  did: string;
}

/**
 * Decode a JWT payload without verification (we just need to read the exp claim)
 */
const decodeJwtPayload = (token: string): JwtPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
};

/**
 * Check if a token is expired or will expire soon
 */
export const isTokenExpired = (token: string | undefined, thresholdSeconds = REFRESH_THRESHOLD_SECONDS): boolean => {
  if (!token) return true;

  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = payload.exp - now;

  return expiresIn <= thresholdSeconds;
};

/**
 * Get the current access token, refreshing if necessary
 */
export const getValidAccessToken = async (): Promise<string | null> => {
  const accessToken = Cookies.get('accessToken');
  const refreshToken = Cookies.get('refreshToken');

  // If access token is still valid, return it
  if (accessToken && !isTokenExpired(accessToken)) {
    return accessToken;
  }

  // If we have a refresh token, try to refresh
  if (refreshToken) {
    const newTokens = await refreshAccessToken(refreshToken);
    if (newTokens) {
      return newTokens.accessJwt;
    }
  }

  // No valid tokens available
  return null;
};

/**
 * Refresh the access token using the refresh token
 */
export const refreshAccessToken = async (refreshToken: string): Promise<RefreshResponse | null> => {
  try {
    const response = await fetch('https://bsky.social/xrpc/com.atproto.server.refreshSession', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${refreshToken}`,
      },
    });

    if (!response.ok) {
      console.error('Token refresh failed:', response.status, response.statusText);
      return null;
    }

    const data: RefreshResponse = await response.json();

    // Update cookies with new tokens
    Cookies.set('accessToken', data.accessJwt);
    Cookies.set('refreshToken', data.refreshJwt);

    console.log('Token refreshed successfully');
    return data;
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
};

/**
 * Ensure we have a valid token before making an API call.
 * Returns the valid access token or null if refresh failed.
 */
export const ensureValidToken = async (): Promise<string | null> => {
  return getValidAccessToken();
};

/**
 * Get auth headers with a valid token, refreshing if necessary
 */
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await getValidAccessToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

/**
 * Check if the user's session is still valid (has valid tokens)
 */
export const isSessionValid = async (): Promise<boolean> => {
  const token = await getValidAccessToken();
  return token !== null;
};
