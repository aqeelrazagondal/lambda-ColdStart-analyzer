"use client";
import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
}

export function Textarea({ label, error, helperText, resize = 'vertical', className = '', style, id, ...props }: TextareaProps) {
  const textareaId = React.useId();
  const finalId = id || textareaId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', width: '100%' }}>
      {label && (
        <label
          htmlFor={finalId}
          style={{
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-medium)',
            color: error ? 'var(--color-error)' : 'var(--text-primary)',
            marginBottom: 'var(--space-1)',
          }}
        >
          {label}
        </label>
      )}
      <textarea
        id={finalId}
        className={className}
        style={{
          width: '100%',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${error ? 'var(--color-error)' : 'var(--border-subtle)'}`,
          background: 'var(--surface-base)',
          color: 'var(--text-primary)',
          fontSize: 'var(--text-base)',
          fontFamily: 'inherit',
          transition: 'all var(--transition-fast)',
          outline: 'none',
          resize,
          minHeight: '100px',
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--color-error)' : 'var(--color-primary)';
          e.currentTarget.style.boxShadow = `0 0 0 3px ${error ? 'var(--color-error-bg)' : 'var(--color-primary-bg)'}`;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error ? 'var(--color-error)' : 'var(--border-subtle)';
          e.currentTarget.style.boxShadow = 'none';
        }}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? `${finalId}-error` : helperText ? `${finalId}-helper` : undefined}
        {...props}
      />
      {error && (
        <div
          id={`${finalId}-error`}
          role="alert"
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--color-error)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-1)',
          }}
        >
          <span aria-hidden="true">⚠️</span>
          {error}
        </div>
      )}
      {helperText && !error && (
        <div id={`${finalId}-helper`} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
          {helperText}
        </div>
      )}
    </div>
  );
}

