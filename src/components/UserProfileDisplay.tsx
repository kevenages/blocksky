"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { getProfile } from "../lib/actorApi";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import HelpSheet from "./HelpSheet";
import { Card, CardContent, CardFooter, CardHeader } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Alert, AlertTitle, AlertDescription } from "../components/ui/alert";
import { FaUserCircle, FaEye, FaEyeSlash } from "react-icons/fa";
import { TbLoader3 } from "react-icons/tb";
import Image from "next/image";
import ConfirmAction from "./ConfirmAction";
import { getRandomShareText } from "../lib/shareText";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../components/ui/hover-card"

interface UserProfile {
  displayName: string;
  handle: string;
  avatar?: string;
  followersCount?: number;
  followsCount?: number;
}

interface UserProfileDisplayProps {
  handle: string;
  onBlockFollowers: () => Promise<void>;
  onBlockFollows: () => Promise<void>;
  isLoggedIn: boolean;
  blockProgress: number;
  blockingStatus: string | null;
  isCompleted: boolean;
  blockedCount: number;
  isBlockingUser: boolean;
  isBlockingFollowers: boolean;
  isBlockingFollowing: boolean;
  mutuals: { handle: string }[];
  loading: boolean;
  isDataInitialized: boolean;
  alreadyBlockedCount: number;
}

export default function UserProfileDisplay({
  handle,
  onBlockFollowers,
  onBlockFollows,
  isLoggedIn,
  blockProgress,
  blockingStatus,
  isCompleted,
  blockedCount,
  isBlockingUser,
  isBlockingFollowers,
  isBlockingFollowing,
  mutuals,
  loading,
  isDataInitialized,
  alreadyBlockedCount,
}: UserProfileDisplayProps) {
  const [hydrated, setHydrated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [accountHandle, setAccountHandle] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { login, logout, errorMessage } = useAuth();
  const randomText = getRandomShareText();
  const shareLink = `https://bsky.app/intent/compose?text=${randomText}`;


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

  const handleLogin = async () => {
    await login(accountHandle, appPassword);
  };

  if (!hydrated) return null;

  return (
    <Card className="w-full max-w-md mt-8">
      <CardHeader className="text-center">
        <div className="flex flex-col items-center">
          {userProfile?.avatar ? (
            <Image
              src={userProfile.avatar}
              alt={`${userProfile.displayName}'s avatar`}
              className="w-20 h-20 rounded-full"
              width={90}
              height={90}
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
      <CardFooter className="flex flex-col items-center space-y-4 py-4">
        {loading ? (
          <p className="text-center text-gray-500">Loading data...</p>
        ) : isLoggedIn ? (
          isDataInitialized ? (
            <div className="flex flex-col space-y-4 w-full">
              <div>
                <span className="font-bold">Please Note</span>:{" "}
                <HoverCard>
                  <HoverCardTrigger className="cursor-help">Mutuals</HoverCardTrigger>
                  <HoverCardContent>
                    A mutual is someone you follow who also follows you back.
                  </HoverCardContent>
                </HoverCard>, accounts you've already blocked, and users with *.bsky.app or *.bsky.team will be skipped.
              </div>
              <ConfirmAction
                title="Block Followers"
                description={`Are you sure you want to block all followers of "${userProfile?.handle}"? This action cannot be undone.`}
                onConfirm={onBlockFollowers}
                trigger={
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={isBlockingUser || isBlockingFollowers || isBlockingFollowing}
                  >
                    {isBlockingFollowers ? "Blocking Followers..." : "Block Followers"}
                  </Button>
                }
              />
              <ConfirmAction
                title="Block Following"
                description={`Are you sure you want to block all accounts followed by "${userProfile?.handle}"? This action cannot be undone.`}
                onConfirm={onBlockFollows}
                trigger={
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={isBlockingUser || isBlockingFollowers || isBlockingFollowing}
                  >
                    {isBlockingFollowing ? "Blocking Following..." : "Block Following"}
                  </Button>
                }
              />
              {(isBlockingFollowers || isBlockingFollowing) && (
                <div className="w-full">
                  <Progress value={blockProgress} />
                  <p className="text-center mt-2">
                    {blockingStatus ? blockingStatus : `${blockProgress.toFixed(1)}% Complete`}
                  </p>
                </div>
              )}
              {isCompleted && (
                <Alert className="w-full text-left">
                  <AlertTitle>Success!</AlertTitle>
                  <AlertDescription className="pt-4">
                    You have successfully blocked {blockedCount.toLocaleString()} users.
                    {mutuals.length > 0 && (
                      <p className="mt-1">
                        {mutuals.length.toLocaleString()} mutuals were not blocked.
                      </p>
                    )}
                    {alreadyBlockedCount > 0 && (
                      <p className="mt-1">
                        {alreadyBlockedCount} users were already blocked.
                      </p>
                    )}
                    <p className="flex justify-center items-center">
                      <a href='https://ko-fi.com/X8X516M9VR' target='_blank' rel="noopener noreferrer">
                        <img
                          className="mt-4"
                          height='36'
                          style={{ border: "0px", height: "36px" }}
                          src='https://storage.ko-fi.com/cdn/kofi5.png?v=6'
                          alt='Buy Me a Coffee at ko-fi.com'
                        />
                      </a>
                    </p>
                    <p className="mt-4 flex justify-center items-center font-bold">
                      Want to spread the word?{" "}
                    </p>
                    <p className="mt-2 flex justify-center items-center">
                      <a
                        href={shareLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 underline"
                      >
                        Spread the word on Bluesky!
                      </a>
                    </p>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div>
              <div className="flex justify-center items-center">
                <TbLoader3 size={18} className="spin text-blue-500" />
              </div>
              <div className="text-center text-gray-500">
                  Initializing your profile...
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center space-y-2 w-full">
            <div className="flex items-center space-x-2 mb-2">
              <span>
                To start blocking, sign in with your Bluesky App Password. Note: This is different
                from your main Bluesky password.
              </span>
              <HelpSheet />
            </div>
            <input
              type="text"
              value={accountHandle}
              onChange={(e) => setAccountHandle(e.target.value)}
              placeholder="Enter Bluesky handle for your account"
              className="border rounded w-full px-4 py-2"
              autoComplete="username"
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