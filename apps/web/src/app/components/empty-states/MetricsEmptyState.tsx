"use client";
import React from 'react';
import { EmptyState, Button } from '@lca/ui-components';
import Link from 'next/link';

interface MetricsEmptyStateProps {
  orgId: string;
  functionId?: string;
}

export function MetricsEmptyState({ orgId, functionId }: MetricsEmptyStateProps) {
  return (
    <EmptyState
      icon="📊"
      title="No metrics data yet"
      description="Connect an AWS account and scan your Lambda functions to start collecting cold start metrics. Metrics are refreshed automatically or on-demand."
      action={{
        label: functionId ? 'Refresh metrics' : 'Connect AWS account',
        onClick: () => {
          if (functionId) {
            // Trigger metrics refresh
            window.location.reload();
          } else {
            window.location.href = `/settings/aws-accounts`;
          }
        },
        variant: 'primary',
      }}
      secondaryAction={
        !functionId
          ? {
              label: 'View functions',
              onClick: () => (window.location.href = `/orgs/${orgId}/functions`),
            }
          : undefined
      }
    />
  );
}

