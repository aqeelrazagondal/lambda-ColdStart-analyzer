"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../providers/AuthContext';

export default function LoginPage() {
  const { setAccessToken } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
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
      setAccessToken(data.accessToken);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Login</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required style={{ width: '100%' }} />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required style={{ width: '100%' }} />
        </label>
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
        <button type="submit">Login</button>
      </form>
      <p style={{ marginTop: 12 }}>
        No account? <a href="/register">Register</a>
      </p>
    </main>
  );
}
