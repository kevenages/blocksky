// src/lib/api.ts

import { AtpAgent } from '@atproto/api';

// Initialize the Bluesky agent
export const agent = new AtpAgent({
  service: 'https://public.api.bsky.app', // Use public API for non-authenticated requests
});