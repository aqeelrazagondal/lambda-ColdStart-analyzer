"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from './providers/AuthContext';
import { AppShell } from './components/shell/AppShell';
import { Card, Stat, Button, Grid, EmptyState } from '@lca/ui-components';

type OrgRecord = { id: string; name: string };

export default function HomePage() {
  const { accessToken, user, apiFetch } = useAuth();
  const [orgs, setOrgs] = useState<OrgRecord[]>([]);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    async function loadOrgs() {
      if (!accessToken) return;
      try {
        const res = await apiFetch(`${apiBase}/orgs`);
        const json = await res.json();
        if (res.ok) setOrgs(json?.orgs || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadOrgs();
  }, [accessToken, apiBase, apiFetch]);

  const primaryCtaHref = orgs[0] ? `/orgs/${orgs[0].id}/dashboard` : '/register';

  // Unauthenticated landing page
  if (!accessToken) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-primary)',
        }}
      >
        {/* Hero Section */}
        <section
          style={{
            position: 'relative',
            padding: 'var(--space-24) var(--space-6)',
            background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--accent-purple) 100%)',
            color: 'var(--text-inverse)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
              <span style={{ fontSize: 'var(--text-2xl)' }}>⚡</span>
              <span style={{ fontSize: 'var(--text-sm)', opacity: 0.9, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Lambda Cold-Start Analyzer
              </span>
            </div>
            <h1
              style={{
                fontSize: 'var(--text-5xl)',
                fontWeight: 'var(--font-bold)',
                margin: '0 0 var(--space-6) 0',
                lineHeight: 'var(--leading-tight)',
                maxWidth: '800px',
              }}
            >
              Eliminate cold starts and ship faster Lambda releases
            </h1>
            <p
              style={{
                fontSize: 'var(--text-xl)',
                opacity: 0.95,
                margin: '0 0 var(--space-8) 0',
                maxWidth: '600px',
                lineHeight: 'var(--leading-relaxed)',
              }}
            >
              Connect AWS once, visualize latency trends, audit bundles, and guide teams with checklist-driven onboarding.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <Link href="/register">
                <Button size="lg" variant="primary" style={{ background: '#fff', color: '#111' }}>
                  Get started
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline" style={{ borderColor: '#fff', color: '#fff', background: 'transparent' }}>
                  I already have access
                </Button>
              </Link>
            </div>
          </div>
          {/* Decorative gradient overlay */}
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.15), transparent 60%)',
              pointerEvents: 'none',
            }}
          />
        </section>

        {/* Feature Highlights */}
        <section
          style={{
            padding: 'var(--space-20) var(--space-6)',
            background: 'var(--bg-secondary)',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2
              style={{
                fontSize: 'var(--text-3xl)',
                fontWeight: 'var(--font-bold)',
                textAlign: 'center',
                margin: '0 0 var(--space-12) 0',
                color: 'var(--text-primary)',
              }}
            >
              Everything you need to optimize Lambda performance
            </h2>
            <Grid columns={3} gap="lg">
              <Card variant="elevated" padding="lg">
                <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>📦</div>
                <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-2) 0' }}>
                  Bundle Audit
                </h3>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 var(--space-4) 0', lineHeight: 'var(--leading-relaxed)' }}>
                  Automatic unpacking, dependency sizing, and remediation tips. Identify bloated dependencies and optimize bundle size.
                </p>
                <Link href="/docs" style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                  Learn more →
                </Link>
              </Card>
              <Card variant="elevated" padding="lg">
                <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>🔄</div>
                <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-2) 0' }}>
                  Auto Refresh
                </h3>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 var(--space-4) 0', lineHeight: 'var(--leading-relaxed)' }}>
                  Schedule CloudWatch pulls with Slack notifications on drift. Stay informed about performance changes automatically.
                </p>
                <Link href="/docs" style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                  Learn more →
                </Link>
              </Card>
              <Card variant="elevated" padding="lg">
                <div style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-4)' }}>📊</div>
                <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-2) 0' }}>
                  Dashboards
                </h3>
                <p style={{ color: 'var(--text-secondary)', margin: '0 0 var(--space-4) 0', lineHeight: 'var(--leading-relaxed)' }}>
                  Compose cards for latency, bundles, alerts, and onboarding progress. Customize views for your team's needs.
                </p>
                <Link href="/docs" style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                  Learn more →
                </Link>
              </Card>
            </Grid>
          </div>
        </section>
      </main>
    );
  }

  // Authenticated home page
  return (
    <AppShell>
      <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
        {/* Welcome Section */}
        <section
          style={{
            marginBottom: 'var(--space-8)',
            padding: 'var(--space-6)',
            background: 'var(--surface-base)',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <p style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', margin: '0 0 var(--space-2) 0' }}>
            Welcome back
          </p>
          <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', margin: '0 0 var(--space-3) 0', color: 'var(--text-primary)' }}>
            Hey {user?.name || user?.email?.split('@')[0]}, ready to inspect your cold starts?
          </h1>
          <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', margin: '0 0 var(--space-6) 0', maxWidth: '600px' }}>
            Jump back into your organization, resume onboarding, or invite collaborators.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <Link href={primaryCtaHref}>
              <Button variant="primary" size="md">
                Open workspace
              </Button>
            </Link>
            <Link href="/settings/aws-accounts">
              <Button variant="outline" size="md">
                Account settings
              </Button>
            </Link>
          </div>
        </section>

        {/* Organizations Grid */}
        <section>
          <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-6) 0', color: 'var(--text-primary)' }}>
            Your Organizations
          </h2>
          {orgs.length > 0 ? (
            <Grid columns={{ sm: 1, md: 2, lg: 3 }} gap="md">
              {orgs.map((org) => (
                <Card key={org.id} variant="elevated" padding="lg" onClick={() => (window.location.href = `/orgs/${org.id}/dashboard`)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: 'var(--radius-lg)',
                        background: 'var(--color-primary-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'var(--text-xl)',
                      }}
                    >
                      {org.name[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-1) 0' }}>
                        {org.name}
                      </h3>
                      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>Organization</p>
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', margin: '0 0 var(--space-4) 0', fontSize: 'var(--text-sm)' }}>
                    Monitor functions, bundles, alerts, and more.
                  </p>
                  <Link
                    href={`/orgs/${org.id}/dashboard`}
                    style={{
                      color: 'var(--color-primary)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 'var(--font-medium)',
                      textDecoration: 'none',
                    }}
                  >
                    Go to dashboard →
                  </Link>
                </Card>
              ))}
            </Grid>
          ) : (
            <Card variant="outlined" padding="lg">
              <EmptyState
                icon="🏢"
                title="No organizations yet"
                description="Create your first organization to start monitoring Lambda functions and optimizing cold starts."
                action={{
                  label: 'Create organization',
                  onClick: () => (window.location.href = '/settings/aws-accounts'),
                  variant: 'primary',
                }}
              />
            </Card>
          )}
        </section>
      </div>
    </AppShell>
  );
}
