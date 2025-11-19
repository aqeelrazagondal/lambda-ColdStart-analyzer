"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../providers/AuthContext';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

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

type BundleDependency = {
  name: string;
  sizeBytes?: number;
};

type BundleInsightSummary = {
  id: string;
  totalSizeBytes: number;
  uncompressedBytes?: number | null;
  fileCount?: number | null;
  dependencyCount?: number | null;
  score?: number | null;
  topDependencies?: BundleDependency[];
  sizeBreakdown?: Record<string, number>;
  recommendations?: string[];
  createdAt: string;
};

type BundleUploadSummary = {
  id: string;
  status: string;
  originalFilename: string;
  sizeBytes: number;
  createdAt: string;
  processedAt?: string | null;
  insight?: BundleInsightSummary | null;
};

type RegionSnapshot = {
  periodStart: string;
  periodEnd: string;
  p90InitMs?: number | null;
  coldCount: number;
  warmCount: number;
};

type FunctionAlert = {
  id: string;
  region: string;
  metric: string;
  severity: string;
  message: string;
  status: string;
  createdAt: string;
};

type MetricsBucketPoint = {
  start: string;
  end: string;
  avgP90InitMs: number | null;
  coldCount: number;
  warmCount: number;
};

type Tab = 'cold-starts' | 'bundle-audit';

export default function FunctionDetailPage() {
  const { apiFetch } = useAuth();
  const params = useParams<{ orgId: string; functionId: string }>();
  const router = useRouter();
  const sp = useSearchParams();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const initialTab = (sp.get('tab') as Tab) === 'bundle-audit' ? 'bundle-audit' : 'cold-starts';
  const [tab, setTab] = useState<Tab>(initialTab);
  const [range, setRange] = useState(sp.get('range') || '7d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [info, setInfo] = useState<string | undefined>();
  const [bundleUploads, setBundleUploads] = useState<BundleUploadSummary[]>([]);
  const [bundleLatest, setBundleLatest] = useState<BundleInsightSummary | null>(null);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [bundleError, setBundleError] = useState<string | undefined>();
  const [bundleInfo, setBundleInfo] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [regionOptions, setRegionOptions] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | undefined>(undefined);
  const [trendSnapshots, setTrendSnapshots] = useState<RegionSnapshot[]>([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState<string | undefined>();
  const [alerts, setAlerts] = useState<FunctionAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | undefined>();
  const [bucketSeries, setBucketSeries] = useState<MetricsBucketPoint[]>([]);
  const [bucketLoading, setBucketLoading] = useState(false);
  const [bucketError, setBucketError] = useState<string | undefined>();
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const featureCharts = (process.env.NEXT_PUBLIC_FEATURE_SPARKLINE || '').toLowerCase() === 'yes';
  const chartData = useMemo(
    () =>
      bucketSeries.map((bucket) => ({
        ...bucket,
        label: formatBucketLabel(bucket.start),
        tooltipLabel: formatBucketTooltip(bucket.start, bucket.end),
      })),
    [bucketSeries]
  );

  const functionId = params?.functionId;

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (range) p.set('range', range);
    return p;
  }, [range]);

  useEffect(() => {
    if (!functionId) return;
    (async () => {
      try {
        const res = await apiFetch(`${apiBase}/functions/${functionId}/regions`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || 'Failed to load regions');
        const options = Array.isArray(json?.regions) ? json.regions : [];
        setRegionOptions(options);
        setSelectedRegion((prev) => prev ?? options[0]);
      } catch (err) {
        console.warn('Failed to load regions', err);
      }
    })();
  }, [apiBase, apiFetch, functionId]);

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
      (router as any).replace(clientUrl);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiBase, apiFetch, functionId, params.orgId, queryParams, router]);

  useEffect(() => {
    if (tab === 'cold-starts') {
      load();
    }
  }, [load, tab]);

  useEffect(() => {
    if (tab !== 'cold-starts' || !selectedRegion) return;
    loadRegionSnapshots(selectedRegion);
    loadBucketSeries(selectedRegion);
  }, [tab, selectedRegion, range]);

  useEffect(() => {
    if (tab !== 'cold-starts' || !functionId) return;
    loadAlerts();
  }, [tab, functionId]);

  const loadBundleData = useCallback(async () => {
    if (!functionId || !params.orgId) return;
    setBundleLoading(true);
    setBundleError(undefined);
    setBundleInfo(undefined);
    try {
      const [uploadsRes, latestRes] = await Promise.all([
        apiFetch(`${apiBase}/orgs/${params.orgId}/functions/${functionId}/bundles?limit=10`),
        apiFetch(`${apiBase}/orgs/${params.orgId}/functions/${functionId}/bundles/latest`),
      ]);
      const uploadsJson = await uploadsRes.json();
      if (!uploadsRes.ok) throw new Error(uploadsJson?.message || 'Failed to load bundle uploads');
      const latestJson = await latestRes.json();
      if (!latestRes.ok) throw new Error(latestJson?.message || 'Failed to load latest insight');
      setBundleUploads(Array.isArray(uploadsJson?.items) ? uploadsJson.items : []);
      setBundleLatest(latestJson?.insight ?? null);
    } catch (e: any) {
      setBundleError(e.message);
    } finally {
      setBundleLoading(false);
    }
  }, [apiBase, apiFetch, functionId, params.orgId]);

  useEffect(() => {
    if (tab === 'bundle-audit') {
      loadBundleData();
    }
  }, [loadBundleData, tab]);

  async function loadAlerts() {
    if (!functionId) return;
    setAlertsLoading(true);
    setAlertsError(undefined);
    try {
      const res = await apiFetch(`${apiBase}/functions/${functionId}/alerts`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load alerts');
      setAlerts(Array.isArray(json?.alerts) ? json.alerts : []);
    } catch (err: any) {
      setAlertsError(err.message);
    } finally {
      setAlertsLoading(false);
    }
  }

  async function loadRegionSnapshots(region: string) {
    if (!functionId) return;
    setTrendLoading(true);
    setTrendError(undefined);
    try {
      const params = new URLSearchParams();
      if (range) params.set('range', range);
      if (region) params.set('region', region);
      const querySuffix = params.toString();
      const url = `${apiBase}/functions/${functionId}/metrics/regions${querySuffix ? `?${querySuffix}` : ''}`;
      const res = await apiFetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load region metrics');
      setTrendSnapshots(Array.isArray(json?.snapshots) ? json.snapshots : []);
    } catch (err: any) {
      setTrendError(err.message);
    } finally {
      setTrendLoading(false);
    }
  }

  async function loadBucketSeries(region?: string) {
    if (!functionId) return;
    setBucketLoading(true);
    setBucketError(undefined);
    try {
      const params = new URLSearchParams();
      if (range) params.set('range', range);
      if (region) params.set('region', region);
      params.set('buckets', '24');
      const querySuffix = params.toString();
      const url = `${apiBase}/functions/${functionId}/metrics/buckets${querySuffix ? `?${querySuffix}` : ''}`;
      const res = await apiFetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to load chart data');
      setBucketSeries(Array.isArray(json?.buckets) ? json.buckets : []);
    } catch (err: any) {
      setBucketError(err.message);
    } finally {
      setBucketLoading(false);
    }
  }

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
      if (selectedRegion) {
        await loadRegionSnapshots(selectedRegion);
        await loadBucketSeries(selectedRegion);
      } else {
        await loadBucketSeries();
      }
      await loadAlerts();
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

  async function downloadMetrics(format: 'csv' | 'pdf') {
    if (!functionId) return;
    setExporting(format);
    try {
      const params = new URLSearchParams();
      if (range) params.set('range', range);
      if (selectedRegion) params.set('region', selectedRegion);
      const suffix = params.toString();
      const url = `${apiBase}/functions/${functionId}/metrics/export.${format}${suffix ? `?${suffix}` : ''}`;
      const res = await apiFetch(url);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.message || 'Export failed');
      }
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `function-${functionId}-metrics.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setExporting(null);
    }
  }

  function onSelectTab(next: Tab) {
    setTab(next);
    const query = new URLSearchParams(sp);
    query.set('tab', next);
    if (next === 'bundle-audit') {
      query.delete('range');
    } else if (range) {
      query.set('range', range);
    }
    router.replace(`/orgs/${params.orgId}/functions/${functionId}?${query.toString()}`);
  }

  async function onUploadBundle() {
    if (!selectedFile || !functionId || !params.orgId) {
      setBundleError('Choose a .zip file before uploading');
      return;
    }
    setUploading(true);
    setBundleError(undefined);
    setBundleInfo(undefined);
    try {
      const form = new FormData();
      form.append('file', selectedFile);
      const res = await apiFetch(`${apiBase}/orgs/${params.orgId}/functions/${functionId}/bundles`, {
        method: 'POST',
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Upload failed');
      setBundleInfo('Bundle uploaded and queued for analysis');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadBundleData();
    } catch (e: any) {
      setBundleError(e.message);
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setBundleError(undefined);
    setBundleInfo(undefined);
    const files = e.target.files;
    if (files && files[0]) {
      setSelectedFile(files[0]);
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
        <nav style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border-color)', paddingBottom: 8 }}>
          {[
            { id: 'cold-starts', label: 'Cold Starts' },
            { id: 'bundle-audit', label: 'Bundle Audit' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => onSelectTab(t.id as Tab)}
              style={{
                border: 'none',
                background: 'transparent',
                fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? 'var(--text-strong)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'cold-starts' && (
        <>
          <section style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <label>
              Range
              <select value={range} onChange={(e) => setRange(e.target.value)} style={{ marginLeft: 8 }}>
                <option value="1d">1d</option>
                <option value="7d">7d</option>
                <option value="14d">14d</option>
              </select>
            </label>
            <label>
              Region
              <select
                value={selectedRegion ?? ''}
                onChange={(e) => setSelectedRegion(e.target.value || undefined)}
                style={{ marginLeft: 8 }}
                disabled={!regionOptions.length}
              >
                {regionOptions.length === 0 && <option value="">Default</option>}
                {regionOptions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={load} disabled={loading} aria-busy={loading}>
              Reload
            </button>
            <button onClick={onRefresh} disabled={refreshing} aria-busy={refreshing}>
              Refresh metrics
            </button>
            <button onClick={onCopyQuery}>Copy Logs Insights query</button>
            <button onClick={() => downloadMetrics('csv')} disabled={exporting === 'csv'}>
              {exporting === 'csv' ? 'Preparing CSV…' : 'Download CSV'}
            </button>
            <button onClick={() => downloadMetrics('pdf')} disabled={exporting === 'pdf'}>
              {exporting === 'pdf' ? 'Preparing PDF…' : 'Download PDF'}
            </button>
          </section>

          {loading && <div style={{ marginTop: 12 }}>Loading metrics…</div>}
          {error && <div style={{ marginTop: 12, color: 'crimson' }}>{error}</div>}
          {info && <div style={{ marginTop: 12, color: 'seagreen' }}>{info}</div>}

          {!loading && !error && (
            <section style={{ marginTop: 16 }}>
              {!snapshot ? (
                <div style={{ color: 'var(--text-muted)' }}>No snapshot in this range yet. Try refreshing metrics.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
                  <Card title="Cold invocations" value={snapshot.coldCount} />
                  <Card title="Warm invocations" value={snapshot.warmCount} />
                  <Card title="P50 Init (ms)" value={snapshot.p50InitMs ?? '—'} />
                  <Card title="P90 Init (ms)" value={snapshot.p90InitMs ?? '—'} />
                  <Card title="P99 Init (ms)" value={snapshot.p99InitMs ?? '—'} />
                </div>
              )}

              {featureCharts && (
                <section style={{ marginTop: 20 }}>
                  <h3 style={{ margin: '8px 0' }}>Trends & Distribution</h3>
                  {bucketLoading ? (
                    <div style={{ color: 'var(--text-muted)' }}>Loading chart data…</div>
                  ) : bucketError ? (
                    <div style={{ color: 'crimson' }}>{bucketError}</div>
                  ) : bucketSeries.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)' }}>No chart data captured yet.</div>
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: 16,
                      }}
                    >
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 16 }}>
                        <h4 style={{ marginTop: 0 }}>P90 init (ms)</h4>
                        <div style={{ width: '100%', height: 240 }}>
                          <ResponsiveContainer>
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="label" />
                              <YAxis />
                              <Tooltip
                                labelFormatter={(_, payload) =>
                                  payload && payload[0] ? payload[0].payload.tooltipLabel : ''
                                }
                                formatter={(value) => [`${value ?? '—'}`, 'P90 init (ms)']}
                              />
                              <Line
                                type="monotone"
                                dataKey="avgP90InitMs"
                                stroke="#2563eb"
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 16 }}>
                        <h4 style={{ marginTop: 0 }}>Warm vs cold invocations</h4>
                        <div style={{ width: '100%', height: 240 }}>
                          <ResponsiveContainer>
                            <AreaChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="label" />
                              <YAxis allowDecimals={false} />
                              <Tooltip
                                labelFormatter={(_, payload) =>
                                  payload && payload[0] ? payload[0].payload.tooltipLabel : ''
                                }
                              />
                              <Area
                                type="monotone"
                                dataKey="coldCount"
                                stackId="counts"
                                stroke="#dc2626"
                                fill="#fecaca"
                                name="Cold"
                                isAnimationActive={false}
                              />
                              <Area
                                type="monotone"
                                dataKey="warmCount"
                                stackId="counts"
                                stroke="#16a34a"
                                fill="#bbf7d0"
                                name="Warm"
                                isAnimationActive={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </section>
          )}

          <section style={{ marginTop: 24 }}>
            <h3>Alerts</h3>
            {alertsLoading ? (
              <div>Checking alerts…</div>
            ) : alertsError ? (
              <div style={{ color: 'crimson' }}>{alertsError}</div>
            ) : alerts.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>No active alerts 🎉</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {alerts.map((alert) => (
                  <li
                    key={alert.id}
                    style={{
                      border: '1px solid var(--border-color)',
                      borderLeft: `4px solid ${alert.severity === 'critical' ? '#b91c1c' : '#f97316'}`,
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>{alert.message}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-subtle)' }}>Region: {alert.region} • Metric: {alert.metric} • Status: {alert.status}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(alert.createdAt).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {tab === 'bundle-audit' && (
        <>
          {bundleLoading && <div style={{ marginTop: 12 }}>Loading bundle insights…</div>}
          {bundleError && <div style={{ marginTop: 12, color: 'crimson' }}>{bundleError}</div>}
          {bundleInfo && <div style={{ marginTop: 12, color: 'seagreen' }}>{bundleInfo}</div>}

          <section style={{ marginTop: 16, border: '1px solid var(--border-color)', borderRadius: 8, padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>Upload new bundle</h3>
            <p style={{ marginTop: 4, color: 'var(--text-subtle)' }}>
              Drop the Lambda deployment ZIP you ship to AWS. We queue it, analyze dependencies, and surface
              recommendations.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={onFileChange}
              />
              <button onClick={onUploadBundle} disabled={uploading || !selectedFile} aria-busy={uploading}>
                {uploading ? 'Uploading…' : selectedFile ? `Upload ${selectedFile.name}` : 'Choose a file first'}
              </button>
            </div>
            {selectedFile && (
              <div style={{ marginTop: 8, color: 'var(--text-muted)' }}>
                Selected file: {selectedFile.name} ({formatBytes(selectedFile.size)})
              </div>
            )}
          </section>

          <section style={{ marginTop: 24 }}>
            <h3 style={{ marginTop: 0 }}>Latest insight</h3>
            {!bundleLatest ? (
              <div style={{ color: 'var(--text-muted)' }}>Upload a bundle to see recommendations.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                <Card title="Total size" value={formatBytes(bundleLatest.totalSizeBytes)} />
                <Card title="Score (0-100)" value={bundleLatest.score ?? '—'} />
                <Card title="Dependencies" value={bundleLatest.dependencyCount ?? '—'} />
              </div>
            )}

            {bundleLatest && (
              <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 16 }}>
                  <h4 style={{ marginTop: 0 }}>Top dependencies</h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {(bundleLatest.topDependencies || []).map((dep) => (
                      <li key={dep.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                        <span>{dep.name}</span>
                        <span style={{ color: 'var(--text-subtle)' }}>{formatBytes(dep.sizeBytes || 0)}</span>
                      </li>
                    ))}
                    {(!bundleLatest.topDependencies || bundleLatest.topDependencies.length === 0) && (
                      <li style={{ color: 'var(--text-muted)' }}>No dependency data captured</li>
                    )}
                  </ul>
                </div>
                <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 16 }}>
                  <h4 style={{ marginTop: 0 }}>Recommendations</h4>
                  <ul>
                    {(bundleLatest.recommendations || []).map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                    {(!bundleLatest.recommendations || bundleLatest.recommendations.length === 0) && (
                      <li>Bundle looks healthy 🎉</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </section>

          <section style={{ marginTop: 32 }}>
            <h3 style={{ marginTop: 0 }}>Upload history</h3>
            {bundleUploads.length === 0 ? (
              <div style={{ color: 'var(--text-muted)' }}>No uploads yet.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '8px 4px' }}>Filename</th>
                      <th style={{ padding: '8px 4px' }}>Size</th>
                      <th style={{ padding: '8px 4px' }}>Status</th>
                      <th style={{ padding: '8px 4px' }}>Uploaded</th>
                      <th style={{ padding: '8px 4px' }}>Processed</th>
                      <th style={{ padding: '8px 4px' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundleUploads.map((upload) => (
                      <tr key={upload.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '8px 4px' }}>{upload.originalFilename}</td>
                        <td style={{ padding: '8px 4px' }}>{formatBytes(upload.sizeBytes)}</td>
                        <td style={{ padding: '8px 4px', textTransform: 'capitalize' }}>{upload.status}</td>
                        <td style={{ padding: '8px 4px' }}>
                          {new Date(upload.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 4px' }}>
                          {upload.processedAt ? new Date(upload.processedAt).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: '8px 4px' }}>
                          {upload.insight?.score ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

function Card({ title, value }: { title: string; value: React.ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{title}</div>
      <div style={{ fontSize: 20, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

function formatBytes(bytes?: number | null) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatBucketLabel(startIso: string) {
  const date = new Date(startIso);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatBucketTooltip(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${start.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })} – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return `${start.toLocaleString()} → ${end.toLocaleString()}`;
}
