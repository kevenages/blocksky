"use client";

import React, { useState, useEffect } from "react";
import InfoCard from "./InfoCard";
import SuggestionsList from "./SuggestionsList";
import UserProfileDisplay from "./UserProfileDisplay";
import { useAuth } from "../hooks/useAuth";
import { useUserProfile } from "../hooks/useUserProfile";
import { User } from "../lib/blockApi";
import { IoCloseCircle } from "react-icons/io5";
import { toast } from "../hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export default function UserBlocker() {
  const [username, setUsername] = useState("");
  const [accountHandle, setAccountHandle] = useState(""); // Added for login handle
  const [appPassword, setAppPassword] = useState(""); // Added for login password
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isBlockingUser, setIsBlockingUser] = useState(false);
  const [isBlockingFollowers, setIsBlockingFollowers] = useState(false);
  const [isBlockingFollowing, setIsBlockingFollowing] = useState(false);
  const [blockingStatus, setBlockingStatus] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [mutuals, setMutuals] = useState<User[]>([]);

  const {
    userProfile,
    suggestions,
    loadUserProfile,
    fetchSuggestions,
    clearSuggestions,
    clearUserProfile,
    setSuggestions,
    startBlockUserFollowers,
    startBlockUserFollows,
    blockProgress,
    isDataInitialized,
    alreadyBlockedCount,
  } = useUserProfile();

  const { login, isLoggedIn, authMethod } = useAuth();
  const { initializeUserData } = useUserProfile();

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Restore searched profile after OAuth redirect
  useEffect(() => {
    const savedUsername = localStorage.getItem('oauth_searched_profile');
    if (savedUsername && isLoggedIn && authMethod === 'oauth' && !userProfile) {
      localStorage.removeItem('oauth_searched_profile');
      setUsername(savedUsername);
      setLoading(true);
      loadUserProfile(savedUsername).finally(() => setLoading(false));
    }
  }, [isLoggedIn, authMethod, userProfile, loadUserProfile]);

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

    const { success, mutuals: fetchedMutuals, errorMessage } = await startBlockUserFollows(
      username,
      (progress, count) => {
        setBlockedCount(count);
        setBlockingStatus(null);
      },
      (status) => setBlockingStatus(status)
    );

    setMutuals(fetchedMutuals);
    setIsBlockingFollowing(false);
    setBlockingStatus(null);
    setIsCompleted(success);

    if (!success && errorMessage) {
      toast({
        variant: "destructive",
        title: "Blocking failed",
        description: errorMessage,
      });
    }
  };

  const handleBlockFollowers = async () => {
    setIsBlockingFollowers(true);
    setIsCompleted(false);
    setBlockedCount(0);

    const { success, mutuals: fetchedMutuals, errorMessage } = await startBlockUserFollowers(
      username,
      (progress, count) => {
        setBlockedCount(count);
        setBlockingStatus(null);
      },
      (status) => setBlockingStatus(status)
    );

    setMutuals(fetchedMutuals);
    setIsBlockingFollowers(false);
    setBlockingStatus(null);
    setIsCompleted(success);

    if (!success && errorMessage) {
      toast({
        variant: "destructive",
        title: "Blocking failed",
        description: errorMessage,
      });
    }
  };

  const resetState = () => {
    setIsBlockingUser(false);
    setIsBlockingFollowers(false);
    setIsBlockingFollowing(false);
    setBlockingStatus(null);
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
    // Save for OAuth redirect restoration
    localStorage.setItem('oauth_searched_profile', suggestion.handle);
    clearSuggestions();
    setLoading(true);
    await loadUserProfile(suggestion.handle);
    setLoading(false);
  };

  const clearSearch = () => {
    setUsername("");
    clearSuggestions();
    clearUserProfile();
    localStorage.removeItem('oauth_searched_profile');
    resetState();
  };

  if (!hydrated) return null;

  return (
    <TooltipProvider>
      <div className="flex flex-col items-center space-y-4">
        <InfoCard />
        <div className="relative w-full max-w-md mt-4 mb-2">
          <input
            type="text"
            value={username}
            onChange={handleInputChange}
            placeholder="Find by Bluesky name or handle"
            className="border border-gray-300 rounded-md w-full px-4 py-2 pr-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoComplete="off"
            disabled={isBlockingUser || isBlockingFollowers || isBlockingFollowing}
          />
          {username && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  aria-label="Clear search"
                  disabled={isBlockingUser || isBlockingFollowers || isBlockingFollowing}
                >
                  <IoCloseCircle className="w-5 h-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Clear search</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <SuggestionsList suggestions={suggestions} onSelect={selectSuggestion} />
      {userProfile && (
        <UserProfileDisplay
          userProfile={userProfile}
          isLoggedIn={isLoggedIn}
          onBlockFollowers={handleBlockFollowers}
          onBlockFollows={handleBlockFollows}
          blockProgress={blockProgress}
          blockingStatus={blockingStatus}
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
    </TooltipProvider>
  );
}