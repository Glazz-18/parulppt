'use client';

import { useEffect, useState, type CSSProperties, type ReactElement } from 'react';
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

// I3: the 4 real events interleaved among the noise rows at deterministic positions (no
// Math.random — CONTRACTS §11 render determinism), so the queue reads dense the way design §11
// intends instead of showing all 12 blanks before any event. Groups noise rows evenly around each
// event; any remainder from an uneven split lands after the last event.
type QueueRow = { kind: 'noise'; key: string } | { kind: 'event'; index: 0 | 1 | 2 | 3 };

const QUEUE_ROW_ORDER: QueueRow[] = (() => {
  const perGroup = Math.floor(SOC_NOISE_ROWS / linkedEvents.length);
  const rows: QueueRow[] = [];
  let noiseCount = 0;
  const pushNoise = (n: number) => {
    for (let i = 0; i < n; i++) rows.push({ kind: 'noise', key: `noise-${noiseCount++}` });
  };
  linkedEvents.forEach((_, i) => {
    pushNoise(perGroup);
    rows.push({ kind: 'event', index: i as 0 | 1 | 2 | 3 });
  });
  pushNoise(SOC_NOISE_ROWS - noiseCount); // any remainder from an uneven split
  return rows;
})();

const noiseRowStyle: CSSProperties = {
  height: '1.4em',
  background: 'var(--muted)',
  opacity: 0.3,
};

// Correlated+ (§9.3): the 4 events join in order as one visible chain — a connecting rule down
// the list, not just plain sibling <li>s (I3's "no chain treatment" gap).
const chainItemStyle: CSSProperties = {
  borderInlineStart: '2px solid var(--rule)',
  marginInlineStart: '0.35em',
  paddingInlineStart: '0.75em',
};

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

  // Rows in QUEUE_ROW_ORDER's fixed, interleaved positions; noise rows only exist while queue-like
  // (their motion.li exit animates away on CORRELATE), event rows persist across the boundary
  // under the same key so they morph in place (interactive -> highlighted -> chain) rather than
  // remounting.
  const queueRows: ReactElement[] = QUEUE_ROW_ORDER.flatMap((row) => {
    if (row.kind === 'noise') {
      return isQueueLike
        ? [<motion.li key={row.key} aria-hidden="true" exit={{ opacity: 0 }} style={noiseRowStyle} />]
        : [];
    }
    const idx = row.index;
    const text = linkedEvents[idx];
    if (!isQueueLike) {
      return [
        <li key={`event-${idx}`} style={chainItemStyle}>
          {text}
        </li>,
      ];
    }
    const highlighted = model.state === 'investigating' && model.inspected === idx;
    if (highlighted) {
      const parts = parseEvent(text);
      return [
        <li key={`event-${idx}`} data-highlighted="true" style={{ border: '1px solid var(--fg)' }}>
          <span>{parts.time}</span> <span>{parts.source}</span> <span>{parts.detail}</span>
        </li>,
      ];
    }
    return [
      <li key={`event-${idx}`}>
        <button type="button" className="demo-btn" onClick={() => dispatch({ type: 'INSPECT', event: idx })}>
          {text}
        </button>
      </li>,
    ];
  });

  return (
    <DemoShell
      scene={scene}
      label={UI_COPY.soc[model.state]}
      tone={TONE[model.state]}
      detail={detail}
      onReset={() => dispatch({ type: 'RESET' })}
      actions={
        isQueueLike ? (
          <button type="button" className="demo-btn" onClick={() => dispatch({ type: 'CORRELATE' })}>
            {socCopy.copilot}
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-3">
        {isQueueLike ? <MonoLabel as="p">{socCopy.queue}</MonoLabel> : null}
        <ul className="flex flex-col gap-1">
          <AnimatePresence initial={false}>{queueRows}</AnimatePresence>
        </ul>
        <p style={{ color: 'var(--muted)' }}>{socCopy.unrelated}</p>
        {!isQueueLike ? (
          <>
            <div style={{ border: '1px solid var(--rule)' }}>
              <MonoLabel as="p">{socCopy.copilot}</MonoLabel>
              <p>{socCopy.summary}</p>
              <p>{socCopy.evidence}</p>
              {model.state === 'correlated' ? <p>{socCopy.suggested}</p> : null}
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
