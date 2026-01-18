// src/components/HelpSheet.tsx

import React from 'react';
import Link from 'next/link'
import Image from 'next/image'

import { Sheet, SheetContent, SheetHeader, SheetDescription, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert"
import { FaQuestionCircle } from 'react-icons/fa';
import { RxOpenInNewWindow } from "react-icons/rx";

export default function HelpSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button aria-label="Help">
          <FaQuestionCircle className="text-blue-500 hover:text-green-500 size-6" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="min-w-[40vw] overflow-auto">
        <SheetHeader>
          <SheetTitle>How to Sign In</SheetTitle>
          <SheetDescription />
        </SheetHeader>
        <div className="mt-4">
          {/* OAuth Section */}
          <Alert className="my-4 border-blue-200 bg-blue-50">
            <AlertTitle>Option 1: Sign in with Bluesky (Recommended)</AlertTitle>
            <AlertDescription>
              The easiest way to sign in. Just enter your handle and authorize BlockSky through Bluesky.
            </AlertDescription>
          </Alert>
          <ol className="list-decimal list-inside mt-2 mb-6">
            <li className="mb-2">Enter your Bluesky handle (e.g., yourname.bsky.social)</li>
            <li className="mb-2">Click &quot;Sign in with Bluesky&quot;</li>
            <li className="mb-2">You&apos;ll be redirected to Bluesky to authorize BlockSky</li>
            <li className="mb-2">After authorizing, you&apos;ll be redirected back and signed in</li>
          </ol>

          <div className="border-t border-gray-200 my-6" />

          {/* App Password Section */}
          <Alert className="my-4">
            <AlertTitle>Option 2: Use an App Password</AlertTitle>
            <AlertDescription>
              App Passwords allow you to log in without using OAuth. They don&apos;t give full access to your account.
            </AlertDescription>
          </Alert>
          <ol className="list-decimal list-inside mt-2">
            <li>
              <Link
                href="https://bsky.app/settings/app-passwords"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500"
              >
                Go to your &apos;App Passwords&apos; setting on Bluesky <RxOpenInNewWindow className="inline-block" />
              </Link>
              <Image
                src="/images/app-password-1.png"
                width={500}
                height={500}
                className="rounded-lg drop-shadow-md border border-solid border-gray-300 my-4"
                alt="Bluesky settings showing App Passwords option"
              />
            </li>
            <li>
              Enter a name for your new password. You may create one specifically for use with BlockSky, if you wish.
              <Image
                src="/images/app-password-2.png"
                width={500}
                height={500}
                className="rounded-lg drop-shadow-md border border-solid border-gray-300 my-4"
                alt="Dialog to create a new app password with a name field"
              />
            </li>
            <li>
              Copy the password and put it somewhere safe.
              <Image
                src="/images/app-password-3.png"
                width={500}
                height={500}
                className="rounded-lg drop-shadow-md border border-solid border-gray-300 my-4"
                alt="Newly created app password displayed for copying"
              />
            </li>
            <li className="mb-2">
              Back in BlockSky, enter your Bluesky handle and paste the app password into the &quot;App Password&quot; field, then click &quot;Login with App Password&quot;.
            </li>
            <li>
              When you are done, you can either choose to keep the app password or delete it in your Bluesky settings.
              <Image
                src="/images/app-password-5.png"
                width={500}
                height={500}
                className="rounded-lg drop-shadow-md border border-solid border-gray-300 my-4"
                alt="Bluesky settings showing option to delete app password"
              />
            </li>
          </ol>
        </div>
      </SheetContent>
    </Sheet>
  );
}