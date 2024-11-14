import { agent } from './api';

// Interface for User, representing basic user details from followers/following lists
interface User {
  handle: string;
}

// Block a single user by handle
export const blockUser = async (handle: string): Promise<boolean> => {
  try {
    await agent.blockUser({ handle });
    console.log(`${handle} has been blocked.`);
    return true;
  } catch (error) {
    console.error('Failed to block user:', error);
    return false;
  }
};

// Block all followers and following of a user
export const blockUserNetwork = async (handle: string): Promise<boolean> => {
  try {
    const followers = await agent.getFollowers({ actor: handle });
    const following = await agent.getFollowing({ actor: handle });
    const usersToBlock: User[] = [...followers.data, ...following.data];

    // Block each user in the combined followers and following lists
    for (const user of usersToBlock) {
      await agent.blockUser({ handle: user.handle });
    }

    console.log(`Blocked ${usersToBlock.length} users connected to ${handle}.`);
    return true;
  } catch (error) {
    console.error('Mass blocking failed:', error);
    return false;
  }
};