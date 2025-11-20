"use client";
import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}

export function Select({ label, error, helperText, options, placeholder, className = '', style, id, ...props }: SelectProps) {
  const selectId = React.useId();
  const finalId = id || selectId;

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
      <select
        id={finalId}
        className={className}
        style={{
          width: '100%',
          padding: 'var(--space-3)',
          paddingRight: 'var(--space-10)',
          borderRadius: 'var(--radius-md)',
          border: `1px solid ${error ? 'var(--color-error)' : 'var(--border-subtle)'}`,
          background: 'var(--surface-base)',
          color: 'var(--text-primary)',
          fontSize: 'var(--text-base)',
          fontFamily: 'inherit',
          transition: 'all var(--transition-fast)',
          outline: 'none',
          cursor: 'pointer',
          appearance: 'none',
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 9L1 4h10z'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right var(--space-3) center',
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
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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

