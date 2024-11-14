// src/lib/blockApi.ts

import { agent } from './api';

export const blockUser = async (handle: string) => {
  try {
    await agent.blockUser({ handle });
    console.log(`${handle} has been blocked.`);
  } catch (error) {
    console.error('Failed to block user:', error);
    throw error;
  }
};

export const blockUserNetwork = async (handle: string) => {
  try {
    const followers = await agent.getFollowers({ handle });
    const following = await agent.getFollowing({ handle });
    const usersToBlock = [...followers.data, ...following.data];

    for (const user of usersToBlock) {
      await agent.blockUser({ handle: user.handle });
    }

    console.log(`Blocked ${usersToBlock.length} users connected to ${handle}.`);
  } catch (error) {
    console.error('Mass blocking failed:', error);
    throw error;
  }
};
