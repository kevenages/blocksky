import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getOAuthClient, sessionStore } from '@/lib/oauthClient';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,  // 'lax' allows cookies on OAuth redirects
  path: '/',
};

const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
};

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const client = getOAuthClient();

    // Exchange the authorization code for a session
    const { session } = await client.callback(params);

    // Get user profile information
    const profileResponse = await session.fetchHandler(
      '/xrpc/app.bsky.actor.getProfile?actor=' + encodeURIComponent(session.did)
    );

    if (!profileResponse.ok) {
      throw new Error('Failed to fetch profile');
    }

    const profile = await profileResponse.json();

    // Get the saved session data from the store (the OAuth client saves it during callback)
    const savedSession = await sessionStore.get(session.did);

    // Set cookies
    const cookieStore = await cookies();

    // Store user DID to restore OAuth session later
    cookieStore.set('user_did', session.did, {
      ...COOKIE_OPTIONS,
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    cookieStore.set('user_handle', profile.handle, {
      ...COOKIE_OPTIONS,
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30,
    });

    if (profile.displayName) {
      cookieStore.set('user_display_name', profile.displayName, {
        ...COOKIE_OPTIONS,
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    // Mark this as an OAuth session
    cookieStore.set('auth_method', 'oauth', {
      ...COOKIE_OPTIONS,
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30,
    });

    // Store the serialized OAuth session in a cookie for persistence
    // This allows session restoration after server restarts
    if (savedSession) {
      cookieStore.set('oauth_session', JSON.stringify(savedSession), {
        ...COOKIE_OPTIONS,
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    // Redirect to home page
    return NextResponse.redirect(new URL('/', getBaseUrl()));
  } catch (error) {
    console.error('OAuth callback error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('OAuth callback error details:', message);

    // Redirect to home with error details
    const baseUrl = getBaseUrl();
    return NextResponse.redirect(
      new URL(`/?error=oauth_failed&details=${encodeURIComponent(message)}`, baseUrl)
    );
  }
}
