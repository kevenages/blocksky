import { agent } from './api';
import { toast } from "../hooks/use-toast";
import { useAuth } from '../hooks/useAuth';

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export interface User {
  handle: string;
}

interface PaginatedResponse<T> {
  data: {
    followers?: T[];
    follows?: T[];
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

// Block a single user by handle
export const blockUser = async (handle: string): Promise<boolean> => {
  try {
    // Uncomment the next line to block users when ready
    // await agent.blockUser({ handle });
    console.log(`${handle} has been blocked.`);
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
): Promise<{ success: boolean; mutuals: User[] }> => {
  try {
    // Fetch followers of the target user
    const followers = await getFollowers(targetHandle);

    // Identify mutuals (BlockSky user's mutuals)
    const mutuals = identifyMutuals(followers);

    // Exclude mutuals from the block list
    const usersToBlock = followers.filter(
      (follower) => !mutuals.some((mutual) => mutual.handle === follower.handle)
    );

    const totalUsers = usersToBlock.length;

    // Block each user and update progress
    for (let i = 0; i < usersToBlock.length; i++) {
      const user = usersToBlock[i];
      await blockUser(user.handle); // Block the user
      const progress = ((i + 1) / totalUsers) * 100;
      onProgress(progress, i + 1); // Call progress callback after each block
      await sleep(50); // Small delay for UI updates (optional)
    }

    return { success: true, mutuals };
  } catch (error) {
    console.error("Error in blockUserFollowers:", error);
    return { success: false, mutuals: [] };
  }
};

export const blockUserFollows = async (
  targetHandle: string,
  onProgress: (progress: number, count: number) => void
): Promise<{ success: boolean; mutuals: User[] }> => {
  try {
    // Fetch followings of the target user
    const follows = await getFollows(targetHandle);

    // Identify mutuals (BlockSky user's mutuals)
    const mutuals = identifyMutuals(follows);

    // Exclude mutuals from the block list
    const usersToBlock = follows.filter(
      (follow) => !mutuals.some((mutual) => mutual.handle === follow.handle)
    );

    const totalUsers = usersToBlock.length;

    // Block each user and update progress
    for (let i = 0; i < usersToBlock.length; i++) {
      const user = usersToBlock[i];
      await blockUser(user.handle); // Block the user
      const progress = ((i + 1) / totalUsers) * 100;
      onProgress(progress, i + 1); // Call progress callback after each block
      await sleep(50); // Small delay for UI updates (optional)
    }

    return { success: true, mutuals };
  } catch (error) {
    console.error("Error in blockUserFollows:", error);
    return { success: false, mutuals: [] };
  }
};