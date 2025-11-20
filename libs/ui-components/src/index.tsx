import React from 'react';

// ============================================================================
// Card Components
// ============================================================================

export interface CardProps {
  title?: string;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'elevated' | 'outlined' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}

export function Card({ title, children, className = '', onClick, variant = 'default', padding = 'md', style }: CardProps) {
  const baseStyles: React.CSSProperties = {
    background: 'var(--surface-base)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border-subtle)',
    transition: 'all var(--transition-base)',
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    default: {},
    elevated: {
      boxShadow: 'var(--shadow-md)',
      border: 'none',
    },
    outlined: {
      border: '1px solid var(--border-base)',
    },
    interactive: {
      cursor: onClick ? 'pointer' : 'default',
      border: '1px solid var(--border-subtle)',
    },
  };

  const paddingStyles: Record<string, React.CSSProperties> = {
    none: { padding: 0 },
    sm: { padding: 'var(--space-3)' },
    md: { padding: 'var(--space-4)' },
    lg: { padding: 'var(--space-6)' },
  };

  const hoverStyles = onClick
    ? {
        ':hover': {
          borderColor: 'var(--border-base)',
          boxShadow: 'var(--shadow-sm)',
          transform: 'translateY(-1px)',
        },
      }
    : {};

  return (
    <section
      className={className}
      style={{ ...baseStyles, ...variantStyles[variant], ...paddingStyles[padding], ...style }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = 'var(--border-base)';
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'none';
        }
      }}
    >
      {title && (
        <h2 style={{ margin: '0 0 var(--space-4) 0', fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
          {title}
        </h2>
      )}
      <div>{children}</div>
    </section>
  );
}

// ============================================================================
// Stat/Metric Badge Components
// ============================================================================

export interface StatProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
}

export function Stat({ label, value, trend, trendValue, icon, size = 'md', variant = 'default' }: StatProps) {
  const sizeStyles = {
    sm: { fontSize: 'var(--text-sm)', gap: 'var(--space-2)' },
    md: { fontSize: 'var(--text-base)', gap: 'var(--space-3)' },
    lg: { fontSize: 'var(--text-xl)', gap: 'var(--space-4)' },
  };

  const variantColors = {
    default: { color: 'var(--text-primary)' },
    primary: { color: 'var(--color-primary)' },
    success: { color: 'var(--color-success)' },
    warning: { color: 'var(--color-warning)' },
    error: { color: 'var(--color-error)' },
  };

  const trendColors = {
    up: { color: 'var(--color-success)' },
    down: { color: 'var(--color-error)' },
    neutral: { color: 'var(--text-tertiary)' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontWeight: 'var(--font-medium)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: sizeStyles[size].gap }}>
        {icon && <span style={{ display: 'flex', alignItems: 'center' }}>{icon}</span>}
        <span style={{ fontSize: sizeStyles[size].fontSize, fontWeight: 'var(--font-semibold)', ...variantColors[variant] }}>
          {value}
        </span>
        {trend && trendValue && (
          <span
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-medium)',
              ...trendColors[trend],
            }}
          >
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Badge Component
// ============================================================================

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function Badge({ children, variant = 'default', size = 'md', dot = false }: BadgeProps) {
  const variantStyles: Record<string, React.CSSProperties> = {
    default: {
      background: 'var(--surface-muted)',
      color: 'var(--text-secondary)',
    },
    primary: {
      background: 'var(--color-primary-bg)',
      color: 'var(--color-primary-text)',
    },
    success: {
      background: 'var(--color-success-bg)',
      color: 'var(--color-success)',
    },
    warning: {
      background: 'var(--color-warning-bg)',
      color: 'var(--color-warning)',
    },
    error: {
      background: 'var(--color-error-bg)',
      color: 'var(--color-error)',
    },
    info: {
      background: 'var(--color-info-bg)',
      color: 'var(--color-info)',
    },
  };

  const sizeStyles = {
    sm: {
      fontSize: 'var(--text-xs)',
      padding: 'var(--space-1) var(--space-2)',
      borderRadius: 'var(--radius-sm)',
    },
    md: {
      fontSize: 'var(--text-sm)',
      padding: 'var(--space-1) var(--space-3)',
      borderRadius: 'var(--radius-md)',
    },
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        fontWeight: 'var(--font-medium)',
        ...variantStyles[variant],
        ...sizeStyles[size],
      }}
    >
      {dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: 'var(--radius-full)',
            background: 'currentColor',
          }}
        />
      )}
      {children}
    </span>
  );
}

// ============================================================================
// Button Component
// ============================================================================

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  style,
  ...props
}: ButtonProps) {
  const baseStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--space-2)',
    fontWeight: 'var(--font-medium)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
    transition: 'all var(--transition-fast)',
    fontFamily: 'inherit',
    opacity: disabled || isLoading ? 0.6 : 1,
    width: fullWidth ? '100%' : 'auto',
  };

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: {
      padding: 'var(--space-2) var(--space-3)',
      fontSize: 'var(--text-sm)',
    },
    md: {
      padding: 'var(--space-3) var(--space-4)',
      fontSize: 'var(--text-base)',
    },
    lg: {
      padding: 'var(--space-4) var(--space-6)',
      fontSize: 'var(--text-lg)',
    },
  };

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: {
      background: 'var(--color-primary)',
      color: 'var(--text-inverse)',
    },
    secondary: {
      background: 'var(--color-secondary-bg)',
      color: 'var(--color-secondary-text)',
    },
    outline: {
      background: 'transparent',
      color: 'var(--color-primary)',
      border: '1px solid var(--border-base)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
    },
    danger: {
      background: 'var(--color-error)',
      color: 'var(--text-inverse)',
    },
  };

  const combinedStyles = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
  };

  return (
    <button
      className={className}
      style={{ ...combinedStyles, ...style }}
      disabled={disabled || isLoading}
      onMouseEnter={(e) => {
        if (!disabled && !isLoading) {
          if (variant === 'primary') e.currentTarget.style.background = 'var(--color-primary-hover)';
          else if (variant === 'secondary') e.currentTarget.style.background = 'var(--surface-hover)';
          else if (variant === 'outline') e.currentTarget.style.borderColor = 'var(--color-primary-hover)';
          else if (variant === 'ghost') e.currentTarget.style.background = 'var(--surface-hover)';
          else if (variant === 'danger') e.currentTarget.style.background = '#dc2626';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isLoading) {
          if (variant === 'primary') e.currentTarget.style.background = 'var(--color-primary)';
          else if (variant === 'secondary') e.currentTarget.style.background = 'var(--color-secondary-bg)';
          else if (variant === 'outline') e.currentTarget.style.borderColor = 'var(--border-base)';
          else if (variant === 'ghost') e.currentTarget.style.background = 'transparent';
          else if (variant === 'danger') e.currentTarget.style.background = 'var(--color-error)';
        }
      }}
      {...props}
    >
      {isLoading ? (
        <>
          <span
            style={{
              width: '14px',
              height: '14px',
              border: '2px solid currentColor',
              borderTopColor: 'transparent',
              borderRadius: 'var(--radius-full)',
              animation: 'spin 0.6s linear infinite',
            }}
          />
          Loading...
        </>
      ) : (
        <>
          {leftIcon && <span>{leftIcon}</span>}
          {children}
          {rightIcon && <span>{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: ButtonProps['variant'];
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action, secondaryAction }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-16) var(--space-4)',
        textAlign: 'center',
        color: 'var(--text-secondary)',
      }}
    >
      {icon && (
        <div
          style={{
            fontSize: '4rem',
            marginBottom: 'var(--space-4)',
            opacity: 0.5,
            color: 'var(--text-tertiary)',
          }}
        >
          {icon}
        </div>
      )}
      <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', margin: '0 0 var(--space-2) 0' }}>
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-secondary)', margin: '0 0 var(--space-6) 0', maxWidth: '400px' }}>
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
          {action && (
            <Button variant={action.variant || 'primary'} onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Sparkline Component
// ============================================================================

export interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  showArea?: boolean;
}

export function Sparkline({ data, width = 100, height = 30, color = 'var(--color-primary)', strokeWidth = 2, showArea = false }: SparklineProps) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          width,
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-tertiary)',
          fontSize: 'var(--text-xs)',
        }}
      >
        No data
      </div>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 4;

  const points = data.map((value, index) => {
    const x = ((index / (data.length - 1)) * (width - padding * 2) + padding) || padding;
    const y = height - ((value - min) / range) * (height - padding * 2) - padding;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(' L ')}`;

  const areaPath = showArea
    ? `M ${padding},${height - padding} L ${points[0]} L ${pathData.replace('M ', '')} L ${width - padding},${height - padding} Z`
    : '';

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {showArea && areaPath && (
        <path d={areaPath} fill={color} opacity="0.2" style={{ transition: 'all var(--transition-base)' }} />
      )}
      <path
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition: 'all var(--transition-base)' }}
      />
    </svg>
  );
}

// ============================================================================
// Grid Layout Component
// ============================================================================

export interface GridProps {
  children: React.ReactNode;
  columns?: number | { sm?: number; md?: number; lg?: number };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
  style?: React.CSSProperties;
}

export function Grid({ children, columns = 3, gap = 'md', className = '', style }: GridProps) {
  const gapSizes = {
    sm: 'var(--space-2)',
    md: 'var(--space-4)',
    lg: 'var(--space-6)',
  };

  if (typeof columns === 'number') {
    return (
      <div
        className={className}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: gapSizes[gap],
          ...style,
        }}
      >
        {children}
      </div>
    );
  }

  const sm = columns.sm || 1;
  const md = columns.md || columns.sm || 2;
  const lg = columns.lg || columns.md || columns.sm || 3;

  // Use a stable ID based on the column configuration
  const gridClass = `grid-${sm}-${md}-${lg}`;

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          .${gridClass} {
            display: grid;
            grid-template-columns: repeat(${sm}, 1fr);
            gap: ${gapSizes[gap]};
          }
          @media (min-width: 769px) {
            .${gridClass} {
              grid-template-columns: repeat(${md}, 1fr) !important;
            }
          }
          @media (min-width: 1025px) {
            .${gridClass} {
              grid-template-columns: repeat(${lg}, 1fr) !important;
            }
          }
        `
      }} />
      <div
        className={`${className} ${gridClass}`}
        style={style}
      >
        {children}
      </div>
    </>
  );
}

// ============================================================================
// Loading Spinner
// ============================================================================

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: '16px',
    md: '24px',
    lg: '32px',
  };

  return (
    <div
      style={{
        width: sizes[size],
        height: sizes[size],
        border: '3px solid var(--border-subtle)',
        borderTopColor: 'var(--color-primary)',
        borderRadius: 'var(--radius-full)',
        animation: 'spin 0.6s linear infinite',
      }}
    />
  );
}

// Add keyframes for spinner animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  if (!document.head.querySelector('style[data-spinner]')) {
    style.setAttribute('data-spinner', 'true');
    document.head.appendChild(style);
  }
}
