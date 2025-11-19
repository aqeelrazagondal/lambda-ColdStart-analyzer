"use client";
import React from 'react';
import { EmptyState } from '@lca/ui-components';

interface BundlesEmptyStateProps {
  orgId: string;
  functionId?: string;
  onUpload?: () => void;
}

export function BundlesEmptyState({ orgId, functionId, onUpload }: BundlesEmptyStateProps) {
  return (
    <EmptyState
      icon="📦"
      title="No bundle uploads yet"
      description="Upload a Lambda deployment package (.zip) to analyze bundle size, identify large dependencies, and get optimization recommendations."
      action={{
        label: 'Upload bundle',
        onClick: () => {
          if (onUpload) {
            onUpload();
          } else if (functionId) {
            window.location.href = `/orgs/${orgId}/functions/${functionId}?tab=bundle-audit`;
          } else {
            window.location.href = `/orgs/${orgId}/functions`;
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

