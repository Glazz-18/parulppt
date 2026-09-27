'use client';

import type { CSSProperties } from 'react';
import type { Mark } from '@/lib/types';

export type TimelineProps = { items: Mark[] };

const atStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  color: 'var(--label)',
};

export function Timeline({ items }: TimelineProps) {
  return (
    <ol>
      {items.map((mark, index) => (
        <li key={`${mark.at}-${index}`} data-part="mark">
          <span style={atStyle}>{mark.at}</span>
          <span>{mark.text}</span>
        </li>
      ))}
    </ol>
  );
}
