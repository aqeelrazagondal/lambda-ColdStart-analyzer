"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, useRef } from 'react';

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
  setAccessToken: (t?: string, refresh?: string) => void;
  setUser: (user?: UserProfile) => void;
  signOut: () => void;
  refreshUser: () => Promise<void>;
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'lca-token';
const REFRESH_TOKEN_STORAGE_KEY = 'lca-refresh-token';
const TOKEN_REFRESH_BUFFER_MS = 60000; // Refresh 1 minute before expiration (15min token - 1min buffer)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessTokenState] = useState<string | undefined>(undefined);
  const [refreshToken, setRefreshTokenState] = useState<string | undefined>(undefined);
  const [user, setUserState] = useState<UserProfile | undefined>(undefined);
  const [loadingUser, setLoadingUser] = useState(true);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Load tokens from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    if (storedToken && storedRefreshToken) {
      setAccessTokenState(storedToken);
      setRefreshTokenState(storedRefreshToken);
    } else {
      setLoadingUser(false);
    }
  }, []);

  // Decode JWT to get expiration time
  const getTokenExpiration = useCallback((token: string): number | null => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
    } catch {
      return null;
    }
  }, []);

  // Refresh access token using refresh token
  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${apiBase}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        throw new Error('Failed to refresh token');
      }
      const data = await res.json();
      const newAccessToken = data.accessToken;
      const newRefreshToken = data.refreshToken;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_STORAGE_KEY, newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, newRefreshToken);
          setRefreshTokenState(newRefreshToken);
        }
      }
      setAccessTokenState(newAccessToken);
      return newAccessToken;
    } catch (err) {
      console.warn('Failed to refresh access token', err);
      // Clear tokens on refresh failure
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      }
      setAccessTokenState(undefined);
      setRefreshTokenState(undefined);
      setUserState(undefined);
      return null;
    }
  }, [refreshToken, apiBase]);

  // Set up automatic token refresh timer
  useEffect(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    if (!accessToken) {
      return;
    }

    const expiration = getTokenExpiration(accessToken);
    if (!expiration) {
      return;
    }

    const now = Date.now();
    const timeUntilExpiration = expiration - now;
    const refreshTime = Math.max(0, timeUntilExpiration - TOKEN_REFRESH_BUFFER_MS);

    refreshTimerRef.current = setTimeout(() => {
      refreshAccessToken();
    }, refreshTime);

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [accessToken, getTokenExpiration, refreshAccessToken]);

  // Fetch user profile when access token changes
  useEffect(() => {
    let aborted = false;
    async function fetchUser() {
      if (!accessToken) {
        setUserState(undefined);
        setLoadingUser(false);
        return;
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
      }
      setLoadingUser(true);
      try {
        const res = await fetch(`${apiBase}/auth/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (res.status === 401) {
          // Token expired, try to refresh
          const newToken = await refreshAccessToken();
          if (newToken && !aborted) {
            // Retry with new token
            const retryRes = await fetch(`${apiBase}/auth/me`, {
              headers: {
                Authorization: `Bearer ${newToken}`,
              },
            });
            if (retryRes.ok) {
              const profile = await retryRes.json();
              if (!aborted) {
                setUserState(profile);
              }
            } else {
              throw new Error('Failed to load profile after refresh');
            }
          } else {
            throw new Error('Failed to refresh token');
          }
        } else if (!res.ok) {
          throw new Error('Failed to load profile');
        } else {
          const profile = await res.json();
          if (!aborted) {
            setUserState(profile);
          }
        }
      } catch (err) {
        if (!aborted) {
          console.warn('Failed to refresh user profile', err);
          setUserState(undefined);
          if (typeof window !== 'undefined') {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
            localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
          }
          setAccessTokenState(undefined);
          setRefreshTokenState(undefined);
        }
      } finally {
        if (!aborted) setLoadingUser(false);
      }
    }
    fetchUser();
    return () => {
      aborted = true;
    };
  }, [accessToken, apiBase, refreshAccessToken]);

  // Support relative paths so components can call apiFetch('/orgs') without repeating the base URL
  const normalizeUrl = useCallback(
    (input: RequestInfo | URL): RequestInfo | URL => {
      if (typeof input === 'string') {
        if (input.startsWith('http://') || input.startsWith('https://')) {
          return input;
        }
        if (input.startsWith('/')) {
          return `${apiBase}${input}`;
        }
      } else if (input instanceof URL) {
        return input;
      }
      return input;
    },
    [apiBase]
  );

  const apiFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const target = normalizeUrl(input);
      const headers = new Headers(init?.headers || {});
      const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
      if (!headers.has('Content-Type') && !isFormData) {
        headers.set('Content-Type', 'application/json');
      }
      
      let token = accessToken;
      if (token) {
        // Check if token is about to expire
        const expiration = getTokenExpiration(token);
        if (expiration && expiration - Date.now() < TOKEN_REFRESH_BUFFER_MS) {
          const newToken = await refreshAccessToken();
          if (newToken) {
            token = newToken;
          }
        }
        headers.set('Authorization', `Bearer ${token}`);
      }

      let res = await fetch(target, { ...init, headers });
      
      // If 401, try to refresh token and retry once
      if (res.status === 401 && refreshToken) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          headers.set('Authorization', `Bearer ${newToken}`);
          res = await fetch(target, { ...init, headers });
        }
      }

      return res;
    },
    [accessToken, refreshToken, normalizeUrl, getTokenExpiration, refreshAccessToken]
  );

  const setAccessToken = (token?: string, refresh?: string) => {
    setAccessTokenState(token);
    if (refresh) {
      setRefreshTokenState(refresh);
      if (typeof window !== 'undefined') {
        localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refresh);
      }
    }
    if (token && typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  };

  const setUser = (next?: UserProfile) => setUserState(next);

  const signOut = useCallback(async () => {
    // Revoke refresh token on server
    if (refreshToken) {
      try {
        await fetch(`${apiBase}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      } catch (err) {
        console.warn('Failed to revoke refresh token on logout', err);
      }
    }
    
    setAccessTokenState(undefined);
    setRefreshTokenState(undefined);
    setUserState(undefined);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    }
  }, [refreshToken, apiBase]);

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
