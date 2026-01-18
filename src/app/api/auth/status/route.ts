import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

interface JwtPayload {
  exp?: number;
}

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string, thresholdSeconds = 60): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = payload.exp - now;

  return expiresIn <= thresholdSeconds;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const authMethod = cookieStore.get('auth_method')?.value;
    const userHandle = cookieStore.get('user_handle')?.value;
    const userDid = cookieStore.get('user_did')?.value;
    const userDisplayName = cookieStore.get('user_display_name')?.value;

    // Handle OAuth sessions - trust cookies for status check
    // Session validation happens when making actual API calls
    if (authMethod === 'oauth') {
      if (!userDid || !userHandle) {
        return NextResponse.json({
          isLoggedIn: false,
          authMethod: null,
          user: null,
        });
      }

      // OAuth session exists based on cookies
      return NextResponse.json({
        isLoggedIn: true,
        needsRefresh: false,
        authMethod: 'oauth',
        user: {
          handle: userHandle || null,
          did: userDid || null,
          displayName: userDisplayName || null,
        },
      });
    }

    // Handle password-based sessions
    const accessToken = cookieStore.get('access_token')?.value;
    const refreshToken = cookieStore.get('refresh_token')?.value;

    // No tokens = not logged in
    if (!accessToken && !refreshToken) {
      return NextResponse.json({
        isLoggedIn: false,
        authMethod: null,
        user: null,
      });
    }

    // Check if access token is valid
    let needsRefresh = !accessToken || isTokenExpired(accessToken);

    // If we need to refresh and have a refresh token, try to refresh
    if (needsRefresh && refreshToken && !isTokenExpired(refreshToken, 0)) {
      // Token needs refresh but we have a valid refresh token
      // The client should call /api/auth/refresh
      return NextResponse.json({
        isLoggedIn: true,
        needsRefresh: true,
        authMethod: 'password',
        user: {
          handle: userHandle || null,
          did: userDid || null,
          displayName: userDisplayName || null,
        },
      });
    }

    // If refresh token is also expired, not logged in
    if (needsRefresh && (!refreshToken || isTokenExpired(refreshToken, 0))) {
      return NextResponse.json({
        isLoggedIn: false,
        authMethod: null,
        user: null,
      });
    }

    // Valid session
    return NextResponse.json({
      isLoggedIn: true,
      needsRefresh: false,
      authMethod: 'password',
      user: {
        handle: userHandle || null,
        did: userDid || null,
        displayName: userDisplayName || null,
      },
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json({
      isLoggedIn: false,
      authMethod: null,
      user: null,
    });
  }
}
