"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';

type ThemeTokens = {
  palette: typeof palette.light;
  spacing: typeof spacing;
  typography: typeof typography;
  radii: typeof radii;
  shadows: typeof shadows;
};

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  tokens: ThemeTokens;
};

const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

const typography = {
  xs: '12px',
  sm: '14px',
  base: '16px',
  md: '18px',
  lg: '20px',
  xl: '24px',
  '2xl': '32px',
  display: '40px',
} as const;

const radii = {
  xs: 4,
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
} as const;

const shadows = {
  xs: '0 1px 2px rgba(15, 23, 42, 0.08)',
  sm: '0 4px 12px rgba(15, 23, 42, 0.08)',
  md: '0 8px 24px rgba(15, 23, 42, 0.12)',
  lg: '0 20px 40px rgba(15, 23, 42, 0.16)',
} as const;

const palette = {
  light: {
    background: '#f8fafc',
    backgroundMuted: '#eef2ff',
    surface: '#ffffff',
    surfaceMuted: '#f1f5f9',
    border: '#e2e8f0',
    borderStrong: '#cbd5f5',
    text: '#0f172a',
    textMuted: '#475569',
    textSubtle: '#94a3b8',
    accent: '#2563eb',
    accentHover: '#1d4ed8',
    accentMuted: '#dbeafe',
    success: '#10b981',
    warning: '#f97316',
    danger: '#ef4444',
    info: '#0ea5e9',
  },
  dark: {
    background: '#020617',
    backgroundMuted: '#0f172a',
    surface: '#0f172a',
    surfaceMuted: '#162033',
    border: '#1e293b',
    borderStrong: '#334155',
    text: '#f8fafc',
    textMuted: '#cbd5f5',
    textSubtle: '#94a3b8',
    accent: '#60a5fa',
    accentHover: '#93c5fd',
    accentMuted: 'rgba(96, 165, 250, 0.12)',
    success: '#34d399',
    warning: '#fb923c',
    danger: '#f87171',
    info: '#38bdf8',
  },
} as const;

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
  tokens: {
    palette: palette.light,
    spacing,
    typography,
    radii,
    shadows,
  },
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('lca-theme') : null;
    if (stored === 'light' || stored === 'dark') {
      setThemeState(stored);
    } else if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setThemeState('dark');
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.dataset.theme = theme;
    localStorage.setItem('lca-theme', theme);
  }, [theme]);

  const toggleTheme = () => setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  const setTheme = (next: Theme) => setThemeState(next);

  const tokens = useMemo<ThemeTokens>(
    () => ({
      palette: palette[theme],
      spacing,
      typography,
      radii,
      shadows,
    }),
    [theme]
  );

  return <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, tokens }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
