"use client";

import React, { useState, useEffect } from "react";
import InfoCard from "./InfoCard";
import SuggestionsList from "./SuggestionsList";
import UserProfileDisplay from "./UserProfileDisplay";
import { useAuth } from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";
import { User } from "../lib/blockApi";

export default function UserBlocker() {
  const [username, setUsername] = useState("");
  const [accountHandle, setAccountHandle] = useState(""); // Added for login handle
  const [appPassword, setAppPassword] = useState(""); // Added for login password
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isBlockingUser, setIsBlockingUser] = useState(false);
  const [isBlockingFollowers, setIsBlockingFollowers] = useState(false);
  const [isBlockingFollowing, setIsBlockingFollowing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [mutuals, setMutuals] = useState<User[]>([]);

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
    isDataInitialized,
    alreadyBlockedCount,
  } = useUserProfile();

  const { login, isLoggedIn } = useAuth();
  const { initializeUserData } = useUserProfile();

  useEffect(() => {
    setHydrated(true);
  }, []);

const handleLogin = async () => {
  const success = await login(accountHandle, appPassword);
  if (success) {
    console.log("User logged in. Initializing user data...");
    await initializeUserData();
  }
};

  const handleBlockFollows = async () => {
    setIsBlockingFollowing(true);
    setIsCompleted(false);
    setBlockedCount(0);

    const { success, mutuals: fetchedMutuals } = await startBlockUserFollows(username, (progress, count) => {
      setBlockedCount(count);
    });

    setMutuals(fetchedMutuals);
    setIsBlockingFollowing(false);
    setIsCompleted(success);
  };

  const handleBlockFollowers = async () => {
    setIsBlockingFollowers(true);
    setIsCompleted(false);
    setBlockedCount(0);

    const { success, mutuals: fetchedMutuals } = await startBlockUserFollowers(username, (progress, count) => {
      setBlockedCount(count);
    });

    setMutuals(fetchedMutuals);
    setIsBlockingFollowers(false);
    setIsCompleted(success);
  };

  const onBlockUser = async () => {
    setIsBlockingUser(true);
    if (userProfile) {
      // Perform block operation here
    }
    setIsBlockingUser(false);
  };

  const resetState = () => {
    setIsBlockingUser(false);
    setIsBlockingFollowers(false);
    setIsBlockingFollowing(false);
    setIsCompleted(false);
    setBlockedCount(0);
    setMutuals([]);
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

  const selectSuggestion = async (suggestion: { handle: string }) => {
    resetState();
    setUsername(suggestion.handle);
    clearSuggestions();
    setLoading(true);
    await loadUserProfile(suggestion.handle);
    setLoading(false);
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
        disabled={isBlockingUser || isBlockingFollowers || isBlockingFollowing}
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
          mutuals={mutuals}
          loading={loading}
          isDataInitialized={isDataInitialized}
          alreadyBlockedCount={alreadyBlockedCount}
        />
      )}
    </div>
  );
}