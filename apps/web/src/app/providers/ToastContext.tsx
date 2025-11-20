"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

type ToastType = 'info' | 'success' | 'error';
interface ToastItem { id: number; type: ToastType; message: string; }

interface ToastState {
  toasts: ToastItem[];
  push: (type: ToastType, message: string) => void;
  info: (message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  remove: (id: number) => void;
}

const ToastContext = createContext<ToastState | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(1);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback((type: ToastType, message: string) => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, type, message }]);
    // Auto-dismiss after 4s
    setTimeout(() => remove(id), 4000);
  }, [remove]);

  const value = useMemo<ToastState>(() => ({
    toasts,
    push,
    info: (m) => push('info', m),
    success: (m) => push('success', m),
    error: (m) => push('error', m),
    remove,
  }), [toasts, push, remove]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={{ position: 'fixed', right: 'var(--space-4)', bottom: 'var(--space-4)', display: 'grid', gap: 'var(--space-2)', zIndex: 'var(--z-dropdown)' }}>
        {toasts.map((t) => (
          <div key={t.id}
               role="status"
               onClick={() => remove(t.id)}
               style={{
                 minWidth: '260px',
                 maxWidth: '420px',
                 padding: 'var(--space-3) var(--space-4)',
                 borderRadius: 'var(--radius-md)',
                 color: 'var(--text-primary)',
                 background: t.type === 'success' ? 'var(--color-success-bg)' : t.type === 'error' ? 'var(--color-error-bg)' : 'var(--surface-base)',
                 border: '1px solid var(--border-subtle)',
                 boxShadow: 'var(--shadow-lg)',
                 cursor: 'pointer',
                 transition: 'all var(--transition-fast)',
               }}
               onMouseEnter={(e) => {
                 e.currentTarget.style.opacity = '0.9';
               }}
               onMouseLeave={(e) => {
                 e.currentTarget.style.opacity = '1';
               }}>
            <strong style={{ textTransform: 'capitalize', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>{t.type}</strong>
            <div style={{ fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>{t.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
