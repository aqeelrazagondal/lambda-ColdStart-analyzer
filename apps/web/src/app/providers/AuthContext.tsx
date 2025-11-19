"use client";
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface AuthState {
  accessToken?: string;
  setAccessToken: (t?: string) => void;
  apiFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);

  const apiFetch = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers || {});
      headers.set('Content-Type', headers.get('Content-Type') || 'application/json');
      if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
      return fetch(input, { ...init, headers });
    },
    [accessToken]
  );

  const value = useMemo<AuthState>(
    () => ({ accessToken, setAccessToken, apiFetch }),
    [accessToken, apiFetch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
