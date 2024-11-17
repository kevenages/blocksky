"use client";

import React, { useState, useEffect } from 'react';
import InfoCard from './InfoCard';
import SuggestionsList from './SuggestionsList';
import UserProfileDisplay from './UserProfileDisplay';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import { blockUser, blockUserNetwork } from '../lib/blockApi'; // Use the correct exported function name

export default function UserBlocker() {
  const [username, setUsername] = useState('');
  const [hydrated, setHydrated] = useState(false); // Add hydration check
  const { userProfile, suggestions, loadUserProfile, fetchSuggestions, clearSuggestions, setSuggestions } = useUserProfile();
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    setHydrated(true); // Set hydrated to true after mounting
  }, []);

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
      await blockUser(userProfile.handle);
      console.log(`${userProfile.handle} has been blocked.`);
    }
  };

  const onBlockNetwork = async () => {
    if (userProfile) {
      await blockUserNetwork(userProfile.handle); // Use the correct function here
      console.log(`Network of ${userProfile.handle} has been blocked.`);
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
          isLoggedIn={isLoggedIn} // No change needed here
          onBlockUser={onBlockUser} // Pass the function here
          onBlockNetwork={onBlockNetwork} // Pass the function here
        />
      )}
    </div>
  );
}