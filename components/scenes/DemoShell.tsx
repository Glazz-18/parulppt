'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { StatusPill, type StatusPillProps } from '@/components/ui/StatusPill';
import { UI_COPY } from '@/lib/constants';
import type { Scene } from '@/lib/types';
import { titleStyle } from './ContentScene';

export type DemoShellProps = {
  scene: Scene;
  label: string;
  tone: StatusPillProps['tone'];
  detail: string;
  caption?: string;
  actions?: ReactNode;
  onReset: () => void;
  children: ReactNode;
};

export function DemoShell({ scene, label, tone, detail, caption, actions, onReset, children }: DemoShellProps) {
  // Live-region text is derived during render from the previous props, so it stays empty
  // on mount (including under StrictMode's double-render) and only changes when label or
  // detail actually changes — no effect needed.
  const [prevProps, setPrevProps] = useState({ label, detail });
  const [announcement, setAnnouncement] = useState('');

  if (prevProps.label !== label || prevProps.detail !== detail) {
    setPrevProps({ label, detail });
    setAnnouncement(detail === '–' ? label : `${label} · ${detail}`);
  }

  const subtitle = scene.kind === 'demo' ? scene.content.subtitle : undefined;

  return (
    <div className="flex h-full flex-col gap-6 md:flex-row md:gap-10">
      <div className="flex flex-col gap-3 md:w-1/3">
        {scene.eyebrow ? <MonoLabel as="p">{scene.eyebrow}</MonoLabel> : null}
        {scene.title ? <h2 style={titleStyle}>{scene.title}</h2> : null}
        {subtitle ? <p style={{ color: 'var(--muted)' }}>{subtitle}</p> : null}
        {caption ? <p style={{ color: 'var(--muted)' }}>{caption}</p> : null}
        <StatusPill label={label} tone={tone} />
      </div>
      <div className="flex flex-1 flex-col gap-4">
        {children}
        <div className="flex items-center gap-3">
          {actions}
          <button type="button" className="demo-btn" onClick={onReset}>
            {UI_COPY.reset}
          </button>
        </div>
      </div>
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
