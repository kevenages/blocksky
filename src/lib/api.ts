// src/lib/api.ts
import { AtpAgent } from '@atproto/api';

// Public agent for non-authenticated requests
export const agent = new AtpAgent({
  service: 'https://public.api.bsky.app',
});

// Authenticated agent for authenticated requests
// Note: Auth headers are set dynamically before each authenticated call
// using authAgent.setHeader() with a fresh token from tokenManager
export const authAgent = new AtpAgent({
  service: 'https://bsky.social',
});
