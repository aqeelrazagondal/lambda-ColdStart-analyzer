"use client";
import React, { Suspense, useEffect, useState } from 'react';
import { useAuth } from '../../providers/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '../../providers/ToastContext';
import { AppShell } from '../../components/shell/AppShell';
import { Card, Button, Spinner } from '@lca/ui-components';

export const dynamic = "force-dynamic";

interface Session {
  id: string;
  userId: string;
  device?: string;
  ipAddress?: string;
  userAgent?: string;
  lastActivityAt: string;
  createdAt: string;
  refreshToken?: {
    id: string;
    expiresAt: string;
    revokedAt?: string;
  };
}

export default function SessionsPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Spinner size="lg" />
        </div>
      </AppShell>
    }>
      <SessionsPageInner />
    </Suspense>
  );
}

function SessionsPageInner() {
  const { apiFetch, accessToken, loadingUser, user } = useAuth();
  const { success, error: pushError } = useToast();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (loadingUser || !accessToken || !user) return;
    loadSessions();
  }, [accessToken, loadingUser, user]);

  async function loadSessions() {
    if (!accessToken) return;
    setLoading(true);
    setError(undefined);
    try {
      const res = await apiFetch(`${apiBase}/auth/sessions`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        throw new Error(data?.message || 'Failed to load sessions');
      }
      setSessions(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function revokeSession(sessionId: string) {
    if (!confirm('Are you sure you want to revoke this session?')) return;
    setLoading(true);
    setError(undefined);
    try {
      const res = await apiFetch(`${apiBase}/auth/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to revoke session');
      success('Session revoked successfully');
      await loadSessions();
    } catch (e: any) {
      setError(e.message);
      pushError(e.message || 'Failed to revoke session');
    } finally {
      setLoading(false);
    }
  }

  async function revokeAllSessions() {
    if (!confirm('Are you sure you want to revoke all sessions? You will be logged out.')) return;
    setLoading(true);
    setError(undefined);
    try {
      const res = await apiFetch(`${apiBase}/auth/sessions/revoke-all`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to revoke sessions');
      success('All sessions revoked successfully');
      // Redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    } catch (e: any) {
      setError(e.message);
      pushError(e.message || 'Failed to revoke sessions');
    } finally {
      setLoading(false);
    }
  }

  function getDeviceInfo(session: Session): string {
    if (session.device) return session.device;
    if (session.userAgent) {
      const ua = session.userAgent;
      if (ua.includes('Mobile')) return 'Mobile Device';
      if (ua.includes('Tablet')) return 'Tablet';
      if (ua.includes('Windows')) return 'Windows';
      if (ua.includes('Mac')) return 'Mac';
      if (ua.includes('Linux')) return 'Linux';
      return 'Unknown Device';
    }
    return 'Unknown';
  }

  const currentSessionId = sessions.find(s => {
    // Try to identify current session - this is a heuristic
    // In a real app, you'd track the current session ID
    return true; // For now, we'll just show all sessions
  })?.id;

  return (
    <AppShell>
      <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', margin: '0 0 var(--space-2) 0' }}>
            Active Sessions
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Manage your active sessions and sign out from devices
          </p>
        </div>

        {error && (
          <Card
            variant="outlined"
            padding="md"
            style={{
              marginBottom: 'var(--space-6)',
              background: 'var(--color-error-bg)',
              color: 'var(--color-error)',
              borderColor: 'var(--color-error)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Error: {error}</span>
              <Button size="sm" variant="ghost" onClick={() => setError(undefined)}>
                Dismiss
              </Button>
            </div>
          </Card>
        )}

        <Card variant="elevated" padding="lg" style={{ marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: 0 }}>
              Your Sessions ({sessions.length})
            </h2>
            <Button variant="outline" onClick={revokeAllSessions} disabled={loading || sessions.length === 0}>
              Revoke All Sessions
            </Button>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
              <Spinner size="lg" />
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No active sessions found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {sessions.map((session) => {
                const isRevoked = session.refreshToken?.revokedAt;
                const isExpired = session.refreshToken?.expiresAt && new Date(session.refreshToken.expiresAt) < new Date();
                const isCurrent = session.id === currentSessionId;

                return (
                  <Card
                    key={session.id}
                    variant="outlined"
                    padding="md"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      opacity: isRevoked || isExpired ? 0.6 : 1,
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                        <strong style={{ fontSize: 'var(--text-base)' }}>{getDeviceInfo(session)}</strong>
                        {isCurrent && (
                          <span style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-2)', background: 'var(--color-success-bg)', color: 'var(--color-success)', borderRadius: 'var(--radius-sm)' }}>
                            Current
                          </span>
                        )}
                        {(isRevoked || isExpired) && (
                          <span style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-2)', background: 'var(--color-error-bg)', color: 'var(--color-error)', borderRadius: 'var(--radius-sm)' }}>
                            {isRevoked ? 'Revoked' : 'Expired'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                        <div>IP: {session.ipAddress || 'Unknown'}</div>
                        <div>Last Activity: {new Date(session.lastActivityAt).toLocaleString()}</div>
                        <div>Created: {new Date(session.createdAt).toLocaleString()}</div>
                        {session.refreshToken?.expiresAt && (
                          <div>Expires: {new Date(session.refreshToken.expiresAt).toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                    <div>
                      {!isRevoked && !isExpired && !isCurrent && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => revokeSession(session.id)}
                          disabled={loading}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

