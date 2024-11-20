"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { FiLogOut, FiGithub } from 'react-icons/fi';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/Tooltip';
import Link from 'next/link'

export default function TopNav() {
  const { isLoggedIn, logout } = useAuth();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true); // Component is now hydrated
  }, []);

  return (
    <nav className="w-full flex justify-end items-center px-6 py-4 bg-white space-x-8">
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href="https://github.com/kevenages/blocksky"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-blue-500"
          >
            <FiGithub size={20} aria-label="View project on GitHub" />
          </a>
        </TooltipTrigger>
        <TooltipContent>View project on GitHub</TooltipContent>
      </Tooltip>
      {hydrated && isLoggedIn && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="#"
              rel="noopener noreferrer"
              onClick={logout}
              className="text-gray-600 hover:text-blue-500"
            >
              <FiLogOut size={20} aria-label="Log out of BlockSky" />
            </Link>
          </TooltipTrigger>
          <TooltipContent>Log out of BlockSky</TooltipContent>
        </Tooltip>
      )}
    </nav>
  );
}