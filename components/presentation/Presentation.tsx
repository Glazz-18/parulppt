'use client';

import { MotionConfig } from 'framer-motion';
import { scenes } from '@/lib/scenes';
import { SceneRenderer } from './SceneRenderer';

export function Presentation() {
  return (
    <MotionConfig reducedMotion="user">
      <main id="presentation">
        {scenes.map((scene) => (
          <SceneRenderer key={scene.id} scene={scene} />
        ))}
      </main>
    </MotionConfig>
  );
}
