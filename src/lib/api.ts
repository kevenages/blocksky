// src/lib/api.ts

import { BskyAgent } from '@atproto/api';

// Initialize the Bluesky agent
export const agent = new BskyAgent({
  service: 'https://public.api.bsky.app', // Use public API for non-authenticated requests
});