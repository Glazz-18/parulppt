'use client';

import { useEffect } from 'react';
import type { Scene } from '@/lib/types';
import { KIND_COMPONENT, UI_COPY } from '@/lib/constants';
import { SceneShell } from '@/components/ui/SceneShell';
import { SceneProgressProvider } from './SceneProgress';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { registry } from '@/components/scenes';

export type SceneRendererProps = {
  scene: Scene;
  onSource?: (slide: number) => void;
};

export function SceneRenderer({ scene, onSource }: SceneRendererProps) {
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
            aria-expanded={false}
            aria-controls="source-drawer"
            onClick={() => onSource?.(scene.slide)}
          >
            {UI_COPY.source}
          </button>
        ) : null}
      </SceneShell>
    </SceneProgressProvider>
  );
}
