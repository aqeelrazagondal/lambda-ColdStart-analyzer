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
      <div style={{ position: 'fixed', right: 16, bottom: 16, display: 'grid', gap: 8, zIndex: 1000 }}>
        {toasts.map((t) => (
          <div key={t.id}
               role="status"
               onClick={() => remove(t.id)}
               style={{
                 minWidth: 260,
                 maxWidth: 420,
                 padding: '12px 16px',
                 borderRadius: 'var(--radius-lg)',
                 color: 'var(--text-color)',
                 background: t.type === 'success' ? 'rgba(16,185,129,0.15)' : t.type === 'error' ? 'rgba(248,113,113,0.18)' : 'var(--surface)',
                 border: '1px solid var(--border-color)',
                 boxShadow: 'var(--shadow-sm)'
               }}>
            <strong style={{ textTransform: 'capitalize' }}>{t.type}</strong>
            <div style={{ fontSize: 14 }}>{t.message}</div>
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
