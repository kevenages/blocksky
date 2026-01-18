// src/components/ClientWrapper.tsx
"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { AuthProvider } from '../hooks/useAuth';
import Loader from './Loader';
import { CookieConsentBanner } from './CookieConsentBanner';
import { Toaster } from './ui/toaster';

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, 1500); // Adjust the delay as needed

    return () => clearTimeout(timeout);
  }, []);

  if (isLoading) {
    return <Loader />;
  }

  return (
    <AuthProvider>
      <main className="w-full max-w-lg mx-auto p-8 text-center mt-2 relative">
        <h1 className="mb-4">
          <Image
            src="/logo.png"
            alt="BlockSky - Mass blocking tool for Bluesky"
            width={200}
            height={217}
            className="mx-auto"
            priority
          />
          <span className="sr-only">BlockSky</span>
        </h1>
        {children}
        <CookieConsentBanner />
      </main>
      <Toaster />
    </AuthProvider>
  );
}