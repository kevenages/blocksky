import { agent } from './api';

// Profile interface aligned with the lexicon
interface Profile {
  handle: string;
  displayName: string;
  avatar?: string; // Optional field for the profile image
  followersCount?: number; // Optional field for follower count
  followsCount?: number; // Optional field for following count
}

// Fetch a user's profile using the getProfile method
export const getProfile = async (handle: string): Promise<Profile | null> => {
  try {
    const profile = await agent.getProfile({ actor: handle });
    return profile.data as Profile;
  } catch (error) {
    console.error("Profile fetch failed:", error);
    return null;
  }
};

// Search actors
export const searchActors = async (query: string, limit: number = 5): Promise<Profile[]> => {
  try {
    const response = await agent.searchActorsTypeahead({
      q: query,
      limit,
    });

    // Map and return actors to align with Profile interface structure
    return response.data.actors.map((actor) => ({
      handle: actor.handle,
      displayName: actor.displayName,
      avatar: actor.avatar || null,
      followersCount: actor.followersCount,
      followsCount: actor.followsCount,
    })) as Profile[];
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    throw error;
  }
};