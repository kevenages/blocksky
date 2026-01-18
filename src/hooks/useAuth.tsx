// src/hooks/useAuth.tsx
"use client";

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { clearBlockedCache, clearUserDataCache } from '../lib/blockApi';
import { toast } from './use-toast';

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  authMethod: 'oauth' | 'password' | null;
  login: (handle: string, appPassword: string) => Promise<boolean>;
  loginWithOAuth: (handle: string) => Promise<void>;
  logout: () => Promise<void>;
  user: {
    handle: string | null;
    displayName: string | null;
    did: string | null;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authMethod, setAuthMethod] = useState<'oauth' | 'password' | null>(null);
  const [attempts, setAttempts] = useState<number>(0);
  const [user, setUser] = useState<{
    handle: string | null;
    displayName: string | null;
    did: string | null;
  }>({
    handle: null,
    displayName: null,
    did: null,
  });

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/status');
      const data = await response.json();

      if (data.isLoggedIn) {
        // If token needs refresh, do it
        if (data.needsRefresh) {
          await fetch('/api/auth/refresh', { method: 'POST' });
        }

        setIsLoggedIn(true);
        setAuthMethod(data.authMethod || 'password');
        setUser({
          handle: data.user?.handle || null,
          displayName: data.user?.displayName || null,
          did: data.user?.did || null,
        });

        // Check for OAuth return URL and restore it
        const returnUrl = localStorage.getItem('oauth_return_url');
        if (returnUrl && data.authMethod === 'oauth') {
          localStorage.removeItem('oauth_return_url');
          // Only redirect if we're not already on that URL
          if (window.location.href !== returnUrl) {
            window.location.href = returnUrl;
          }
        }
      } else {
        setIsLoggedIn(false);
        setAuthMethod(null);
        setUser({ handle: null, displayName: null, did: null });
      }
    } catch (error) {
      console.error('Auth status check failed:', error);
      setIsLoggedIn(false);
      setAuthMethod(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    handle: string,
    appPassword: string,
    initializeUserData?: (handle: string) => Promise<void>
  ): Promise<boolean> => {
    // Check for lockout
    if (attempts >= 10) {
      if (Cookies.get("loginLockout")) {
        toast({
          variant: "destructive",
          title: "Too many attempts",
          description: "Please try again in an hour.",
        });
        return false;
      }
      Cookies.set("loginLockout", "true", { expires: 1 / 24 });
      return false;
    }

    try {
      // Call server-side login route - password never stored client-side
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: handle, password: appPassword }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUser({
          handle: data.user.handle,
          displayName: data.user.displayName,
          did: data.user.did,
        });
        setIsLoggedIn(true);
        setAuthMethod('password');
        setAttempts(0);

        // Trigger data initialization
        if (initializeUserData) {
          await initializeUserData(data.user.handle);
        }

        return true;
      } else {
        setAttempts((prev) => prev + 1);
        toast({
          variant: "destructive",
          title: "Login failed",
          description: data.error || "Invalid handle or app password. Please try again.",
        });
        return false;
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Login error",
        description: "An error occurred during login.",
      });
      console.error("Login error:", error);
      return false;
    }
  };

  const loginWithOAuth = async (handle: string): Promise<void> => {
    try {
      const response = await fetch('/api/auth/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle }),
      });

      const data = await response.json();

      if (response.ok && data.authUrl) {
        // Save current URL to restore after OAuth redirect
        localStorage.setItem('oauth_return_url', window.location.href);
        // Redirect to the OAuth authorization URL
        window.location.href = data.authUrl;
      } else {
        toast({
          variant: "destructive",
          title: "Sign in failed",
          description: data.error || "Failed to initiate sign in.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign in error",
        description: "An error occurred during sign in.",
      });
      console.error("OAuth login error:", error);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Call server-side logout route to clear httpOnly cookies
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }

    // Clear client-side state
    setIsLoggedIn(false);
    setAuthMethod(null);
    setAttempts(0);
    setUser({ handle: null, displayName: null, did: null });
    Cookies.remove("loginLockout");

    // Clear caches
    clearBlockedCache();
    clearUserDataCache();
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, authMethod, login, loginWithOAuth, logout, user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
