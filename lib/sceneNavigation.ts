import { useSyncExternalStore } from 'react';

// CONTRACTS §8. Task 11 adds the window keydown listener, scroll-derived current scene and snapping here.

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

// ---- goToScene ----
// In flight from goToScene until the engine sees the scroll settle and calls endNavigation() (ruling 6).
let target: { slide: number; top: number } | null = null;

export function isNavigationInFlight(): boolean {
  return target !== null;
}

/** Document top (px) of the in-flight target, or null. */
export function getNavigationTarget(): number | null {
  return target?.top ?? null;
}

export function endNavigation(): void {
  target = null;
}

export function goToScene(slide: number): void {
  if (!Number.isInteger(slide) || slide < FIRST || slide > LAST) return;
  const el = document.getElementById(`scene-${String(slide).padStart(2, '0')}`);
  if (!el || target?.slide === slide) return;
  const top = el.getBoundingClientRect().top + window.scrollY;
  target = { slide, top };
  setCurrentScene(slide);
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' });
  el.focus({ preventScroll: true });
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

  // Ruling 3: forward while the pinned scene is unfinished; back while it is scrolled past its arrival pose.
  const scrollInScene =
    ctx.pinned && (direction === 1 ? ctx.progress < 1 : ctx.progress > 1 / ctx.scrollLength);
  if (scrollInScene) return { type: 'scrollBy', direction };
  const slide = ctx.current + direction;
  return slide >= FIRST && slide <= LAST ? { type: 'goTo', slide } : null;
}
