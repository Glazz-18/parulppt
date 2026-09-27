import { useSyncExternalStore } from 'react';
import { getSceneProgress } from '@/components/presentation/SceneProgress';
import { track } from '@/lib/analytics';
import { scenes } from '@/lib/scenes';

// CONTRACTS §8: navigation API, current scene, soft snapping and the engine's window listeners.

const FIRST = 1;
const LAST = 46;

// ---- current-scene store ----
let current = FIRST;
const listeners = new Set<() => void>();

export function getCurrentScene(): number {
  return current;
}

export function setCurrentScene(slide: number): void {
  if (slide === current) return;
  current = slide;
  listeners.forEach((listener) => listener());
}

export function subscribeCurrentScene(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useCurrentScene(): number {
  return useSyncExternalStore(subscribeCurrentScene, getCurrentScene, () => FIRST);
}

// ---- DOM helpers (event time only, never during render) ----
const sectionOf = (slide: number) => document.getElementById(`scene-${String(slide).padStart(2, '0')}`);
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const behavior = (): ScrollBehavior => (reducedMotion() ? 'auto' : 'smooth');

// ponytail: reads every section rect per call (46 rects); cache + ResizeObserver if profiling shows layout cost.
function readSections(): SnapSection[] {
  return [...document.querySelectorAll<HTMLElement>('#presentation > section[data-scene]')].map((el) => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top + window.scrollY, pinned: el.dataset.pin === 'true', height: rect.height };
  });
}

// ---- goToScene ----
// In flight from goToScene until the scroll settles (ruling 6): a scroll event at the target, scrollend,
// user scroll input, or SNAP_IDLE_MS without a scroll event (covers a target already at scrollY).
let target: { slide: number; top: number } | null = null;
let settleTimer: ReturnType<typeof setTimeout> | undefined;

export function isNavigationInFlight(): boolean {
  return target !== null;
}

/** Document top (px) of the in-flight target, or null. */
export function getNavigationTarget(): number | null {
  return target?.top ?? null;
}

export function endNavigation(): void {
  target = null;
  clearTimeout(settleTimer);
}

function restartSettle() {
  clearTimeout(settleTimer);
  settleTimer = setTimeout(endNavigation, SNAP_IDLE_MS);
}

export function goToScene(slide: number): void {
  if (!Number.isInteger(slide) || slide < FIRST || slide > LAST) return;
  const el = sectionOf(slide);
  if (!el || target?.slide === slide) return;
  const top = el.getBoundingClientRect().top + window.scrollY;
  target = { slide, top };
  cancelSnap();
  restartSettle();
  setCurrentScene(slide);
  window.scrollTo({ top, behavior: behavior() });
  el.focus({ preventScroll: true });
}

// ---- soft snapping (CONTRACTS §8, TRD §4) ----
export const SNAP_IDLE_MS = 160;

export type SnapSection = { top: number; pinned: boolean; height: number };

/** Nearest section top (ties → earlier); null strictly inside a pinned scene's sticky range (ruling 7). */
export function nearestSnapTarget(scrollY: number, sections: SnapSection[], innerHeight: number): number | null {
  let best: number | null = null;
  for (const { top, pinned, height } of sections) {
    if (pinned && scrollY > top && scrollY < top + height - innerHeight) return null;
    if (best === null || Math.abs(top - scrollY) < Math.abs(best - scrollY)) best = top;
  }
  return best;
}

// Armed = a snap timer is pending (ruling 13).
let snapTimer: ReturnType<typeof setTimeout> | undefined;

function cancelSnap() {
  clearTimeout(snapTimer);
  snapTimer = undefined;
}

function armSnap() {
  if (target) return; // no snap while a navigation is in flight
  clearTimeout(snapTimer);
  snapTimer = setTimeout(snap, SNAP_IDLE_MS);
}

function snap() {
  snapTimer = undefined;
  if (reducedMotion()) return;
  const top = nearestSnapTarget(window.scrollY, readSections(), window.innerHeight);
  if (top !== null && Math.abs(top - window.scrollY) > 1) window.scrollTo({ top, behavior: 'smooth' });
}

// ---- engine listeners ----
/** Scroll ±1 viewport clamped to the scene's sticky range; if that moves < 1px, go to the adjacent scene (ruling 12). */
function scrollInScene(slide: number, direction: 1 | -1) {
  const el = sectionOf(slide);
  if (!el) return;
  const { top: rectTop, height } = el.getBoundingClientRect();
  const top = rectTop + window.scrollY;
  const end = Math.max(top, top + height - window.innerHeight);
  const next = Math.min(Math.max(window.scrollY + direction * window.innerHeight, top), end);
  if (Math.abs(next - window.scrollY) <= 1) return goToScene(slide + direction);
  cancelSnap(); // the key's clamped landing is deliberate; a snap from its range end would undo it
  window.scrollTo({ top: next, behavior: behavior() });
}

/** Installs the app's single window keydown listener plus scroll/input listeners; returns the cleanup. */
export function startNavigationEngine(): () => void {
  const syncCurrent = () =>
    setCurrentScene(
      computeIdleScene(
        readSections().map((s) => s.top),
        window.scrollY,
        window.innerHeight,
      ),
    );

  const onScroll = () => {
    if (target) {
      if (Math.abs(window.scrollY - target.top) > 1) return restartSettle();
      endNavigation();
    }
    if (snapTimer !== undefined) armSnap(); // momentum keeps pushing the snap back
    syncCurrent();
  };
  const onScrollEnd = () => {
    endNavigation();
    syncCurrent();
  };
  // User scroll input cancels a smooth scroll in the browser, so it ends the navigation too.
  const onInput = () => {
    endNavigation();
    armSnap();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const slide = getCurrentScene();
    const scene = scenes[slide - 1];
    const action = keyToAction(event, {
      current: slide,
      pinned: scene.pin,
      scrollLength: scene.scrollLength,
      progress: getSceneProgress(slide),
      drawerOpen: false, // Task 13: SourceDrawer state
      demoEscape: false, // Task 13: useDemoEscape registration for `slide`
    });
    if (!action) return armSnap(); // an unhandled key may scroll natively
    event.preventDefault();
    switch (action.type) {
      case 'goTo':
        return goToScene(action.slide);
      case 'scrollBy':
        return scrollInScene(slide, action.direction);
      // Task 13: 'closeDrawer' and 'demoEscape'.
    }
  };

  const passive = { passive: true };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('scroll', onScroll, passive);
  window.addEventListener('scrollend', onScrollEnd, passive);
  window.addEventListener('wheel', onInput, passive);
  window.addEventListener('touchend', onInput, passive);
  const unsubscribe = subscribeCurrentScene(() => track('scene_enter', { slide: getCurrentScene() }));
  syncCurrent(); // a mid-page refresh may restore scrollY without a scroll event

  return () => {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('scrollend', onScrollEnd);
    window.removeEventListener('wheel', onInput);
    window.removeEventListener('touchend', onInput);
    unsubscribe();
    cancelSnap();
    endNavigation();
  };
}

/** 1-based slide of the last section whose top ≤ the viewport midline; 1 if none. */
export function computeIdleScene(sectionTops: number[], scrollY: number, innerHeight: number): number {
  const midline = scrollY + innerHeight / 2;
  const index = sectionTops.findLastIndex((top) => top <= midline);
  return index < 0 ? FIRST : index + 1;
}

// ---- keyboard map ----
export const KEY_IGNORE_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="slider"], [role="spinbutton"], [role="listbox"], [role="radiogroup"], [role="tablist"], [role="menu"], [role="grid"]';
export const SPACE_IGNORE_SELECTOR = 'button, summary, [role="button"], [role="checkbox"], [role="switch"]';
export const PROGRESS_EPSILON = 1e-3;

export type NavAction =
  | { type: 'goTo'; slide: number }
  | { type: 'scrollBy'; direction: 1 | -1 } // engine clamps one viewport to the pinned scene's range
  | { type: 'closeDrawer' }
  | { type: 'demoEscape' };

export type KeyContext = {
  current: number;
  pinned: boolean;
  scrollLength: number;
  progress: number;
  drawerOpen: boolean;
  demoEscape: boolean;
};

/** Maps a keydown to an action; null means unhandled (the listener must not preventDefault). */
export function keyToAction(event: KeyboardEvent, ctx: KeyContext): NavAction | null {
  if (event.altKey || event.ctrlKey || event.metaKey) return null;
  if (event.key === 'Escape') {
    if (ctx.drawerOpen) return { type: 'closeDrawer' };
    return ctx.demoEscape ? { type: 'demoEscape' } : null;
  }

  const el = event.target instanceof Element ? event.target : null;
  if (el?.closest(KEY_IGNORE_SELECTOR)) return null;

  let direction: 1 | -1;
  switch (event.key) {
    case 'Home':
      return { type: 'goTo', slide: FIRST };
    case 'End':
      return { type: 'goTo', slide: LAST };
    case 'ArrowDown':
    case 'PageDown':
      direction = 1;
      break;
    case 'ArrowUp':
    case 'PageUp':
      direction = -1;
      break;
    case ' ':
      if (el?.closest(SPACE_IGNORE_SELECTOR)) return null;
      direction = event.shiftKey ? -1 : 1;
      break;
    default:
      return null;
  }

  // Rulings 3 + 12: forward while the pinned scene is unfinished; back while it is scrolled past its
  // arrival pose. PROGRESS_EPSILON absorbs fractional scroll offsets so an edge never traps the key.
  const scrollInScene =
    ctx.pinned &&
    (direction === 1
      ? ctx.progress < 1 - PROGRESS_EPSILON
      : ctx.progress > 1 / ctx.scrollLength + PROGRESS_EPSILON);
  if (scrollInScene) return { type: 'scrollBy', direction };
  const slide = ctx.current + direction;
  return slide >= FIRST && slide <= LAST ? { type: 'goTo', slide } : null;
}
