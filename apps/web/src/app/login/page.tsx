"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../providers/AuthContext';
import { Button } from '@lca/ui-components';
import { Input } from '../components/forms/Input';
import { Form } from '../components/forms/Form';

export default function LoginPage() {
  const { setAccessToken, setUser } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Login failed');
      }
      setAccessToken(data.accessToken, data.refreshToken);
      setUser(data.user);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-6)',
        background: 'var(--bg-primary)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          position: 'relative',
        }}
      >
        {/* Decorative background element */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-20%',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, var(--color-primary-bg) 0%, transparent 70%)',
            opacity: 0.3,
            borderRadius: '50%',
            filter: 'blur(60px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        
        <section
          style={{
            width: '100%',
            position: 'relative',
            zIndex: 1,
            background: 'var(--surface-base)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-subtle)',
            padding: 'var(--space-8)',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          {/* Logo/Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-6)' }}>
            <span style={{ fontSize: 'var(--text-2xl)' }}>⚡</span>
            <span style={{ fontSize: 'var(--text-sm)', opacity: 0.9, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 'var(--font-semibold)' }}>
              Lambda Cold-Start Analyzer
            </span>
          </div>

          <Form
            title="Sign in"
            description="Welcome back. Sign in to continue to your workspace."
            error={error}
            onSubmit={onSubmit}
            footer={
              <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                  Don't have an account?{' '}
                  <Link
                    href="/register"
                    style={{
                      color: 'var(--color-primary)',
                      fontWeight: 'var(--font-medium)',
                      textDecoration: 'none',
                    }}
                  >
                    Create one
                  </Link>
                </p>
              </div>
            }
          >
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              leftIcon={<span>📧</span>}
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              leftIcon={<span>🔒</span>}
            />
            <Button type="submit" variant="primary" size="lg" fullWidth isLoading={loading}>
              Sign in
            </Button>
          </Form>
        </section>
      </div>
    </main>
  );
}
