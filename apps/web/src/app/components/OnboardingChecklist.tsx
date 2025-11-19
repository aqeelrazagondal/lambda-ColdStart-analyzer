"use client";
import React from 'react';
import { Card, Button, Badge } from '@lca/ui-components';
import { InfoTooltip } from './Tooltip';
import Link from 'next/link';

interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  description?: string;
  href?: string;
  onClick?: () => void;
}

interface OnboardingChecklistProps {
  items: ChecklistItem[];
  orgId: string;
  onAction?: (itemId: string) => void;
}

export function OnboardingChecklist({ items, orgId, onAction }: OnboardingChecklistProps) {
  const completedCount = items.filter((item) => item.done).length;
  const totalCount = items.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <Card variant="elevated" padding="lg">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
        <div>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', margin: '0 0 var(--space-1) 0' }}>
            Getting Started
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
            {completedCount} of {totalCount} steps completed
          </p>
        </div>
        <Badge variant={progress === 100 ? 'success' : 'primary'} size="md">
          {progress}%
        </Badge>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          height: '8px',
          background: 'var(--surface-muted)',
          borderRadius: 'var(--radius-full)',
          marginBottom: 'var(--space-6)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: progress === 100 ? 'var(--color-success)' : 'var(--color-primary)',
            borderRadius: 'var(--radius-full)',
            transition: 'width var(--transition-base)',
          }}
        />
      </div>

      {/* Checklist Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {items.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-3)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              background: item.done ? 'var(--color-success-bg)' : 'var(--surface-muted)',
              border: `1px solid ${item.done ? 'var(--color-success)' : 'var(--border-subtle)'}`,
              transition: 'all var(--transition-fast)',
            }}
          >
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: 'var(--radius-md)',
                border: `2px solid ${item.done ? 'var(--color-success)' : 'var(--border-base)'}`,
                background: item.done ? 'var(--color-success)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px',
              }}
            >
              {item.done && (
                <span style={{ color: 'var(--text-inverse)', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)' }}>✓</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                <span
                  style={{
                    fontSize: 'var(--text-base)',
                    fontWeight: item.done ? 'var(--font-medium)' : 'var(--font-semibold)',
                    color: item.done ? 'var(--text-secondary)' : 'var(--text-primary)',
                    textDecoration: item.done ? 'line-through' : 'none',
                  }}
                >
                  {item.label}
                </span>
                {item.id === 'connect-aws' && (
                  <InfoTooltip
                    content="Connect your AWS account using IAM role-based access. This allows LCA to read CloudWatch metrics and scan Lambda functions."
                    link={{ href: '/docs/aws-setup', label: 'Setup guide' }}
                  />
                )}
              </div>
              {item.description && (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: '0 0 var(--space-2) 0' }}>
                  {item.description}
                </p>
              )}
              {!item.done && (item.href || item.onClick) && (
                <div style={{ marginTop: 'var(--space-2)' }}>
                  {item.href ? (
                    <Link href={item.href}>
                      <Button size="sm" variant="primary">
                        {item.id === 'connect-aws' && 'Connect AWS'}
                        {item.id === 'scan-functions' && 'Scan functions'}
                        {item.id === 'upload-bundle' && 'Upload bundle'}
                        {item.id === 'notification' && 'Add channel'}
                        {!['connect-aws', 'scan-functions', 'upload-bundle', 'notification'].includes(item.id) && 'Get started'}
                      </Button>
                    </Link>
                  ) : (
                    <Button size="sm" variant="primary" onClick={item.onClick}>
                      Get started
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {progress === 100 && (
        <div
          style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-4)',
            background: 'var(--color-success-bg)',
            borderRadius: 'var(--radius-md)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-success)', fontWeight: 'var(--font-semibold)', margin: 0 }}>
            🎉 All set! You're ready to optimize your Lambda functions.
          </p>
        </div>
      )}
    </Card>
  );
}

