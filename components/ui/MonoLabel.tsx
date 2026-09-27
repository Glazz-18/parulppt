'use client';

import type { CSSProperties, ReactNode } from 'react';

export type MonoLabelProps = {
  as?: 'span' | 'p' | 'h2';
  tone?: 'label' | 'muted';
  children: ReactNode;
};

export function MonoLabel({ as: Tag = 'span', tone = 'label', children }: MonoLabelProps) {
  const style: CSSProperties = {
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.12em',
    color: tone === 'muted' ? 'var(--muted)' : 'var(--label)',
  };

  return (
    <Tag data-tone={tone} className="uppercase" style={style}>
      {children}
    </Tag>
  );
}
