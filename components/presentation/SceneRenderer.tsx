'use client';

import { useEffect, type CSSProperties } from 'react';
import type { Scene } from '@/lib/types';
import { KIND_COMPONENT, UI_COPY } from '@/lib/constants';
import { SceneShell } from '@/components/ui/SceneShell';
import { SceneProgressProvider } from './SceneProgress';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { registry } from '@/components/scenes';
import { useSourceDrawer } from '@/lib/sceneNavigation';

export type SceneRendererProps = {
  scene: Scene;
};

// design §15: tiny mono label, no background; global :focus-visible ring stays (no outline override).
const sourceButtonStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.65rem',
  letterSpacing: '0.08em',
  color: 'var(--muted)',
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
};

export function SceneRenderer({ scene }: SceneRendererProps) {
  const drawer = useSourceDrawer();
  const componentName = scene.component ?? KIND_COMPONENT[scene.kind];
  const Component = componentName ? registry[componentName] : undefined;

  useEffect(() => {
    if (!Component && process.env.NODE_ENV !== 'production') {
      console.warn(
        `SceneRenderer: no registry component for ${scene.id} (resolved name: ${componentName ?? 'none'}); rendering fallback markup`,
      );
    }
    // Only re-warn if the resolved component identity or name changes.
  }, [Component, componentName, scene.id]);

  return (
    <SceneProgressProvider slide={scene.slide}>
      <SceneShell scene={scene}>
        {Component ? (
          <Component scene={scene} />
        ) : (
          <>
            {scene.eyebrow ? <MonoLabel as="p">{scene.eyebrow}</MonoLabel> : null}
            {scene.title ? <h2>{scene.title}</h2> : null}
          </>
        )}
        {scene.sourceNotes?.length ? (
          <button
            type="button"
            aria-expanded={drawer.slide === scene.slide}
            aria-controls="source-drawer"
            onClick={(event) => {
              // Recorded as the focus-return trigger by openDrawer; explicit so it holds
              // regardless of a platform's click-focus default (CONTRACTS §8).
              event.currentTarget.focus();
              if (drawer.slide === scene.slide) drawer.close();
              else drawer.open(scene.slide);
            }}
            style={sourceButtonStyle}
          >
            {UI_COPY.source}
          </button>
        ) : null}
      </SceneShell>
    </SceneProgressProvider>
  );
}
