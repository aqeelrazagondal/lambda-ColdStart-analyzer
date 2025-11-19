"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../providers/AuthContext';
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
  const router = useRouter();
  const sp = useSearchParams();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const [region, setRegion] = useState(sp.get('region') || '');
  const [runtime, setRuntime] = useState(sp.get('runtime') || '');
  const [q, setQ] = useState(sp.get('q') || '');
  const [page, setPage] = useState<number>(Number(sp.get('page') || 1));
  const [pageSize, setPageSize] = useState<number>(Number(sp.get('pageSize') || 50));

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
    if (!params?.orgId) return;
    setLoading(true); setError(undefined);
    try {
      const url = `${apiBase}/orgs/${params.orgId}/functions?${query.toString()}`;
      const res = await apiFetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load');
      setData(json);
      // reflect query in URL
      const clientUrl = `/orgs/${params.orgId}/functions?${query.toString()}`;
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
  }, [region, runtime, q, page, pageSize, params?.orgId]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <main style={{ padding: 24 }}>
      <h1>Functions</h1>

      <section style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input placeholder="Region (e.g. us-east-1)" value={region} onChange={(e) => setRegion(e.target.value)} />
        <input placeholder="Runtime (e.g. nodejs20.x)" value={runtime} onChange={(e) => setRuntime(e.target.value)} />
        <input placeholder="Search name" value={q} onChange={(e) => setQ(e.target.value)} />
        <button onClick={() => load()} disabled={loading}>Apply</button>
      </section>

      {loading && <div>Loading...</div>}
      {error && <div style={{ color: 'crimson' }}>{error}</div>}

      {data && (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>Name</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>Region</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>Runtime</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>Memory</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>Timeout</th>
                <th style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>Last scanned</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((f) => (
                <tr key={f.functionArn}>
                  <td>
                    <Link href={`/orgs/${params.orgId}/functions/${f.id}`} style={{ textDecoration: 'none' }}>
                      {f.functionName}
                    </Link>
                  </td>
                  <td>{f.region}</td>
                  <td>{f.runtime || '-'}</td>
                  <td>{f.memoryMb ?? '-'}</td>
                  <td>{typeof f.timeoutMs === 'number' ? `${Math.round((f.timeoutMs || 0) / 1000)}s` : '-'}</td>
                  <td>{f.lastScannedAt ? new Date(f.lastScannedAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
              {data.items.length === 0 && (
                <tr><td colSpan={6} style={{ color: '#666' }}>No functions found</td></tr>
              )}
            </tbody>
          </table>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
            <span>Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            <label style={{ marginLeft: 'auto' }}>
              Page size
              <select value={pageSize} onChange={(e) => setPageSize(parseInt(e.target.value, 10))}>
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </label>
          </div>
        </>
      )}
    </main>
  );
}
