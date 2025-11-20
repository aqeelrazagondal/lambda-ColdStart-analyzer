"use client";
import React from 'react';

export interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  title?: string;
  description?: string;
  error?: string;
  footer?: React.ReactNode;
}

export function Form({ children, title, description, error, footer, onSubmit, ...props }: FormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (onSubmit) onSubmit(e);
      }}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%' }}
      {...props}
    >
      {title && (
        <div style={{ marginBottom: 'var(--space-2)' }}>
          <h1
            style={{
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--font-bold)',
              margin: '0 0 var(--space-2) 0',
              color: 'var(--text-primary)',
            }}
          >
            {title}
          </h1>
          {description && (
            <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', margin: 0, lineHeight: 'var(--leading-relaxed)' }}>
              {description}
            </p>
          )}
        </div>
      )}
      {error && (
        <div
          style={{
            padding: 'var(--space-3)',
            background: 'var(--color-error-bg)',
            color: 'var(--color-error)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
          }}
        >
          <span>⚠️</span>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>{children}</div>
      {footer && <div style={{ marginTop: 'var(--space-2)' }}>{footer}</div>}
    </form>
  );
}

