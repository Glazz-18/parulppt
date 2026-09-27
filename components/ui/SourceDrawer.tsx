'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { UI_COPY } from '@/lib/constants';
import { scenes } from '@/lib/scenes';
import { getDrawerTrigger, useSourceDrawer } from '@/lib/sceneNavigation';

// design §15 + CONTRACTS §5.2/§8: compact, non-modal side panel; deck tokens only.
const panelStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  bottom: 0,
  insetInlineEnd: 0,
  width: 'min(320px, 86vw)',
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  zIndex: 50,
  background: 'var(--bg)',
  color: 'var(--fg)',
  borderInlineStart: '1px solid var(--rule)',
  fontFamily: 'var(--font-mono)',
  padding: '1.25rem',
  boxSizing: 'border-box',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  marginBottom: '1rem',
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: '0.75rem',
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

const listStyle: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  fontSize: '0.85rem',
  lineHeight: 1.5,
};

export function SourceDrawer() {
  const { slide, close } = useSourceDrawer();
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<Element | null>(null);
  const prevSlideRef = useRef<number | null>(null);

  // Opens focused on Close; a real close (not a switch to another slide) returns focus to the
  // trigger, but only if focus is still inside the drawer (or lost to body) — a close caused by
  // navigation must not steal focus from the section `goToScene` just focused (CONTRACTS §8).
  useEffect(() => {
    if (slide !== null) {
      triggerRef.current = getDrawerTrigger();
      closeButtonRef.current?.focus();
    } else if (prevSlideRef.current !== null) {
      const active = document.activeElement;
      const insideDrawer = active === document.body || (active != null && panelRef.current?.contains(active));
      if (insideDrawer && triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus({ preventScroll: true });
      }
    }
    prevSlideRef.current = slide;
  }, [slide]);

  // Non-modal: closes on outside pointerdown, never preventDefault so the click underneath
  // (e.g. a SideNav link) still reaches its handler. A SOURCE trigger's own pointerdown is
  // ignored so its click can toggle instead of close-then-reopen.
  useEffect(() => {
    if (slide === null) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panelRef.current?.contains(target)) return;
      if (target instanceof Element && target.closest('[aria-controls="source-drawer"]')) return;
      close();
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [slide, close]);

  const scene = slide !== null ? scenes[slide - 1] : null;
  const items = scene?.sourceNotes?.flatMap((entry) => entry.split(' · ')) ?? [];
  const themeProps = scene
    ? { 'data-theme': scene.theme, ...(scene.accent ? { 'data-accent': scene.accent } : {}) }
    : {};

  return (
    <AnimatePresence>
      {slide !== null ? (
        <motion.aside
          key="drawer"
          ref={panelRef}
          id="source-drawer"
          role="dialog"
          aria-modal="false"
          aria-labelledby="source-drawer-title"
          {...themeProps}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          style={panelStyle}
        >
          <div style={headerStyle}>
            <p id="source-drawer-title" style={titleStyle}>
              {UI_COPY.source}
            </p>
            <button type="button" ref={closeButtonRef} onClick={close} style={closeButtonStyle}>
              {UI_COPY.close}
            </button>
          </div>
          <ul style={listStyle}>
            {items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
