// src/components/HelpSheet.tsx

import React from 'react';
import Link from 'next/link'
import Image from 'next/image'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/Sheet';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert"
import { FaQuestionCircle } from 'react-icons/fa';
import { RxOpenInNewWindow } from "react-icons/rx";

export default function HelpSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button aria-label="Help">
          <FaQuestionCircle className="text-gray-500 hover:text-blue-500" />
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="min-w-[40vw] overflow-auto">
        <SheetHeader>
          <SheetTitle>How to set up an App Password</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <Alert className="my-4">
            <AlertTitle>What is a Bluesky App Password?</AlertTitle>
            <AlertDescription>
              App Passwords allow you to log in to applications like Blocksky without giving full access to your account or password.
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
                alt=""
              />
            </li>
            <li>
              Enter a name for your new password. You may create one specifically for use with Blocksky, if you wish.
              <Image
                src="/images/app-password-2.png"
                width={500}
                height={500}
                className="rounded-lg drop-shadow-md border border-solid border-gray-300 my-4"
                alt=""
              />
            </li>
            <li>
              Copy the password and put it somewhere safe.
              <Image
                src="/images/app-password-3.png"
                width={500}
                height={500}
                className="rounded-lg drop-shadow-md border border-solid border-gray-300 my-4"
                alt=""
              />
            </li>
            <li>
              Use this app password to log in instead of your main account password.
              <Image
                src="/images/app-password-4.png"
                width={500}
                height={500}
                className="rounded-lg drop-shadow-md border border-solid border-gray-300 my-4"
                alt=""
              />
            </li>
            <li>
              When you are done, you can either choose to keep the app password or delete it in your Bluesky settings.
              <Image
                src="/images/app-password-5.png"
                width={500}
                height={500}
                className="rounded-lg drop-shadow-md border border-solid border-gray-300 my-4"
                alt=""
              />
            </li>
          </ol>
        </div>
      </SheetContent>
    </Sheet>
  );
}