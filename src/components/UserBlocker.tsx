"use client";

import React, { useState, useEffect } from 'react';
import InfoCard from './InfoCard';
import SuggestionsList from './SuggestionsList';
import UserProfileDisplay from './UserProfileDisplay';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';

export default function UserBlocker() {
  const [username, setUsername] = useState('');
  const [hydrated, setHydrated] = useState(false); // Add hydration check
  const [isCompleted, setIsCompleted] = useState(false); // Track completion
  const [blockedCount, setBlockedCount] = useState(0); // Track blocked users count
  const { userProfile, suggestions, loadUserProfile, fetchSuggestions, clearSuggestions, setSuggestions } = useUserProfile();
  const { isLoggedIn } = useAuth();
  const { blockProgress, startBlockUserNetwork } = useUserProfile();

  useEffect(() => {
    setHydrated(true); // Set hydrated to true after mounting
  }, []);

  const handleBlockNetwork = async () => {
    setIsCompleted(false);
    setBlockedCount(0);

    await startBlockUserNetwork(username, (progress: number, count: number) => {
      console.log(`Progress: ${progress}%, Blocked Count: ${count}`);
      if (progress === 100) {
        setIsCompleted(true);
        setBlockedCount(count);
      }
    });
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setUsername(input);

    if (input.length > 1) {
      const fetchedSuggestions = await fetchSuggestions(input);
      setSuggestions(fetchedSuggestions); // Use setSuggestions here
    } else {
      clearSuggestions();
    }
  };

  const selectSuggestion = (suggestion: { handle: string }) => {
    setUsername(suggestion.handle);
    clearSuggestions();
    loadUserProfile(suggestion.handle);
  };

  const onBlockUser = async () => {
    if (userProfile) {
      //await blockUser(userProfile.handle);
      console.log(`${userProfile.handle} has been blocked.`);
    }
  };

  // Return null or loading indicator until hydration
  if (!hydrated) return null;

  return (
    <div className="flex flex-col items-center space-y-4">
      <InfoCard />
      <input
        type="text"
        value={username}
        onChange={handleInputChange}
        placeholder="Enter Bluesky name or handle"
        className="border border-gray-300 rounded-md w-full max-w-md px-4 py-2 mt-4 mb-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoComplete="off"
      />
      <SuggestionsList suggestions={suggestions} onSelect={selectSuggestion} />
      {userProfile && (
        <UserProfileDisplay
          handle={userProfile.handle}
          isLoggedIn={isLoggedIn} // Pass the authentication state
          onBlockUser={onBlockUser} // Pass the block user function
          onBlockNetwork={handleBlockNetwork} // Pass the block network function
          blockProgress={blockProgress} // Pass the progress
          isCompleted={isCompleted} // Pass the completion state
          blockedCount={blockedCount} // Pass the blocked count
        />
      )}
    </div>
  );
}