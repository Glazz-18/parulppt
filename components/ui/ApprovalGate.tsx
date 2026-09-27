'use client';

import type { CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { UI_COPY } from '@/lib/constants';
import { PROGRESS_EPSILON } from '@/lib/sceneNavigation';
import { StatusPill } from './StatusPill';

export type ApprovalGateProps =
  | {
      mode: 'click';
      heading: string;
      proposal: string;
      approveLabel: string;
      rejectLabel: string;
      outcome: 'pending' | 'approved' | 'rejected';
      onApprove: () => void;
      onReject: () => void;
    }
  | { mode: 'scroll'; heading: string; progress: number };

// §9.3 "approved: suggested marked committed" — the StatusPill already carries the green
// check for the outcome itself; this marks the proposal paragraph too, so the commit isn't
// shown only by colour (icon + a connecting rule, same technique as the rejected strikethrough).
function CommittedIcon() {
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

function ScrollIcon({ lit }: { lit: boolean }) {
  const color = lit ? 'var(--green)' : 'var(--rule)';
  if (lit) {
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
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="14" height="14">
      <circle cx="8" cy="8" r="5" fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

export function ApprovalGate(props: ApprovalGateProps) {
  if (props.mode === 'scroll') {
    const { heading, progress } = props;
    // Minor 4: fractional scroll offsets on high-DPR laptops can measure 0.9999 at the sticky
    // range's true end, so the gate must light within PROGRESS_EPSILON of 1, not only at exactly 1.
    const lit = progress >= 1 - PROGRESS_EPSILON;
    const rootStyle: CSSProperties = { border: `1px solid ${lit ? 'var(--green)' : 'var(--rule)'}` };

    return (
      <div data-lit={lit ? 'true' : 'false'} style={rootStyle}>
        <ScrollIcon lit={lit} />
        <h3>{heading}</h3>
      </div>
    );
  }

  const { heading, proposal, approveLabel, rejectLabel, outcome, onApprove, onReject } = props;
  // Ruling accepted (disputed ruling 1 / Minor 8): CONTRACTS §9.3 lists "Controls –" for both
  // approved and rejected, so once a decision is made the buttons disable rather than staying
  // live for a stray Reject-after-Approve. SocDemo's reducer already no-ops a repeat press; this
  // also stops the click from reaching it at all, and shows the state (dashed border + reduced
  // opacity via .demo-btn:disabled — never colour alone).
  const decided = outcome !== 'pending';

  return (
    <div data-outcome={outcome}>
      <h3>{heading}</h3>
      <p>
        {outcome === 'approved' ? <CommittedIcon /> : null}
        {outcome === 'rejected' ? <s>{proposal}</s> : proposal}
      </p>
      <button type="button" className="demo-btn" disabled={decided} onClick={onApprove}>
        {approveLabel}
      </button>
      <button type="button" className="demo-btn" disabled={decided} onClick={onReject}>
        {rejectLabel}
      </button>
      <AnimatePresence initial={false}>
        {outcome === 'approved' ? (
          <motion.div
            key="approved"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <StatusPill label={UI_COPY.soc.approved} tone="safe" />
          </motion.div>
        ) : null}
        {outcome === 'rejected' ? (
          <motion.div
            key="rejected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <StatusPill label={UI_COPY.soc.rejected} tone="neutral" />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
