"use client";
import React from 'react';
import { useTheme } from '../providers/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        padding: '8px 12px',
        borderRadius: 999,
        border: '1px solid var(--border-color)',
        background: 'var(--surface)',
        color: 'var(--text-color)',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
        zIndex: 1000,
      }}
      aria-label="Toggle theme"
    >
      {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
    </button>
  );
}
