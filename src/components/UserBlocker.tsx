"use client";

import React, { useState, useEffect } from "react";
import InfoCard from "./InfoCard";
import SuggestionsList from "./SuggestionsList";
import UserProfileDisplay from "./UserProfileDisplay";
import { useAuth } from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";

export default function UserBlocker() {
  const [username, setUsername] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [isBlockingUser, setIsBlockingUser] = useState(false); // Individual state
  const [isBlockingFollowers, setIsBlockingFollowers] = useState(false); // Individual state
  const [isBlockingFollowing, setIsBlockingFollowing] = useState(false); // Individual state
  const [isCompleted, setIsCompleted] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);

  const {
    userProfile,
    suggestions,
    loadUserProfile,
    fetchSuggestions,
    clearSuggestions,
    setSuggestions,
    startBlockUserFollowers,
    startBlockUserFollows,
    blockProgress,
  } = useUserProfile();

  const { isLoggedIn } = useAuth();

  useEffect(() => {
    setHydrated(true);
  }, []);

  const handleBlockFollows = async () => {
    setIsBlockingFollowing(true); // Disable "Block Following" button
    setIsCompleted(false);
    setBlockedCount(0);

    await startBlockUserFollows(username, (progress, count) => {
      if (progress === 100) {
        setIsCompleted(true);
        setBlockedCount(count);
      }
    });

    setIsBlockingFollowing(false); // Re-enable "Block Following" button
  };

  const handleBlockFollowers = async () => {
    setIsBlockingFollowers(true); // Disable "Block Followers" button
    setIsCompleted(false);
    setBlockedCount(0);

    await startBlockUserFollowers(username, (progress, count) => {
      if (progress === 100) {
        setIsCompleted(true);
        setBlockedCount(count);
      }
    });

    setIsBlockingFollowers(false); // Re-enable "Block Followers" button
  };

  const onBlockUser = async () => {
    setIsBlockingUser(true); // Disable "Block User" button
    if (userProfile) {
      console.log(`${userProfile.handle} has been blocked.`);
    }
    setIsBlockingUser(false); // Re-enable "Block User" button
  };

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setUsername(input);

    if (input.length > 1) {
      const fetchedSuggestions = await fetchSuggestions(input);
      setSuggestions(fetchedSuggestions);
    } else {
      clearSuggestions();
    }
  };

  const selectSuggestion = (suggestion: { handle: string }) => {
    setUsername(suggestion.handle);
    clearSuggestions();
    loadUserProfile(suggestion.handle);
  };

  if (!hydrated) return null;

  return (
    <div className="flex flex-col items-center space-y-4">
      <InfoCard />
      <input
        type="text"
        value={username}
        onChange={handleInputChange}
        placeholder="Find by Bluesky name or handle"
        className="border border-gray-300 rounded-md w-full max-w-md px-4 py-2 mt-4 mb-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        autoComplete="off"
        disabled={isBlockingUser || isBlockingFollowers || isBlockingFollowing} // Disable input when blocking
      />
      <SuggestionsList suggestions={suggestions} onSelect={selectSuggestion} />
      {userProfile && (
        <UserProfileDisplay
          handle={userProfile.handle}
          isLoggedIn={isLoggedIn}
          onBlockUser={onBlockUser}
          onBlockFollowers={handleBlockFollowers}
          onBlockFollows={handleBlockFollows}
          blockProgress={blockProgress}
          isCompleted={isCompleted}
          blockedCount={blockedCount}
          isBlockingUser={isBlockingUser}
          isBlockingFollowers={isBlockingFollowers}
          isBlockingFollowing={isBlockingFollowing}
        />
      )}
    </div>
  );
}