// src/components/UserBlocker.tsx
"use client";

import React, { useState } from 'react';
import InfoCard from './InfoCard';
import SuggestionsList from './SuggestionsList';
import UserProfileDisplay from './UserProfileDisplay';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';

export default function UserBlocker() {
  const [username, setUsername] = useState('');
  const { userProfile, suggestions, loadUserProfile, fetchSuggestions, clearSuggestions, setSuggestions } = useUserProfile();
  const { isLoggedIn } = useAuth();

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

  return (
    <div className="flex flex-col items-center space-y-4">
      <InfoCard />
      <input
        type="text"
        value={username}
        onChange={handleInputChange}
        placeholder="Enter Bluesky Username"
        className="border border-gray-300 rounded-md w-full max-w-md px-4 py-2 mt-4 mb-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoComplete="off"
      />
      <SuggestionsList suggestions={suggestions} onSelect={selectSuggestion} />
      {userProfile && (
        <UserProfileDisplay
          handle={userProfile.handle}
          isLoggedIn={isLoggedIn}
        />
      )}
    </div>
  );
}