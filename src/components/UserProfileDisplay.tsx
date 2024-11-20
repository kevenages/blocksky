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
  onBlockNetwork: () => Promise<void>;
  isLoggedIn: boolean;
  blockProgress: number;
  isCompleted: boolean;
  blockedCount: number;
}

export default function UserProfileDisplay({
  handle,
  onBlockUser,
  onBlockNetwork,
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

  const handleBlockNetworkClick = async () => {
    setIsBlocking(true);
    await onBlockNetwork();
    setIsBlocking(false);
  };

  if (!hydrated) return null;

  return (
    <Card className="w-full max-w-md mt-8">
      <CardHeader className="text-left">
        <div className="flex items-start space-x-4">
          {userProfile?.avatar ? (
            <img
              src={userProfile.avatar}
              alt={`${userProfile.displayName}'s avatar`}
              className="w-16 h-16 rounded-full"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center border-4 border-white">
              <FaUserCircle className="text-white w-10 h-10" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-xl font-semibold">{userProfile?.displayName}</span>
            {userProfile?.handle && (
              <a
                href={`https://bsky.app/profile/${userProfile.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500"
              >
                @{userProfile.handle}
              </a>
            )}
            <div className="flex space-x-4 mt-2">
              <Badge variant="outline">
                Followers: {userProfile?.followersCount?.toLocaleString()}
              </Badge>
              <Badge variant="outline">
                Following: {userProfile?.followsCount?.toLocaleString()}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="border-b border-gray-200 p-0" />
      <CardFooter className="flex flex-col items-center space-y-4 py-4">
        {isLoggedIn ? (
          <div className="flex flex-col space-y-4 w-full">
            <div className="flex space-x-4">
              <Button onClick={onBlockUser} variant="secondary">
                Block User
              </Button>
              <Button
                onClick={handleBlockNetworkClick}
                variant="destructive"
                disabled={isBlocking}
              >
                {isBlocking ? "Fetching accounts..." : "Block User and Network"}
              </Button>
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
                  You have successfully blocked {blockedCount} users.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2 w-full">
            <div className="flex items-center space-x-2 mb-2">
              <span>Please log in to Bluesky using your app password</span>
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