export const metadata = {
  title: 'Lambda Cold-Start Analyzer',
  description: 'Dashboard for analyzing AWS Lambda cold starts and bundles',
};

import { AuthProvider } from './providers/AuthContext';
import { ToastProvider } from './providers/ToastContext';
import { ThemeProvider } from './providers/ThemeContext';
import { ThemeToggle } from './components/ThemeToggle';
import { ThemeStyles } from './components/ThemeStyles';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
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
