// src/components/SuggestionsList.tsx

"use client";

import React from 'react';
import { FaUserCircle } from 'react-icons/fa';

interface Suggestion {
  displayName: string;
  handle: string;
  avatar?: string | null;
}

interface SuggestionsListProps {
  suggestions: Suggestion[];
  onSelect: (suggestion: Suggestion) => void;
}

export default function SuggestionsList({ suggestions, onSelect }: SuggestionsListProps) {
  if (suggestions.length === 0) {
    return null;
  }

  console.log("Rendering suggestions:", suggestions); // Check suggestions content

  return (
    <ul className="rounded bg-white shadow-md max-h-40 overflow-y-auto w-full max-w-md">
      {suggestions.map((suggestion, index) => (
        <li
          key={index}
          onClick={() => onSelect(suggestion)}
          className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-200"
        >
          {suggestion.avatar ? (
            <img
              src={suggestion.avatar}
              alt={`${suggestion.displayName}'s avatar`}
              className="w-8 h-8 rounded-full mr-2"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center border-2 border-white mr-2">
              <FaUserCircle className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-medium text-left break-words">{suggestion.displayName}</span>
            <span className="text-gray-500 text-left break-words">@{suggestion.handle}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}