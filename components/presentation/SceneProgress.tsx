'use client';

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from 'react';
import { track } from '@/lib/analytics';
import type { SceneBeat } from '@/lib/types';

// CONTRACTS §6. Only the engine (Presentation) writes; scenes read via useSceneProgress().
// A slide absent from `measured` has not been measured yet and reads 1.
const measured = new Map<number, number>();
const listeners = new Map<number, Set<() => void>>();

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const notify = (slide: number) => listeners.get(slide)?.forEach((listener) => listener());

export function getSceneProgress(slide: number): number {
  return measured.get(slide) ?? 1;
}

export function setSceneProgress(slide: number, progress: number): void {
  const next = clamp01(progress);
  const prev = measured.get(slide);
  if (prev === next) return;
  measured.set(slide, next);
  // Ruling 5: only a measured value below 1 counts as "from below".
  if (next === 1 && prev !== undefined) track('scene_complete', { slide });
  notify(slide);
}

export function resetSceneProgress(): void {
  const slides = [...measured.keys()];
  measured.clear();
  slides.forEach(notify);
}

function subscribe(slide: number, listener: () => void): () => void {
  let set = listeners.get(slide);
  if (!set) listeners.set(slide, (set = new Set()));
  set.add(listener);
  return () => {
    set.delete(listener);
  };
}

const SlideContext = createContext<number | null>(null);

export function SceneProgressProvider({ slide, children }: { slide: number; children: ReactNode }) {
  return <SlideContext.Provider value={slide}>{children}</SlideContext.Provider>;
}

export function useSceneProgress(): number {
  const slide = useContext(SlideContext);
  const sub = useCallback(
    (listener: () => void) => (slide === null ? () => {} : subscribe(slide, listener)),
    [slide],
  );
  return useSyncExternalStore(
    sub,
    () => (slide === null ? 1 : getSceneProgress(slide)),
    () => 1,
  );
}

export function beatProgress(p: number, beat: SceneBeat): number {
  return clamp01((p - beat.start) / (beat.end - beat.start));
}
