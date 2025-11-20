"use client";
import React from 'react';
import { Spinner } from '@lca/ui-components';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

/**
 * Reusable loading state component
 */
export function LoadingState({ message = 'Loading...', size = 'md', fullScreen = false }: LoadingStateProps) {
  const content = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-4)',
        padding: fullScreen ? 'var(--space-16)' : 'var(--space-8)',
        color: 'var(--text-secondary)',
      }}
    >
      <Spinner size={size} />
      {message && <p style={{ fontSize: 'var(--text-base)', margin: 0 }}>{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-overlay)',
          zIndex: 'var(--z-modal)',
        }}
      >
        {content}
      </div>
    );
  }

  return content;
}

