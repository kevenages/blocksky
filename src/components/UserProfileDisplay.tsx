"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { getProfile } from "../lib/actorApi";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "../components/ui/card";
import HelpSheet from "./HelpSheet";
import { FaUserCircle, FaEye, FaEyeSlash } from "react-icons/fa";
import { Progress } from "../components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "../components/ui/alert";

// Define the UserProfile interface
interface UserProfile {
  displayName: string;
  handle: string;
  avatar?: string;
  followersCount?: number;
  followsCount?: number;
}

interface UserProfileDisplayProps {
  handle: string;
  onBlockUser: () => void;
  onBlockFollowers: () => Promise<void>;
  isLoggedIn: boolean;
  blockProgress: number;
  isCompleted: boolean;
  blockedCount: number;
}

export default function UserProfileDisplay({
  handle,
  onBlockUser,
  onBlockFollowers,
  isLoggedIn,
  blockProgress,
  isCompleted,
  blockedCount,
}: UserProfileDisplayProps) {
  const [hydrated, setHydrated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [accountHandle, setAccountHandle] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const { login, errorMessage } = useAuth();

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    async function loadProfile() {
      if (!handle) return;
      const profile = await getProfile(handle);
      setUserProfile(profile);
    }
    loadProfile();
  }, [handle]);

  const handleLogin = () => login(accountHandle, appPassword);

  const handleBlockFollowersClick = async () => {
    setIsBlocking(true);
    await onBlockFollowers();
    setIsBlocking(false);
  };

  if (!hydrated) return null;

  return (
    <Card className="w-full max-w-md mt-8">
    <CardHeader className="text-center">
      <div className="flex flex-col items-center">
        {userProfile?.avatar ? (
          <img
            src={userProfile.avatar}
            alt={`${userProfile.displayName}'s avatar`}
            className="w-20 h-20 rounded-full"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center border-4 border-white mb-4">
            <FaUserCircle className="text-white w-12 h-12" />
          </div>
        )}
      </div>
      <div className="mt-8 text-center">
        <span className="text-xl font-semibold block">{userProfile?.displayName}</span>
        {userProfile?.handle && (
          <a
            href={`https://bsky.app/profile/${userProfile.handle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 block"
          >
            @{userProfile.handle}
          </a>
        )}
      </div>
    <div className="w-full flex justify-center">
      <Badge variant="outline" className="mr-2 mt-4">
        Followers: {userProfile?.followersCount?.toLocaleString()}
      </Badge>
      <Badge variant="outline" className="mt-4">
        Following: {userProfile?.followsCount?.toLocaleString()}
      </Badge>
    </div>
  </CardHeader>
  <CardContent className="border-b border-gray-200 p-0" />
  <CardFooter className="flex flex-col items-center space-y-4 py-4 ">
    {isLoggedIn ? (
      <div className="flex flex-col space-y-4 w-full">
        <div className="flex space-x-4">
          <div className="flex flex-col space-y-4 w-full">
            <Button
              onClick={onBlockUser}
              variant="secondary"
              className="w-full"
            >
              Block User
            </Button>
            <Button
              onClick={handleBlockFollowersClick}
              variant="destructive"
              disabled={isBlocking}
              className="w-full"
            >
              {isBlocking ? "Fetching accounts..." : "Block User and Followers"}
            </Button>
          </div>
        </div>
        {blockProgress > 0 && !isCompleted && (
          <div className="w-full">
            <Progress value={blockProgress} />
            <p className="text-center mt-2">{Math.round(blockProgress)}% Complete</p>
          </div>
        )}
        {isCompleted && (
          <Alert className="w-full">
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>
              You have successfully blocked {blockedCount.toLocaleString()} users.
            </AlertDescription>
          </Alert>
        )}
      </div>
    ) : (
      <div className="flex flex-col items-center space-y-2 w-full">
        <div className="flex items-center space-x-2 mb-2">
          <span>To block users, log in with your Bluesky App Password. Note: This is different from your main Bluesky password.</span>
          <HelpSheet />
        </div>
        <input
          type="text"
          value={accountHandle}
          onChange={(e) => setAccountHandle(e.target.value)}
          placeholder="Enter Bluesky handle for your account"
          className="border rounded w-full px-4 py-2"
          autoComplete="off"
        />
        <div className="relative w-full">
          <input
            type={isPasswordVisible ? "text" : "password"}
            value={appPassword}
            onChange={(e) => setAppPassword(e.target.value)}
            placeholder="Bluesky App Password (e.g., xxxx-xxxx-xxxx-xxxx)"
            className="border rounded w-full px-4 py-2 pr-10"
            autoComplete="off"
          />
          <span
            className="absolute inset-y-0 right-0 flex items-center pr-3 cursor-pointer"
            onClick={() => setIsPasswordVisible((prev) => !prev)}
            title={isPasswordVisible ? "Hide password" : "Show password"}
          >
            {isPasswordVisible ? (
              <FaEyeSlash className="text-gray-500 hover:text-green-500" />
            ) : (
              <FaEye className="text-gray-500 hover:text-green-500" />
            )}
          </span>
        </div>
        <Button onClick={handleLogin} className="w-full">
          Login
        </Button>
        {errorMessage && <p className="text-red-500">{errorMessage}</p>}
      </div>
    )}
  </CardFooter>
</Card>
  );
}