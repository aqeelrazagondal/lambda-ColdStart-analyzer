"use client";
import React, { Suspense, useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../providers/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '../../providers/ToastContext';
import { AppShell } from '../../components/shell/AppShell';
import { Card, Button, Spinner } from '@lca/ui-components';
import { Input } from '../../components/forms/Input';
import { Form } from '../../components/forms/Form';

export const dynamic = "force-dynamic";

interface AuditLog {
  id: string;
  userId?: string;
  orgId?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestMethod?: string;
  requestPath?: string;
  responseStatus?: number;
  createdAt: string;
}

interface RetentionPolicy {
  orgId: string;
  retentionDays: number;
}

export default function AuditLogsPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Spinner size="lg" />
        </div>
      </AppShell>
    }>
      <AuditLogsPageInner />
    </Suspense>
  );
}

interface OrgItem { id: string; name: string; createdAt: string; role: string }

function AuditLogsPageInner() {
  const { apiFetch, accessToken, loadingUser } = useAuth();
  const { success, error: pushError } = useToast();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const sp = useSearchParams();
  const router = useRouter();

  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [orgId, setOrgId] = useState<string>(sp.get('orgId') || '');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [retentionPolicy, setRetentionPolicy] = useState<RetentionPolicy | null>(null);
  const [retentionDays, setRetentionDays] = useState(90);
  const [updatingRetention, setUpdatingRetention] = useState(false);

  const [filters, setFilters] = useState({
    userId: '',
    action: '',
    resourceType: '',
    startDate: '',
    endDate: '',
    limit: 100,
    offset: 0,
  });

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
      loadRetentionPolicy();
    }
  }, [orgId]);

  async function loadRetentionPolicy() {
    if (!orgId || !accessToken) return;
    try {
      const res = await apiFetch(`${apiBase}/audit/retention-policy/${orgId}`);
      const data = await res.json();
      if (res.ok) {
        setRetentionPolicy(data);
        setRetentionDays(data.retentionDays || 90);
      }
    } catch (e: any) {
      console.error('Failed to load retention policy:', e);
    }
  }

  async function loadLogs(targetOrgId: string) {
    if (!targetOrgId || !accessToken) return;
    setLoading(true); 
    setError(undefined);
    try {
      const params = new URLSearchParams();
      if (filters.userId) params.set('userId', filters.userId);
      if (filters.action) params.set('action', filters.action);
      if (filters.resourceType) params.set('resourceType', filters.resourceType);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      params.set('limit', String(filters.limit));
      params.set('offset', String(filters.offset));

      const res = await apiFetch(`${apiBase}/audit/logs/${targetOrgId}?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        throw new Error(data?.message || 'Failed to load audit logs');
      }
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orgId) {
      const q = new URLSearchParams(Array.from(sp.entries()));
      q.set('orgId', orgId);
      router.replace(`?${q.toString()}`);
      loadLogs(orgId);
    }
  }, [orgId, filters]);

  async function onUpdateRetention(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setUpdatingRetention(true);
    setError(undefined);
    try {
      const res = await apiFetch(`${apiBase}/audit/retention-policy/${orgId}`, {
        method: 'POST',
        body: JSON.stringify({ retentionDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to update retention policy');
      await loadRetentionPolicy();
      success('Retention policy updated successfully');
    } catch (e: any) {
      setError(e.message);
      pushError(e.message || 'Failed to update retention policy');
    } finally {
      setUpdatingRetention(false);
    }
  }

  async function onCleanup() {
    if (!orgId || !confirm('Are you sure you want to delete old audit logs? This action cannot be undone.')) return;
    setLoading(true);
    setError(undefined);
    try {
      const res = await apiFetch(`${apiBase}/audit/cleanup`, {
        method: 'POST',
        body: JSON.stringify({ orgId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Cleanup failed');
      success(`Deleted ${data.deleted} audit log entries`);
      await loadLogs(orgId);
    } catch (e: any) {
      setError(e.message);
      pushError(e.message || 'Cleanup failed');
    } finally {
      setLoading(false);
    }
  }

  function exportLogs(format: 'csv' | 'json') {
    if (logs.length === 0) {
      pushError('No logs to export');
      return;
    }

    if (format === 'csv') {
      const headers = ['ID', 'Action', 'User ID', 'Resource Type', 'Resource ID', 'IP Address', 'Method', 'Path', 'Status', 'Created At'];
      const rows = logs.map(log => [
        log.id,
        log.action,
        log.userId || '',
        log.resourceType || '',
        log.resourceId || '',
        log.ipAddress || '',
        log.requestMethod || '',
        log.requestPath || '',
        log.responseStatus || '',
        new Date(log.createdAt).toISOString(),
      ]);
      const csv = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  const canLoad = useMemo(() => orgId && ['admin', 'owner'].includes(orgs.find(o => o.id === orgId)?.role || ''), [orgId, orgs]);

  return (
    <AppShell>
      <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', margin: '0 0 var(--space-2) 0' }}>
            Audit Logs
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Query and review audit logs for your organization
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
            <Card variant="elevated" padding="lg" style={{ marginBottom: 'var(--space-6)' }}>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-4) 0' }}>
                Filters
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                <Input
                  label="User ID"
                  type="text"
                  value={filters.userId}
                  onChange={(e) => setFilters({ ...filters, userId: e.target.value, offset: 0 })}
                  placeholder="Filter by user ID"
                />
                <Input
                  label="Action"
                  type="text"
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value, offset: 0 })}
                  placeholder="e.g., user.login"
                />
                <Input
                  label="Resource Type"
                  type="text"
                  value={filters.resourceType}
                  onChange={(e) => setFilters({ ...filters, resourceType: e.target.value, offset: 0 })}
                  placeholder="e.g., organization"
                />
                <Input
                  label="Start Date"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value, offset: 0 })}
                />
                <Input
                  label="End Date"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value, offset: 0 })}
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                <Button variant="outline" onClick={() => exportLogs('csv')} disabled={logs.length === 0}>
                  Export CSV
                </Button>
                <Button variant="outline" onClick={() => exportLogs('json')} disabled={logs.length === 0}>
                  Export JSON
                </Button>
              </div>
            </Card>

            <Card variant="elevated" padding="lg" style={{ marginBottom: 'var(--space-6)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: 0 }}>
                  Audit Logs ({total} total)
                </h2>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset - filters.limit) })}
                    disabled={filters.offset === 0 || loading}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
                    disabled={filters.offset + filters.limit >= total || loading}
                  >
                    Next
                  </Button>
                </div>
              </div>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
                  <Spinner size="lg" />
                </div>
              ) : logs.length === 0 ? (
                <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No audit logs found.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                        <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>Action</th>
                        <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>User</th>
                        <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>Resource</th>
                        <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>IP</th>
                        <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>Status</th>
                        <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>Date</th>
                        <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => (
                        <tr
                          key={log.id}
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
                          <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>{log.action}</td>
                          <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>{log.userId || '-'}</td>
                          <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                            {log.resourceType ? `${log.resourceType}${log.resourceId ? `:${log.resourceId.substring(0, 8)}` : ''}` : '-'}
                          </td>
                          <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>{log.ipAddress || '-'}</td>
                          <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                            {log.responseStatus ? (
                              <span style={{ color: log.responseStatus >= 400 ? 'var(--color-error)' : log.responseStatus >= 300 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                                {log.responseStatus}
                              </span>
                            ) : '-'}
                          </td>
                          <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td style={{ padding: 'var(--space-3)' }}>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedLog(log)}>
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card variant="elevated" padding="lg">
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-4) 0' }}>
                Retention Policy
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', margin: '0 0 var(--space-4) 0' }}>
                Configure how long audit logs are retained. Logs older than the retention period will be automatically deleted.
              </p>
              <Form onSubmit={onUpdateRetention}>
                <Input
                  label="Retention Period (days)"
                  type="number"
                  value={retentionDays}
                  onChange={(e) => setRetentionDays(parseInt(e.target.value, 10) || 90)}
                  min={1}
                  max={3650}
                  helperText={`Current policy: ${retentionPolicy?.retentionDays || 90} days`}
                />
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                  <Button type="submit" variant="primary" disabled={updatingRetention} isLoading={updatingRetention}>
                    Update Policy
                  </Button>
                  <Button type="button" variant="outline" onClick={onCleanup} disabled={loading}>
                    Cleanup Now
                  </Button>
                </div>
              </Form>
            </Card>
          </>
        )}

        {selectedLog && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={() => setSelectedLog(null)}
          >
            <Card
              variant="elevated"
              padding="lg"
              style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: 0 }}>Log Details</h3>
                <Button size="sm" variant="ghost" onClick={() => setSelectedLog(null)}>Close</Button>
              </div>
              <pre style={{ background: 'var(--surface-muted)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', overflow: 'auto', fontSize: 'var(--text-sm)' }}>
                {JSON.stringify(selectedLog, null, 2)}
              </pre>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}

