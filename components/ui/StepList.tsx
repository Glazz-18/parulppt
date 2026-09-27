'use client';

import type { CSSProperties } from 'react';
import type { Step } from '@/lib/types';

export type StepListProps = { items: Step[] };

const numberStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  color: 'var(--label)',
};

export function StepList({ items }: StepListProps) {
  return (
    <ol>
      {items.map((step, index) => (
        <li key={`${step.n}-${index}`} data-part="step">
          <span style={numberStyle}>{step.n}</span>
          {step.term ? <strong>{step.term}</strong> : null}
          <span>{step.text}</span>
        </li>
      ))}
    </ol>
  );
}
