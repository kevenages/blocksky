// src/components/HelpSheet.tsx

import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/Sheet';
import { FaQuestionCircle } from 'react-icons/fa';

export default function HelpSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button aria-label="Help">
          <FaQuestionCircle className="text-gray-500 hover:text-blue-500" />
        </button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>How to set up an App Password</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <p>To generate an app password:</p>
          <ol className="list-decimal list-inside mt-2">
            <li>Go to your account settings on Bluesky.</li>
            <li>Find the 'App Passwords' section.</li>
            <li>Create a new password specifically for use with BlockSky.</li>
            <li>Use this app password here instead of your main account password.</li>
          </ol>
        </div>
      </SheetContent>
    </Sheet>
  );
}
