import React from 'react';

export interface CardProps {
  title: string;
  children?: React.ReactNode;
}

export function Card({ title, children }: CardProps) {
  return (
    <section
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <h2 style={{ margin: '0 0 8px 0', fontSize: 18 }}>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <strong>{label}:</strong>
      <span>{value}</span>
    </div>
  );
}
