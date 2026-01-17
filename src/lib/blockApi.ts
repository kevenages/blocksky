import { agent, authAgent } from './api';
import { toast } from "../hooks/use-toast";
import Cookies from 'js-cookie';
import { getValidAccessToken, ensureValidToken } from './tokenManager';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// Batch size for applyWrites - ATProto supports up to 200 operations per request
const BATCH_SIZE = 200;

export interface User {
  handle: string;
  did: string;
}

interface PaginatedResponse<T> {
  data: {
    followers?: T[];
    follows?: T[];
    blocks?: T[]; // Add blocks here
    cursor?: string;
  };
}

let userFollowers: User[] = [];
let userFollows: User[] = [];
let userDataCacheTimestamp: number = 0;
let userDataCacheHandle: string | null = null;
const USER_DATA_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Blocked users cache
let blockedHandlesCache: Set<string> | null = null;
let blockedCacheTimestamp: number = 0;
const BLOCKED_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const isWhitelisted = (handle: string): boolean => {
  return handle.endsWith('.bsky.app') || handle.endsWith('.bsky.team') || handle === "bsky.app";
};

// Fetch the BlockSky user's followers and followings (with caching)
export const fetchUserData = async (currentUserHandle: string, forceRefresh = false) => {
  if (!currentUserHandle) {
    console.error("User handle is not provided for fetchUserData");
    throw new Error("User handle is required");
  }

  const now = Date.now();

  // Return cached data if still valid and same user
  if (
    !forceRefresh &&
    userDataCacheHandle === currentUserHandle &&
    userFollowers.length > 0 &&
    (now - userDataCacheTimestamp) < USER_DATA_CACHE_TTL
  ) {
    console.log("Using cached user followers/following data");
    return;
  }

  try {
    console.log("Fetching fresh user followers/following data");
    [userFollowers, userFollows] = await Promise.all([
      getFollowers(currentUserHandle),
      getFollows(currentUserHandle),
    ]);
    userDataCacheTimestamp = now;
    userDataCacheHandle = currentUserHandle;
  } catch (error) {
    console.error("Error fetching BlockSky user's data:", error);
    throw error;
  }
};

/**
 * Clear the user data cache (call on logout)
 */
export const clearUserDataCache = (): void => {
  userFollowers = [];
  userFollows = [];
  userDataCacheTimestamp = 0;
  userDataCacheHandle = null;
};

// Identify mutuals for the BlockSky user
export const identifyMutuals = (list: User[]): User[] => {
  return list.filter((item) =>
    userFollowers.some((follower) => follower.handle === item.handle) &&
    userFollows.some((following) => following.handle === item.handle)
  );
};

export const getBlockedUsers = async (): Promise<User[]> => {
  const blockedUsers: User[] = [];
  try {
    // Ensure we have a valid token before starting
    const token = await ensureValidToken();
    if (!token) {
      console.error("No valid token available for getBlockedUsers");
      return blockedUsers;
    }

    // Update auth header on the agent
    authAgent.setHeader('Authorization', `Bearer ${token}`);

    let cursor: string | undefined;

    do {
      const response = await authAgent.app.bsky.graph.getBlocks(
        { cursor, limit: 50 }
      );

      if (response.data.blocks) {
        blockedUsers.push(...response.data.blocks);
      }
      cursor = response.data.cursor;
    } while (cursor);

    return blockedUsers;
  } catch (error) {
    // Explicitly check if the error is an object with the expected properties
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      "status" in error
    ) {
      const typedError = error as { message: string; status: number };
      if (typedError.message === "UpstreamFailure" || typedError.status === 502) {
        console.error("Upstream failure. Retrying in 500ms...");
        await sleep(500);
      } else if (typedError.status === 401) {
        console.error("Authentication failed in getBlockedUsers. Token may have expired.");
      }
    } else {
      console.error("Error fetching blocked users:", error);
    }
    return blockedUsers; // Ensure the function always returns a value
  }
};

/**
 * Get blocked handles with caching (5 minute TTL)
 */
export const getBlockedHandlesWithCache = async (): Promise<Set<string>> => {
  const now = Date.now();

  // Return cached if still valid
  if (blockedHandlesCache && (now - blockedCacheTimestamp) < BLOCKED_CACHE_TTL) {
    console.log("Using cached blocked list");
    return blockedHandlesCache;
  }

  // Fetch fresh and cache
  console.log("Fetching fresh blocked list");
  const blockedUsers = await getBlockedUsers();
  blockedHandlesCache = new Set(blockedUsers.map(u => u.handle));
  blockedCacheTimestamp = now;

  return blockedHandlesCache;
};

/**
 * Add a handle to the blocked cache (called after successful block)
 */
export const addToBlockedCache = (handle: string): void => {
  if (blockedHandlesCache) {
    blockedHandlesCache.add(handle);
  }
};

/**
 * Clear the blocked cache (call on logout or when needed)
 */
export const clearBlockedCache = (): void => {
  blockedHandlesCache = null;
  blockedCacheTimestamp = 0;
};

export const getDidFromHandle = async (handle: string): Promise<string | null> => {
  try {
    const response = await agent.resolveHandle({ handle });
    return response?.data?.did || null;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      "status" in error
    ) {
      const typedError = error as { message: string; status: number };
      if (typedError.message === "UpstreamFailure" || typedError.status === 502) {
        console.error("Upstream failure. Retrying in 500ms...");
        await sleep(500);
      }
    } else {
      console.error("Error resolving DID from handle:", error);
      throw error;
    }
    return null;
  }
};

/**
 * Update the authAgent's authorization header with a fresh token
 */
const updateAuthAgentHeader = async (): Promise<boolean> => {
  const token = await getValidAccessToken();
  if (token) {
    authAgent.setHeader('Authorization', `Bearer ${token}`);
    return true;
  }
  return false;
};

interface BatchBlockResult {
  successCount: number;
  failedUsers: User[];
}

/**
 * Block users in batches using applyWrites for maximum performance.
 * ATProto supports up to 200 operations per applyWrites call.
 */
const blockUsersBatch = async (
  repo: string,
  users: User[],
  onBatchComplete: (completed: number, total: number) => void,
  maxRetries = 2
): Promise<BatchBlockResult> => {
  let successCount = 0;
  const failedUsers: User[] = [];
  const totalUsers = users.length;

  // Process in batches of BATCH_SIZE
  for (let batchStart = 0; batchStart < users.length; batchStart += BATCH_SIZE) {
    const batch = users.slice(batchStart, batchStart + BATCH_SIZE);
    const createdAt = new Date().toISOString();

    // Build the writes array for this batch
    const writes = batch.map(user => ({
      $type: 'com.atproto.repo.applyWrites#create' as const,
      collection: 'app.bsky.graph.block',
      value: {
        subject: user.did,
        createdAt,
        $type: 'app.bsky.graph.block',
      },
    }));

    let success = false;
    for (let attempt = 0; attempt <= maxRetries && !success; attempt++) {
      try {
        // Ensure auth header is fresh before the call
        await updateAuthAgentHeader();

        await authAgent.com.atproto.repo.applyWrites({
          repo,
          writes,
        });

        // Batch succeeded
        successCount += batch.length;
        batch.forEach(user => addToBlockedCache(user.handle));
        success = true;
        console.log(`Blocked batch of ${batch.length} users (${batchStart + batch.length}/${totalUsers})`);

      } catch (error) {
        const typedError = error as { status?: number; message?: string };

        // Handle auth errors with retry after token refresh
        if (typedError.status === 401 && attempt < maxRetries) {
          console.log(`Auth failed on batch, refreshing token and retrying...`);
          const newToken = await ensureValidToken();
          if (!newToken) {
            console.error("Failed to refresh token");
            failedUsers.push(...batch);
            break;
          }
          continue;
        }

        // Handle rate limiting - wait and retry
        if (typedError.status === 429 && attempt < maxRetries) {
          console.log("Rate limited, waiting 3 seconds...");
          await sleep(3000);
          continue;
        }

        // Handle upstream failures - wait and retry
        if ((typedError.message === "UpstreamFailure" || typedError.status === 502) && attempt < maxRetries) {
          console.log("Upstream failure, retrying in 1 second...");
          await sleep(1000);
          continue;
        }

        // If we get here, all retries failed - fall back to individual blocking for this batch
        console.error(`Batch failed, falling back to individual blocks for ${batch.length} users:`, error);
        for (const user of batch) {
          const blocked = await blockUserWithRetry(repo, user.did, user.handle);
          if (blocked) {
            successCount++;
          } else {
            failedUsers.push(user);
          }
        }
        success = true; // Mark as "handled" even if some individual blocks failed
      }
    }

    // Report progress after each batch
    onBatchComplete(Math.min(batchStart + batch.length, totalUsers), totalUsers);

    // Small delay between batches to be nice to the API
    if (batchStart + BATCH_SIZE < users.length) {
      await sleep(100);
    }
  }

  return { successCount, failedUsers };
};

/**
 * Block a user with automatic retry on auth failure (used as fallback)
 */
const blockUserWithRetry = async (
  repo: string,
  subjectDid: string,
  handle: string,
  maxRetries = 2
): Promise<boolean> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Ensure auth header is fresh before the call
      await updateAuthAgentHeader();

      const response = await authAgent.app.bsky.graph.block.create(
        { repo },
        {
          subject: subjectDid,
          createdAt: new Date().toISOString(),
        }
      );

      if (response.uri) {
        console.log(`Blocked: ${handle}`);
        return true;
      }
      return false;
    } catch (error) {
      const typedError = error as { status?: number; message?: string };

      // Handle auth errors with retry after token refresh
      if (typedError.status === 401 && attempt < maxRetries) {
        console.log(`Auth failed for ${handle}, refreshing token and retrying...`);
        const newToken = await ensureValidToken();
        if (!newToken) {
          console.error("Failed to refresh token");
          return false;
        }
        // Token has been refreshed, loop will continue and updateAuthAgentHeader will be called
        continue;
      }

      // Handle rate limiting
      if (typedError.status === 429) {
        console.log("Rate limited, waiting 2 seconds...");
        await sleep(2000);
        continue;
      }

      // Handle upstream failures
      if (typedError.message === "UpstreamFailure" || typedError.status === 502) {
        console.log("Upstream failure, retrying in 500ms...");
        await sleep(500);
        continue;
      }

      console.error(`Failed to block ${handle}:`, error);
      return false;
    }
  }
  return false;
};

export const getFollowers = async (handle: string): Promise<User[]> => {
  try {
    const followers: User[] = [];
    let cursor: string | undefined;

    do {
      const response: PaginatedResponse<User> = await agent.getFollowers({ actor: handle, cursor });
      if (response.data.followers) {
        followers.push(...response.data.followers); // Directly add User objects
      }
      cursor = response.data.cursor;
    } while (cursor);

    return followers;
  } catch (error) {
    toast({
      title: "Failed to fetch followers",
      description: `Unable to retrieve followers for "${handle}".`,
      variant: "destructive",
    });
    console.error("Error fetching followers:", error);
    throw error;
  }
};

export const getFollows = async (handle: string): Promise<User[]> => {
  try {
    const follows: User[] = [];
    let cursor: string | undefined;

    do {
      const response: PaginatedResponse<User> = await agent.getFollows({ actor: handle, cursor });
      if (response.data.follows) {
        follows.push(...response.data.follows); // Directly add User objects
      }
      cursor = response.data.cursor;
    } while (cursor);

    return follows;
  } catch (error) {
    toast({
      title: "Failed to fetch following",
      description: `Unable to retrieve following list for "${handle}".`,
      variant: "destructive",
    });
    console.error("Error fetching follows:", error);
    throw error;
  }
};

export const blockUserFollowers = async (
  targetHandle: string,
  onProgress: (progress: number, count: number) => void,
  onStatusChange?: (status: string) => void
): Promise<{ success: boolean; mutuals: User[]; alreadyBlockedCount: number; blockedCount: number }> => {
  try {
    // Ensure we have a valid token before starting
    const initialToken = await ensureValidToken();
    if (!initialToken) {
      toast({
        title: "Authentication expired",
        description: "Please log in again to continue.",
        variant: "destructive",
      });
      return { success: false, mutuals: [], alreadyBlockedCount: 0, blockedCount: 0 };
    }

    onStatusChange?.(`Fetching @${targetHandle}'s followers...`);
    const followers = await getFollowers(targetHandle);

    onStatusChange?.("Checking your blocked list...");
    const blockedHandles = await getBlockedHandlesWithCache();

    onStatusChange?.("Identifying mutuals...");
    const mutuals = identifyMutuals(followers);
    const mutualHandles = new Set(mutuals.map(m => m.handle));
    const loggedInUserHandle = Cookies.get("userHandle");
    const loggedInUserDid = Cookies.get("userDID");

    const usersToBlock = followers.filter(
      (follower) =>
        follower.handle !== loggedInUserHandle &&
        !isWhitelisted(follower.handle) &&
        !mutualHandles.has(follower.handle) &&
        !blockedHandles.has(follower.handle)
    );

    const alreadyBlockedCount = followers.length - usersToBlock.length - mutuals.length;

    if (usersToBlock.length === 0) {
      onProgress(100, 0);
      return { success: true, mutuals, alreadyBlockedCount, blockedCount: 0 };
    }

    onStatusChange?.(`Blocking ${usersToBlock.length.toLocaleString()} users...`);

    // Use batch blocking for maximum performance
    const result = await blockUsersBatch(
      loggedInUserDid!,
      usersToBlock,
      (completed, total) => {
        const progress = (completed / total) * 100;
        onProgress(progress, completed);
      }
    );

    if (result.failedUsers.length > 0) {
      console.warn(`${result.failedUsers.length} users failed to block`);
    }

    return { success: true, mutuals, alreadyBlockedCount, blockedCount: result.successCount };
  } catch (error) {
    console.error("Error in blockUserFollowers:", error);
    return { success: false, mutuals: [], alreadyBlockedCount: 0, blockedCount: 0 };
  }
};

export const blockUserFollows = async (
  targetHandle: string,
  onProgress: (progress: number, count: number) => void,
  onStatusChange?: (status: string) => void
): Promise<{ success: boolean; mutuals: User[]; alreadyBlockedCount: number; blockedCount: number }> => {
  try {
    // Ensure we have a valid token before starting
    const initialToken = await ensureValidToken();
    if (!initialToken) {
      toast({
        title: "Authentication expired",
        description: "Please log in again to continue.",
        variant: "destructive",
      });
      return { success: false, mutuals: [], alreadyBlockedCount: 0, blockedCount: 0 };
    }

    onStatusChange?.(`Fetching accounts @${targetHandle} follows...`);
    const follows = await getFollows(targetHandle);

    onStatusChange?.("Checking your blocked list...");
    const blockedHandles = await getBlockedHandlesWithCache();

    onStatusChange?.("Identifying mutuals...");
    const mutuals = identifyMutuals(follows);
    const mutualHandles = new Set(mutuals.map(m => m.handle));
    const loggedInUserHandle = Cookies.get("userHandle");
    const loggedInUserDid = Cookies.get("userDID");

    const usersToBlock = follows.filter(
      (follow) =>
        follow.handle !== loggedInUserHandle &&
        !isWhitelisted(follow.handle) &&
        !mutualHandles.has(follow.handle) &&
        !blockedHandles.has(follow.handle)
    );

    const alreadyBlockedCount = follows.length - usersToBlock.length - mutuals.length;

    if (usersToBlock.length === 0) {
      onProgress(100, 0);
      return { success: true, mutuals, alreadyBlockedCount, blockedCount: 0 };
    }

    onStatusChange?.(`Blocking ${usersToBlock.length.toLocaleString()} users...`);

    // Use batch blocking for maximum performance
    const result = await blockUsersBatch(
      loggedInUserDid!,
      usersToBlock,
      (completed, total) => {
        const progress = (completed / total) * 100;
        onProgress(progress, completed);
      }
    );

    if (result.failedUsers.length > 0) {
      console.warn(`${result.failedUsers.length} users failed to block`);
    }

    return { success: true, mutuals, alreadyBlockedCount, blockedCount: result.successCount };
  } catch (error) {
    console.error("Error in blockUserFollows:", error);
    return { success: false, mutuals: [], alreadyBlockedCount: 0, blockedCount: 0 };
  }
};