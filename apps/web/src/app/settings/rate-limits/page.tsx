"use client";
import React, { Suspense, useEffect, useState } from 'react';
import { useAuth } from '../../providers/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '../../providers/ToastContext';
import { AppShell } from '../../components/shell/AppShell';
import { Card, Button, Spinner } from '@lca/ui-components';

export const dynamic = "force-dynamic";

interface RateLimitStats {
  totalRequests: number;
  blockedRequests: number;
  activeUsers: number;
  activeIPs: number;
  topUsers: Array<{ userId: string; requests: number; blocked: number }>;
  topIPs: Array<{ ip: string; requests: number; blocked: number }>;
}

interface Violation {
  identifier: string;
  count: number;
  limit: number;
}

export default function RateLimitsPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Spinner size="lg" />
        </div>
      </AppShell>
    }>
      <RateLimitsPageInner />
    </Suspense>
  );
}

interface OrgItem { id: string; name: string; createdAt: string; role: string }

function RateLimitsPageInner() {
  const { apiFetch, accessToken, loadingUser } = useAuth();
  const { error: pushError } = useToast();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const sp = useSearchParams();
  const router = useRouter();

  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [orgId, setOrgId] = useState<string>(sp.get('orgId') || '');
  const [stats, setStats] = useState<RateLimitStats | null>(null);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (loadingUser || !accessToken) return;
    
    setLoadingOrgs(true);
    (async () => {
      try {
        const res = await apiFetch(`${apiBase}/orgs`);
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            throw new Error('Authentication required. Please log in again.');
          }
          throw new Error(data?.message || 'Failed to load orgs');
        }
        const adminOrgs = (data.orgs || []).filter((o: OrgItem) => ['admin', 'owner'].includes(o.role));
        setOrgs(adminOrgs);
        if (adminOrgs.length && !orgId) {
          const first = adminOrgs[0].id;
          setOrgId(first);
          const q = new URLSearchParams(Array.from(sp.entries()));
          q.set('orgId', first);
          router.replace(`?${q.toString()}`);
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoadingOrgs(false);
      }
    })();
  }, [accessToken, loadingUser, apiFetch, apiBase, orgId, sp, router]);

  useEffect(() => {
    if (orgId) {
      loadStats();
      loadViolations();
    }
  }, [orgId]);

  async function loadStats() {
    if (!orgId || !accessToken) return;
    setLoading(true);
    setError(undefined);
    try {
      const res = await apiFetch(`${apiBase}/rate-limit/stats/${orgId}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        throw new Error(data?.message || 'Failed to load rate limit stats');
      }
      setStats(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadViolations() {
    if (!orgId || !accessToken) return;
    try {
      const res = await apiFetch(`${apiBase}/rate-limit/violations/${orgId}?limit=20`);
      const data = await res.json();
      if (res.ok) {
        setViolations(Array.isArray(data) ? data : []);
      }
    } catch (e: any) {
      console.error('Failed to load violations:', e);
    }
  }

  const canLoad = orgId && ['admin', 'owner'].includes(orgs.find(o => o.id === orgId)?.role || '');

  return (
    <AppShell>
      <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', margin: '0 0 var(--space-2) 0' }}>
            Rate Limit Monitoring
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Monitor API rate limiting and identify potential abuse
          </p>
        </div>

        <Card variant="elevated" padding="md" style={{ marginBottom: 'var(--space-6)' }}>
          <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-2)' }}>
            Organization
          </label>
          {loadingOrgs ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3)' }}>
              <Spinner size="sm" />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Loading organizations...</span>
            </div>
          ) : orgs.length === 0 ? (
            <div style={{ padding: 'var(--space-3)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
              No organizations with admin access found.
            </div>
          ) : (
            <select
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-base)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-base)',
              }}
            >
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.role})
                </option>
              ))}
            </select>
          )}
        </Card>

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

        {canLoad && (
          <>
            {stats && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                <Card variant="elevated" padding="md">
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>Total Requests</div>
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' }}>{stats.totalRequests.toLocaleString()}</div>
                </Card>
                <Card variant="elevated" padding="md">
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>Blocked Requests</div>
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-error)' }}>
                    {stats.blockedRequests.toLocaleString()}
                  </div>
                </Card>
                <Card variant="elevated" padding="md">
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>Active Users</div>
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' }}>{stats.activeUsers}</div>
                </Card>
                <Card variant="elevated" padding="md">
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>Active IPs</div>
                  <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)' }}>{stats.activeIPs}</div>
                </Card>
              </div>
            )}

            <Card variant="elevated" padding="lg" style={{ marginBottom: 'var(--space-6)' }}>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-4) 0' }}>
                Top Users
              </h2>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
                  <Spinner size="lg" />
                </div>
              ) : stats && stats.topUsers.length === 0 ? (
                <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No user data available.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>User ID</th>
                        <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>Requests</th>
                        <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>Blocked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.topUsers.map((user, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>{user.userId}</td>
                          <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>{user.requests.toLocaleString()}</td>
                          <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: user.blocked > 0 ? 'var(--color-error)' : 'var(--text-secondary)' }}>
                            {user.blocked}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card variant="elevated" padding="lg" style={{ marginBottom: 'var(--space-6)' }}>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-4) 0' }}>
                Rate Limit Violations
              </h2>
              {violations.length === 0 ? (
                <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No violations found.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>Identifier</th>
                        <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>Count</th>
                        <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>Limit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {violations.map((violation, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>{violation.identifier}</td>
                          <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-error)' }}>
                            {violation.count.toLocaleString()}
                          </td>
                          <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>{violation.limit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

