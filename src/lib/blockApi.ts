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

// Block all followers and following of a user
export const blockUserFollowers = async (
  handle: string,
  onProgress: (progress: number, count: number) => void
): Promise<boolean> => {
  try {
    const usersToBlock: string[] = [];
    let cursor: string | undefined;

    // Fetch all followers
    do {
      const followers: PaginatedResponse<User> = await agent.getFollowers({ actor: handle, cursor });
      if (followers.data.followers) {
        usersToBlock.push(...followers.data.followers.map((f) => f.handle));
      }
      cursor = followers.data.cursor;
    } while (cursor);

    // Fetch all following
    cursor = undefined;
    do {
      const following: PaginatedResponse<User> = await agent.getFollows({ actor: handle, cursor });
      if (following.data.follows) {
        usersToBlock.push(...following.data.follows.map((f) => f.handle));
      }
      cursor = following.data.cursor;
    } while (cursor);

    const totalUsers = usersToBlock.length;

    // Block each user and update progress
    for (let i = 0; i < usersToBlock.length; i++) {
      const userHandle = usersToBlock[i];
      console.log(userHandle);
      await sleep(5); // Slow down for debugging, replace with appropriate timeout if necessary
      // Uncomment the next line to block users when ready
      // await agent.blockUser({ handle: userHandle });
      const progress = ((i + 1) / totalUsers) * 100;
      onProgress(progress, i + 1); // Pass progress and count to the callback
    }
    console.log(usersToBlock.toString());

    return true;
  } catch (error) {
    toast({
      title: "Mass blocking failed",
      description: `Something went wrong. Please try again.`,
      variant: "destructive",
    });
    console.error("Mass blocking failed:", error);
    return false;
  }
};