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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Check initial login status based on token presence
  const initialLoginState = !!Cookies.get("accessToken");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(initialLoginState);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [attempts, setAttempts] = useState<number>(0);

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
      // Use centralized PDS URL for login
      const response = await fetch(`https://bsky.social/xrpc/com.atproto.server.createSession`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: handle,
          password: appPassword,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        Cookies.set("accessToken", data.accessJwt);
        Cookies.set("refreshToken", data.refreshJwt);
        setIsLoggedIn(true);
        setErrorMessage('');
        return true;
      } else {
        setAttempts(prev => prev + 1);
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
    Cookies.remove("loginLockout");
    Cookies.remove("accessToken");
    Cookies.remove("refreshToken");
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, login, logout, errorMessage, attempts }}>
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