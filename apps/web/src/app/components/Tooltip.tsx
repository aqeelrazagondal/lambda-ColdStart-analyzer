"use client";
import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: string | React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function Tooltip({ children, content, position = 'top', delay = 200 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = triggerRect.top + scrollY - tooltipRect.height - 8;
          left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2;
          break;
        case 'bottom':
          top = triggerRect.bottom + scrollY + 8;
          left = triggerRect.left + scrollX + triggerRect.width / 2 - tooltipRect.width / 2;
          break;
        case 'left':
          top = triggerRect.top + scrollY + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.left + scrollX - tooltipRect.width - 8;
          break;
        case 'right':
          top = triggerRect.top + scrollY + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.right + scrollX + 8;
          break;
      }

      setTooltipPosition({ top, left });
    }
  }, [isVisible, position]);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  return (
    <>
      <div ref={triggerRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{ display: 'inline-block' }}>
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            top: tooltipPosition?.top || 0,
            left: tooltipPosition?.left || 0,
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            padding: 'var(--space-2) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-subtle)',
            zIndex: 'var(--z-tooltip)',
            maxWidth: '300px',
            pointerEvents: 'none',
          }}
        >
          {content}
        </div>
      )}
    </>
  );
}

interface InfoTooltipProps {
  content: string | React.ReactNode;
  link?: { href: string; label: string };
}

export function InfoTooltip({ content, link }: InfoTooltipProps) {
  return (
    <Tooltip
      content={
        <div>
          <div style={{ marginBottom: link ? 'var(--space-2)' : 0 }}>{content}</div>
          {link && (
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--color-primary)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-medium)',
                textDecoration: 'none',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {link.label} →
            </a>
          )}
        </div>
      }
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '16px',
          height: '16px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--surface-muted)',
          color: 'var(--text-tertiary)',
          fontSize: 'var(--text-xs)',
          cursor: 'help',
          marginLeft: 'var(--space-1)',
        }}
      >
        ?
      </span>
    </Tooltip>
  );
}

