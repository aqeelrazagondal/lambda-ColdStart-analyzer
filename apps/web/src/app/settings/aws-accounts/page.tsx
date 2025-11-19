"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../providers/AuthContext';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '../../providers/ToastContext';

interface OrgItem { id: string; name: string; createdAt: string; role: string }
interface AwsAccount { id: string; awsAccountId: string; roleArn: string; externalId: string; defaultRegion?: string; connectedAt?: string }

export default function AwsAccountsPage() {
  const { apiFetch } = useAuth();
  const { success, error: pushError, info } = useToast();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const sp = useSearchParams();
  const router = useRouter();

  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [orgId, setOrgId] = useState<string>(sp.get('orgId') || '');
  const [accounts, setAccounts] = useState<AwsAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const [form, setForm] = useState({ awsAccountId: '', roleArn: '', externalId: '', defaultRegion: 'us-east-1' });
  const canCreate = useMemo(() => form.awsAccountId && form.roleArn && form.externalId && orgId, [form, orgId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${apiBase}/orgs`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || 'Failed to load orgs');
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
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAccounts(targetOrgId: string) {
    setLoading(true); setError(undefined);
    try {
      const res = await apiFetch(`${apiBase}/orgs/${targetOrgId}/aws-accounts`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to load accounts');
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
    <main style={{ padding: 24 }}>
      <h1>AWS Accounts</h1>
      <div style={{ marginBottom: 16 }}>
        <label>
          Organization:&nbsp;
          <select value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name} ({o.role})</option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', color: '#7f1d1d', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Error: {error}</span>
            <button onClick={() => setError(undefined)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>Dismiss</button>
          </div>
        </div>
      )}

      <section style={{ display: 'grid', gap: 12, maxWidth: 640, marginBottom: 24 }}>
        <h2>Create connection</h2>
        <form onSubmit={onCreate} style={{ display: 'grid', gap: 8 }}>
          <label>
            AWS Account ID
            <input value={form.awsAccountId} onChange={(e) => setForm({ ...form, awsAccountId: e.target.value })} placeholder="123456789012" />
            <div style={{ fontSize: 12, color: '#666' }}>Must be a 12-digit AWS account ID</div>
          </label>
          <label>
            Role ARN
            <input value={form.roleArn} onChange={(e) => setForm({ ...form, roleArn: e.target.value })} placeholder="arn:aws:iam::123456789012:role/ReadOnlyRole" />
          </label>
          <label>
            External ID
            <input value={form.externalId} onChange={(e) => setForm({ ...form, externalId: e.target.value })} />
          </label>
          <label>
            Default Region
            <input value={form.defaultRegion} onChange={(e) => setForm({ ...form, defaultRegion: e.target.value })} />
          </label>
          <button type="submit" disabled={!canCreate || loading}>Create</button>
        </form>
      </section>

      <section>
        <h2>Connections</h2>
        {loading && <div>Loading...</div>}
        {error && <div style={{ color: 'crimson' }}>{error}</div>}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>ID</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>AWS Account</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>Default Region</th>
              <th style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>{a.awsAccountId}</td>
                <td>{a.defaultRegion || '-'}</td>
                <td>
                  <button onClick={() => onTest(a.id)} disabled={loading}>Test</button>
                  <button onClick={() => onScan(a.id)} style={{ marginLeft: 8 }} disabled={loading}>Scan</button>
                </td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr><td colSpan={4} style={{ color: '#666' }}>No connections</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
