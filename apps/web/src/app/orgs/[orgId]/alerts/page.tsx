"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '../../../components/shell/AppShell';
import { useAuth } from '../../../providers/AuthContext';
import { Card, Grid, Badge, Spinner, Button, EmptyState } from '@lca/ui-components';
import Link from 'next/link';

interface FunctionAlert {
  id: string;
  functionId: string;
  function?: {
    functionName: string;
    region: string;
  };
  message: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'open' | 'resolved';
  createdAt: string;
}

export default function AlertsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;
  const { apiFetch } = useAuth();
  const [alerts, setAlerts] = useState<FunctionAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (!orgId) return;
    loadAlerts();
  }, [orgId]);

  async function loadAlerts() {
    if (!orgId) return;
    setLoading(true);
    setError(undefined);
    try {
      // Load alerts from all functions - in a real app, you'd have an org-level endpoint
      const res = await apiFetch(`${apiBase}/orgs/${orgId}/functions`);
      const functionsRes = await res.json();
      if (!res.ok) throw new Error(functionsRes?.message || 'Failed to load functions');

      const allAlerts: FunctionAlert[] = [];
      for (const fn of functionsRes.items || []) {
        try {
          const alertRes = await apiFetch(`${apiBase}/functions/${fn.id}/alerts`);
          const alertData = await alertRes.json();
          if (alertRes.ok && Array.isArray(alertData)) {
            allAlerts.push(...alertData.map((a: any) => ({ ...a, function: fn })));
          }
        } catch (err) {
          // Continue if individual function fails
        }
      }
      setAlerts(allAlerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredAlerts = alerts.filter((alert) => {
    if (filter !== 'all' && alert.status !== filter) return false;
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    return true;
  });

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
            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', margin: '0 0 var(--space-2) 0' }}>Alerts</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Monitor and respond to Lambda function alerts</p>
          </div>
        </div>

        {/* Filters */}
        <Card variant="elevated" padding="md" style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-secondary)' }}>Status:</span>
            {(['all', 'open', 'resolved'] as const).map((f) => (
              <Button key={f} size="sm" variant={filter === f ? 'primary' : 'ghost'} onClick={() => setFilter(f)}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--text-secondary)', marginLeft: 'var(--space-4)' }}>
              Severity:
            </span>
            {(['all', 'critical', 'warning', 'info'] as const).map((s) => (
              <Button key={s} size="sm" variant={severityFilter === s ? 'primary' : 'ghost'} onClick={() => setSeverityFilter(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
        </Card>

        {error && (
          <Card variant="outlined" padding="md" style={{ marginBottom: 'var(--space-4)', background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
            {error}
          </Card>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
            <Spinner size="lg" />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <Card variant="outlined" padding="lg">
            <EmptyState
              icon="🔔"
              title={alerts.length === 0 ? 'No alerts yet' : 'No alerts match your filters'}
              description={
                alerts.length === 0
                  ? 'Alerts will appear here when your Lambda functions exceed configured thresholds or encounter issues.'
                  : 'Try adjusting your filters to see more alerts.'
              }
              action={
                alerts.length === 0
                  ? {
                      label: 'View functions',
                      onClick: () => (window.location.href = `/orgs/${orgId}/functions`),
                      variant: 'primary',
                    }
                  : undefined
              }
            />
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {filteredAlerts.map((alert) => (
              <Card key={alert.id} variant="elevated" padding="lg">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-3)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                      <Badge
                        variant={alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}
                        size="md"
                      >
                        {alert.severity}
                      </Badge>
                      <Badge variant={alert.status === 'open' ? 'error' : 'success'} size="sm">
                        {alert.status}
                      </Badge>
                    </div>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-1) 0' }}>
                      {alert.message}
                    </h3>
                    {alert.function && (
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                        {alert.function.functionName} • {alert.function.region}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                    {new Date(alert.createdAt).toLocaleString()}
                  </div>
                  {alert.function && (
                    <Link href={`/orgs/${orgId}/functions/${alert.functionId}`}>
                      <Button variant="outline" size="sm">
                        View Function
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

