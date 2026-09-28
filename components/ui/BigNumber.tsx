'use client';

import type { CSSProperties } from 'react';
import type { Metric } from '@/lib/types';

export type BigNumberProps = Metric;

// design §4 numeric emphasis (64-140px) assumes a short numeric value ("$8.80", "48%"). Several
// deck metrics (CONTRACTS §3.1) are full sentences ("−$1.93M per breach") that overflow the
// pinned viewport at that scale (measured, slide 27: 1284px content in a 796px viewport). Long
// values drop to a compact bold scale instead; the 8-char cutoff separates the deck's short
// numeric metrics from its sentence-shaped ones without touching any copy.
const HERO_VALUE_FONT_SIZE = 'clamp(64px, 8vw, 140px)';
const COMPACT_VALUE_FONT_SIZE = 'clamp(28px, 3.4vw, 52px)';
const LONG_VALUE_THRESHOLD = 8;

function valueStyleFor(value: string): CSSProperties {
  const isLong = value.length > LONG_VALUE_THRESHOLD;
  return {
    fontFamily: 'var(--font-sans)',
    // Review fix (round 2 addendum): fontWeight:700 was applied to both tiers, which bolded
    // every hero-scale value deck-wide (e.g. slide 24's "$8.80") -- an unrequested typography
    // change. The hero tier had no fontWeight before the length-aware fix (591b0a0); only the
    // compact tier (long, sentence-shaped values, which read thin at their smaller size) needs it.
    ...(isLong ? { fontWeight: 700 } : {}),
    fontSize: isLong ? COMPACT_VALUE_FONT_SIZE : HERO_VALUE_FONT_SIZE,
    lineHeight: 1,
    color: 'var(--fg)',
  };
}

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
      <p style={valueStyleFor(value)}>
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
