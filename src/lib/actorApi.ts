// src/lib/actorApi.ts

import { agent } from './api';

export const getProfile = async (handle: string) => {
  try {
    const profile = await agent.api.app.bsky.actor.getProfile({ actor: handle });
    console.log("Fetched profile data:", profile.data); // Log for verification
    return profile.data;
  } catch (error: any) {
    if (error.response && error.response.status === 404) {
      console.error(`Profile not found for handle: ${handle}`);
      return null;
    } else {
      console.error('User lookup failed:', error);
      throw error;
    }
  }
};

export const searchActors = async (query: string, limit: number = 5) => {
  try {
    const response = await agent.api.app.bsky.actor.searchActors({
      q: query,
      limit,
    });
    console.log("Fetched actors:", response.data.actors); // Log to inspect actors
    return response.data.actors.map((actor) => ({
      ...actor,
      avatar: actor.avatar || null,
    }));
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    throw error;
  }
};
