"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../providers/AuthContext';
import { AppShell } from '../../../components/shell/AppShell';
import { Card, Button, Spinner, EmptyState, Badge } from '@lca/ui-components';
import Link from 'next/link';

interface LFn {
  id: string;
  functionArn: string;
  functionName: string;
  runtime?: string;
  memoryMb?: number;
  timeoutMs?: number;
  region: string;
  lastScannedAt?: string;
}

interface ListResponse {
  items: LFn[];
  total: number;
  page: number;
  pageSize: number;
}

export default function OrgFunctionsPage() {
  const { apiFetch } = useAuth();
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;
  const router = useRouter();
  const sp = useSearchParams();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const [region, setRegion] = useState(sp.get('region') || '');
  const [runtime, setRuntime] = useState(sp.get('runtime') || '');
  const [q, setQ] = useState(sp.get('q') || '');
  const [page, setPage] = useState<number>(Number(sp.get('page') || 1));
  const [pageSize, setPageSize] = useState<number>(Number(sp.get('pageSize') || 50));
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);

  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (region) p.set('region', region);
    if (runtime) p.set('runtime', runtime);
    if (q) p.set('q', q);
    p.set('page', String(page));
    p.set('pageSize', String(pageSize));
    return p;
  }, [region, runtime, q, page, pageSize]);

  async function load() {
    if (!orgId) return;
    setLoading(true);
    setError(undefined);
    try {
      const url = `${apiBase}/orgs/${orgId}/functions?${query.toString()}`;
      const res = await apiFetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load');
      setData(json);
      const uniqueRegions = new Set<string>();
      (json.items || []).forEach((item: any) => {
        if (item.region) uniqueRegions.add(item.region);
      });
      setAvailableRegions((prev) => Array.from(new Set([...prev, ...uniqueRegions])));
      const clientUrl = `/orgs/${orgId}/functions?${query.toString()}`;
      router.replace(clientUrl);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region, runtime, q, page, pageSize, orgId]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const isMobile = useIsMobile();

  if (!orgId) {
    return (
      <AppShell orgId={orgId}>
        <div>Invalid organization</div>
      </AppShell>
    );
  }

  return (
    <AppShell orgId={orgId}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', margin: '0 0 var(--space-2) 0' }}>Functions</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Explore and manage your Lambda functions</p>
          </div>
          <Link href={`/orgs/${orgId}/dashboard`}>
            <Button variant="outline" size="sm">
              ← Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <Card variant="elevated" padding="md" style={{ marginBottom: 'var(--space-4)' }}>
          <div
            style={{
              display: 'grid',
              gap: 'var(--space-3)',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
              alignItems: 'end',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-2)' }}>
                Region
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-base)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                <option value="">All regions</option>
                {availableRegions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-2)' }}>
                Runtime
              </label>
              <input
                placeholder="nodejs20.x"
                value={runtime}
                onChange={(e) => setRuntime(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-base)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-2)' }}>
                Search
              </label>
              <input
                placeholder="Search name"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{
                  width: '100%',
                  padding: 'var(--space-2) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-base)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-sm)',
                }}
              />
            </div>
            <Button onClick={() => load()} disabled={loading} variant="primary" size="md">
              Filter
            </Button>
          </div>
        </Card>

        {error && (
          <Card variant="outlined" padding="md" style={{ marginBottom: 'var(--space-4)', background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
            {error}
          </Card>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
            <Spinner size="lg" />
          </div>
        ) : data && data.items.length === 0 ? (
          <Card variant="outlined" padding="lg">
            <EmptyState
              icon="⚡"
              title="No functions found"
              description="Connect an AWS account and scan your Lambda functions to get started. Functions will appear here once scanned."
              action={{
                label: 'Connect AWS account',
                onClick: () => (window.location.href = '/settings/aws-accounts'),
                variant: 'primary',
              }}
              secondaryAction={{
                label: 'Back to Dashboard',
                onClick: () => (window.location.href = `/orgs/${orgId}/dashboard`),
              }}
            />
          </Card>
        ) : (
          data && (
            <>
              {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {data.items.map((fn) => (
                    <Card key={fn.id} variant="elevated" padding="md">
                      <Link
                        href={`/orgs/${orgId}/functions/${fn.id}`}
                        style={{
                          textDecoration: 'none',
                          color: 'inherit',
                          display: 'block',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-3)' }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-1) 0' }}>
                              {fn.functionName}
                            </h3>
                            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-2)' }}>
                              <Badge variant="default" size="sm">
                                {fn.region}
                              </Badge>
                              {fn.runtime && (
                                <Badge variant="info" size="sm">
                                  {fn.runtime}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                          <div>
                            <span style={{ fontWeight: 'var(--font-medium)' }}>Memory: </span>
                            {fn.memoryMb ? `${fn.memoryMb} MB` : '—'}
                          </div>
                          <div>
                            <span style={{ fontWeight: 'var(--font-medium)' }}>Timeout: </span>
                            {typeof fn.timeoutMs === 'number' ? `${Math.round((fn.timeoutMs || 0) / 1000)}s` : '—'}
                          </div>
                          {fn.lastScannedAt && (
                            <div>
                              <span style={{ fontWeight: 'var(--font-medium)' }}>Last scanned: </span>
                              {new Date(fn.lastScannedAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </Link>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card variant="elevated" padding="none">
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                          <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                            Name
                          </th>
                          <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                            Region
                          </th>
                          <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                            Runtime
                          </th>
                          <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                            Memory
                          </th>
                          <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                            Timeout
                          </th>
                          <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                            Last scanned
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.items.map((f) => (
                          <tr
                            key={f.functionArn}
                            style={{
                              borderBottom: '1px solid var(--border-subtle)',
                              transition: 'background var(--transition-fast)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--surface-hover)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                            }}
                          >
                            <td style={{ padding: 'var(--space-3)' }}>
                              <Link
                                href={`/orgs/${orgId}/functions/${f.id}`}
                                style={{
                                  textDecoration: 'none',
                                  color: 'var(--color-primary)',
                                  fontWeight: 'var(--font-medium)',
                                }}
                              >
                                {f.functionName}
                              </Link>
                            </td>
                            <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>{f.region}</td>
                            <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>{f.runtime || '-'}</td>
                            <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>{f.memoryMb ?? '-'}</td>
                            <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                              {typeof f.timeoutMs === 'number' ? `${Math.round((f.timeoutMs || 0) / 1000)}s` : '-'}
                            </td>
                            <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                              {f.lastScannedAt ? new Date(f.lastScannedAt).toLocaleString() : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* Pagination */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  marginTop: 'var(--space-4)',
                  flexWrap: 'wrap',
                }}
              >
                <Button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} variant="outline" size="sm">
                  Prev
                </Button>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  Page {page} / {totalPages}
                </span>
                <Button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} variant="outline" size="sm">
                  Next
                </Button>
                <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Page size:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                    style={{
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--surface-base)',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-sm)',
                    }}
                  >
                    {[10, 25, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )
        )}
      </div>
    </AppShell>
  );
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const listener = () => setIsMobile(media.matches);
    listener();
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [breakpoint]);
  return isMobile;
}
