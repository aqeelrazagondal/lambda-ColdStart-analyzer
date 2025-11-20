"use client";
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, Button } from '@lca/ui-components';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch React errors
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ padding: 'var(--space-8)', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <Card variant="outlined" padding="lg" style={{ maxWidth: '600px', width: '100%' }}>
            <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', margin: '0 0 var(--space-4) 0', color: 'var(--color-error)' }}>
              Something went wrong
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
              {this.state.error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <Button
                variant="primary"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
              >
                Reload Page
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.history.back();
                }}
              >
                Go Back
              </Button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--surface-muted)', borderRadius: 'var(--radius-md)' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'var(--font-medium)', marginBottom: 'var(--space-2)' }}>
                  Error Details (Development Only)
                </summary>
                <pre style={{ fontSize: 'var(--text-xs)', overflow: 'auto', color: 'var(--text-secondary)' }}>
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

