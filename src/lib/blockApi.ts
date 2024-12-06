import { agent, authAgent, withAuthHeaders } from './api';
import { toast } from "../hooks/use-toast";
import Cookies from 'js-cookie';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export interface User {
  handle: string;
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

// Fetch the BlockSky user's followers and followings
export const fetchUserData = async (currentUserHandle: string) => {
  if (!currentUserHandle) {
    console.error("User handle is not provided for fetchUserData");
    throw new Error("User handle is required");
  }

  try {
    [userFollowers, userFollows] = await Promise.all([
      getFollowers(currentUserHandle),
      getFollows(currentUserHandle),
    ]);
  } catch (error) {
    console.error("Error fetching BlockSky user's data:", error);
    throw error;
  }
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
    let cursor: string | undefined;

    do {
      const response = await authAgent.app.bsky.graph.getBlocks(
        { cursor, limit: 50 },
        { headers: withAuthHeaders() }
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
        console.error("Upstream failure. Retrying in 5 seconds...");
        await sleep(500); // Wait 5 seconds before retrying
      }
    } else {
      console.error("Error fetching blocked users:", error);
    }
    return blockedUsers; // Ensure the function always returns a value
  }
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
        console.error("Upstream failure. Retrying in 5 seconds...");
        await sleep(500); // Wait 5 seconds before retrying
      }
    } else {
      console.error("Error resolving DID from handle:", error);
      throw error; // Re-throw other errors to stop the operation
    }
    return null; // Return null if DID resolution fails
  }
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
  onProgress: (progress: number, count: number) => void
): Promise<{ success: boolean; mutuals: User[]; alreadyBlockedCount: number }> => {
  try {
    
    const followers = await getFollowers(targetHandle); // Get followers
    const blockedUsers = await getBlockedUsers(); // Get already blocked users
    const mutuals = identifyMutuals(followers); // Identify mutuals
    const loggedInUserHandle = Cookies.get("userHandle"); // Fetch the logged-in user's handle
    const loggedInUserDid = Cookies.get("userDID");

    const usersToBlock = followers.filter(
      (follower) =>
        follower.handle !== loggedInUserHandle && // Exclude logged-in user
        !mutuals.some((mutual) => mutual.handle === follower.handle) && // Exclude mutuals
        !blockedUsers.some((blocked) => blocked.handle === follower.handle) // Exclude already blocked
    );

    const alreadyBlockedCount = followers.length - usersToBlock.length;
    const totalUsers = usersToBlock.length || 1; // Prevent divide-by-zero

    for (let i = 0; i < usersToBlock.length; i++) {
      const userDid = await getDidFromHandle(usersToBlock[i].handle); // Resolve DID
      if (userDid) {

        const response = await authAgent.app.bsky.graph.block.create(
          { repo: loggedInUserDid },
          {
            subject: userDid, // Block the user by DID
            createdAt: new Date().toISOString(),
          },
        );
        if (response.uri) {
          console.log(`Blocked follower: ${usersToBlock[i].handle}`);
        }
      }
      const progress = ((i + 1) / totalUsers) * 100;
      console.log("Blocking progress:", progress);
      onProgress(progress, i + 1); // Update progress
      await sleep(50); // Add delay for UI updates
    }

    return { success: true, mutuals, alreadyBlockedCount };
  } catch (error) {
    console.error("Error in blockUserFollowers:", error);
    return { success: false, mutuals: [], alreadyBlockedCount: 0 };
  }
};

export const blockUserFollows = async (
  targetHandle: string,
  onProgress: (progress: number, count: number) => void
): Promise<{ success: boolean; mutuals: User[]; alreadyBlockedCount: number }> => {
  try {
    const follows = await getFollows(targetHandle); // Get the list of users the target is following
    const blockedUsers = await getBlockedUsers(); // Get already blocked users
    const mutuals = identifyMutuals(follows); // Identify mutuals
    const loggedInUserHandle = Cookies.get("userHandle"); // Get the logged-in user's handle

    const usersToBlock = follows.filter(
      (follow) =>
        follow.handle !== loggedInUserHandle && // Exclude the logged-in user
        !mutuals.some((mutual) => mutual.handle === follow.handle) && // Exclude mutuals
        !blockedUsers.some((blocked) => blocked.handle === follow.handle) // Exclude already blocked users
    );

    const alreadyBlockedCount = follows.length - usersToBlock.length;
    const totalUsers = usersToBlock.length || 1; // Prevent divide-by-zero errors

    for (let i = 0; i < usersToBlock.length; i++) {
      const userDid = await getDidFromHandle(usersToBlock[i].handle); // Resolve DID
      if (userDid) {
        const response = await authAgent.app.bsky.graph.block.create(
          { repo: loggedInUserHandle },
          {
            subject: userDid, // Use the resolved DID
            createdAt: new Date().toISOString(),
          }
        );
        if (response.uri) {
          console.log(`Blocked user: ${usersToBlock[i].handle}`);
        }
      }
      const progress = ((i + 1) / totalUsers) * 100;
      onProgress(progress, i + 1); // Update progress
      await sleep(50); // Add delay for UI updates
    }

    return { success: true, mutuals, alreadyBlockedCount };
  } catch (error) {
    console.error("Error in blockUserFollows:", error);
    return { success: false, mutuals: [], alreadyBlockedCount: 0 };
  }
};