import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { act, cleanup, render, renderHook } from '@testing-library/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as analytics from '@/lib/analytics';
import { scenes } from '@/lib/scenes';
import type { SceneBeat } from '@/lib/types';
import { Presentation } from './Presentation';
import { beatProgress, getSceneProgress, useSceneProgress } from './SceneProgress';

// Every registry lookup resolves to a probe that prints its scene's progress and counts its renders.
const renders = vi.hoisted(() => new Map<number, number>());
vi.mock('@/components/scenes', async () => {
  const { useSceneProgress: useProgress } = await import('./SceneProgress');
  function Probe({ scene }: { scene: { slide: number } }) {
    const progress = useProgress();
    renders.set(scene.slide, (renders.get(scene.slide) ?? 0) + 1);
    return <output data-probe={scene.slide}>{progress}</output>;
  }
  return { registry: new Proxy({}, { get: () => Probe }) };
});

type Self = Parameters<NonNullable<ScrollTrigger.Vars['onUpdate']>>[0];
const self = (progress: number) => ({ progress }) as Self;

let reduced = false;
const mediaListeners = new Set<() => void>();
let createSpy: MockInstance<typeof ScrollTrigger.create>;
let trackSpy: MockInstance<typeof analytics.track>;

beforeEach(() => {
  reduced = false;
  renders.clear();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      get matches() {
        if (query.includes('no-preference')) return !reduced;
        if (query.includes('reduce')) return reduced;
        return false;
      },
      media: query,
      onchange: null,
      addListener: (l: () => void) => mediaListeners.add(l),
      removeListener: (l: () => void) => mediaListeners.delete(l),
      addEventListener: (_: string, l: () => void) => mediaListeners.add(l),
      removeEventListener: (_: string, l: () => void) => mediaListeners.delete(l),
      dispatchEvent: () => false,
    }),
  });
  createSpy = vi.spyOn(ScrollTrigger, 'create');
  trackSpy = vi.spyOn(analytics, 'track');
  // Scenes without a resolved component name (demo kind) hit the SceneRenderer fallback warning.
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  // ScrollTrigger restores scroll on revert; jsdom only logs "not implemented".
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mediaListeners.clear();
});

const varsFor = (slide: number): ScrollTrigger.Vars => {
  const section = document.getElementById(`scene-${String(slide).padStart(2, '0')}`);
  const call = createSpy.mock.calls.find(([vars]) => vars.trigger === section);
  if (!call) throw new Error(`no trigger for slide ${slide}`);
  return call[0];
};
const probe = (container: HTMLElement, slide: number) =>
  container.querySelector(`[data-probe="${slide}"]`)?.textContent;
const pinned = scenes.find((s) => s.pin) ?? scenes[0];
const other = scenes.find((s) => s.slide !== pinned.slide)!;

describe('beatProgress', () => {
  const beat: SceneBeat = { id: 'b', start: 0.2, end: 0.6, action: 'fade' };
  it('clamps below start to 0, above end to 1, and is linear between', () => {
    expect(beatProgress(0, beat)).toBe(0);
    expect(beatProgress(0.2, beat)).toBe(0);
    expect(beatProgress(0.4, beat)).toBeCloseTo(0.5);
    expect(beatProgress(0.6, beat)).toBe(1);
    expect(beatProgress(1, beat)).toBe(1);
  });
});

describe('useSceneProgress outside the engine', () => {
  it('returns 1 outside any scene provider, and getSceneProgress is 1 when unmeasured', () => {
    const { result } = renderHook(() => useSceneProgress());
    expect(result.current).toBe(1);
    expect(getSceneProgress(9)).toBe(1);
  });
});

describe('progress engine under prefers-reduced-motion: reduce', () => {
  it('creates zero ScrollTriggers and every scene reads 1', () => {
    reduced = true;
    const { container } = render(<Presentation />);
    expect(createSpy).not.toHaveBeenCalled();
    expect(ScrollTrigger.getAll()).toHaveLength(0);
    for (const scene of scenes) expect(probe(container, scene.slide)).toBe('1');
  });
});

describe('progress engine under prefers-reduced-motion: no-preference', () => {
  it('creates exactly one measuring trigger per section with start/end per pin', () => {
    render(<Presentation />);
    expect(createSpy).toHaveBeenCalledTimes(46);
    expect(ScrollTrigger.getAll()).toHaveLength(46);
    for (const scene of scenes) {
      const vars = varsFor(scene.slide);
      expect(vars.start).toBe('top bottom');
      expect(vars.end).toBe(scene.pin ? 'bottom bottom' : 'top top');
      expect(vars).not.toHaveProperty('pin');
      expect(vars).not.toHaveProperty('animation');
      expect(vars.onRefresh).toBeTypeOf('function');
      expect(vars.onUpdate).toBeTypeOf('function');
    }
  });

  it('kills all triggers on unmount and recreates exactly 46 on remount', () => {
    const first = render(<Presentation />);
    first.unmount();
    expect(ScrollTrigger.getAll()).toHaveLength(0);
    render(<Presentation />);
    expect(createSpy).toHaveBeenCalledTimes(92);
    expect(ScrollTrigger.getAll()).toHaveLength(46);
  });

  it('reads 1 before measurement and the measured value after the first onRefresh (Review Focus 1)', () => {
    const { container } = render(<Presentation />);
    expect(probe(container, pinned.slide)).toBe('1');
    act(() => varsFor(pinned.slide).onRefresh!(self(0.37)));
    expect(probe(container, pinned.slide)).toBe('0.37');
    expect(getSceneProgress(pinned.slide)).toBe(0.37);
    act(() => varsFor(pinned.slide).onUpdate!(self(0.5)));
    expect(probe(container, pinned.slide)).toBe('0.5');
    expect(probe(container, other.slide)).toBe('1');
  });

  it('re-renders only the scene whose progress changed', () => {
    render(<Presentation />);
    const before = new Map(renders);
    act(() => varsFor(pinned.slide).onUpdate!(self(0.25)));
    for (const scene of scenes) {
      const delta = (renders.get(scene.slide) ?? 0) - (before.get(scene.slide) ?? 0);
      expect(delta).toBe(scene.slide === pinned.slide ? 1 : 0);
    }
  });

  it('fires scene_complete only on a measured rise to 1', () => {
    render(<Presentation />);
    const vars = varsFor(pinned.slide);
    const completes = () => trackSpy.mock.calls.filter(([event]) => event === 'scene_complete');

    act(() => vars.onRefresh!(self(1))); // first measurement is 1: not "from below"
    expect(completes()).toHaveLength(0);
    act(() => vars.onUpdate!(self(0.5)));
    act(() => vars.onUpdate!(self(1)));
    expect(completes()).toEqual([['scene_complete', { slide: pinned.slide }]]);
    act(() => vars.onUpdate!(self(1)));
    expect(completes()).toHaveLength(1);
    act(() => vars.onUpdate!(self(0.9)));
    act(() => vars.onUpdate!(self(1)));
    expect(completes()).toHaveLength(2);
  });

  it('kills triggers and resets to unmeasured when reduced motion turns on at runtime', () => {
    const { container } = render(<Presentation />);
    act(() => varsFor(pinned.slide).onRefresh!(self(0.37)));
    reduced = true;
    act(() => mediaListeners.forEach((l) => l()));
    expect(ScrollTrigger.getAll()).toHaveLength(0);
    expect(probe(container, pinned.slide)).toBe('1');
    expect(getSceneProgress(pinned.slide)).toBe(1);
  });
});

