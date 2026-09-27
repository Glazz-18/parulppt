'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DemoShell } from './DemoShell';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { ApprovalGate } from '@/components/ui/ApprovalGate';
import { UI_COPY } from '@/lib/constants';
import { track } from '@/lib/analytics';
import { useDemoEscape } from '@/lib/sceneNavigation';
import {
  linkedEvents,
  socCopy,
  socInitial,
  socReducer,
  SOC_NOISE_ROWS,
  SOC_PROPOSE_DELAY_MS,
  type SocAction,
  type SocModel,
  type SocState,
} from '@/lib/demoState';
import type { SceneProps } from '@/lib/types';

const TONE: Record<SocState, 'neutral' | 'safe' | 'alert'> = {
  queue: 'neutral',
  investigating: 'neutral',
  correlated: 'neutral',
  'pending-approval': 'alert',
  approved: 'safe',
  rejected: 'neutral',
};

const DETAIL: Record<SocState, string> = {
  queue: socCopy.queue,
  investigating: '', // computed from linkedEvents[inspected] below
  correlated: socCopy.evidence,
  'pending-approval': socCopy.gate,
  approved: '–',
  rejected: '–',
};

// "15:02 Mail · link clicked" -> { time: "15:02", source: "Mail", detail: "link clicked" }
function parseEvent(raw: string) {
  const match = raw.match(/^(\S+) (.+?) · (.+)$/);
  if (!match) return { time: raw, source: '', detail: '' };
  const [, time, source, detail] = match;
  return { time, source, detail };
}

// Event time only, never during render (CONTRACTS §11): read inside the PROPOSE effect below.
function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="14" height="14">
      <path
        d="M3 8.5 6.5 12 13 4"
        fill="none"
        stroke="var(--green)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SocDemo({ scene }: SceneProps) {
  const [model, setModel] = useState<SocModel>(socInitial);

  function dispatch(action: SocAction) {
    const next = socReducer(model, action);
    // Value equality, not reference: socModel is an object, so even a defined transition (e.g. RESET
    // from queue) can return a structurally-identical-but-new object; both cases are no-ops here,
    // same as the primitive-state reducers' natural by-value no-op (also guards ApprovalGate's
    // non-disabling buttons against repeat APPROVE/REJECT presses).
    if (next.state === model.state && next.inspected === model.inspected) return;
    setModel(next);
    track('demo_interaction', {
      slide: scene.slide,
      demo: 'soc',
      action: action.type,
      from: model.state,
      to: next.state,
    });
  }

  useDemoEscape(23, model.state === 'investigating' ? () => dispatch({ type: 'CLOSE' }) : null);

  useEffect(() => {
    if (model.state !== 'correlated') return undefined;
    const delay = prefersReducedMotion() ? 0 : SOC_PROPOSE_DELAY_MS;
    const id = setTimeout(() => dispatch({ type: 'PROPOSE' }), delay);
    return () => clearTimeout(id);
    // model.state alone gates this effect; dispatch closes over the current model each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.state]);

  const isQueueLike = model.state === 'queue' || model.state === 'investigating';
  const detail =
    model.state === 'investigating' && model.inspected !== null
      ? linkedEvents[model.inspected]
      : DETAIL[model.state];

  return (
    <DemoShell
      scene={scene}
      label={UI_COPY.soc[model.state]}
      tone={TONE[model.state]}
      detail={detail}
      onReset={() => dispatch({ type: 'RESET' })}
      actions={
        isQueueLike ? (
          <button type="button" onClick={() => dispatch({ type: 'CORRELATE' })}>
            {socCopy.copilot}
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        {isQueueLike ? <MonoLabel as="p">{socCopy.queue}</MonoLabel> : null}
        <ul className="flex flex-col gap-1">
          <AnimatePresence initial={false}>
            {isQueueLike
              ? Array.from({ length: SOC_NOISE_ROWS }, (_, i) => (
                  <motion.li key={`noise-${i}`} aria-hidden="true" exit={{ opacity: 0 }} />
                ))
              : null}
          </AnimatePresence>
          {linkedEvents.map((text, i) => {
            const idx = i as 0 | 1 | 2 | 3;
            if (!isQueueLike) {
              return <li key={i}>{text}</li>; // correlated+: plain chain item, no longer interactive
            }
            const highlighted = model.state === 'investigating' && model.inspected === idx;
            if (highlighted) {
              const parts = parseEvent(text);
              return (
                <li key={i} data-highlighted="true" style={{ border: '1px solid var(--fg)' }}>
                  <span>{parts.time}</span> <span>{parts.source}</span> <span>{parts.detail}</span>
                </li>
              );
            }
            return (
              <li key={i}>
                <button type="button" onClick={() => dispatch({ type: 'INSPECT', event: idx })}>
                  {text}
                </button>
              </li>
            );
          })}
        </ul>
        <p style={{ color: 'var(--muted)' }}>{socCopy.unrelated}</p>
        {!isQueueLike ? (
          <>
            <div style={{ border: '1px solid var(--rule)' }}>
              <MonoLabel as="p">{socCopy.copilot}</MonoLabel>
              <p>{socCopy.summary}</p>
              <p>{socCopy.evidence}</p>
              <p>
                {model.state === 'approved' ? <CheckIcon /> : null}{' '}
                {model.state === 'rejected' ? <s>{socCopy.suggested}</s> : socCopy.suggested}
              </p>
            </div>
            {model.state !== 'correlated' ? (
              <ApprovalGate
                mode="click"
                heading={socCopy.gate}
                proposal={socCopy.suggested}
                approveLabel={socCopy.approve}
                rejectLabel={socCopy.reject}
                outcome={model.state === 'approved' ? 'approved' : model.state === 'rejected' ? 'rejected' : 'pending'}
                onApprove={() => dispatch({ type: 'APPROVE' })}
                onReject={() => dispatch({ type: 'REJECT' })}
              />
            ) : null}
          </>
        ) : null}
      </div>
    </DemoShell>
  );
}

export default SocDemo;
