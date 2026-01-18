// Client-side utilities for BlockSky
// Note: Authenticated operations are now handled by server-side API routes

export interface User {
  handle: string;
  did?: string;
}

// Blocked users cache (client-side, for UI state only)
let blockedHandlesCache: Set<string> | null = null;
let blockedCacheTimestamp: number = 0;
const BLOCKED_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Add a handle to the blocked cache (called after successful block)
 */
export const addToBlockedCache = (handle: string): void => {
  if (blockedHandlesCache) {
    blockedHandlesCache.add(handle);
  }
};

/**
 * Add multiple handles to the blocked cache
 */
export const addMultipleToBlockedCache = (handles: string[]): void => {
  if (blockedHandlesCache) {
    handles.forEach(h => blockedHandlesCache!.add(h));
  }
};

/**
 * Clear the blocked cache (call on logout)
 */
export const clearBlockedCache = (): void => {
  blockedHandlesCache = null;
  blockedCacheTimestamp = 0;
};

// User data cache (for UI state only)
let userDataCacheTimestamp: number = 0;

/**
 * Clear the user data cache (call on logout)
 */
export const clearUserDataCache = (): void => {
  userDataCacheTimestamp = 0;
};
