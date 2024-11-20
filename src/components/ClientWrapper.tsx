// src/components/ClientWrapper.tsx
"use client";


import React, { useState, useEffect } from 'react';
import { AuthProvider } from '../hooks/useAuth';
import TopNav from './TopNav';
import Loader from '@/components/Loader';

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
      <TopNav />
      <main className="w-full max-w-lg mx-auto p-8 text-center mt-8 relative">
        <h1 className="text-4xl font-bold text-blue-600 mb-8">
          Bl<span id="no-symbol" className="inline-block">🚫</span>cksk<span id="target-letter">y</span>
        </h1>
        {children}
        <div
          id="butterfly"
          className="absolute" // Start hidden, fade in later
          style={{ width: '96px', height: '96px' }} // Larger size for butterfly
        >
          🦋 {/* The butterfly icon */}
        </div>
      </main>
    </AuthProvider>
  );
}