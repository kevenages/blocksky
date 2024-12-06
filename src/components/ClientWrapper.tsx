// src/components/ClientWrapper.tsx
"use client";


import React, { useState, useEffect } from 'react';
import { AuthProvider } from '../hooks/useAuth';
import Loader from './Loader';
import { CookieConsentBanner } from './CookieConsentBanner';
import { Badge } from "../components/ui/badge"

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
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          BlockSky <sup><Badge variant="outline">beta</Badge></sup>
        </h1>
        {children}
        <CookieConsentBanner />
      </main>
    </AuthProvider>
  );
}