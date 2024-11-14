// src/components/UserProfileDisplay.tsx

"use client";

import React from 'react';
import Link from 'next/link';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/Card';
import { Tooltip, TooltipTrigger, TooltipContent } from '../components/ui/Tooltip';
import { FaUserCircle } from 'react-icons/fa';

interface UserProfile {
  displayName: string;
  handle: string;
  avatar?: string;
  followersCount?: number;
  followsCount?: number;
}

interface UserProfileDisplayProps {
  userProfile: UserProfile;
  onBlockUser: () => void;
  onBlockNetwork: () => void;
}

export default function UserProfileDisplay({
  userProfile,
  onBlockUser,
  onBlockNetwork,
}: UserProfileDisplayProps) {
  return (
    <Card className="w-full max-w-md mt-8">
      <CardHeader className="text-left">
        <div className="flex items-start space-x-4">
          {/* Display avatar if available, otherwise show icon with blue background and white icon */}
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
          
          {/* Column 2: Name, Handle, Followers, Following */}
          <div className="flex flex-col">
            <span className="text-xl font-semibold">{userProfile.displayName}</span>

            {/* Tooltip on handle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={`https://bsky.app/profile/${userProfile.handle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500"
                >
                  @{userProfile.handle}
                </Link>
              </TooltipTrigger>
              <TooltipContent>View on bsky.app</TooltipContent>
            </Tooltip>

            <div className="flex space-x-4 mt-2">
              <Badge variant="outline">
                Followers: {userProfile.followersCount?.toLocaleString()}
              </Badge>
              <Badge variant="outline">
                Following: {userProfile.followsCount?.toLocaleString()}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="border-b border-gray-200 p-0" />

      <CardFooter className="flex justify-center items-center space-x-4 py-2">
        <Button onClick={onBlockUser} variant="secondary">
          Block User
        </Button>
        <Button onClick={onBlockNetwork} variant="danger">
          Block User and Network
        </Button>
      </CardFooter>
    </Card>
  );
}