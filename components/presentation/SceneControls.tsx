'use client';

import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { ACTS, UI_COPY } from '@/lib/constants';
import { scenes } from '@/lib/scenes';
import { goToScene, useCurrentScene } from '@/lib/sceneNavigation';

const LAST = 46;

const buttonStyle = (disabled: boolean): CSSProperties => ({
  fontFamily: 'var(--font-mono)',
  fontSize: '0.7rem',
  letterSpacing: '0.08em',
  background: 'transparent',
  border: '1px solid var(--rule)',
  color: 'var(--fg)',
  padding: '0.4em 0.75em',
  opacity: disabled ? 0.4 : 1,
  cursor: disabled ? 'default' : 'pointer',
});

export function SceneControls() {
  const current = useCurrentScene();
  const scene = scenes[current - 1];
  const act = ACTS.find((a) => a.id === scene.act);
  const nn = String(current).padStart(2, '0');
  const atFirst = current === 1;
  const atLast = current === LAST;

  const themeProps = {
    'data-theme': scene.theme,
    ...(scene.accent ? { 'data-accent': scene.accent } : {}),
  };

  return (
    <div {...themeProps} style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>
      <p
        style={{
          position: 'fixed',
          top: '1rem',
          insetInlineEnd: '1rem',
          zIndex: 40,
          margin: 0,
          fontSize: '0.75rem',
          letterSpacing: '0.08em',
        }}
      >
        {nn} / {LAST}
      </p>

      {act ? (
        <p
          data-act-label
          className="uppercase"
          style={{
            position: 'fixed',
            bottom: '1rem',
            insetInlineStart: 'calc(var(--rail-w) + 1rem)',
            zIndex: 40,
            margin: 0,
            fontSize: '0.7rem',
            letterSpacing: '0.08em',
            color: 'var(--muted)',
            // The longest act label (Act 5) must never wrap under this fixed corner.
            maxWidth: '40vw',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {`Act ${act.n} — ${act.label}`}
        </p>
      ) : null}

      <div style={{ position: 'fixed', bottom: '1rem', insetInlineEnd: '1rem', zIndex: 40, display: 'flex', gap: '0.5rem' }}>
        <motion.button
          type="button"
          disabled={atFirst}
          initial={false}
          whileHover={atFirst ? undefined : { scale: 1.05 }}
          whileTap={atFirst ? undefined : { scale: 0.97 }}
          onClick={() => goToScene(current - 1)}
          style={buttonStyle(atFirst)}
        >
          <span aria-hidden="true">←</span> <span className="uppercase">{UI_COPY.previous}</span>
        </motion.button>
        <motion.button
          type="button"
          disabled={atLast}
          initial={false}
          whileHover={atLast ? undefined : { scale: 1.05 }}
          whileTap={atLast ? undefined : { scale: 0.97 }}
          onClick={() => goToScene(current + 1)}
          style={buttonStyle(atLast)}
        >
          <span className="uppercase">{UI_COPY.next}</span> <span aria-hidden="true">→</span>
        </motion.button>
      </div>
    </div>
  );
}
