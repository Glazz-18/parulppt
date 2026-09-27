'use client';

import type { CSSProperties } from 'react';
import type { Metric } from '@/lib/types';

export type BigNumberProps = Metric;

const valueStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'clamp(64px, 8vw, 140px)',
  lineHeight: 1,
  color: 'var(--fg)',
};

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  letterSpacing: '0.08em',
  color: 'var(--muted)',
};

const versusLabelStyle: CSSProperties = {
  ...labelStyle,
  fontSize: '0.32em',
};

export function BigNumber({ value, label, heading, versus }: BigNumberProps) {
  return (
    <div>
      {heading ? (
        <p data-part="label" style={labelStyle}>
          {heading}
        </p>
      ) : null}
      <p style={valueStyle}>
        <span data-part="value">{value}</span>
        {versus ? (
          <>
            {' '}
            <span data-part="label" style={versusLabelStyle}>
              {versus[0]}
            </span>{' '}
            <span data-part="value">{versus[1]}</span>
          </>
        ) : null}
      </p>
      {label ? (
        <p data-part="label" style={labelStyle}>
          {label}
        </p>
      ) : null}
    </div>
  );
}
