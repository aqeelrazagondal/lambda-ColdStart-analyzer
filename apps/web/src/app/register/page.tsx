"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../providers/AuthContext';

export default function RegisterPage() {
  const { setAccessToken } = useAuth();
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
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Register failed');
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Register</h1>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} type="text" style={{ width: '100%' }} />
        </label>
        <label>
          Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required style={{ width: '100%' }} />
        </label>
        <label>
          Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required style={{ width: '100%' }} />
        </label>
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
        <button type="submit">Create account</button>
      </form>
      <p style={{ marginTop: 12 }}>
        Already have an account? <a href="/login">Login</a>
      </p>
    </main>
  );
}
