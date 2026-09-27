'use client';

import { useEffect, useRef } from 'react';
import { MotionConfig } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { startNavigationEngine } from '@/lib/sceneNavigation';
import { scenes } from '@/lib/scenes';
import { SceneRenderer } from './SceneRenderer';
import { resetSceneProgress, setSceneProgress } from './SceneProgress';
import { SideNav } from './SideNav';
import { SceneControls } from './SceneControls';
import { SourceDrawer } from '@/components/ui/SourceDrawer';

// Binds useGSAP to this gsap instance so its context owns the matchMedia and triggers below.
gsap.registerPlugin(useGSAP);

export function Presentation() {
  const mainRef = useRef<HTMLElement>(null);

  // CONTRACTS §8: keyboard, scroll-derived current scene, soft snapping; the cleanup removes them all.
  useEffect(() => startNavigationEngine(), []);

  // CONTRACTS §6 + A4/A11: one measuring trigger per section; no pin, no animation.
  useGSAP(
    () => {
      // No matchMedia (e.g. jsdom): no engine, every scene keeps its static progress-1 markup.
      if (typeof window.matchMedia !== 'function') return;
      // The only ScrollTrigger import and registration in the app (CONTRACTS §11). Idempotent;
      // done here, not at module scope, because registering reads matchMedia.
      gsap.registerPlugin(ScrollTrigger);
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        for (const scene of scenes) {
          const store = (self: ScrollTrigger) => setSceneProgress(scene.slide, self.progress);
          ScrollTrigger.create({
            trigger: mainRef.current?.querySelector<HTMLElement>(`#${scene.id}`),
            start: 'top bottom',
            end: scene.pin ? 'bottom bottom' : 'top top',
            onRefresh: store,
            onUpdate: store,
          });
        }
        // Runs when reduce turns on at runtime and on unmount; the context kills the triggers.
        return resetSceneProgress;
      });
    },
    { scope: mainRef },
  );

  return (
    <MotionConfig reducedMotion="user">
      <main id="presentation" ref={mainRef}>
        {scenes.map((scene) => (
          <SceneRenderer key={scene.id} scene={scene} />
        ))}
      </main>
      <SourceDrawer />
      <SideNav />
      <SceneControls />
    </MotionConfig>
  );
}
