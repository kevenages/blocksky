"use client"

import React, {useState, useEffect} from 'react';
import UserBlocker from '../components/UserBlocker';
import { SiBluesky } from "react-icons/si";
import CookiePolicySheet from '../components/CookiePolicySheet';
import PrivacyPolicySheet from '../components/PrivacyPolicySheet';
import { FiGithub } from 'react-icons/fi';
import { useAuth } from "../hooks/useAuth";
import { FiLogOut } from 'react-icons/fi';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';
import Link from 'next/link';

export default function HomePage() {
  const [hydrated, setHydrated] = useState(false);
  const { isLoggedIn, logout } = useAuth();
    useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <>
      <div>
        <UserBlocker />
      </div>
      <footer className="flex flex-col items-center gap-y-4 text-sm mb-6 mt-8">
        {/* Existing Footer Nav */}
        <nav className="flex justify-center gap-x-6 gap-y-2 text-sm" aria-label="Footer">
          <a href="https://bsky.app/profile/blocksky.app" className="text-gray-400 hover:text-gray-300 flex items-center space-x-2" target="_blank">
              <SiBluesky size={24} />
              <span>@blocksky.app</span>
            </a>
          <CookiePolicySheet triggerClassName="text-gray-400 hover:text-gray-300" />
          <PrivacyPolicySheet triggerClassName="text-gray-400 hover:text-gray-300" />
        </nav>

        {/* GitHub Link */}
        <a
          href="https://github.com/kevenages/blocksky"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-gray-400 hover:text-gray-300"
        >
          <FiGithub size={20} aria-label="View project on GitHub" />
          <span className="ml-2">View on GitHub</span>
        </a>
        { isLoggedIn && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="#"
              rel="noopener noreferrer"
              onClick={logout}
              className="flex items-center text-gray-400 hover:text-gray-300"
            >
              <span className="ml-2 mr-2">Sign out</span> <FiLogOut size={20} aria-label="Log out of BlockSky" /> 
            </Link>
          </TooltipTrigger>
          <TooltipContent>Sign out of BlockSky</TooltipContent>
        </Tooltip>
        )}
      </footer>

    </>
  );
}