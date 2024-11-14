// src/hooks/useUserProfile.ts

import { useState } from 'react';
import { getProfile, searchActors } from '../lib/actorApi';
import { blockUser, blockUserNetwork } from '../lib/blockApi';

interface UserProfile {
  displayName: string;
  handle: string;
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
      console.error('User lookup failed:', error);
      alert('Failed to load user profile.');
    }
  };

  const fetchSuggestions = async (query: string) => {
    try {
      const results = await searchActors(query);
      setSuggestions(results);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    }
  };

  const clearSuggestions = () => {
    setSuggestions([]);
  };

  const handleBlockUser = async () => {
    if (userProfile) {
      try {
        await blockUser(userProfile.handle);
        alert(`${userProfile.handle} has been blocked.`);
      } catch (error) {
        console.error('Failed to block user:', error);
        alert('Failed to block user.');
      }
    }
  };

  const handleBlockUserNetwork = async () => {
    if (userProfile) {
      try {
        await blockUserNetwork(userProfile.handle);
        alert(`Blocked users connected to ${userProfile.handle}.`);
      } catch (error) {
        console.error('Mass blocking failed:', error);
        alert('Failed to block user network.');
      }
    }
  };

  return {
    userProfile,
    suggestions,
    loadUserProfile,
    fetchSuggestions,
    clearSuggestions,
    handleBlockUser,
    handleBlockUserNetwork,
  };
}