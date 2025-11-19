export const metadata = {
  title: 'Lambda Cold-Start Analyzer',
  description: 'Dashboard for analyzing AWS Lambda cold starts and bundles',
};

import { AuthProvider } from './providers/AuthContext';
import { ToastProvider } from './providers/ToastContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <AuthProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
