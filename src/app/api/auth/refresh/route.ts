import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getOAuthClient } from '@/lib/oauthClient';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

export async function POST() {
  try {
    const cookieStore = await cookies();
    const authMethod = cookieStore.get('auth_method')?.value;
    const userDid = cookieStore.get('user_did')?.value;

    // Handle OAuth refresh
    if (authMethod === 'oauth') {
      if (!userDid) {
        return NextResponse.json(
          { error: 'No session found' },
          { status: 401 }
        );
      }

      try {
        const client = getOAuthClient();
        // Restore session with forced refresh
        await client.restore(userDid, true);
        return NextResponse.json({ success: true });
      } catch {
        // Clear OAuth session cookies on failure
        cookieStore.delete('user_did');
        cookieStore.delete('user_handle');
        cookieStore.delete('user_display_name');
        cookieStore.delete('auth_method');

        return NextResponse.json(
          { error: 'OAuth session expired. Please log in again.' },
          { status: 401 }
        );
      }
    }

    // Handle password-based refresh
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token available' },
        { status: 401 }
      );
    }

    // Call Bluesky API to refresh token
    const response = await fetch('https://bsky.social/xrpc/com.atproto.server.refreshSession', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${refreshToken}`,
      },
    });

    if (!response.ok) {
      // Clear invalid tokens
      cookieStore.delete('access_token');
      cookieStore.delete('refresh_token');

      return NextResponse.json(
        { error: 'Session expired. Please log in again.' },
        { status: 401 }
      );
    }

    const data = await response.json();

    // Update tokens in httpOnly cookies
    cookieStore.set('access_token', data.accessJwt, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 2, // 2 hours
    });

    cookieStore.set('refresh_token', data.refreshJwt, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json(
      { error: 'An error occurred during token refresh' },
      { status: 500 }
    );
  }
}
