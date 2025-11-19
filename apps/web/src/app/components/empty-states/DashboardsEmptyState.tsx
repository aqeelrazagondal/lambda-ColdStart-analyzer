"use client";
import React from 'react';
import { EmptyState } from '@lca/ui-components';

interface DashboardsEmptyStateProps {
  orgId: string;
  onCreate?: () => void;
}

export function DashboardsEmptyState({ orgId, onCreate }: DashboardsEmptyStateProps) {
  return (
    <EmptyState
      icon="📊"
      title="No dashboards yet"
      description="Create a custom dashboard to visualize key metrics, track performance trends, and monitor your Lambda functions at a glance."
      action={{
        label: 'Create dashboard',
        onClick: () => {
          if (onCreate) {
            onCreate();
          } else {
            // Scroll to create form or show modal
            const form = document.getElementById('create-dashboard-form');
            if (form) {
              form.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        },
        variant: 'primary',
      }}
      secondaryAction={{
        label: 'View functions',
        onClick: () => (window.location.href = `/orgs/${orgId}/functions`),
      }}
    />
  );
}

