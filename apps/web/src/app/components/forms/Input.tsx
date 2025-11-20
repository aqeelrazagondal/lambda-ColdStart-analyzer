"use client";
import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Input({ label, error, helperText, leftIcon, rightIcon, className = '', style, id, ...props }: InputProps) {
  const inputId = React.useId();
  const finalId = id || inputId;

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
      <div style={{ position: 'relative', width: '100%' }}>
        {leftIcon && (
          <div
            style={{
              position: 'absolute',
              left: 'var(--space-3)',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-tertiary)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {leftIcon}
          </div>
        )}
        <input
          id={finalId}
          className={className}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${finalId}-error` : helperText ? `${finalId}-helper` : undefined}
          style={{
            width: '100%',
            padding: 'var(--space-3)',
            paddingLeft: leftIcon ? 'var(--space-10)' : 'var(--space-3)',
            paddingRight: rightIcon ? 'var(--space-10)' : 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${error ? 'var(--color-error)' : 'var(--border-subtle)'}`,
            background: 'var(--surface-base)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-base)',
            fontFamily: 'inherit',
            transition: 'all var(--transition-fast)',
            outline: 'none',
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
          {...props}
        />
        {rightIcon && (
          <div
            style={{
              position: 'absolute',
              right: 'var(--space-3)',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-tertiary)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {rightIcon}
          </div>
        )}
      </div>
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

