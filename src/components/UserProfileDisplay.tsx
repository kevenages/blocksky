// src/components/UserProfileDisplay.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getProfile } from '../lib/actorApi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/Card";
import HelpSheet from './HelpSheet';
import { FaUserCircle, FaEye, FaEyeSlash } from 'react-icons/fa';

interface UserProfile {
  displayName: string;
  handle: string;
  avatar?: string;
  followersCount?: number;
  followsCount?: number;
}

interface UserProfileDisplayProps {
  handle: string;
  onBlockUser?: () => void;
  onBlockNetwork?: () => void;
  isLoggedIn: boolean;
}

export default function UserProfileDisplay({
  handle,
  onBlockUser,
  onBlockNetwork,
  isLoggedIn, // Correctly pass this from props
}: UserProfileDisplayProps) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [accountHandle, setAccountHandle] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { login, errorMessage } = useAuth(); // Only destructure login and errorMessage

  useEffect(() => {
    async function loadProfile() {
      const profile = await getProfile(handle);
      setUserProfile(profile);
    }
    loadProfile();
  }, [handle]);

  const handleLogin = () => login(accountHandle, appPassword);

  return (
    userProfile && (
      <Card className="w-full max-w-md mt-8">
        <CardHeader className="text-left">
          <div className="flex items-start space-x-4">
            {userProfile.avatar ? (
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
              <span className="text-xl font-semibold">{userProfile.displayName}</span>
              <a
                href={`https://bsky.app/profile/${userProfile.handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500"
              >
                @{userProfile.handle}
              </a>
              <div className="flex space-x-4 mt-2">
                <Badge variant="outline">Followers: {userProfile.followersCount?.toLocaleString()}</Badge>
                <Badge variant="outline">Following: {userProfile.followsCount?.toLocaleString()}</Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="border-b border-gray-200 p-0" />
        <CardFooter className="flex flex-col items-center space-y-4 py-4">
          {isLoggedIn ? (
            <div className="flex space-x-4">
              <Button onClick={onBlockUser} variant="secondary">
                Block User
              </Button>
              <Button onClick={onBlockNetwork} variant="destructive">
                Block User and Network
              </Button>
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
    )
  );
}