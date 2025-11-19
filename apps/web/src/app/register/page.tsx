"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../providers/AuthContext';

export default function RegisterPage() {
  const { setAccessToken, setUser } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | undefined>();

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    try {
      const res = await fetch(`${apiBase}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || 'Register failed');
      }
      setAccessToken(data.accessToken);
      setUser(data.user);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Register failed');
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-3xl)',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 480,
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--space-2xl)',
          boxShadow: 'var(--shadow-sm)',
          background: 'var(--surface)',
        }}
      >
        <h1 style={{ marginTop: 0 }}>Create your workspace</h1>
        <p style={{ color: 'var(--text-muted)' }}>Spin up a new organization in seconds.</p>
        <form onSubmit={onSubmit} style={{ display: 'grid', gap: 16, marginTop: 16 }}>
          <label style={{ display: 'grid', gap: 4 }}>
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} type="text" placeholder="Ada Lovelace" />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label style={{ display: 'grid', gap: 4 }}>
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
          {error && <div style={{ color: 'var(--danger)' }}>{error}</div>}
          <button type="submit" data-variant="primary">
            Create account
          </button>
        </form>
        <p style={{ marginTop: 16 }}>
          Already have an account? <Link href="/login">Log in</Link>
        </p>
      </section>
    </main>
  );
}
