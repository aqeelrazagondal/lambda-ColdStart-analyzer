"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '../../../components/shell/AppShell';
import { useOrgData } from '../../../providers/OrgDataContext';
import { useAuth } from '../../../providers/AuthContext';
import { Card, Stat, Button, Grid, Badge, Sparkline, Spinner, EmptyState } from '@lca/ui-components';
import { OnboardingChecklist } from '../../../components/OnboardingChecklist';
import { DashboardsEmptyState } from '../../../components/empty-states/DashboardsEmptyState';
import { InfoTooltip } from '../../../components/Tooltip';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const bytesToMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

type DashboardLayout = {
  id: string;
  name: string;
  description?: string | null;
  config: DashboardConfig;
  createdAt: string;
};

type DashboardCard = {
  title: string;
  metric: string;
  functionId?: string;
};

type DashboardConfig = {
  cards: DashboardCard[];
};

type NotificationChannel = {
  id: string;
  type: string;
  target: string;
  description?: string | null;
  enabled: boolean;
};

const metricOptions = [
  { id: 'p90', label: 'P90 init (ms)' },
  { id: 'cold_ratio', label: 'Cold start ratio' },
  { id: 'bundle_score', label: 'Bundle score' },
];

const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export default function DashboardPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;
  const { overview, loadingOverview, refreshOverview, demoMode, setDemoMode } = useOrgData();
  const { apiFetch, accessToken, loadingUser } = useAuth();
  const [activityFilter, setActivityFilter] = useState<'all' | 'bundle' | 'alert' | 'notification'>('all');
  const [dashboards, setDashboards] = useState<DashboardLayout[]>([]);
  const [dashboardsLoading, setDashboardsLoading] = useState(false);
  const [dashError, setDashError] = useState<string | undefined>();
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [channelError, setChannelError] = useState<string | undefined>();
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelType, setChannelType] = useState<'slack' | 'email'>('slack');
  const [channelTarget, setChannelTarget] = useState('');
  const [channelDescription, setChannelDescription] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [cardTitle, setCardTitle] = useState('');
  const [cardMetric, setCardMetric] = useState(metricOptions[0].id);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (!orgId || !accessToken || loadingUser) return;
    loadDashboards();
    loadChannels();
  }, [orgId, accessToken, loadingUser]);

  const filteredActivity = useMemo(() => {
    if (!overview) return [];
    if (activityFilter === 'all') return overview.activity;
    return overview.activity.filter((event) => event.type.includes(activityFilter));
  }, [overview, activityFilter]);

  const checklist = overview?.checklist ?? [];
  const topFunctions = overview?.topFunctions ?? [];
  const totals = overview?.totals ?? { functions: 0, bundles: 0, alertsOpen: 0, awsAccounts: 0, dashboards: 0, notifications: 0 };
  const health = overview?.health ?? { avgP90: null, coldRatio: null };

  async function loadDashboards() {
    if (!orgId || !accessToken) return;
    setDashboardsLoading(true);
    setDashError(undefined);
    try {
      const res = await apiFetch(`${apiBase}/orgs/${orgId}/dashboards`);
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        throw new Error(json?.message || 'Failed to load dashboards');
      }
      setDashboards((json || []).map((item: any) => ({ ...item, config: normalizeConfig(item.config) })));
    } catch (err: any) {
      setDashError(err.message);
      console.error('Failed to load dashboards:', err);
    } finally {
      setDashboardsLoading(false);
    }
  }

  async function loadChannels() {
    if (!orgId || !accessToken) return;
    setChannelLoading(true);
    setChannelError(undefined);
    try {
      const res = await apiFetch(`${apiBase}/orgs/${orgId}/notifications`);
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        }
        throw new Error(json?.message || 'Failed to load channels');
      }
      setChannels(json || []);
    } catch (err: any) {
      setChannelError(err.message);
      console.error('Failed to load channels:', err);
    } finally {
      setChannelLoading(false);
    }
  }

  async function handleRefreshMetrics() {
    if (!orgId) return;
    setRefreshing(true);
    try {
      // Trigger refresh for all functions (simplified - in real app would iterate through functions)
      await refreshOverview();
    } catch (err: any) {
      console.error('Failed to refresh metrics', err);
    } finally {
      setRefreshing(false);
    }
  }

  function normalizeConfig(raw: any): DashboardConfig {
    if (raw && raw.cards) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.cards) return parsed as DashboardConfig;
      } catch {}
    }
    return { cards: [] };
  }

  function addCard() {
    if (!cardTitle.trim()) return;
    setCards((prev) => [...prev, { title: cardTitle.trim(), metric: cardMetric }]);
    setCardTitle('');
  }

  function removeCard(index: number) {
    setCards((prev) => prev.filter((_, idx) => idx !== index));
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !name.trim()) return;
    setSaving(true);
    setDashError(undefined);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        config: JSON.stringify({ cards }),
      };
      const res = await apiFetch(`${apiBase}/orgs/${orgId}/dashboards`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to save dashboard');
      setName('');
      setDescription('');
      setCards([]);
      await loadDashboards();
    } catch (err: any) {
      setDashError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!orgId) return;
    if (!confirm('Delete this dashboard?')) return;
    try {
      const res = await apiFetch(`${apiBase}/orgs/${orgId}/dashboards/${id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to delete dashboard');
      setDashboards((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      setDashError(err.message);
    }
  }

  async function onCreateChannel(e: React.FormEvent) {
    e.preventDefault();
    if (!orgId || !channelTarget.trim()) return;
    setChannelError(undefined);
    try {
      const res = await apiFetch(`${apiBase}/orgs/${orgId}/notifications`, {
        method: 'POST',
        body: JSON.stringify({
          type: channelType,
          target: channelTarget.trim(),
          description: channelDescription.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || 'Failed to create channel');
      setChannelTarget('');
      setChannelDescription('');
      setChannels((prev) => [json, ...prev]);
    } catch (err: any) {
      setChannelError(err.message);
    }
  }

  async function onDeleteChannel(id: string) {
    if (!orgId) return;
    if (!confirm('Delete this channel?')) return;
    try {
      const res = await apiFetch(`${apiBase}/orgs/${orgId}/notifications/${id}`, { method: 'DELETE' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || 'Failed to delete channel');
      setChannels((prev) => prev.filter((ch) => ch.id !== id));
    } catch (err: any) {
      setChannelError(err.message);
    }
  }

  // Prepare chart data
  const p90ChartData = topFunctions
    .filter((fn) => fn.trend && fn.trend.length > 0)
    .map((fn) => ({
      name: fn.name,
      data: fn.trend?.map((point) => ({
        timestamp: new Date(point.timestamp).toLocaleDateString(),
        value: point.value,
      })) || [],
    }));

  const alertsData = overview?.alerts?.map((alert) => ({
    name: alert.severity,
    value: alert.count,
  })) || [];

  if (loadingUser || loadingOverview) {
    return (
      <AppShell orgId={orgId}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <Spinner size="lg" />
        </div>
      </AppShell>
    );
  }

  if (!accessToken) {
    return (
      <AppShell orgId={orgId}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: 'var(--space-4)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Authentication required</p>
          <Button variant="primary" onClick={() => (window.location.href = '/login')}>
            Go to Login
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell orgId={orgId}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%', paddingTop: 0 }}>
        {/* Header with Demo Mode Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-8)', marginTop: 0 }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', margin: '0 0 var(--space-2) 0' }}>
              {overview?.org?.name || 'Dashboard'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Monitor and optimize your Lambda functions</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={demoMode}
                onChange={(e) => setDemoMode(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Demo mode</span>
            </label>
            <Button variant="outline" size="sm" onClick={handleRefreshMetrics} isLoading={refreshing}>
              🔄 Refresh metrics
            </Button>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <Card variant="elevated" padding="md" style={{ marginBottom: 'var(--space-3)' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-4) 0' }}>
            Quick Actions
          </h3>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Link href={`/orgs/${orgId}/functions`}>
              <Button variant="outline" size="sm">
                ⚡ View Functions
              </Button>
            </Link>
            <Link href={`/settings/aws-accounts`}>
              <Button variant="outline" size="sm">
                🔗 Connect AWS
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={() => document.getElementById('create-dashboard-form')?.scrollIntoView({ behavior: 'smooth' })}>
              📊 Create Dashboard
            </Button>
            <Link href={`/orgs/${orgId}/functions`}>
              <Button variant="outline" size="sm">
                📦 Upload Bundle
              </Button>
            </Link>
          </div>
        </Card>

        {/* KPI Cards */}
        <Grid columns={{ sm: 2, md: 4 }} gap="md" style={{ marginBottom: 'var(--space-8)' }}>
          <Card variant="elevated" padding="md">
            <Stat
              label="Functions"
              value={totals.functions}
              icon="⚡"
              size="lg"
              variant="primary"
              trend={totals.functions > 0 ? 'up' : 'neutral'}
            />
          </Card>
          <Card variant="elevated" padding="md">
            <Stat
              label="Open Alerts"
              value={totals.alertsOpen}
              icon="🔔"
              size="lg"
              variant={totals.alertsOpen > 0 ? 'error' : 'success'}
            />
          </Card>
          <Card variant="elevated" padding="md">
            <Stat
              label="Avg P90 Init"
              value={health.avgP90 ? `${health.avgP90}ms` : 'N/A'}
              icon="⏱️"
              size="lg"
              variant={health.avgP90 && health.avgP90 > 1000 ? 'warning' : 'default'}
            />
          </Card>
          <Card variant="elevated" padding="md">
            <Stat
              label="Cold Ratio"
              value={health.coldRatio ? `${health.coldRatio}%` : 'N/A'}
              icon="❄️"
              size="lg"
              variant={health.coldRatio && health.coldRatio > 20 ? 'warning' : 'default'}
            />
          </Card>
        </Grid>

        {/* Two Column Layout: Checklist + Top Functions */}
        <Grid columns={{ sm: 1, md: 2 }} gap="lg" style={{ marginBottom: 'var(--space-8)' }}>
          {/* Onboarding Checklist */}
          <OnboardingChecklist
            items={checklist.map((item) => ({
              ...item,
              href:
                item.id === 'connect-aws'
                  ? '/settings/aws-accounts'
                  : item.id === 'scan-functions'
                  ? `/orgs/${orgId}/functions`
                  : item.id === 'upload-bundle'
                  ? `/orgs/${orgId}/functions`
                  : item.id === 'notification'
                  ? undefined
                  : undefined,
              onClick: item.id === 'notification' ? () => document.getElementById('notification-channels')?.scrollIntoView({ behavior: 'smooth' }) : undefined,
            }))}
            orgId={orgId}
          />

          {/* Top Functions with Sparklines */}
          <Card variant="elevated" padding="lg">
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-4) 0' }}>
              Top Functions
            </h3>
            {topFunctions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {topFunctions.map((fn) => (
                  <Link
                    key={fn.id}
                    href={`/orgs/${orgId}/functions/${fn.id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div
                      style={{
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--surface-base)',
                        transition: 'all var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-base)';
                        e.currentTarget.style.background = 'var(--surface-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        e.currentTarget.style.background = 'var(--surface-base)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                        <div>
                          <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-base)' }}>{fn.name}</div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{fn.region || 'N/A'}</div>
                        </div>
                        {fn.trend && fn.trend.length > 0 && (
                          <div style={{ width: '100px', height: '30px' }}>
                            <Sparkline data={fn.trend.map((p) => p.value)} color="var(--color-primary)" showArea />
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>P90: </span>
                          <span style={{ fontWeight: 'var(--font-semibold)' }}>{fn.p90InitMs ? `${fn.p90InitMs}ms` : 'N/A'}</span>
                        </div>
                        <div>
                          <span style={{ color: 'var(--text-secondary)' }}>Cold: </span>
                          <span style={{ fontWeight: 'var(--font-semibold)' }}>{fn.coldRatio ? `${fn.coldRatio}%` : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState icon="⚡" title="No functions yet" description="Connect an AWS account and scan your Lambda functions to get started." />
            )}
          </Card>
        </Grid>

        {/* Charts Row */}
        {p90ChartData.length > 0 && (
          <Grid columns={{ sm: 1, md: 2 }} gap="lg" style={{ marginBottom: 'var(--space-8)' }}>
            <Card variant="elevated" padding="lg">
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-4) 0' }}>
                P90 Init Trend
                <InfoTooltip content="P90 initialization time shows the 90th percentile of cold start durations over time." />
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={p90ChartData[0]?.data || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="var(--text-secondary)" 
                    fontSize={12}
                    tick={{ fill: 'var(--text-secondary)' }}
                  />
                  <YAxis 
                    stroke="var(--text-secondary)" 
                    fontSize={12}
                    tick={{ fill: 'var(--text-secondary)' }}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      background: 'var(--surface-base)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="var(--chart-1)" 
                    strokeWidth={3} 
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {alertsData.length > 0 && (
              <Card variant="elevated" padding="lg">
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-4) 0' }}>
                  Alerts by Severity
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={alertsData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {alertsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        background: 'var(--surface-base)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            )}
          </Grid>
        )}

        {/* Recent Activity Feed */}
        <Card variant="elevated" padding="lg" style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: 0 }}>Recent Activity</h3>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              {(['all', 'bundle', 'alert', 'notification'] as const).map((filter) => (
                <Button
                  key={filter}
                  size="sm"
                  variant={activityFilter === filter ? 'primary' : 'ghost'}
                  onClick={() => setActivityFilter(filter)}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Button>
              ))}
            </div>
          </div>
          {filteredActivity.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {filteredActivity.map((item) => (
                <div
                  key={item.id}
                  style={{
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--surface-muted)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div>
                      <div style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>
                        {item.message}
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                        {new Date(item.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <Badge variant="default" size="sm">
                      {item.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon="📋" title="No activity yet" description="Activity will appear here as you use the platform." />
          )}
        </Card>

        {/* Create Dashboard Form */}
        <Card id="create-dashboard-form" variant="outlined" padding="lg" style={{ marginBottom: 'var(--space-8)' }}>
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-4) 0' }}>
            Create Dashboard
          </h2>
          {dashError && (
            <div style={{ padding: 'var(--space-3)', background: 'var(--color-error-bg)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
              {dashError}
            </div>
          )}
          <form onSubmit={onCreate} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-2)' }}>
                Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Ops Overview"
                style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-base)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-base)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-2)' }}>
                Description
              </label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
                style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--surface-base)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-base)',
                }}
              />
            </div>
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)' }}>
              <div style={{ fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-3)' }}>Cards</div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-3)' }}>
                <input
                  value={cardTitle}
                  onChange={(e) => setCardTitle(e.target.value)}
                  placeholder="Card title"
                  style={{
                    flex: 1,
                    minWidth: '200px',
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--surface-base)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                  }}
                />
                <select
                  value={cardMetric}
                  onChange={(e) => setCardMetric(e.target.value)}
                  style={{
                    padding: 'var(--space-2) var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--surface-base)',
                    color: 'var(--text-primary)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  {metricOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Button type="button" size="sm" onClick={addCard} disabled={!cardTitle.trim()}>
                  Add card
                </Button>
              </div>
              {cards.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No cards yet.</div>
              ) : (
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                  {cards.map((card, idx) => (
                    <div
                      key={`${card.title}-${idx}`}
                      style={{
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-3)',
                        minWidth: '180px',
                        background: 'var(--surface-muted)',
                      }}
                    >
                      <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>{card.title}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                        {metricOptions.find((m) => m.id === card.metric)?.label ?? card.metric}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeCard(idx)}
                        style={{ marginTop: 'var(--space-2)' }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" disabled={saving || !name.trim()} isLoading={saving}>
              {saving ? 'Saving…' : 'Save dashboard'}
            </Button>
          </form>
        </Card>

        {/* Saved Dashboards */}
        <section style={{ marginBottom: 'var(--space-8)' }}>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-4) 0' }}>
            Saved Dashboards
          </h2>
          {dashboardsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
              <Spinner />
            </div>
          ) : dashboards.length === 0 ? (
            <Card variant="outlined" padding="lg">
              <DashboardsEmptyState orgId={orgId} onCreate={() => document.getElementById('create-dashboard-form')?.scrollIntoView({ behavior: 'smooth' })} />
            </Card>
          ) : (
            <Grid columns={{ sm: 1, md: 2, lg: 3 }} gap="md">
              {dashboards.map((layout) => (
                <Card key={layout.id} variant="elevated" padding="lg">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-4)' }}>
                    <div>
                      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-1) 0' }}>
                        {layout.name}
                      </h3>
                      {layout.description && (
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{layout.description}</div>
                      )}
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(layout.id)} style={{ color: 'var(--color-error)' }}>
                      Delete
                    </Button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--space-2)' }}>
                    {layout.config.cards.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>No cards defined.</div>
                    ) : (
                      layout.config.cards.map((card, idx) => (
                        <div
                          key={idx}
                          style={{
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-2)',
                            background: 'var(--surface-muted)',
                          }}
                        >
                          <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>{card.title}</div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                            {metricOptions.find((m) => m.id === card.metric)?.label ?? card.metric}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </Card>
              ))}
            </Grid>
          )}
        </section>

        {/* Notification Channels */}
        <Card id="notification-channels" variant="outlined" padding="lg">
          <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-4) 0' }}>
            Notification Channels
          </h2>
          <form onSubmit={onCreateChannel} style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
            <select
              value={channelType}
              onChange={(e) => setChannelType(e.target.value as 'slack' | 'email')}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-base)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <option value="slack">Slack webhook</option>
              <option value="email">Email (log only)</option>
            </select>
            <input
              value={channelTarget}
              onChange={(e) => setChannelTarget(e.target.value)}
              placeholder={channelType === 'slack' ? 'https://hooks.slack.com/services/...' : 'alerts@example.com'}
              style={{
                flex: 1,
                minWidth: '240px',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-base)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
              }}
            />
            <input
              value={channelDescription}
              onChange={(e) => setChannelDescription(e.target.value)}
              placeholder="Description"
              style={{
                flex: 1,
                minWidth: '180px',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-base)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
              }}
            />
            <Button type="submit" size="sm" disabled={!channelTarget.trim()}>
              Add channel
            </Button>
          </form>
          {channelError && (
            <div style={{ padding: 'var(--space-3)', background: 'var(--color-error-bg)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
              {channelError}
            </div>
          )}
          {channelLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-4)' }}>
              <Spinner />
            </div>
          ) : channels.length === 0 ? (
            <EmptyState icon="🔔" title="No channels configured" description="Add a notification channel to receive alerts about your Lambda functions." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {channels.map((channel) => (
                <div
                  key={channel.id}
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-3)',
                    background: 'var(--surface-muted)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'var(--font-semibold)', textTransform: 'capitalize', fontSize: 'var(--text-sm)' }}>
                      {channel.type}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                      {channel.target}
                    </div>
                    {channel.description && (
                      <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                        {channel.description}
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => onDeleteChannel(channel.id)} style={{ color: 'var(--color-error)' }}>
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
