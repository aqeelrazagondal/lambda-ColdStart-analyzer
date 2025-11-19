"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AppShell } from '../../../components/shell/AppShell';
import { useAuth } from '../../../providers/AuthContext';
import { Card, Grid, Badge, Spinner, Button } from '@lca/ui-components';
import { BundlesEmptyState } from '../../../components/empty-states/BundlesEmptyState';
import Link from 'next/link';

interface BundleUpload {
  id: string;
  functionId: string;
  function?: {
    functionName: string;
    region: string;
  };
  originalFilename: string;
  sizeBytes: number;
  status: string;
  createdAt: string;
}

export default function BundlesPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId;
  const { apiFetch } = useAuth();
  const [bundles, setBundles] = useState<BundleUpload[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  useEffect(() => {
    if (!orgId) return;
    loadBundles();
  }, [orgId]);

  async function loadBundles() {
    if (!orgId) return;
    setLoading(true);
    setError(undefined);
    try {
      // Load bundles from all functions - in a real app, you'd have an org-level endpoint
      const res = await apiFetch(`${apiBase}/orgs/${orgId}/functions`);
      const functionsRes = await res.json();
      if (!res.ok) throw new Error(functionsRes?.message || 'Failed to load functions');

      const allBundles: BundleUpload[] = [];
      for (const fn of functionsRes.items || []) {
        try {
          const bundleRes = await apiFetch(`${apiBase}/orgs/${orgId}/functions/${fn.id}/bundles?limit=10`);
          const bundleData = await bundleRes.json();
          if (bundleRes.ok && Array.isArray(bundleData)) {
            allBundles.push(...bundleData.map((b: any) => ({ ...b, function: fn })));
          }
        } catch (err) {
          // Continue if individual function fails
        }
      }
      setBundles(allBundles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const bytesToMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

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
            <h1 style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', margin: '0 0 var(--space-2) 0' }}>Bundle Uploads</h1>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Analyze Lambda deployment packages and optimize bundle size</p>
          </div>
          <Link href={`/orgs/${orgId}/functions`}>
            <Button variant="primary">Upload Bundle</Button>
          </Link>
        </div>

        {error && (
          <Card variant="outlined" padding="md" style={{ marginBottom: 'var(--space-4)', background: 'var(--color-error-bg)', color: 'var(--color-error)' }}>
            {error}
          </Card>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-16)' }}>
            <Spinner size="lg" />
          </div>
        ) : bundles.length === 0 ? (
          <Card variant="outlined" padding="lg">
            <BundlesEmptyState orgId={orgId} />
          </Card>
        ) : (
          <Grid columns={{ sm: 1, md: 2, lg: 3 }} gap="md">
            {bundles.map((bundle) => (
              <Card key={bundle.id} variant="elevated" padding="lg">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-3)' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-1) 0' }}>
                      {bundle.originalFilename || 'Untitled bundle'}
                    </h3>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      {bundle.function?.functionName || 'Unknown function'}
                    </div>
                  </div>
                  <Badge
                    variant={
                      bundle.status === 'completed'
                        ? 'success'
                        : bundle.status === 'processing'
                        ? 'warning'
                        : bundle.status === 'failed'
                        ? 'error'
                        : 'default'
                    }
                    size="sm"
                  >
                    {bundle.status}
                  </Badge>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Size:</span>
                    <span style={{ fontWeight: 'var(--font-semibold)' }}>{bytesToMb(bundle.sizeBytes)}</span>
                  </div>
                  {bundle.function?.region && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Region:</span>
                      <span>{bundle.function.region}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Uploaded:</span>
                    <span>{new Date(bundle.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {bundle.function && (
                  <div style={{ marginTop: 'var(--space-4)' }}>
                    <Link href={`/orgs/${orgId}/functions/${bundle.functionId}?tab=bundle-audit`}>
                      <Button variant="outline" size="sm" fullWidth>
                        View Analysis
                      </Button>
                    </Link>
                  </div>
                )}
              </Card>
            ))}
          </Grid>
        )}
      </div>
    </AppShell>
  );
}
