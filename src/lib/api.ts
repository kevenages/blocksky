// src/lib/api.ts
import { AtpAgent } from '@atproto/api';

// Public agent for non-authenticated requests (profile lookups, search, etc.)
export const agent = new AtpAgent({
  service: 'https://public.api.bsky.app',
});

// Note: Authenticated requests now go through server-side API routes
// See /api/auth/* and /api/block/* for authenticated operations
