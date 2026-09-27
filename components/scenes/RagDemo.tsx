'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { DemoShell } from './DemoShell';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { UI_COPY } from '@/lib/constants';
import { track } from '@/lib/analytics';
import {
  ragCopy,
  ragDocs,
  ragInitial,
  ragRanking,
  ragReducer,
  type RagAction,
  type RagState,
} from '@/lib/demoState';
import type { SceneProps } from '@/lib/types';

const TONE: Record<RagState, 'neutral' | 'safe' | 'alert'> = {
  before: 'neutral',
  poisoned: 'alert',
  fixed: 'safe',
};

const STEP_ORDER: RagState[] = ['before', 'poisoned', 'fixed'];

function nextActionFor(state: RagState, step: RagState): RagAction | null {
  if (state === 'before' && step === 'poisoned') return 'PLANT';
  if (state === 'poisoned' && step === 'fixed') return 'FIX';
  return null;
}

function WarningIcon() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="14" height="14">
      <path d="M8 1 15 14H1Z" fill="none" stroke="var(--orange)" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="8" y1="6" x2="8" y2="9.5" stroke="var(--orange)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="12" r="0.75" fill="var(--orange)" />
    </svg>
  );
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

function TrustBadge({ trust }: { trust: 'approved' | 'unapproved' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4em' }}>
      {trust === 'approved' ? <CheckIcon /> : <WarningIcon />}
      {trust}
    </span>
  );
}

function AnswerText({ state }: { state: RagState }) {
  const answer = ragCopy.answers[state];
  const linkIndex = state === 'poisoned' ? answer.indexOf(ragCopy.link) : -1;

  if (linkIndex === -1) {
    return <>{answer}</>;
  }

  const prefix = answer.slice(0, linkIndex);
  const suffix = answer.slice(linkIndex + ragCopy.link.length);

  return (
    <>
      {prefix}
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3em' }}>
        <WarningIcon />
        {ragCopy.link}
      </span>
      {suffix}
    </>
  );
}

export function RagDemo({ scene }: SceneProps) {
  const [state, setState] = useState<RagState>(ragInitial);

  function dispatch(action: RagAction) {
    const next = ragReducer(state, action);
    if (next === state) return;
    setState(next);
    track('demo_interaction', { slide: scene.slide, demo: 'rag', action, from: state, to: next });
  }

  return (
    <DemoShell
      scene={scene}
      label={ragCopy.labels[state]}
      tone={TONE[state]}
      detail={ragCopy.answers[state]}
      onReset={() => dispatch('RESET')}
      actions={
        <>
          {STEP_ORDER.map((step) => {
            const action = nextActionFor(state, step);
            return (
              <button
                key={step}
                type="button"
                aria-current={step === state ? 'step' : undefined}
                disabled={action === null}
                onClick={() => {
                  if (action) dispatch(action);
                }}
              >
                {ragCopy.labels[step]}
              </button>
            );
          })}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div>
          <MonoLabel as="p">{ragCopy.index}</MonoLabel>
          <table>
            <thead>
              <tr>
                <th scope="col"></th>
                <th scope="col">{UI_COPY.relevance}</th>
                <th scope="col">{UI_COPY.authorization}</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {ragRanking[state].map((name, i) => {
                  const doc = ragDocs.find((d) => d.name === name)!;
                  const isPoisonedRow = Boolean(doc.poisoned);
                  const showHidden = isPoisonedRow && state !== 'before';
                  const struck = state === 'fixed' && isPoisonedRow;
                  const rowText = (
                    <>
                      {name}
                      {showHidden ? <p style={{ color: 'var(--muted)' }}>{ragCopy.hidden}</p> : null}
                    </>
                  );

                  return (
                    <motion.tr
                      key={name}
                      initial={isPoisonedRow ? { opacity: 0, y: -8 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <th scope="row">{struck ? <s>{rowText}</s> : rowText}</th>
                      <td>{i + 1}</td>
                      <td>
                        <TrustBadge trust={doc.trust} />
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        <div style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--rule)' }}>
          <p>{ragCopy.question}</p>
          <p>
            <AnswerText state={state} />
          </p>
        </div>
      </div>
    </DemoShell>
  );
}

export default RagDemo;
