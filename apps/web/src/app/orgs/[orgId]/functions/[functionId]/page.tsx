"use client";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../providers/AuthContext';

type Snapshot = {
  id: string;
  coldCount: number;
  warmCount: number;
  p50InitMs?: number | null;
  p90InitMs?: number | null;
  p99InitMs?: number | null;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
};

export default function FunctionDetailPage() {
  const { apiFetch } = useAuth();
  const params = useParams<{ orgId: string; functionId: string }>();
  const router = useRouter();
  const sp = useSearchParams();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const [range, setRange] = useState(sp.get('range') || '7d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [info, setInfo] = useState<string | undefined>();
  const featureSpark = (process.env.NEXT_PUBLIC_FEATURE_SPARKLINE || '').toLowerCase() === 'yes';

  const functionId = params?.functionId;

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (range) p.set('range', range);
    return p;
  }, [range]);

  const load = useCallback(async () => {
    if (!functionId) return;
    setLoading(true); setError(undefined); setInfo(undefined);
    try {
      const url = `${apiBase}/functions/${functionId}/metrics?${queryParams.toString()}`;
      const res = await apiFetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load metrics');
      setSnapshot(json?.snapshot || null);
      // reflect range in URL (client)
      const clientUrl = `/orgs/${params.orgId}/functions/${functionId}?${queryParams.toString()}`;
      router.replace(clientUrl);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase, apiFetch, functionId, params.orgId, queryParams, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function onRefresh() {
    if (!functionId) return;
    setRefreshing(true); setError(undefined); setInfo(undefined);
    try {
      const url = `${apiBase}/functions/${functionId}/refresh-metrics?${queryParams.toString()}`;
      const res = await apiFetch(url, { method: 'POST' });
      const retryAfter = res.headers.get('Retry-After');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          const sec = Number(retryAfter || json?.retryAfterSeconds || 0);
          throw new Error(`Rate limited. Try again in ${sec || '?'}s`);
        }
        if (res.status === 502) {
          const rid = json?.requestId ? ` (requestId=${json.requestId})` : '';
          throw new Error(`${json?.message || 'Provider error'}${rid}`);
        }
        throw new Error(json?.message || 'Failed to refresh metrics');
      }
      setInfo('Metrics refreshed');
      // re-load metrics
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRefreshing(false);
    }
  }

  async function onCopyQuery() {
    if (!functionId) return;
    setError(undefined); setInfo(undefined);
    try {
      const url = `${apiBase}/functions/${functionId}/logs-insights-query`;
      const res = await apiFetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to get query');
      const text = json?.query || '';
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setInfo(`Copied query for ${json?.logGroupName ?? 'log group'}`);
      } else {
        setError('Clipboard API not available');
      }
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0 }}>Function Detail</h1>
        <div style={{ marginLeft: 'auto' }}>
          <Link href={`/orgs/${params.orgId}/functions`}>← Back to Functions</Link>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <nav style={{ display: 'flex', gap: 16, borderBottom: '1px solid #eee', paddingBottom: 8 }}>
          <span style={{ color: '#888' }}>Summary</span>
          <strong>Cold Starts</strong>
          <span style={{ color: '#888' }}>Settings</span>
        </nav>
      </div>

      <section style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <label>
          Range
          <select value={range} onChange={(e) => setRange(e.target.value)} style={{ marginLeft: 8 }}>
            <option value="1d">1d</option>
            <option value="7d">7d</option>
            <option value="14d">14d</option>
          </select>
        </label>
        <button onClick={load} disabled={loading} aria-busy={loading}>Reload</button>
        <button onClick={onRefresh} disabled={refreshing} aria-busy={refreshing}>Refresh metrics</button>
        <button onClick={onCopyQuery}>Copy Logs Insights query</button>
      </section>

      {loading && <div style={{ marginTop: 12 }}>Loading metrics…</div>}
      {error && <div style={{ marginTop: 12, color: 'crimson' }}>{error}</div>}
      {info && <div style={{ marginTop: 12, color: 'seagreen' }}>{info}</div>}

      {!loading && !error && (
        <section style={{ marginTop: 16 }}>
          {!snapshot ? (
            <div style={{ color: '#666' }}>No snapshot in this range yet. Try refreshing metrics.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
              <Card title="Cold invocations" value={snapshot.coldCount} />
              <Card title="Warm invocations" value={snapshot.warmCount} />
              <Card title="P50 Init (ms)" value={snapshot.p50InitMs ?? '—'} />
              <Card title="P90 Init (ms)" value={snapshot.p90InitMs ?? '—'} />
              <Card title="P99 Init (ms)" value={snapshot.p99InitMs ?? '—'} />
            </div>
          )}

          {featureSpark && (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ margin: '8px 0' }}>Cold starts (sparkline)</h3>
              {!snapshot ? (
                <div style={{ color: '#666' }}>Waiting for timeseries endpoint…</div>
              ) : (
                <Sparkline
                  width={400}
                  height={60}
                  data={[snapshot.coldCount]} // placeholder until timeseries is available
                />
              )}
              <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
                Note: Sparkline uses a placeholder until a timeseries endpoint is available.
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

function Card({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 12, color: '#666' }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function Sparkline({ data, width, height }: { data: number[]; width: number; height: number }) {
  const max = Math.max(1, ...data);
  const points = data.map((v, i) => {
    const x = (i / Math.max(1, data.length - 1)) * (width - 2) + 1;
    const y = height - 1 - (v / max) * (height - 2);
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} style={{ border: '1px solid #eee', borderRadius: 4 }}>
      <polyline
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        points={points.join(' ')}
      />
    </svg>
  );
}
