"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type UserProfile = {
  id: string;
  email: string;
  name?: string;
  createdAt?: string;
};

interface AuthState {
  accessToken?: string;
  user?: UserProfile;
  loadingUser: boolean;
  setAccessToken: (t?: string) => void;
  setUser: (user?: UserProfile) => void;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessTokenState] = useState<string | undefined>(undefined);
  const [user, setUserState] = useState<UserProfile | undefined>(undefined);
  const [loadingUser, setLoadingUser] = useState(true);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('lca-token');
    if (stored) {
      setAccessTokenState(stored);
    } else {
      setLoadingUser(false);
    }
  }, []);

  useEffect(() => {
    let aborted = false;
    async function fetchUser() {
      if (!accessToken) {
        setUserState(undefined);
        setLoadingUser(false);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('lca-token');
        }
        return;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('lca-token', accessToken);
      }
      setLoadingUser(true);
      try {
        const res = await fetch(`${apiBase}/auth/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!res.ok) throw new Error('Failed to load profile');
        const profile = await res.json();
        if (!aborted) {
          setUserState(profile);
        }
      } catch (err) {
        if (!aborted) {
          console.warn('Failed to refresh user profile', err);
          setUserState(undefined);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('lca-token');
          }
          setAccessTokenState(undefined);
        }
      } finally {
        if (!aborted) setLoadingUser(false);
      }
    }
    fetchUser();
    return () => {
      aborted = true;
    };
  }, [accessToken, apiBase]);

  const apiFetch = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers || {});
      const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
      if (!headers.has('Content-Type') && !isFormData) {
        headers.set('Content-Type', 'application/json');
      }
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
      return fetch(input, { ...init, headers });
    },
    [accessToken]
  );

  const setAccessToken = (token?: string) => {
    setAccessTokenState(token);
  };

  const setUser = (next?: UserProfile) => setUserState(next);

  const signOut = () => {
    setAccessTokenState(undefined);
    setUserState(undefined);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lca-token');
    }
  };

  const refreshUser = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch(`${apiBase}/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to refresh user');
      const profile = await res.json();
      setUserState(profile);
    } catch (err) {
      console.warn(err);
    }
  }, [accessToken, apiBase]);

  const value = useMemo<AuthState>(
    () => ({ accessToken, user, loadingUser, setAccessToken, setUser, signOut, refreshUser, apiFetch }),
    [accessToken, user, loadingUser, apiFetch, signOut, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
