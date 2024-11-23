import { agent } from './api';
import { toast } from "../hooks/use-toast";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface User {
  handle: string;
}

interface PaginatedResponse<T> {
  data: {
    followers?: T[];
    follows?: T[];
    cursor?: string;
  };
}

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

// Fetch all followers of a user
export const getFollowers = async (handle: string): Promise<string[]> => {
  try {
    const followers: string[] = [];
    let cursor: string | undefined;

    do {
      const response: PaginatedResponse<User> = await agent.getFollowers({ actor: handle, cursor });
      if (response.data.followers) {
        followers.push(...response.data.followers.map((f) => f.handle));
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

// Fetch all following (follows) of a user
export const getFollows = async (handle: string): Promise<string[]> => {
  try {
    const follows: string[] = [];
    let cursor: string | undefined;

    do {
      const response: PaginatedResponse<User> = await agent.getFollows({ actor: handle, cursor });
      if (response.data.follows) {
        follows.push(...response.data.follows.map((f) => f.handle));
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
export const blockUserFollows = async (
  handle: string,
  onProgress: (progress: number, count: number) => void
): Promise<boolean> => {
  try {
    const [follows] = await Promise.all([
      getFollows(handle),
    ]);

    const usersToBlock = [...follows];
    const totalUsers = usersToBlock.length;

    // Block each user and update progress
    for (let i = 0; i < usersToBlock.length; i++) {
      const userHandle = usersToBlock[i];
      console.log(userHandle);
      await sleep(5);
      // Uncomment the next line to block users when ready
      // await agent.blockUser({ handle: userHandle });
      const progress = ((i + 1) / totalUsers) * 100;
      console.log('progress', progress);
      onProgress(progress, i + 1); // Pass progress and count to the callback
    }
    return true;
  } catch (error) {
    toast({
      title: "Mass blocking of follows failed",
      description: `Something went wrong. Please try again.`,
      variant: "destructive",
    });
    console.error("Mass blocking failed:", error);
    return false;
  }
};

// Block all followers and following of a user
export const blockUserFollowers = async (
  handle: string,
  onProgress: (progress: number, count: number) => void
): Promise<boolean> => {
  try {
    const [followers] = await Promise.all([
      getFollowers(handle),
    ]);

    const usersToBlock = [...followers];
    const totalUsers = usersToBlock.length;

    // Block each user and update progress
    for (let i = 0; i < usersToBlock.length; i++) {
      const userHandle = usersToBlock[i];
      console.log(userHandle);
      await sleep(5);
      // Uncomment the next line to block users when ready
      // await agent.blockUser({ handle: userHandle });
      const progress = ((i + 1) / totalUsers) * 100;
      console.log('progress', progress);
      onProgress(progress, i + 1); // Pass progress and count to the callback
    }
    return true;
  } catch (error) {
    toast({
      title: "Mass blocking of followers failed",
      description: `Something went wrong. Please try again.`,
      variant: "destructive",
    });
    console.error("Mass blocking failed:", error);
    return false;
  }
};