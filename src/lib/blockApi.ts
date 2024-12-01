import { agent, authAgent, withAuthHeaders } from './api';
import { toast } from "../hooks/use-toast";
//import { useAuth } from '../hooks/useAuth';

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
  try {
    const blockedUsers: User[] = [];
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
    console.error('Error fetching blocked users:', error);
    throw error;
  }
};

// Block a single user by handle
export const blockUser = async (handle: string): Promise<boolean> => {
  try {
    // Uncomment the next line to block users when ready
    // await agent.blockUser({ handle });
    //console.log(`${handle} has been blocked.`);
    return true;
  } catch (error) {
    toast({
      title: "Failed to block user",
      description: `Unable to block "${handle}". Please try again.`,
      variant: "destructive",
    });
    console.error('Failed to block user:', error);
    return false;
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

// Block all followers and following of a user
export const blockUserFollowers = async (
  targetHandle: string,
  onProgress: (progress: number, count: number) => void
): Promise<{ success: boolean; mutuals: User[]; alreadyBlockedCount: number }> => {
  try {
    const followers = await getFollowers(targetHandle); // Get followers
    const blockedUsers = await getBlockedUsers(); // Get already blocked users
    const mutuals = identifyMutuals(followers); // Identify mutuals

    const usersToBlock = followers.filter(
      (follower) =>
        !mutuals.some((mutual) => mutual.handle === follower.handle) &&
        !blockedUsers.some((blocked) => blocked.handle === follower.handle)
    );

    const alreadyBlockedCount = followers.length - usersToBlock.length;
    const totalUsers = usersToBlock.length || 1; // Prevent divide-by-zero

    for (let i = 0; i < usersToBlock.length; i++) {
      await blockUser(usersToBlock[i].handle);
      const progress = ((i + 1) / totalUsers) * 100;
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
    const follows = await getFollows(targetHandle); // Get follows
    const blockedUsers = await getBlockedUsers(); // Get already blocked users
    const mutuals = identifyMutuals(follows); // Identify mutuals

    const usersToBlock = follows.filter(
      (follow) =>
        !mutuals.some((mutual) => mutual.handle === follow.handle) &&
        !blockedUsers.some((blocked) => blocked.handle === follow.handle)
    );

    const alreadyBlockedCount = follows.length - usersToBlock.length;
    const totalUsers = usersToBlock.length || 1; // Prevent divide-by-zero

    for (let i = 0; i < usersToBlock.length; i++) {
      await blockUser(usersToBlock[i].handle);
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