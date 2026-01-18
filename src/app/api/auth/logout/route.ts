import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getOAuthClient } from '@/lib/oauthClient';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const authMethod = cookieStore.get('auth_method')?.value;
    const userDid = cookieStore.get('user_did')?.value;

    // Revoke OAuth session if applicable
    if (authMethod === 'oauth' && userDid) {
      try {
        const client = getOAuthClient();
        await client.revoke(userDid);
      } catch (error) {
        // Log but don't fail logout if revocation fails
        console.error('OAuth revocation error:', error);
      }
    }

    // Clear all auth-related cookies
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');
    cookieStore.delete('user_handle');
    cookieStore.delete('user_did');
    cookieStore.delete('user_display_name');
    cookieStore.delete('auth_method');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
