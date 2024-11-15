// src/components/TopNav.tsx
"use client";

import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { FiLogOut } from 'react-icons/fi';
import { FaGithub } from 'react-icons/fa';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip';

export default function TopNav() {
  const { isLoggedIn, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="w-full flex justify-between items-center px-6 py-4 bg-white shadow-md">
      <div className="ml-auto flex items-center space-x-4">
        {/* GitHub Icon with Tooltip */}
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href="https://github.com/kevenages/blocksky"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-blue-500"
              aria-label="GitHub"
            >
              <FaGithub size={20} />
            </a>
          </TooltipTrigger>
          <TooltipContent>View project on GitHub</TooltipContent>
        </Tooltip>

        {/* Logout Icon with Tooltip, visible only when logged in */}
        {isLoggedIn && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-red-500"
                aria-label="Logout"
              >
                <FiLogOut size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent>Log out of BlockSky</TooltipContent>
          </Tooltip>
        )}
      </div>
    </nav>
  );
}