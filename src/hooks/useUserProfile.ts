// src/hooks/useUserProfile.ts
import { useAuth } from '../hooks/useAuth';
import { useState, useEffect } from 'react';
import { getProfile, searchActors } from '../lib/actorApi';
import { fetchUserData, blockUserFollowers, blockUserFollows, User } from '../lib/blockApi';


interface UserProfile {
  handle: string;
  displayName: string;
  avatar?: string;
  followersCount?: number;
  followsCount?: number;
}

export function useUserProfile() {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [blockProgress, setBlockProgress] = useState(0);

  // Effect to initialize user data
  useEffect(() => {
    const initializeUserData = async () => {
      console.log("Initializing user data with handle:", user?.handle);
        if (!user?.handle) return;

        try {
          await fetchUserData(user.handle);
          console.log("User data successfully fetched for:", user.handle);
        } catch (error) {
          console.error("Error initializing user data:", error);
        }
      };

      initializeUserData();
  }, [user]);

  const startBlockUserFollowers = async (
    handle: string,
    onProgress: (progress: number, count: number) => void
  ): Promise<{ success: boolean; mutuals: User[] }> => {
    setBlockProgress(0); // Reset progress

    try {
      const result = await blockUserFollowers(handle, (progress, blockedCount) => {
        setBlockProgress(progress); // Update progress locally
        onProgress(progress, blockedCount); // Callback for external updates
      });
      return result; // Should be { success, mutuals }
    } catch (error) {
      console.error('Error blocking followers:', error);
      return { success: false, mutuals: [] }; // Ensure predictable structure
    }
  };

  const startBlockUserFollows = async (
    handle: string,
    onProgress: (progress: number, count: number) => void
  ): Promise<{ success: boolean; mutuals: User[] }> => {
    setBlockProgress(0); // Reset progress

    try {
      const result = await blockUserFollows(handle, (progress, blockedCount) => {
        setBlockProgress(progress); // Update progress locally
        onProgress(progress, blockedCount); // Callback for external updates
      });
      return result; // Should be { success, mutuals }
    } catch (error) {
      console.error('Error blocking follows:', error);
      return { success: false, mutuals: [] }; // Ensure predictable structure
    }
  };


  const loadUserProfile = async (handle: string) => {
    try {
      const profile = await getProfile(handle);
      setUserProfile(profile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchSuggestions = async (query: string) => {
    try {
      const results = await searchActors(query);
      setSuggestions(results);
      return results;
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
  };

  const clearSuggestions = () => {
    setSuggestions([]);
  };

  return {
    userProfile,
    suggestions,
    loadUserProfile,
    fetchSuggestions,
    clearSuggestions,
    setSuggestions,
    blockProgress,
    startBlockUserFollowers,
    startBlockUserFollows,
  };
}
