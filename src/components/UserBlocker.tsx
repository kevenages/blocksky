// src/components/UserBlocker.tsx

"use client";

import React, { useState } from 'react';
import InfoCard from '../components/InfoCard';
import SuggestionsList from '../components/SuggestionsList';
import UserProfileDisplay from '../components/UserProfileDisplay';
import { useUserProfile } from '../hooks/useUserProfile';

export default function UserBlocker() {
  const [username, setUsername] = useState('');
  const {
    userProfile,
    suggestions,
    loadUserProfile,
    fetchSuggestions,
    clearSuggestions,
    handleBlockUser,
    handleBlockUserNetwork,
  } = useUserProfile();

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setUsername(input);

    if (input.length > 1) {
      await fetchSuggestions(input);
      console.log("Suggestions after fetch:", suggestions);
    } else {
      clearSuggestions();
    }
  };

  const selectSuggestion = (suggestion: { handle: string }) => {
    setUsername(suggestion.handle);
    clearSuggestions();
    loadUserProfile(suggestion.handle);
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <InfoCard />
      <input
        type="text"
        value={username}
        onChange={handleInputChange}
        placeholder="Enter Bluesky username"
        className="border rounded w-full max-w-md px-4 py-2 mb-4"
      />
      <SuggestionsList suggestions={suggestions} onSelect={selectSuggestion} />

      {userProfile && <hr className="border-t border-gray-200 my-4 w-full max-w-md" />}

      {userProfile && (
        <UserProfileDisplay
          userProfile={userProfile}
          onBlockUser={handleBlockUser}
          onBlockNetwork={handleBlockUserNetwork}
        />
      )}
    </div>
  );
}