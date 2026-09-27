'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DemoShell } from './DemoShell';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { UI_COPY } from '@/lib/constants';
import { track } from '@/lib/analytics';
import {
  campusBot,
  campusBotCopy,
  campusBotInitial,
  campusBotReducer,
  type CampusBotAction,
  type CampusBotState,
} from '@/lib/demoState';
import type { SceneProps } from '@/lib/types';

const TONE: Record<CampusBotState, 'neutral' | 'safe' | 'alert'> = {
  baseline: 'neutral',
  roleplay: 'neutral',
  'guardrail-off': 'alert',
  'guardrail-on': 'safe',
};

const DETAIL: Record<CampusBotState, string> = {
  baseline: campusBotCopy.refusal,
  roleplay: campusBotCopy.roleplay,
  'guardrail-off': campusBotCopy.leak,
  'guardrail-on': campusBotCopy.blocked,
};

function WarningIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="14" height="14">
      <path d="M8 1 15 14H1Z" fill="none" stroke="var(--orange)" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="8" y1="6" x2="8" y2="9.5" stroke="var(--orange)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="12" r="0.75" fill="var(--orange)" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="14" height="14">
      <path
        d="M8 1 14 3.5V8c0 4-2.7 6.3-6 7-3.3-.7-6-3-6-7V3.5Z"
        fill="none"
        stroke="var(--green)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CampusBotDemo({ scene }: SceneProps) {
  const [state, setState] = useState<CampusBotState>(campusBotInitial);

  function dispatch(action: CampusBotAction) {
    const next = campusBotReducer(state, action);
    if (next === state) return;
    setState(next);
    track('demo_interaction', { slide: 4, demo: 'campusbot', action, from: state, to: next });
  }

  const showRoleplay = state !== 'baseline';
  const showLeak = state === 'guardrail-off';
  const showBlocked = state === 'guardrail-on';

  return (
    <DemoShell
      scene={scene}
      label={campusBotCopy.labels[state]}
      tone={TONE[state]}
      detail={DETAIL[state]}
      caption={UI_COPY.fictional}
      onReset={() => dispatch('RESET')}
      actions={
        state === 'baseline' ? (
          <button type="button" className="demo-btn" onClick={() => dispatch('ROLEPLAY')}>
            {campusBotCopy.labels.roleplay}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="demo-btn"
              aria-pressed={state === 'guardrail-off'}
              onClick={() => dispatch('GUARDRAIL_OFF')}
            >
              {campusBotCopy.labels['guardrail-off']}
            </button>
            <button
              type="button"
              className="demo-btn"
              aria-pressed={state === 'guardrail-on'}
              onClick={() => dispatch('GUARDRAIL_ON')}
            >
              {campusBotCopy.labels['guardrail-on']}
            </button>
          </>
        )
      }
    >
      <div className="flex flex-col gap-3">
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--muted)',
            border: '1px solid var(--rule)',
            padding: '0.75em 1em',
          }}
        >
          <MonoLabel as="span" tone="muted">
            {campusBotCopy.systemLabel}
          </MonoLabel>
          <p>{campusBot.system}</p>
        </div>
        <div style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--rule)' }}>
          <MonoLabel as="span">{campusBotCopy.user}</MonoLabel>
          <p>{campusBotCopy.question}</p>
        </div>
        {/* I4 (residual): this card was the last cream (--fg) background in the demo — its
            default-tone MonoLabel renders --label (--orange on this dark+accent-orange scene)
            on cream at ~2.3:1. Moved to the dark ground (--bg) with --fg text, matching every
            other card in this demo (the user/roleplay/leak cards all sit on --bg), so the label
            is orange-on-dark like the rest. */}
        <div style={{ backgroundColor: 'var(--bg)', color: 'var(--fg)', border: '1px solid var(--rule)' }}>
          <MonoLabel as="span">{campusBotCopy.bot}</MonoLabel>
          <p>{campusBotCopy.refusal}</p>
        </div>
        <AnimatePresence>
          {showRoleplay && (
            <motion.div
              key="roleplay"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--rule)' }}
            >
              <MonoLabel as="span">{campusBotCopy.user}</MonoLabel>
              <p>{campusBotCopy.roleplay}</p>
            </motion.div>
          )}
          {showLeak && (
            <motion.div
              key="leak"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              // I4: on this dark scene, --fg is cream — --orange text on it measures ~2.3:1. The
              // leak card instead sits on the dark ground (--bg) with --orange text, which is the
              // same accent/background pairing already used elsewhere on dark+orange-accent
              // scenes, keeping the warning icon.
              style={{ backgroundColor: 'var(--bg)', color: 'var(--orange)', border: '1px solid var(--rule)' }}
            >
              <MonoLabel as="span" tone="muted">
                {campusBotCopy.bot}
              </MonoLabel>
              <p>
                <WarningIcon /> {campusBotCopy.leak}
              </p>
            </motion.div>
          )}
          {showBlocked && (
            <motion.div
              key="blocked"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{ color: 'var(--green)' }}
            >
              <p>
                <ShieldIcon /> {campusBotCopy.blocked}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DemoShell>
  );
}

export default CampusBotDemo;
