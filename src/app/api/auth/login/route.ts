import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

export async function POST(request: NextRequest) {
  try {
    const { identifier, password } = await request.json();

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Handle and password are required' },
        { status: 400 }
      );
    }

    // Call Bluesky API server-side
    const response = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: error.message || 'Invalid handle or app password' },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Set httpOnly cookies - tokens never exposed to JavaScript
    const cookieStore = await cookies();

    cookieStore.set('access_token', data.accessJwt, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 2, // 2 hours
    });

    cookieStore.set('refresh_token', data.refreshJwt, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Store user info in non-httpOnly cookies (safe, not sensitive)
    cookieStore.set('user_handle', data.handle, {
      ...COOKIE_OPTIONS,
      httpOnly: false, // Allow JS to read handle for display
    });

    cookieStore.set('user_did', data.did, {
      ...COOKIE_OPTIONS,
      httpOnly: false, // Allow JS to read DID for display
    });

    if (data.displayName) {
      cookieStore.set('user_display_name', data.displayName, {
        ...COOKIE_OPTIONS,
        httpOnly: false,
      });
    }

    // Set auth method to password
    cookieStore.set('auth_method', 'password', {
      ...COOKIE_OPTIONS,
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 30,
    });

    // Clear any OAuth session cookie from previous OAuth login
    cookieStore.delete('oauth_session');

    // Return user info (but NOT tokens)
    return NextResponse.json({
      success: true,
      user: {
        handle: data.handle,
        did: data.did,
        displayName: data.displayName || null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
