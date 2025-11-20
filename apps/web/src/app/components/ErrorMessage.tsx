"use client";
import React from 'react';
import { Card } from '@lca/ui-components';

interface ErrorMessageProps {
  error: string | Error | null | undefined;
  title?: string;
  onRetry?: () => void;
  variant?: 'default' | 'inline' | 'card';
  style?: React.CSSProperties;
}

/**
 * Reusable error message component
 */
export function ErrorMessage({ error, title = 'Error', onRetry, variant = 'default', style }: ErrorMessageProps) {
  if (!error) return null;

  const errorMessage = error instanceof Error ? error.message : error;

  if (variant === 'inline') {
    return (
      <div
        role="alert"
        style={{
          padding: 'var(--space-3)',
          background: 'var(--color-error-bg)',
          color: 'var(--color-error)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-2)',
          ...style,
        }}
      >
        <span aria-hidden="true">⚠️</span>
        <span>{errorMessage}</span>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <Card variant="outlined" padding="md" style={{ background: 'var(--color-error-bg)', color: 'var(--color-error)', ...style }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: onRetry ? 'var(--space-3)' : 0 }}>
          <span aria-hidden="true">⚠️</span>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-1) 0' }}>
              {title}
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', margin: 0 }}>{errorMessage}</p>
          </div>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              background: 'var(--color-error)',
              color: 'var(--text-inverse)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--font-medium)',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        )}
      </Card>
    );
  }

  return (
    <div
      role="alert"
      style={{
        padding: 'var(--space-4)',
        background: 'var(--color-error-bg)',
        color: 'var(--color-error)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-error)',
        ...style,
      }}
    >
      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-2) 0' }}>
        {title}
      </h3>
      <p style={{ fontSize: 'var(--text-base)', margin: '0 0 var(--space-3) 0' }}>{errorMessage}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: 'var(--space-2) var(--space-4)',
            background: 'var(--color-error)',
            color: 'var(--text-inverse)',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-medium)',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      )}
    </div>
  );
}

