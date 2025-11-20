"use client";

import { useEffect } from 'react';

export function ThemeStyles() {
  useEffect(() => {
    // Ensure body is marked as styled once component mounts
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-styled', 'true');
    }
  }, []);
  
  return (
    <style jsx global>{`
      :root {
        /* Typography Scale - Modern 8px baseline */
        --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        --font-mono: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        
        /* Font Sizes - Fluid typography scale */
        --text-xs: 0.75rem;      /* 12px */
        --text-sm: 0.875rem;     /* 14px */
        --text-base: 1rem;       /* 16px */
        --text-lg: 1.125rem;     /* 18px */
        --text-xl: 1.25rem;     /* 20px */
        --text-2xl: 1.5rem;     /* 24px */
        --text-3xl: 1.875rem;   /* 30px */
        --text-4xl: 2.25rem;     /* 36px */
        --text-5xl: 3rem;       /* 48px */
        
        /* Font Weights */
        --font-normal: 400;
        --font-medium: 500;
        --font-semibold: 600;
        --font-bold: 700;
        
        /* Line Heights */
        --leading-tight: 1.25;
        --leading-snug: 1.375;
        --leading-normal: 1.5;
        --leading-relaxed: 1.625;
        
        /* Spacing Scale - 4px base unit */
        --space-0: 0;
        --space-1: 0.25rem;    /* 4px */
        --space-2: 0.5rem;     /* 8px */
        --space-3: 0.75rem;    /* 12px */
        --space-4: 1rem;       /* 16px */
        --space-5: 1.25rem;    /* 20px */
        --space-6: 1.5rem;     /* 24px */
        --space-8: 2rem;       /* 32px */
        --space-10: 2.5rem;    /* 40px */
        --space-12: 3rem;      /* 48px */
        --space-16: 4rem;      /* 64px */
        --space-20: 5rem;      /* 80px */
        --space-24: 6rem;      /* 96px */
        
        /* Border Radius */
        --radius-sm: 0.25rem;   /* 4px */
        --radius-md: 0.5rem;    /* 8px */
        --radius-lg: 0.75rem;   /* 12px */
        --radius-xl: 1rem;      /* 16px */
        --radius-2xl: 1.5rem;   /* 24px */
        --radius-full: 9999px;
        
        /* Shadows */
        --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        
        /* Transitions */
        --transition-fast: 150ms ease;
        --transition-base: 200ms ease;
        --transition-slow: 300ms ease;
        
        /* Z-index scale */
        --z-dropdown: 1000;
        --z-sticky: 1020;
        --z-fixed: 1030;
        --z-modal-backdrop: 1040;
        --z-modal: 1050;
        --z-popover: 1060;
        --z-tooltip: 1070;
      }
      
      body {
        font-family: var(--font-sans);
        font-size: var(--text-base);
        line-height: var(--leading-normal);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        transition: background-color var(--transition-base), color var(--transition-base);
      }
      
      /* Light Theme */
      body[data-theme='light'] {
        /* Backgrounds */
        --bg-primary: #ffffff;
        --bg-secondary: #f8fafc;
        --bg-tertiary: #f1f5f9;
        --bg-elevated: #ffffff;
        --bg-overlay: rgba(15, 23, 42, 0.5);
        
        /* Surfaces */
        --surface-base: #ffffff;
        --surface-raised: #ffffff;
        --surface-hover: #f8fafc;
        --surface-active: #f1f5f9;
        --surface-muted: #f8fafc;
        
        /* Borders */
        --border-subtle: #e2e8f0;
        --border-base: #cbd5e1;
        --border-strong: #94a3b8;
        
        /* Text Colors */
        --text-primary: #0f172a;
        --text-secondary: #475569;
        --text-tertiary: #64748b;
        --text-disabled: #94a3b8;
        --text-inverse: #ffffff;
        
        /* Semantic Colors */
        --color-success: #10b981;
        --color-success-bg: #d1fae5;
        --color-warning: #f59e0b;
        --color-warning-bg: #fef3c7;
        --color-error: #ef4444;
        --color-error-bg: #fee2e2;
        --color-info: #3b82f6;
        --color-info-bg: #dbeafe;
        
        /* Interactive Colors */
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
        
        /* Accent Colors */
        --accent-blue: #3b82f6;
        --accent-purple: #8b5cf6;
        --accent-green: #10b981;
        --accent-orange: #f59e0b;
        --accent-red: #ef4444;
        --accent-pink: #ec4899;
        
        /* Chart Colors */
        --chart-1: #3b82f6;
        --chart-2: #8b5cf6;
        --chart-3: #10b981;
        --chart-4: #f59e0b;
        --chart-5: #ef4444;
        --chart-6: #ec4899;
        --chart-7: #06b6d4;
        --chart-8: #84cc16;
      }
      
      /* Dark Theme */
      body[data-theme='dark'] {
        /* Backgrounds */
        --bg-primary: #0f172a;
        --bg-secondary: #1e293b;
        --bg-tertiary: #334155;
        --bg-elevated: #1e293b;
        --bg-overlay: rgba(0, 0, 0, 0.7);
        
        /* Surfaces */
        --surface-base: #1e293b;
        --surface-raised: #334155;
        --surface-hover: #334155;
        --surface-active: #475569;
        --surface-muted: #1e293b;
        
        /* Borders */
        --border-subtle: #334155;
        --border-base: #475569;
        --border-strong: #64748b;
        
        /* Text Colors */
        --text-primary: #f8fafc;
        --text-secondary: #cbd5e1;
        --text-tertiary: #94a3b8;
        --text-disabled: #64748b;
        --text-inverse: #0f172a;
        
        /* Semantic Colors */
        --color-success: #10b981;
        --color-success-bg: #064e3b;
        --color-warning: #f59e0b;
        --color-warning-bg: #78350f;
        --color-error: #ef4444;
        --color-error-bg: #7f1d1d;
        --color-info: #3b82f6;
        --color-info-bg: #1e3a8a;
        
        /* Interactive Colors */
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
        
        /* Accent Colors */
        --accent-blue: #60a5fa;
        --accent-purple: #a78bfa;
        --accent-green: #34d399;
        --accent-orange: #fbbf24;
        --accent-red: #f87171;
        --accent-pink: #f472b6;
        
        /* Chart Colors */
        --chart-1: #60a5fa;
        --chart-2: #a78bfa;
        --chart-3: #34d399;
        --chart-4: #fbbf24;
        --chart-5: #f87171;
        --chart-6: #f472b6;
        --chart-7: #22d3ee;
        --chart-8: #a3e635;
      }
      
      /* Base element styles */
      * {
        box-sizing: border-box;
      }
      
      body {
        margin: 0;
        padding: 0;
        background: var(--bg-primary);
        color: var(--text-primary);
        min-height: 100vh;
      }
      
      a {
        color: var(--color-primary);
        text-decoration: none;
        transition: color var(--transition-fast);
      }
      
      a:hover {
        color: var(--color-primary-hover);
      }
      
      button {
        font-family: inherit;
        cursor: pointer;
      }
      
      input, textarea, select {
        font-family: inherit;
        transition: all var(--transition-fast);
      }
      
      /* Enhanced input styling */
      input[type="text"],
      input[type="email"],
      input[type="password"],
      input[type="number"],
      input[type="tel"],
      input[type="url"],
      textarea,
      select {
        background: var(--surface-base);
        border: 1px solid var(--border-subtle);
        color: var(--text-primary);
        border-radius: var(--radius-md);
        padding: var(--space-3);
        font-size: var(--text-base);
        transition: all var(--transition-fast);
      }
      
      input[type="text"]:focus,
      input[type="email"]:focus,
      input[type="password"]:focus,
      input[type="number"]:focus,
      input[type="tel"]:focus,
      input[type="url"]:focus,
      textarea:focus,
      select:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 3px var(--color-primary-bg);
      }
      
      input[type="text"]:hover:not(:focus),
      input[type="email"]:hover:not(:focus),
      input[type="password"]:hover:not(:focus),
      input[type="number"]:hover:not(:focus),
      input[type="tel"]:hover:not(:focus),
      input[type="url"]:hover:not(:focus),
      textarea:hover:not(:focus),
      select:hover:not(:focus) {
        border-color: var(--border-base);
      }
      
      input::placeholder,
      textarea::placeholder {
        color: var(--text-tertiary);
        opacity: 0.7;
      }
      
      select {
        cursor: pointer;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right var(--space-3) center;
        padding-right: var(--space-10);
        appearance: none;
      }
      
      /* Focus styles for accessibility */
      *:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
      }
      
      /* Scrollbar styling */
      ::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      
      ::-webkit-scrollbar-track {
        background: var(--bg-secondary);
      }
      
      ::-webkit-scrollbar-thumb {
        background: var(--border-base);
        border-radius: var(--radius-full);
      }
      
      ::-webkit-scrollbar-thumb:hover {
        background: var(--border-strong);
      }
      
      /* Responsive styles for AppShell */
      @media (max-width: 768px) {
        .sidebar {
          display: none !important;
        }

        .mobile-menu-button {
          display: block !important;
        }

        .global-search {
          display: none;
        }

        main {
          padding: var(--space-4) !important;
        }
      }

      @media (min-width: 769px) {
        .mobile-menu-button {
          display: none !important;
        }
      }

      /* Accessibility improvements */
      button:focus-visible,
      a:focus-visible,
      input:focus-visible,
      select:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
      }

      /* Smooth transitions */
      .sidebar {
        transition: transform 0.3s ease;
      }
    `}</style>
  );
}
