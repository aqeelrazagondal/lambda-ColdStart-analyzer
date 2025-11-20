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
            body[data-theme='light'], body:not([data-theme]) {
              background: #ffffff;
              color: #0f172a;
            }
            body[data-theme='dark'] {
              background: #0f172a;
              color: #f8fafc;
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
