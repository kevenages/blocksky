// src/hooks/useUserProfile.ts
import { useState } from 'react';
import { getProfile, searchActors } from '../lib/actorApi';

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
    setSuggestions, // Ensure setSuggestions is returned here
  };
}