"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useAuth } from '../../providers/AuthContext';
import { useTheme } from '../../providers/ThemeContext';
import { Button } from '@lca/ui-components';

interface NavItem {
  label: string;
  href: string;
  icon?: string;
  badge?: number;
}

interface AppShellProps {
  orgId?: string;
  children: React.ReactNode;
}

export function AppShell({ orgId, children }: AppShellProps) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const params = useParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orgs, setOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [currentOrg, setCurrentOrg] = useState<{ id: string; name: string } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const { apiFetch } = useAuth();

  const currentOrgId = orgId || (params?.orgId as string);

  useEffect(() => {
    if (user) {
      loadOrgs();
    }
  }, [user]);

  useEffect(() => {
    if (currentOrgId && orgs.length > 0) {
      const org = orgs.find((o) => o.id === currentOrgId);
      if (org) setCurrentOrg(org);
    }
  }, [currentOrgId, orgs]);

  async function loadOrgs() {
    try {
      const res = await apiFetch(`${apiBase}/orgs`);
      const json = await res.json();
      if (res.ok && json.orgs) {
        setOrgs(json.orgs);
      }
    } catch (err) {
      console.warn('Failed to load orgs', err);
    }
  }

  async function handleSearch(query: string) {
    if (!query.trim() || !currentOrgId) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await apiFetch(`${apiBase}/orgs/${currentOrgId}/search?q=${encodeURIComponent(query)}`);
      const json = await res.json();
      if (res.ok && json.results) {
        setSearchResults(json.results);
      }
    } catch (err) {
      console.warn('Search failed', err);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchQuery) handleSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const navItems: NavItem[] = currentOrgId
    ? [
        { label: 'Dashboard', href: `/orgs/${currentOrgId}/dashboard`, icon: '📊' },
        { label: 'Functions', href: `/orgs/${currentOrgId}/functions`, icon: '⚡' },
        { label: 'Bundles', href: `/orgs/${currentOrgId}/bundles`, icon: '📦' },
        { label: 'Alerts', href: `/orgs/${currentOrgId}/alerts`, icon: '🔔' },
        { label: 'Settings', href: '/settings/aws-accounts', icon: '⚙️' },
      ]
    : [];

  const isActive = (href: string) => {
    if (href === '/dashboard' || href.includes('/dashboard')) {
      return pathname?.includes('/dashboard');
    }
    return pathname === href || pathname?.startsWith(href + '/');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: 'var(--bg-primary)',
      }}
    >
      {/* Top Bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 'var(--z-sticky)',
          background: 'var(--surface-base)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: 'var(--space-3) var(--space-4)',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
        }}
      >
        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: currentOrgId ? 'block' : 'none',
            background: 'none',
            border: 'none',
            fontSize: 'var(--text-xl)',
            cursor: 'pointer',
            padding: 'var(--space-2)',
            color: 'var(--text-primary)',
          }}
          aria-label="Toggle menu"
          className="mobile-menu-button"
        >
          ☰
        </button>

        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', textDecoration: 'none', color: 'var(--text-primary)' }}>
          <span style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)' }}>⚡</span>
          <span style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)' }}>LCA</span>
        </Link>

        {/* Org Switcher */}
        {currentOrgId && orgs.length > 0 && (
          <div style={{ position: 'relative', marginLeft: 'auto' }}>
            <select
              value={currentOrgId}
              onChange={(e) => {
                const newOrg = orgs.find((o) => o.id === e.target.value);
                if (newOrg) {
                  window.location.href = `/orgs/${newOrg.id}/dashboard`;
                }
              }}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-base)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                fontWeight: 'var(--font-medium)',
                cursor: 'pointer',
              }}
            >
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Global Search */}
        {currentOrgId && (
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }} className="global-search">
            <input
              type="text"
              placeholder="Search functions, dashboards..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
              style={{
                width: '100%',
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
              }}
            />
            {searchOpen && searchResults.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: 'var(--space-1)',
                  background: 'var(--surface-base)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  zIndex: 'var(--z-dropdown)',
                }}
              >
                {searchResults.map((result) => (
                  <Link
                    key={result.id}
                    href={result.href}
                    style={{
                      display: 'block',
                      padding: 'var(--space-3)',
                      textDecoration: 'none',
                      color: 'var(--text-primary)',
                      borderBottom: '1px solid var(--border-subtle)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <div style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)' }}>{result.label}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>
                      {result.type} {result.meta && `• ${result.meta}`}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 'var(--text-lg)',
            cursor: 'pointer',
            padding: 'var(--space-2)',
            color: 'var(--text-secondary)',
            borderRadius: 'var(--radius-md)',
          }}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {/* User Menu */}
        {user && (
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-inverse)',
                  fontWeight: 'var(--font-semibold)',
                  fontSize: 'var(--text-sm)',
                }}
              >
                {user.name?.[0]?.toUpperCase() || user.email[0]?.toUpperCase() || 'U'}
              </div>
              <span style={{ fontSize: 'var(--text-sm)', display: 'none' }}>{user.name || user.email}</span>
            </button>
            {userMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 'var(--space-2)',
                  background: 'var(--surface-base)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  minWidth: '200px',
                  zIndex: 'var(--z-dropdown)',
                }}
              >
                <div style={{ padding: 'var(--space-3)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontWeight: 'var(--font-semibold)', fontSize: 'var(--text-sm)' }}>{user.name || 'User'}</div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>{user.email}</div>
                </div>
                <div style={{ padding: 'var(--space-1)' }}>
                  <button
                    onClick={() => {
                      signOut();
                      setUserMenuOpen(false);
                      window.location.href = '/';
                    }}
                    style={{
                      width: '100%',
                      padding: 'var(--space-2) var(--space-3)',
                      background: 'none',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      fontSize: 'var(--text-sm)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--surface-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        {currentOrgId && (
          <aside
            style={{
              width: '240px',
              background: 'var(--surface-base)',
              borderRight: '1px solid var(--border-subtle)',
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              overflowY: 'auto',
            }}
            className="sidebar"
          >
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  color: isActive(item.href) ? 'var(--color-primary)' : 'var(--text-secondary)',
                  background: isActive(item.href) ? 'var(--color-primary-bg)' : 'transparent',
                  fontWeight: isActive(item.href) ? 'var(--font-semibold)' : 'var(--font-normal)',
                  fontSize: 'var(--text-sm)',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive(item.href)) {
                    e.currentTarget.style.background = 'var(--surface-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive(item.href)) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: 'var(--color-error)',
                      color: 'var(--text-inverse)',
                      borderRadius: 'var(--radius-full)',
                      padding: 'var(--space-1) var(--space-2)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--font-semibold)',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            ))}
          </aside>
        )}

        {/* Main Content */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--space-6)',
            background: 'var(--bg-secondary)',
          }}
        >
          {children}
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--bg-overlay)',
            zIndex: 'var(--z-modal-backdrop)',
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
              width: '280px',
              background: 'var(--surface-base)',
              borderRight: '1px solid var(--border-subtle)',
              padding: 'var(--space-4)',
              zIndex: 'var(--z-modal)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h2 style={{ margin: 0, fontSize: 'var(--text-lg)' }}>Menu</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 'var(--text-xl)',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                }}
              >
                ✕
              </button>
            </div>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  color: isActive(item.href) ? 'var(--color-primary)' : 'var(--text-secondary)',
                  background: isActive(item.href) ? 'var(--color-primary-bg)' : 'transparent',
                  marginBottom: 'var(--space-2)',
                }}
              >
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
