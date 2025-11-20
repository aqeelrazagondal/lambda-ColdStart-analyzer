"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../providers/AuthContext';
import { AppShell } from '../../../../components/shell/AppShell';
import { Card, Stat, Button, Grid, Badge, Spinner, EmptyState } from '@lca/ui-components';
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
    <AppShell orgId={params.orgId}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
            Function Detail
          </h1>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/orgs/${params.orgId}/functions`)}>
            ← Back to Functions
          </Button>
        </div>

        <nav style={{ display: 'flex', gap: 'var(--space-6)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 'var(--space-2)' }}>
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
                fontWeight: tab === t.id ? 'var(--font-semibold)' : 'var(--font-normal)',
                color: tab === t.id ? 'var(--color-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                transition: 'all var(--transition-fast)',
                borderBottom: tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom: '-2px',
              }}
              onMouseEnter={(e) => {
                if (tab !== t.id) {
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (tab !== t.id) {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'cold-starts' && (
        <>
          <Card variant="outlined" padding="md" style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-secondary)' }}>
                  Range:
                </label>
                <select 
                  value={range} 
                  onChange={(e) => setRange(e.target.value)}
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--surface-base)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  <option value="1d">1d</option>
                  <option value="7d">7d</option>
                  <option value="14d">14d</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-secondary)' }}>
                  Region:
                </label>
                <select
                  value={selectedRegion ?? ''}
                  onChange={(e) => setSelectedRegion(e.target.value || undefined)}
                  disabled={!regionOptions.length}
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--surface-base)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  {regionOptions.length === 0 && <option value="">Default</option>}
                  {regionOptions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginLeft: 'auto' }}>
                <Button variant="outline" size="sm" onClick={load} disabled={loading} isLoading={loading}>
                  Reload
                </Button>
                <Button variant="primary" size="sm" onClick={onRefresh} disabled={refreshing} isLoading={refreshing}>
                  Refresh metrics
                </Button>
                <Button variant="ghost" size="sm" onClick={onCopyQuery}>
                  Copy Query
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadMetrics('csv')} disabled={exporting === 'csv'} isLoading={exporting === 'csv'}>
                  {exporting === 'csv' ? 'Preparing…' : 'CSV'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadMetrics('pdf')} disabled={exporting === 'pdf'} isLoading={exporting === 'pdf'}>
                  {exporting === 'pdf' ? 'Preparing…' : 'PDF'}
                </Button>
              </div>
            </div>
          </Card>

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              <Spinner size="sm" />
              <span>Loading metrics…</span>
            </div>
          )}
          {error && (
            <div style={{ 
              padding: 'var(--space-3)', 
              background: 'var(--color-error-bg)', 
              color: 'var(--color-error)', 
              borderRadius: 'var(--radius-md)', 
              marginBottom: 'var(--space-4)' 
            }}>
              {error}
            </div>
          )}
          {info && (
            <div style={{ 
              padding: 'var(--space-3)', 
              background: 'var(--color-success-bg)', 
              color: 'var(--color-success)', 
              borderRadius: 'var(--radius-md)', 
              marginBottom: 'var(--space-4)' 
            }}>
              {info}
            </div>
          )}

          {!loading && !error && (
            <>
              {!snapshot ? (
                <Card variant="outlined" padding="lg">
                  <EmptyState 
                    icon="📊" 
                    title="No metrics available" 
                    description="No snapshot in this range yet. Try refreshing metrics to collect data." 
                  />
                </Card>
              ) : (
                <Grid columns={{ sm: 2, md: 5 }} gap="md" style={{ marginBottom: 'var(--space-6)' }}>
                  <Card variant="elevated" padding="md">
                    <Stat label="Cold invocations" value={snapshot.coldCount.toLocaleString()} variant="error" />
                  </Card>
                  <Card variant="elevated" padding="md">
                    <Stat label="Warm invocations" value={snapshot.warmCount.toLocaleString()} variant="success" />
                  </Card>
                  <Card variant="elevated" padding="md">
                    <Stat label="P50 Init" value={snapshot.p50InitMs ? `${snapshot.p50InitMs}ms` : '—'} />
                  </Card>
                  <Card variant="elevated" padding="md">
                    <Stat label="P90 Init" value={snapshot.p90InitMs ? `${snapshot.p90InitMs}ms` : '—'} variant="warning" />
                  </Card>
                  <Card variant="elevated" padding="md">
                    <Stat label="P99 Init" value={snapshot.p99InitMs ? `${snapshot.p99InitMs}ms` : '—'} variant="error" />
                  </Card>
                </Grid>
              )}

              {featureCharts && (
                <div style={{ marginBottom: 'var(--space-6)' }}>
                  {bucketLoading ? (
                    <Card variant="outlined" padding="lg">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)' }}>
                        <Spinner size="sm" />
                        <span>Loading chart data…</span>
                      </div>
                    </Card>
                  ) : bucketError ? (
                    <Card variant="outlined" padding="lg">
                      <div style={{ color: 'var(--color-error)' }}>{bucketError}</div>
                    </Card>
                  ) : bucketSeries.length === 0 ? (
                    <Card variant="outlined" padding="lg">
                      <EmptyState icon="📈" title="No chart data" description="No chart data captured yet. Metrics will appear here once data is collected." />
                    </Card>
                  ) : (
                    <Grid columns={{ sm: 1, md: 2 }} gap="lg">
                      <Card variant="elevated" padding="lg">
                        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-4) 0', color: 'var(--text-primary)' }}>
                          P90 Init Time Trend
                        </h3>
                        <div style={{ width: '100%', height: 280 }}>
                          <ResponsiveContainer>
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                              <XAxis 
                                dataKey="label" 
                                stroke="var(--text-secondary)" 
                                fontSize={12}
                                tick={{ fill: 'var(--text-secondary)' }}
                              />
                              <YAxis 
                                stroke="var(--text-secondary)" 
                                fontSize={12}
                                tick={{ fill: 'var(--text-secondary)' }}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: 'var(--surface-base)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: 'var(--radius-md)',
                                  color: 'var(--text-primary)',
                                }}
                                labelFormatter={(_, payload) =>
                                  payload && payload[0] ? payload[0].payload.tooltipLabel : ''
                                }
                                formatter={(value) => [`${value ?? '—'} ms`, 'P90 Init']}
                              />
                              <Line
                                type="monotone"
                                dataKey="avgP90InitMs"
                                stroke="var(--chart-1)"
                                strokeWidth={3}
                                dot={false}
                                isAnimationActive={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                      <Card variant="elevated" padding="lg">
                        <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-4) 0', color: 'var(--text-primary)' }}>
                          Warm vs Cold Invocations
                        </h3>
                        <div style={{ width: '100%', height: 280 }}>
                          <ResponsiveContainer>
                            <AreaChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                              <XAxis 
                                dataKey="label" 
                                stroke="var(--text-secondary)" 
                                fontSize={12}
                                tick={{ fill: 'var(--text-secondary)' }}
                              />
                              <YAxis 
                                allowDecimals={false}
                                stroke="var(--text-secondary)" 
                                fontSize={12}
                                tick={{ fill: 'var(--text-secondary)' }}
                              />
                              <Tooltip
                                contentStyle={{
                                  background: 'var(--surface-base)',
                                  border: '1px solid var(--border-subtle)',
                                  borderRadius: 'var(--radius-md)',
                                  color: 'var(--text-primary)',
                                }}
                                labelFormatter={(_, payload) =>
                                  payload && payload[0] ? payload[0].payload.tooltipLabel : ''
                                }
                              />
                              <Area
                                type="monotone"
                                dataKey="coldCount"
                                stackId="counts"
                                stroke="var(--chart-5)"
                                fill="var(--chart-5)"
                                fillOpacity={0.6}
                                name="Cold"
                                isAnimationActive={false}
                              />
                              <Area
                                type="monotone"
                                dataKey="warmCount"
                                stackId="counts"
                                stroke="var(--chart-3)"
                                fill="var(--chart-3)"
                                fillOpacity={0.6}
                                name="Warm"
                                isAnimationActive={false}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </Card>
                    </Grid>
                  )}
                </div>
              )}
            </>
          )}

          <Card variant="elevated" padding="lg">
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-4) 0', color: 'var(--text-primary)' }}>
              Alerts
            </h3>
            {alertsLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)' }}>
                <Spinner size="sm" />
                <span>Checking alerts…</span>
              </div>
            ) : alertsError ? (
              <div style={{ padding: 'var(--space-3)', background: 'var(--color-error-bg)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)' }}>
                {alertsError}
              </div>
            ) : alerts.length === 0 ? (
              <EmptyState icon="✅" title="No active alerts" description="All systems are running smoothly!" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderLeft: `4px solid ${alert.severity === 'critical' ? 'var(--color-error)' : 'var(--color-warning)'}`,
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--space-4)',
                      background: 'var(--surface-base)',
                      transition: 'all var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-base)';
                      e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-2)' }}>
                      <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>
                        {alert.message}
                      </div>
                      <Badge variant={alert.severity === 'critical' ? 'error' : 'warning'} size="sm">
                        {alert.severity}
                      </Badge>
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-1)' }}>
                      Region: {alert.region} • Metric: {alert.metric} • Status: {alert.status}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      {new Date(alert.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      {tab === 'bundle-audit' && (
        <>
          {bundleLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              <Spinner size="sm" />
              <span>Loading bundle insights…</span>
            </div>
          )}
          {bundleError && (
            <div style={{ 
              padding: 'var(--space-3)', 
              background: 'var(--color-error-bg)', 
              color: 'var(--color-error)', 
              borderRadius: 'var(--radius-md)', 
              marginBottom: 'var(--space-4)' 
            }}>
              {bundleError}
            </div>
          )}
          {bundleInfo && (
            <div style={{ 
              padding: 'var(--space-3)', 
              background: 'var(--color-success-bg)', 
              color: 'var(--color-success)', 
              borderRadius: 'var(--radius-md)', 
              marginBottom: 'var(--space-4)' 
            }}>
              {bundleInfo}
            </div>
          )}

          <Card variant="elevated" padding="lg" style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-2) 0', color: 'var(--text-primary)' }}>
              Upload new bundle
            </h3>
            <p style={{ marginTop: 0, marginBottom: 'var(--space-4)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
              Drop the Lambda deployment ZIP you ship to AWS. We queue it, analyze dependencies, and surface recommendations.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={onFileChange}
                style={{
                  padding: 'var(--space-2)',
                  fontSize: 'var(--text-sm)',
                }}
              />
              <Button 
                variant="primary" 
                size="md" 
                onClick={onUploadBundle} 
                disabled={uploading || !selectedFile} 
                isLoading={uploading}
              >
                {uploading ? 'Uploading…' : selectedFile ? `Upload ${selectedFile.name}` : 'Choose a file first'}
              </Button>
            </div>
            {selectedFile && (
              <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'var(--surface-muted)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                Selected file: <strong>{selectedFile.name}</strong> ({formatBytes(selectedFile.size)})
              </div>
            )}
          </Card>

          <Card variant="elevated" padding="lg" style={{ marginBottom: 'var(--space-6)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-4) 0', color: 'var(--text-primary)' }}>
              Latest insight
            </h3>
            {!bundleLatest ? (
              <EmptyState icon="📦" title="No bundle insights" description="Upload a bundle to see recommendations and analysis." />
            ) : (
              <>
                <Grid columns={{ sm: 1, md: 3 }} gap="md" style={{ marginBottom: 'var(--space-6)' }}>
                  <Card variant="outlined" padding="md">
                    <Stat label="Total size" value={formatBytes(bundleLatest.totalSizeBytes)} />
                  </Card>
                  <Card variant="outlined" padding="md">
                    <Stat 
                      label="Score (0-100)" 
                      value={bundleLatest.score ?? '—'} 
                      variant={bundleLatest.score && bundleLatest.score >= 80 ? 'success' : bundleLatest.score && bundleLatest.score >= 60 ? 'warning' : 'error'}
                    />
                  </Card>
                  <Card variant="outlined" padding="md">
                    <Stat label="Dependencies" value={bundleLatest.dependencyCount?.toLocaleString() ?? '—'} />
                  </Card>
                </Grid>

                <Grid columns={{ sm: 1, md: 2 }} gap="lg">
                  <Card variant="outlined" padding="md">
                    <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-3) 0', color: 'var(--text-primary)' }}>
                      Top dependencies
                    </h4>
                    {(!bundleLatest.topDependencies || bundleLatest.topDependencies.length === 0) ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No dependency data captured</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {(bundleLatest.topDependencies || []).map((dep) => (
                          <div key={dep.name} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: 'var(--space-2)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--surface-muted)',
                          }}>
                            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{dep.name}</span>
                            <Badge variant="default" size="sm">{formatBytes(dep.sizeBytes || 0)}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                  <Card variant="outlined" padding="md">
                    <h4 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-3) 0', color: 'var(--text-primary)' }}>
                      Recommendations
                    </h4>
                    {(!bundleLatest.recommendations || bundleLatest.recommendations.length === 0) ? (
                      <div style={{ 
                        padding: 'var(--space-3)', 
                        background: 'var(--color-success-bg)', 
                        color: 'var(--color-success)', 
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-sm)',
                      }}>
                        Bundle looks healthy 🎉
                      </div>
                    ) : (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {(bundleLatest.recommendations || []).map((rec, idx) => (
                          <li 
                            key={idx}
                            style={{
                              padding: 'var(--space-2)',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--color-warning-bg)',
                              color: 'var(--color-warning)',
                              fontSize: 'var(--text-sm)',
                            }}
                          >
                            {rec}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                </Grid>
              </>
            )}
          </Card>

          <Card variant="elevated" padding="lg">
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-4) 0', color: 'var(--text-primary)' }}>
              Upload history
            </h3>
            {bundleUploads.length === 0 ? (
              <EmptyState icon="📋" title="No uploads yet" description="Upload your first bundle to see it here." />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border-subtle)' }}>
                      <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)' }}>Filename</th>
                      <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)' }}>Size</th>
                      <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)' }}>Status</th>
                      <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)' }}>Uploaded</th>
                      <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)' }}>Processed</th>
                      <th style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-secondary)' }}>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundleUploads.map((upload) => (
                      <tr 
                        key={upload.id} 
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
                        <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{upload.originalFilename}</td>
                        <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{formatBytes(upload.sizeBytes)}</td>
                        <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                          <Badge 
                            variant={upload.status === 'completed' ? 'success' : upload.status === 'failed' ? 'error' : 'default'} 
                            size="sm"
                          >
                            {upload.status}
                          </Badge>
                        </td>
                        <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                          {new Date(upload.createdAt).toLocaleString()}
                        </td>
                        <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                          {upload.processedAt ? new Date(upload.processedAt).toLocaleString() : '—'}
                        </td>
                        <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                          {upload.insight?.score !== null && upload.insight?.score !== undefined ? (
                            <Badge 
                              variant={upload.insight.score >= 80 ? 'success' : upload.insight.score >= 60 ? 'warning' : 'error'} 
                              size="sm"
                            >
                              {upload.insight.score}
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </AppShell>
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
