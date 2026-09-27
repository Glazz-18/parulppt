'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ACTS, UI_COPY } from '@/lib/constants';
import { scenes } from '@/lib/scenes';
import { goToScene, setIndexEscape, useCurrentScene } from '@/lib/sceneNavigation';

// CONTRACTS §5.5: "Go to scene NN: <title>", else "<eyebrow>", else nothing when both are empty
// (same "empty string counts as absent" convention as SideNav's sceneAriaLabel, ruling 16).
export function indexSceneLabel(slide: number, title?: string, eyebrow?: string): string {
  const nn = String(slide).padStart(2, '0');
  const name = title || eyebrow;
  return name ? `Go to scene ${nn}: ${name}` : `Go to scene ${nn}`;
}

const FOCUSABLE_SELECTOR = 'button';

const triggerStyle: CSSProperties = {
  position: 'fixed',
  top: '1rem',
  insetInlineStart: 'calc(var(--rail-w) + 1rem)',
  zIndex: 60,
  fontFamily: 'var(--font-mono)',
  fontSize: '0.7rem',
  letterSpacing: '0.08em',
  background: 'transparent',
  border: '1px solid var(--rule)',
  color: 'var(--fg)',
  padding: '0.4em 0.75em',
  cursor: 'pointer',
};

const dialogStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 70,
  overflowY: 'auto',
  background: 'var(--bg)',
  color: 'var(--fg)',
  fontFamily: 'var(--font-mono)',
  padding: '3rem 1.5rem',
  boxSizing: 'border-box',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  marginBottom: '1.5rem',
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.85rem',
  letterSpacing: '0.08em',
  color: 'var(--label)',
};

const closeButtonStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.7rem',
  letterSpacing: '0.08em',
  background: 'transparent',
  border: '1px solid var(--rule)',
  color: 'var(--fg)',
  padding: '0.3em 0.6em',
  cursor: 'pointer',
};

const headingStyle: CSSProperties = {
  margin: '1.5rem 0 0.5rem',
  fontSize: '0.7rem',
  letterSpacing: '0.08em',
  color: 'var(--muted)',
};

const listStyle: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.4rem',
};

const sceneButtonStyle: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'start',
  fontFamily: 'var(--font-mono)',
  fontSize: '0.8rem',
  background: 'transparent',
  border: 'none',
  color: 'var(--fg)',
  padding: '0.2em 0',
  cursor: 'pointer',
};

type SceneButtonProps = {
  slide: number;
  title?: string;
  eyebrow?: string;
  current: boolean;
  onNavigate: (slide: number) => void;
};

function SceneButton({ slide, title, eyebrow, current, onNavigate }: SceneButtonProps) {
  const nn = String(slide).padStart(2, '0');
  const name = title || eyebrow;
  return (
    <li>
      <button
        type="button"
        data-index-scene
        aria-label={indexSceneLabel(slide, title, eyebrow)}
        aria-current={current ? 'step' : undefined}
        style={sceneButtonStyle}
        onClick={() => onNavigate(slide)}
      >
        {name ? `${nn} — ${name}` : nn}
      </button>
    </li>
  );
}

export function IndexOverlay() {
  const current = useCurrentScene();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef(false);

  const close = () => setOpen(false);

  // A21: while open, the engine's single Escape handler closes this overlay first (topmost layer).
  useEffect(() => {
    if (!open) return undefined;
    setIndexEscape(close);
    return () => setIndexEscape(null);
  }, [open]);

  // Opening focuses the first scene button; a real close returns focus to the trigger (§5.5). A
  // navigate-then-close already moved focus to the destination section, so only reclaim it when
  // focus is still inside the dialog (or lost to body) — mirrors SourceDrawer's same guard.
  useEffect(() => {
    if (open) {
      dialogRef.current?.querySelector<HTMLButtonElement>('[data-index-scene]')?.focus();
    } else if (wasOpenRef.current) {
      const active = document.activeElement;
      const insideDialog = active === document.body || (active != null && dialogRef.current?.contains(active));
      if (insideDialog) triggerRef.current?.focus({ preventScroll: true });
    }
    wasOpenRef.current = open;
  }, [open]);

  const navigate = (slide: number) => {
    goToScene(slide);
    close();
  };

  const trapTab = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    const edge = event.shiftKey ? first : last;
    if (active !== edge && dialogRef.current.contains(active)) return; // native Tab order handles it
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        aria-expanded={open}
        aria-controls="scene-index"
        style={triggerStyle}
        onClick={() => setOpen((o) => !o)}
      >
        {UI_COPY.index}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="index"
            ref={dialogRef}
            id="scene-index"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scene-index-title"
            style={dialogStyle}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            onKeyDown={trapTab}
            onClick={(event) => {
              if (event.target === event.currentTarget) close();
            }}
          >
            <div style={headerStyle}>
              <p id="scene-index-title" style={titleStyle}>
                {UI_COPY.index}
              </p>
              <button type="button" onClick={close} style={closeButtonStyle}>
                {UI_COPY.close}
              </button>
            </div>

            <ul style={listStyle}>
              <SceneButton
                slide={1}
                title={scenes[0].title}
                eyebrow={scenes[0].eyebrow}
                current={current === 1}
                onNavigate={navigate}
              />
            </ul>

            {ACTS.map((actEntry) => {
              const actScenes = scenes.filter((s) => s.act === actEntry.id);
              const headingId = `${actEntry.id}-index-heading`;
              return (
                <div key={actEntry.id}>
                  <p id={headingId} className="uppercase" style={headingStyle}>
                    {`Act ${actEntry.n} — ${actEntry.label}`}
                  </p>
                  <ul aria-labelledby={headingId} style={listStyle}>
                    {actScenes.map((s) => (
                      <SceneButton
                        key={s.id}
                        slide={s.slide}
                        title={s.title}
                        eyebrow={s.eyebrow}
                        current={current === s.slide}
                        onNavigate={navigate}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
