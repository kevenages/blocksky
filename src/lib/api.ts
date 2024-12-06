// src/lib/api.ts
import { AtpAgent } from '@atproto/api';
import Cookies from 'js-cookie';

// Public agent for non-authenticated requests
export const agent = new AtpAgent({
  service: 'https://public.api.bsky.app',
});

// Authenticated agent for authenticated requests
export const authAgent = new AtpAgent({
  service: 'https://bsky.social',
});

authAgent.setHeader(
  'Authorization',
  `Bearer ${Cookies.get('accessToken') || ''}`
);

// Helper function to dynamically set the Authorization header
export const withAuthHeaders = (headers: Record<string, string> = {}) => {
  const accessToken = Cookies.get("accessToken");
  console.log('accessToken', accessToken);
  if (accessToken) {
    return {
      ...headers,
      Authorization: `Bearer ${accessToken}`,
    };
  }
  return headers;
};
