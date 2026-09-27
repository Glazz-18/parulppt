'use client';

import type { CSSProperties } from 'react';

export type StatusPillProps = { label: string; tone: 'neutral' | 'safe' | 'alert' };

const TONE_COLOR: Record<StatusPillProps['tone'], string> = {
  neutral: 'var(--muted)',
  safe: 'var(--green)',
  alert: 'var(--orange)',
};

function ToneIcon({ tone, color }: { tone: StatusPillProps['tone']; color: string }) {
  if (tone === 'safe') {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="14" height="14">
        <path
          d="M3 8.5 6.5 12 13 4"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (tone === 'alert') {
    return (
      <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="14" height="14">
        <path d="M8 1 15 14H1Z" fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="8" y1="6" x2="8" y2="9.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="12" r="0.75" fill={color} />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="14" height="14">
      <circle cx="8" cy="8" r="5" fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export function StatusPill({ label, tone }: StatusPillProps) {
  const color = TONE_COLOR[tone];
  const rootStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4em',
    border: `1px solid ${color}`,
  };
  const labelStyle: CSSProperties = {
    fontFamily: 'var(--font-mono)',
    color: 'var(--fg)',
  };

  return (
    <span data-tone={tone} style={rootStyle}>
      <ToneIcon tone={tone} color={color} />
      <span style={labelStyle}>{label}</span>
    </span>
  );
}
