export const metadata = {
  title: 'Lambda Cold-Start Analyzer',
  description: 'Dashboard for analyzing AWS Lambda cold starts and bundles',
};

import { AuthProvider } from './providers/AuthContext';
import { ToastProvider } from './providers/ToastContext';
import { ThemeProvider } from './providers/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import { ThemeStyles } from './components/ThemeStyles';
import { NoFlash } from './components/NoFlash';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('lca-theme');
                  if (!theme) {
                    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    theme = prefersDark ? 'dark' : 'light';
                  }
                  document.documentElement.setAttribute('data-theme', theme);
                  document.body.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
        <style dangerouslySetInnerHTML={{
          __html: `
            * { box-sizing: border-box; margin: 0; padding: 0; }
            html, body {
              margin: 0;
              padding: 0;
              width: 100%;
              height: 100%;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              font-size: 16px;
              line-height: 1.5;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            
            /* Theme variables - loaded immediately to prevent FOUC */
            :root {
              --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              --font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
              --text-xs: 0.75rem;
              --text-sm: 0.875rem;
              --text-base: 1rem;
              --text-lg: 1.125rem;
              --text-xl: 1.25rem;
              --text-2xl: 1.5rem;
              --text-3xl: 1.875rem;
              --text-4xl: 2.25rem;
              --text-5xl: 3rem;
              --font-normal: 400;
              --font-medium: 500;
              --font-semibold: 600;
              --font-bold: 700;
              --leading-tight: 1.25;
              --leading-snug: 1.375;
              --leading-normal: 1.5;
              --leading-relaxed: 1.625;
              --space-0: 0;
              --space-1: 0.25rem;
              --space-2: 0.5rem;
              --space-3: 0.75rem;
              --space-4: 1rem;
              --space-5: 1.25rem;
              --space-6: 1.5rem;
              --space-8: 2rem;
              --space-10: 2.5rem;
              --space-12: 3rem;
              --space-16: 4rem;
              --space-20: 5rem;
              --space-24: 6rem;
              --radius-sm: 0.25rem;
              --radius-md: 0.5rem;
              --radius-lg: 0.75rem;
              --radius-xl: 1rem;
              --radius-2xl: 1.5rem;
              --radius-full: 9999px;
              --transition-fast: 150ms ease;
              --transition-base: 200ms ease;
              --transition-slow: 300ms ease;
            }
            
            body[data-theme='light'], body:not([data-theme]) {
              background: #ffffff;
              color: #0f172a;
              --bg-primary: #ffffff;
              --bg-secondary: #f8fafc;
              --bg-tertiary: #f1f5f9;
              --bg-elevated: #ffffff;
              --surface-base: #ffffff;
              --surface-raised: #ffffff;
              --surface-hover: #f8fafc;
              --surface-active: #f1f5f9;
              --surface-muted: #f8fafc;
              --border-subtle: #e2e8f0;
              --border-base: #cbd5e1;
              --border-strong: #94a3b8;
              --text-primary: #0f172a;
              --text-secondary: #475569;
              --text-tertiary: #64748b;
              --text-disabled: #94a3b8;
              --text-inverse: #ffffff;
              --color-success: #10b981;
              --color-success-bg: #d1fae5;
              --color-warning: #f59e0b;
              --color-warning-bg: #fef3c7;
              --color-error: #ef4444;
              --color-error-bg: #fee2e2;
              --color-info: #3b82f6;
              --color-info-bg: #dbeafe;
              --color-primary: #3b82f6;
              --color-primary-hover: #2563eb;
              --color-primary-active: #1d4ed8;
              --color-primary-bg: #dbeafe;
              --color-primary-text: #1e40af;
              --color-secondary: #64748b;
              --color-secondary-hover: #475569;
              --color-secondary-active: #334155;
              --color-secondary-bg: #f1f5f9;
              --color-secondary-text: #475569;
            }
            
            body[data-theme='dark'] {
              background: #0f172a;
              color: #f8fafc;
              --bg-primary: #0f172a;
              --bg-secondary: #1e293b;
              --bg-tertiary: #334155;
              --bg-elevated: #1e293b;
              --surface-base: #1e293b;
              --surface-raised: #334155;
              --surface-hover: #334155;
              --surface-active: #475569;
              --surface-muted: #1e293b;
              --border-subtle: #334155;
              --border-base: #475569;
              --border-strong: #64748b;
              --text-primary: #f8fafc;
              --text-secondary: #cbd5e1;
              --text-tertiary: #94a3b8;
              --text-disabled: #64748b;
              --text-inverse: #0f172a;
              --color-success: #10b981;
              --color-success-bg: #064e3b;
              --color-warning: #f59e0b;
              --color-warning-bg: #78350f;
              --color-error: #ef4444;
              --color-error-bg: #7f1d1d;
              --color-info: #3b82f6;
              --color-info-bg: #1e3a8a;
              --color-primary: #3b82f6;
              --color-primary-hover: #60a5fa;
              --color-primary-active: #93c5fd;
              --color-primary-bg: #1e3a8a;
              --color-primary-text: #93c5fd;
              --color-secondary: #64748b;
              --color-secondary-hover: #94a3b8;
              --color-secondary-active: #cbd5e1;
              --color-secondary-bg: #334155;
              --color-secondary-text: #cbd5e1;
            }
            
            body {
              font-family: var(--font-sans);
              font-size: var(--text-base);
              line-height: var(--leading-normal);
              margin: 0;
              padding: 0;
              background: var(--bg-primary);
              color: var(--text-primary);
              min-height: 100vh;
              transition: background-color var(--transition-base), color var(--transition-base);
            }
            
            /* Prevent flash by setting default styles immediately */
            #__next, [data-nextjs-scroll-focus-boundary] {
              min-height: 100vh;
            }
          `
        }} />
      </head>
      <body suppressHydrationWarning>
        <NoFlash />
        <ThemeProvider>
          <ThemeStyles />
          <AuthProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AuthProvider>
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
