'use client';

import { useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { ACTS, UI_COPY } from '@/lib/constants';
import { scenes } from '@/lib/scenes';
import { goToScene, useCurrentScene } from '@/lib/sceneNavigation';

// ponytail: mirrors app/globals.css --rail-w (W1-owned, not read at runtime — no window reads during render).
const RAIL_W_PX = 56;
const EXPANDED_W_PX = 208;

/** Ruling 16: "Go to scene NN" while the manifest title is empty, else "Go to scene NN: <title>". */
export function sceneAriaLabel(slide: number, title?: string): string {
  const nn = String(slide).padStart(2, '0');
  return title ? `Go to scene ${nn}: ${title}` : `Go to scene ${nn}`;
}

type SceneLinkProps = { slide: number; title?: string; current: boolean; expanded: boolean };

function SceneLink({ slide, title, current, expanded }: SceneLinkProps) {
  const nn = String(slide).padStart(2, '0');
  const linkStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6em',
    padding: '4px 0 4px 20px',
    textDecoration: 'none',
    color: 'var(--fg)',
    whiteSpace: 'nowrap',
  };
  const dotStyle: CSSProperties = {
    display: 'inline-block',
    flex: '0 0 auto',
    borderRadius: '50%',
    boxSizing: 'border-box',
    width: current ? 10 : 6,
    height: current ? 10 : 6,
    border: '1.5px solid var(--fg)',
    background: current ? 'var(--label)' : 'transparent',
    borderColor: current ? 'var(--label)' : 'var(--fg)',
  };
  const numStyle: CSSProperties = {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.7rem',
    color: 'var(--muted)',
    opacity: expanded ? 1 : 0,
    transition: 'opacity 150ms',
  };

  return (
    <li>
      <a
        href={`#scene-${nn}`}
        aria-label={sceneAriaLabel(slide, title)}
        aria-current={current ? 'step' : undefined}
        style={linkStyle}
        onClick={(event) => {
          event.preventDefault();
          goToScene(slide);
        }}
      >
        <span aria-hidden="true" style={dotStyle} />
        <span aria-hidden="true" style={numStyle}>
          {nn}
        </span>
      </a>
    </li>
  );
}

export function SideNav() {
  const current = useCurrentScene();
  const [expanded, setExpanded] = useState(false);
  const scene = scenes[current - 1];

  const themeProps = {
    'data-theme': scene.theme,
    ...(scene.accent ? { 'data-accent': scene.accent } : {}),
  };

  const collapse = (event: React.FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExpanded(false);
  };

  const listStyle: CSSProperties = { listStyle: 'none', margin: 0, padding: 0 };

  return (
    <>
      <motion.nav
        aria-label={UI_COPY.nav}
        {...themeProps}
        className="hidden lg:block"
        initial={false}
        animate={{ width: expanded ? EXPANDED_W_PX : RAIL_W_PX }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        onFocus={() => setExpanded(true)}
        onBlur={collapse}
        style={{
          position: 'fixed',
          insetInlineStart: 0,
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          overflowX: 'hidden',
          background: 'var(--bg)',
          zIndex: 40,
        }}
      >
        <ul style={listStyle}>
          <SceneLink slide={1} title={scenes[0].title || undefined} current={current === 1} expanded={expanded} />
        </ul>
        {ACTS.map((actEntry) => {
          const actScenes = scenes.filter((s) => s.act === actEntry.id);
          const isCurrentAct = scene.act === actEntry.id;
          const headingId = `${actEntry.id}-heading`;
          return (
            <div key={actEntry.id}>
              <p
                id={headingId}
                data-current={isCurrentAct ? 'true' : 'false'}
                className="uppercase"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  letterSpacing: '0.08em',
                  color: isCurrentAct ? 'var(--label)' : 'var(--muted)',
                  opacity: expanded ? 1 : 0,
                  whiteSpace: 'nowrap',
                  margin: '10px 0 4px 20px',
                  transition: 'opacity 150ms',
                }}
              >
                {`Act ${actEntry.n} — ${actEntry.label}`}
              </p>
              <ul aria-labelledby={headingId} style={listStyle}>
                {actScenes.map((s) => (
                  <SceneLink
                    key={s.id}
                    slide={s.slide}
                    title={s.title || undefined}
                    current={current === s.slide}
                    expanded={expanded}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </motion.nav>

      {/* Design §13 / requirement J5: below 1024px (Tailwind `lg`), the rail's own CSS hides it and this
          thin progress strip takes over instead. CSS media query only — no JS width check. */}
      <div
        {...themeProps}
        aria-hidden="true"
        className="lg:hidden"
        style={{
          position: 'fixed',
          insetInlineStart: 0,
          insetInlineEnd: 0,
          top: 0,
          height: 3,
          background: 'var(--rule)',
          zIndex: 40,
        }}
      >
        <div style={{ height: '100%', width: `${(current / scenes.length) * 100}%`, background: 'var(--label)' }} />
      </div>
    </>
  );
}
