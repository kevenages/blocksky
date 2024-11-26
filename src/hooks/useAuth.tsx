// src/hooks/useAuth.tsx
"use client";

import React, { useState, createContext, useContext, ReactNode } from 'react';
import Cookies from 'js-cookie';

interface AuthContextType {
  isLoggedIn: boolean;
  login: (handle: string, appPassword: string) => Promise<boolean>;
  logout: () => void;
  errorMessage: string;
  attempts: number;
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
  const initialLoginState = !!Cookies.get("accessToken");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(initialLoginState);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [attempts, setAttempts] = useState<number>(0);
  
  // Load user info from cookies
  const [user, setUser] = useState<{
    handle: string | null;
    displayName: string | null;
    did: string | null;
  }>({
    handle: Cookies.get("userHandle") || null,
    displayName: Cookies.get("userDisplayName") || null,
    did: Cookies.get("userDID") || null,
  });

  const login = async (handle: string, appPassword: string): Promise<boolean> => {
    if (attempts >= 10) {
      if (Cookies.get("loginLockout")) {
        setErrorMessage("Too many failed attempts. Please try again in an hour.");
        return false;
      }
      Cookies.set("loginLockout", "true", { expires: 1 / 24 });
      return false;
    }

    try {
      const response = await fetch(`https://bsky.social/xrpc/com.atproto.server.createSession`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: handle, password: appPassword }),
      });

      if (response.ok) {
        const data = await response.json();
        Cookies.set("accessToken", data.accessJwt);
        Cookies.set("refreshToken", data.refreshJwt);

        // Save user info in cookies
        Cookies.set("userHandle", data.handle);
        Cookies.set("userDisplayName", data.displayName);
        Cookies.set("userDID", data.did);

        setUser({
          handle: data.handle,
          displayName: data.displayName,
          did: data.did,
        });
        setIsLoggedIn(true);
        setErrorMessage('');
        return true;
      } else {
        setAttempts((prev) => prev + 1);
        setErrorMessage("Invalid handle or app password. Please try again.");
        return false;
      }
    } catch (error) {
      setErrorMessage("An error occurred during login.");
      console.error("Login error:", error);
      return false;
    }
  };

  const logout = (): void => {
    setIsLoggedIn(false);
    setErrorMessage('');
    setAttempts(0);
    setUser({ handle: null, displayName: null, did: null });
    Cookies.remove("loginLockout");
    Cookies.remove("accessToken");
    Cookies.remove("refreshToken");
    Cookies.remove("userHandle");
    Cookies.remove("userDisplayName");
    Cookies.remove("userDID");
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout, errorMessage, attempts, user }}>
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