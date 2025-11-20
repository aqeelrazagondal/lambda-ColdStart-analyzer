"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

export type OrgOverview = {
  org: { id: string; name: string };
  totals: {
    functions: number;
    bundles: number;
    alertsOpen: number;
    awsAccounts: number;
    dashboards: number;
    notifications: number;
  };
  health: {
    avgP90?: number | null;
    coldRatio?: number | null;
  };
  topFunctions: Array<{
    id: string;
    name: string;
    region?: string | null;
    p90InitMs?: number | null;
    coldRatio?: number | null;
    trend?: Array<{ timestamp: string; value: number }>;
  }>;
  recentBundles: Array<{
    id: string;
    functionName: string;
    sizeBytes: number;
    status: string;
    createdAt: string;
  }>;
  activity: Array<{
    id: string;
    message: string;
    type: string;
    createdAt: string;
  }>;
  alerts: Array<{ severity: string; count: number }>;
  checklist: Array<{ id: string; label: string; done: boolean; description?: string }>;
};

type OrgDataContextValue = {
  orgId: string;
  overview?: OrgOverview;
  loadingOverview: boolean;
  refreshOverview: () => Promise<void>;
  demoMode: boolean;
  setDemoMode: (value: boolean) => void;
};

const OrgDataContext = createContext<OrgDataContextValue | undefined>(undefined);

const demoOverview: OrgOverview = {
  org: { id: 'demo', name: 'Aurora Foods Demo' },
  totals: {
    functions: 42,
    bundles: 18,
    alertsOpen: 3,
    awsAccounts: 2,
    dashboards: 4,
    notifications: 5,
  },
  health: {
    avgP90: 840,
    coldRatio: 18,
  },
  topFunctions: [
    {
      id: 'demo-fn-1',
      name: 'checkout-handler',
      region: 'us-east-1',
      p90InitMs: 910,
      coldRatio: 22,
      trend: Array.from({ length: 12 }).map((_, idx) => ({
        timestamp: new Date(Date.now() - (12 - idx) * 3600 * 1000).toISOString(),
        value: 600 + Math.random() * 400,
      })),
    },
    {
      id: 'demo-fn-2',
      name: 'image-resizer',
      region: 'eu-central-1',
      p90InitMs: 420,
      coldRatio: 12,
      trend: Array.from({ length: 12 }).map((_, idx) => ({
        timestamp: new Date(Date.now() - (12 - idx) * 3600 * 1000).toISOString(),
        value: 350 + Math.random() * 120,
      })),
    },
  ],
  recentBundles: [
    {
      id: 'bundle-1',
      functionName: 'checkout-handler',
      sizeBytes: 21_000_000,
      status: 'completed',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'bundle-2',
      functionName: 'image-resizer',
      sizeBytes: 12_000_000,
      status: 'processing',
      createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    },
  ],
  activity: [
    {
      id: 'activity-1',
      type: 'bundle_upload',
      message: 'Uploaded bundle for checkout-handler',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'activity-2',
      type: 'alert_resolved',
      message: 'Resolved latency alert on auth-service',
      createdAt: new Date(Date.now() - 7200 * 1000).toISOString(),
    },
  ],
  alerts: [
    { severity: 'critical', count: 1 },
    { severity: 'warning', count: 2 },
  ],
  checklist: [
    { id: 'connect-aws', label: 'Connect AWS Account', done: true, description: 'Linked via IAM role' },
    { id: 'scan-functions', label: 'Scan functions', done: true, description: '42 Lambdas synced' },
    { id: 'upload-bundle', label: 'Upload bundle', done: true },
    { id: 'notification', label: 'Add notification channel', done: false, description: 'Slack alerts pending' },
  ],
};

export function OrgDataProvider({ orgId, children }: { orgId: string; children: React.ReactNode }) {
  const { apiFetch, accessToken, loadingUser } = useAuth();
  const [overview, setOverview] = useState<OrgOverview | undefined>();
  const [demoMode, setDemoMode] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem('lca-demo-mode');
    if (stored === 'true') setDemoMode(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('lca-demo-mode', String(demoMode));
  }, [demoMode]);

  const [loadingOverview, setLoadingOverview] = useState(false);

  const fetchOverview = useCallback(async () => {
    if (!orgId || demoMode || !accessToken || loadingUser) return;
    setLoadingOverview(true);
    try {
      const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/orgs/${orgId}/overview`);
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          console.error('Authentication failed for overview');
          return;
        }
        throw new Error(json?.message || 'Failed to load overview');
      }
      setOverview(json);
    } catch (err) {
      console.error('Failed to fetch overview:', err);
    } finally {
      setLoadingOverview(false);
    }
  }, [apiFetch, orgId, demoMode, accessToken, loadingUser]);

  useEffect(() => {
    if (demoMode) {
      setOverview(demoOverview);
      setLoadingOverview(false);
      return;
    }
    if (accessToken && !loadingUser) {
      fetchOverview();
    }
  }, [demoMode, fetchOverview, accessToken, loadingUser]);

  useEffect(() => {
    if (demoMode || !accessToken || loadingUser) return;
    fetchOverview();
  }, [orgId, demoMode, fetchOverview, accessToken, loadingUser]);

  const value = useMemo<OrgDataContextValue>(
    () => ({
      orgId,
      overview,
      loadingOverview,
      refreshOverview: fetchOverview,
      demoMode,
      setDemoMode,
    }),
    [orgId, overview, loadingOverview, fetchOverview, demoMode]
  );

  return <OrgDataContext.Provider value={value}>{children}</OrgDataContext.Provider>;
}

export function useOrgData() {
  const ctx = useContext(OrgDataContext);
  if (!ctx) {
    throw new Error('useOrgData must be used within OrgDataProvider');
  }
  return ctx;
}

