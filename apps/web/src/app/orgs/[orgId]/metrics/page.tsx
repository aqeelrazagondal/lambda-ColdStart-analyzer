"use client";
import React, { useMemo, useState } from 'react';
import { Card, Grid, EmptyState, Stat, Sparkline, Button } from '@lca/ui-components';
import { useOrgData } from '../../../providers/OrgDataContext';
import { AppShell } from '../../../components/shell/AppShell';
import { MetricsEmptyState } from '../../../components/empty-states/MetricsEmptyState';
import Link from 'next/link';

export default function MetricsPage() {
  const { overview, orgId } = useOrgData();
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('7d');

  const functionTrends = useMemo(() => overview?.topFunctions ?? [], [overview]);
  const hasData = functionTrends.length > 0;

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
        <header style={{ marginBottom: 'var(--space-6)' }}>
          <p style={{ textTransform: 'uppercase', letterSpacing: 1, fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', margin: '0 0 var(--space-2) 0' }}>
            Metrics
          </p>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', margin: '0 0 var(--space-2) 0' }}>
            Latency insights & sparkline library
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 620, margin: '0 0 var(--space-4) 0' }}>
            Monitor cold start ratios, latency percentiles, and account-wide drift. Use these sparkline modules across dashboards.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            {(['24h', '7d', '30d'] as const).map((option) => (
              <Button
                key={option}
                variant={range === option ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setRange(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </header>

        {!hasData ? (
          <Card variant="outlined" padding="lg">
            <MetricsEmptyState orgId={orgId} />
          </Card>
        ) : (
          <>
            <Grid columns={{ sm: 1, md: 2, lg: 3 }} gap="lg" style={{ marginBottom: 'var(--space-6)' }}>
              {functionTrends.map((fn) => (
                <Card key={fn.id} variant="elevated" padding="lg">
                  <div style={{ marginBottom: 'var(--space-4)' }}>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-1) 0' }}>
                      {fn.name}
                    </h3>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
                      {fn.region || 'default'} • p90 {fn.p90InitMs ?? '—'}ms
                    </p>
                  </div>
                  {fn.trend && fn.trend.length > 0 && (
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                      <Sparkline
                        data={fn.trend.map((point) => point.value)}
                        width={280}
                        height={60}
                        color="var(--color-primary)"
                        showArea
                      />
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-3)' }}>
                    <Stat
                      label="P90"
                      value={fn.p90InitMs ? `${fn.p90InitMs} ms` : 'N/A'}
                      size="sm"
                      trend={fn.p90InitMs && fn.p90InitMs > 1000 ? 'up' : 'neutral'}
                    />
                    <Stat
                      label="Cold %"
                      value={fn.coldRatio ? `${fn.coldRatio}%` : 'N/A'}
                      size="sm"
                      trend={fn.coldRatio && fn.coldRatio > 20 ? 'up' : 'neutral'}
                    />
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    Cold ratio {fn.coldRatio ?? '—'}%
                  </div>
                  <div style={{ marginTop: 'var(--space-4)' }}>
                    <Link href={`/orgs/${orgId}/functions/${fn.id}`}>
                      <Button variant="outline" size="sm" fullWidth>
                        View Function
                      </Button>
                    </Link>
                  </div>
                </Card>
              ))}
            </Grid>

            <Card variant="elevated" padding="lg">
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-4) 0' }}>
                Recommended follow-ups
              </h3>
              <ul style={{ listStyle: 'disc', paddingLeft: 'var(--space-6)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>
                <li>
                  <Link href="/docs/metrics#cold-ratio" style={{ color: 'var(--color-primary)' }}>
                    Tune cold ratio alerting
                  </Link>
                </li>
                <li>
                  <Link href="/docs/metrics#sparklines" style={{ color: 'var(--color-primary)' }}>
                    Embed sparklines in dashboards
                  </Link>
                </li>
                <li>
                  <Link href={`/orgs/${orgId}/dashboard#composer`} style={{ color: 'var(--color-primary)' }}>
                    Pin this module to dashboards
                  </Link>
                </li>
              </ul>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
