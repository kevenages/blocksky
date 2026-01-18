import { NextRequest, NextResponse } from 'next/server';
import { getOAuthClient } from '@/lib/oauthClient';

export async function POST(request: NextRequest) {
  try {
    const { handle } = await request.json();

    if (!handle) {
      return NextResponse.json(
        { error: 'Handle is required' },
        { status: 400 }
      );
    }

    const client = getOAuthClient();

    // Generate authorization URL for the given handle
    const authUrl = await client.authorize(handle, {
      scope: 'atproto transition:generic',
    });

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error) {
    console.error('OAuth initiation error:', error);
    const message = error instanceof Error ? error.message : String(error);
    console.error('OAuth error message:', message);

    // Check for common errors and provide friendly messages
    const lowerMessage = message.toLowerCase();
    if (
      lowerMessage.includes('resolve identity') ||
      lowerMessage.includes('unable to resolve') ||
      lowerMessage.includes('not found') ||
      lowerMessage.includes('enotfound') ||
      lowerMessage.includes('could not resolve') ||
      lowerMessage.includes('no user') ||
      lowerMessage.includes('handle invalid') ||
      lowerMessage.includes('actor not found')
    ) {
      return NextResponse.json(
        { error: 'Could not find that Bluesky handle. Please check the spelling and try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow. Please try again.' },
      { status: 500 }
    );
  }
}
