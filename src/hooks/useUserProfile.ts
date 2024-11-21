// src/hooks/useUserProfile.ts
import { useState } from 'react';
import { getProfile, searchActors } from '../lib/actorApi';
import { blockUserFollowers } from '../lib/blockApi';

interface UserProfile {
  handle: string;
  displayName: string;
  avatar?: string;
  followersCount?: number;
  followsCount?: number;
}

export function useUserProfile() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
  const [blockProgress, setBlockProgress] = useState(0);

  // Updated startBlockUserFollowers function
const startBlockUserFollowers = async (
  handle: string,
  onProgress: (progress: number, count: number) => void
) => {
  setBlockProgress(0); // Reset progress
  try {
    await blockUserFollowers(handle, (progress: number, blockedCount: number) => {
      console.log(`Callback invoked: Progress - ${progress}, Count - ${blockedCount}`);
      setBlockProgress(progress); // Update local progress
      onProgress(progress, blockedCount); // Update via callback
    });
  } catch (error) {
    console.error('Error blocking Followers:', error);
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
  };
}