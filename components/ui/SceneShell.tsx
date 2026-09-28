'use client';

import type { CSSProperties, ReactNode } from 'react';
import type { Scene } from '@/lib/types';

export type SceneShellProps = { scene: Scene; children: ReactNode };

export function SceneShell({ scene, children }: SceneShellProps) {
  const sectionStyle = {
    background: 'var(--bg)',
    color: 'var(--fg)',
    '--scroll-length': scene.scrollLength,
  } as CSSProperties;

  const viewportStyle: CSSProperties = {
    paddingInline: 'calc(var(--rail-w) + 5vw) 5vw',
    paddingBlock: 'max(7vh, 96px)',
  };

  return (
    <section
      id={scene.id}
      data-scene={scene.id}
      data-slide={String(scene.slide).padStart(2, '0')}
      data-act={scene.act}
      data-theme={scene.theme}
      data-pin={scene.pin ? 'true' : 'false'}
      {...(scene.accent ? { 'data-accent': scene.accent } : {})}
      style={sectionStyle}
      tabIndex={-1}
    >
      <div className="scene-viewport" style={viewportStyle}>
        {children}
      </div>
    </section>
  );
}
