"use client";
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../providers/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '../../providers/ToastContext';
import { AppShell } from '../../components/shell/AppShell';
import { Card, Button, Spinner } from '@lca/ui-components';
import { Input } from '../../components/forms/Input';
import { Form } from '../../components/forms/Form';

export const dynamic = "force-dynamic";

export default function AwsAccountsPage() {
  return (
    <Suspense fallback={
      <AppShell>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Spinner size="lg" />
        </div>
      </AppShell>
    }>
      <AwsAccountsPageInner />
    </Suspense>
  );
}


interface OrgItem { id: string; name: string; createdAt: string; role: string }
interface AwsAccount { id: string; awsAccountId: string; roleArn: string; externalId: string; defaultRegion?: string; connectedAt?: string }

function AwsAccountsPageInner() {
  const { apiFetch, accessToken, loadingUser } = useAuth();
  const { success, error: pushError, info } = useToast();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const sp = useSearchParams();
  const router = useRouter();

  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [orgId, setOrgId] = useState<string>(sp.get('orgId') || '');
  const [accounts, setAccounts] = useState<AwsAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const [form, setForm] = useState({ awsAccountId: '', roleArn: '', externalId: '', defaultRegion: 'us-east-1' });
  const canCreate = useMemo(() => form.awsAccountId && form.roleArn && form.externalId && orgId, [form, orgId]);

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
        setOrgs(data.orgs || []);
        if (data.orgs?.length && !orgId) {
          const first = data.orgs[0].id;
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

  async function loadAccounts(targetOrgId: string) {
    if (!targetOrgId || !accessToken) return;
    setLoading(true); 
    setError(undefined);
    try {
      const res = await apiFetch(`${apiBase}/orgs/${targetOrgId}/aws-accounts`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        throw new Error(data?.message || 'Failed to load accounts');
      }
      setAccounts(data.accounts || []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (orgId) {
      // reflect orgId in URL
      const q = new URLSearchParams(Array.from(sp.entries()));
      q.set('orgId', orgId);
      router.replace(`?${q.toString()}`);
      loadAccounts(orgId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canCreate) return;
    setLoading(true); setError(undefined);
    try {
      const res = await apiFetch(`${apiBase}/orgs/${orgId}/aws-accounts`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to create');
      setForm({ awsAccountId: '', roleArn: '', externalId: '', defaultRegion: 'us-east-1' });
      await loadAccounts(orgId);
      success('AWS account connection created');
    } catch (e: any) {
      setError(e.message);
      pushError(e.message || 'Failed to create');
    } finally {
      setLoading(false);
    }
  }

  async function onTest(id: string) {
    setLoading(true); setError(undefined);
    try {
      const res = await apiFetch(`${apiBase}/aws-accounts/${id}/test-connection`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || 'Connection failed');
      success(`Connection OK (account ${data.accountId}, region ${data.regionChecked})`);
    } catch (e: any) {
      pushError(`Test failed: ${e.message}`);
    } finally { setLoading(false); }
  }

  async function onScan(id: string) {
    const regions = prompt('Enter regions (comma-separated)', 'us-east-1')?.split(',').map(s => s.trim()).filter(Boolean);
    if (!regions || regions.length === 0) return;
    setLoading(true); setError(undefined);
    try {
      const res = await apiFetch(`${apiBase}/aws-accounts/${id}/scan-lambdas`, {
        method: 'POST',
        body: JSON.stringify({ regions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Scan failed');
      info(`Scanned ${data.scanned} functions in [${data.regions.join(', ')}]`);
    } catch (e: any) {
      pushError(`Scan failed: ${e.message}`);
    } finally { setLoading(false); }
  }

  return (
    <AppShell>
      <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', margin: '0 0 var(--space-2) 0' }}>
            AWS Accounts
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Connect and manage your AWS accounts for Lambda function monitoring
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
              No organizations found. <a href="/" style={{ color: 'var(--color-primary)' }}>Create one</a> to get started.
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

        <Card variant="elevated" padding="lg" style={{ marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-4) 0' }}>
            Create Connection
          </h2>
          <Form onSubmit={onCreate}>
            <Input
              label="AWS Account ID"
              type="text"
              value={form.awsAccountId}
              onChange={(e) => setForm({ ...form, awsAccountId: e.target.value })}
              placeholder="123456789012"
              helperText="Must be a 12-digit AWS account ID"
              leftIcon={<span>🔢</span>}
            />
            <Input
              label="Role ARN"
              type="text"
              value={form.roleArn}
              onChange={(e) => setForm({ ...form, roleArn: e.target.value })}
              placeholder="arn:aws:iam::123456789012:role/ReadOnlyRole"
              leftIcon={<span>🔑</span>}
            />
            <Input
              label="External ID"
              type="text"
              value={form.externalId}
              onChange={(e) => setForm({ ...form, externalId: e.target.value })}
              placeholder="Enter external ID"
              leftIcon={<span>🔐</span>}
            />
            <Input
              label="Default Region"
              type="text"
              value={form.defaultRegion}
              onChange={(e) => setForm({ ...form, defaultRegion: e.target.value })}
              placeholder="us-east-1"
              helperText="Default AWS region for this account"
              leftIcon={<span>🌍</span>}
            />
            <Button type="submit" variant="primary" size="lg" fullWidth disabled={!canCreate || loading} isLoading={loading}>
              Create Connection
            </Button>
          </Form>
        </Card>

        <Card variant="elevated" padding="lg">
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-4) 0' }}>
            Connections
          </h2>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
              <Spinner size="lg" />
            </div>
          ) : accounts.length === 0 ? (
            <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No AWS account connections yet. Create one above to get started.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-muted)', borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                      AWS Account
                    </th>
                    <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                      Default Region
                    </th>
                    <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                      Connected
                    </th>
                    <th style={{ padding: 'var(--space-3)', textAlign: 'left', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr
                      key={a.id}
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
                      <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>{a.awsAccountId}</td>
                      <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>{a.defaultRegion || '-'}</td>
                      <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                        {a.connectedAt ? new Date(a.connectedAt).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: 'var(--space-3)' }}>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                          <Button size="sm" variant="outline" onClick={() => onTest(a.id)} disabled={loading}>
                            Test
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => onScan(a.id)} disabled={loading}>
                            Scan
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
