"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../providers/AuthContext';
import { AppShell } from '../../../components/shell/AppShell';
import { Card, Button, Spinner, EmptyState, Badge } from '@lca/ui-components';
import { Input, Select } from '../../../components/forms';
import { usePagination, useMediaQuery } from '../../../hooks';
import { API_BASE_URL, PAGE_SIZES } from '../../../utils/constants';
import { formatDate } from '../../../utils/format';
import { ErrorMessage } from '../../../components/ErrorMessage';
import { LoadingState } from '../../../components/LoadingState';
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
  const { apiFetch, accessToken, loadingUser } = useAuth();
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;
  const router = useRouter();
  const sp = useSearchParams();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const [region, setRegion] = useState(sp.get('region') || '');
  const [runtime, setRuntime] = useState(sp.get('runtime') || '');
  const [q, setQ] = useState(sp.get('q') || '');
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);

  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const pagination = usePagination({
    initialPage: Number(sp.get('page') || 1),
    initialPageSize: Number(sp.get('pageSize') || 50),
    totalItems: data?.total || 0,
  });

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (region) p.set('region', region);
    if (runtime) p.set('runtime', runtime);
    if (q) p.set('q', q);
    p.set('page', String(pagination.page));
    p.set('pageSize', String(pagination.pageSize));
    return p;
  }, [region, runtime, q, pagination.page, pagination.pageSize]);

  const load = React.useCallback(async () => {
    if (!orgId || loadingUser || !accessToken) return;
    setLoading(true);
    setError(undefined);
    try {
      const url = `${API_BASE_URL}/orgs/${orgId}/functions?${query.toString()}`;
      const res = await apiFetch(url);
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        throw new Error(json?.message || 'Failed to load functions');
      }
      setData(json);
      const uniqueRegions = new Set<string>();
      (json.items || []).forEach((item: any) => {
        if (item.region) uniqueRegions.add(item.region);
      });
      setAvailableRegions((prev) => Array.from(new Set([...prev, ...uniqueRegions])));
      const clientUrl = `/orgs/${orgId}/functions?${query.toString()}`;
      router.replace(clientUrl);
    } catch (e: any) {
      setError(e.message || 'Failed to load functions');
    } finally {
      setLoading(false);
    }
  }, [orgId, query, apiFetch, router, loadingUser, accessToken]);

  useEffect(() => {
    load();
  }, [load]);

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
            <Select
              label="Region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              options={[
                { value: '', label: 'All regions' },
                ...availableRegions.map((opt) => ({ value: opt, label: opt })),
              ]}
            />
            <Input
              label="Runtime"
              placeholder="e.g., nodejs20.x"
              value={runtime}
              onChange={(e) => setRuntime(e.target.value)}
            />
            <Input
              label="Search"
              placeholder="Search function name"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button onClick={load} disabled={loading} variant="primary" size="md" style={{ alignSelf: 'end' }}>
              Filter
            </Button>
          </div>
        </Card>

        {error && <ErrorMessage error={error} variant="card" onRetry={load} style={{ marginBottom: 'var(--space-4)' }} />}

        {loading ? (
          <LoadingState message="Loading functions..." size="lg" />
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
                              {formatDate(fn.lastScannedAt)}
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
                              {f.lastScannedAt ? formatDate(f.lastScannedAt) : '-'}
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
                <Button disabled={!pagination.canGoPrev} onClick={pagination.prevPage} variant="outline" size="sm" aria-label="Previous page">
                  Prev
                </Button>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }} aria-label={`Page ${pagination.page} of ${pagination.totalPages}`}>
                  Page {pagination.page} / {pagination.totalPages}
                </span>
                <Button disabled={!pagination.canGoNext} onClick={pagination.nextPage} variant="outline" size="sm" aria-label="Next page">
                  Next
                </Button>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <label htmlFor="page-size-select" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    Page size:
                  </label>
                  <Select
                    id="page-size-select"
                    value={String(pagination.pageSize)}
                    onChange={(e) => pagination.setPageSize(parseInt(e.target.value, 10))}
                    options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
                    style={{ width: 'auto', minWidth: '80px' }}
                  />
                </div>
              </div>
            </>
          )
        )}
      </div>
    </AppShell>
  );
}

