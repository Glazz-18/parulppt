import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import {
  KEY_IGNORE_SELECTOR,
  PROGRESS_EPSILON,
  SPACE_IGNORE_SELECTOR,
  computeIdleScene,
  endNavigation,
  getCurrentScene,
  getNavigationTarget,
  goToScene,
  isNavigationInFlight,
  keyToAction,
  setCurrentScene,
  subscribeCurrentScene,
  useCurrentScene,
  type NavAction,
} from './sceneNavigation';

let scrollTo: MockInstance<typeof window.scrollTo>;

function addSection(slide: number, rectTop: number): HTMLElement {
  const el = document.createElement('section');
  el.id = `scene-${String(slide).padStart(2, '0')}`;
  el.tabIndex = -1;
  el.getBoundingClientRect = () => ({ top: rectTop }) as DOMRect;
  document.body.appendChild(el);
  return el;
}

function setReducedMotion(matches: boolean | undefined) {
  Object.defineProperty(window, 'matchMedia', {
    // undefined models jsdom / old browsers without matchMedia.
    value:
      matches === undefined
        ? undefined
        : (query: string) => ({ matches: query === '(prefers-reduced-motion: reduce)' && matches }),
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Object.defineProperty(window, 'scrollY', { value: 100, configurable: true });
  setReducedMotion(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  endNavigation();
  setCurrentScene(1);
});

describe('goToScene', () => {
  it.each([0, 47, 2.5, -1, Number.NaN, Infinity])('ignores out-of-range or non-integer slide %s', (slide) => {
    addSection(1, 0);
    goToScene(slide);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(getCurrentScene()).toBe(1);
    expect(isNavigationInFlight()).toBe(false);
  });

  it('ignores a slide whose section is absent', () => {
    goToScene(7);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(getCurrentScene()).toBe(1);
    expect(isNavigationInFlight()).toBe(false);
  });

  it('scrolls smoothly to the section document top, sets current at once, focuses without scrolling', () => {
    const el = addSection(3, 300);
    const focus = vi.spyOn(el, 'focus');
    goToScene(3);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 400, behavior: 'smooth' });
    expect(getCurrentScene()).toBe(3);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    expect(isNavigationInFlight()).toBe(true);
    expect(getNavigationTarget()).toBe(400);
  });

  it('uses smooth behaviour when matchMedia reports no preference', () => {
    setReducedMotion(false);
    addSection(3, 300);
    goToScene(3);
    expect(scrollTo).toHaveBeenCalledWith({ top: 400, behavior: 'smooth' });
  });

  it('uses auto behaviour under prefers-reduced-motion: reduce', () => {
    setReducedMotion(true);
    addSection(3, 300);
    goToScene(3);
    expect(scrollTo).toHaveBeenCalledWith({ top: 400, behavior: 'auto' });
  });

  it('latest call wins: a different target re-issues scrollTo and replaces the in-flight target', () => {
    addSection(3, 300);
    addSection(5, 900);
    goToScene(3);
    goToScene(5);
    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 1000, behavior: 'smooth' });
    expect(getCurrentScene()).toBe(5);
    expect(getNavigationTarget()).toBe(1000);
  });

  it('a call for the in-flight target is a no-op', () => {
    const el = addSection(3, 300);
    const focus = vi.spyOn(el, 'focus');
    goToScene(3);
    goToScene(3);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('endNavigation clears the in-flight state; the same target can then be requested again', () => {
    addSection(3, 300);
    goToScene(3);
    endNavigation();
    expect(isNavigationInFlight()).toBe(false);
    expect(getNavigationTarget()).toBeNull();
    goToScene(3);
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });
});

describe('current-scene store', () => {
  it('notifies subscribers on change only, and unsubscribes', () => {
    const fn = vi.fn();
    const unsubscribe = subscribeCurrentScene(fn);
    setCurrentScene(4);
    setCurrentScene(4);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(getCurrentScene()).toBe(4);
    unsubscribe();
    setCurrentScene(5);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('useCurrentScene follows the store', () => {
    const { result } = renderHook(() => useCurrentScene());
    expect(result.current).toBe(1);
    act(() => setCurrentScene(12));
    expect(result.current).toBe(12);
  });

  it('useCurrentScene renders 1 on the server', () => {
    setCurrentScene(9);
    function Probe() {
      return createElement('output', null, useCurrentScene());
    }
    expect(renderToString(createElement(Probe))).toBe('<output>1</output>');
  });
});

describe('computeIdleScene', () => {
  const tops = [0, 1000, 2000, 5000];
  it.each([
    [0, 800, 1], // midline 400
    [599, 800, 1], // midline 999
    [600, 800, 2], // midline 1000: a top equal to the midline counts
    [4000, 800, 3], // midline 4400, inside a long (pinned) section
    [4600, 800, 4],
    [99999, 800, 4],
  ])('scrollY %i, innerHeight %i -> slide %i', (scrollY, innerHeight, slide) => {
    expect(computeIdleScene(tops, scrollY, innerHeight)).toBe(slide);
  });

  it('returns 1 when no top qualifies or there are no sections', () => {
    expect(computeIdleScene([500, 900], 0, 800)).toBe(1);
    expect(computeIdleScene([], 0, 800)).toBe(1);
  });
});

type Ctx = Parameters<typeof keyToAction>[1];
const base: Ctx = { current: 10, pinned: false, scrollLength: 1, progress: 1, drawerOpen: false, demoEscape: false };
const pinned = (progress: number): Ctx => ({ ...base, pinned: true, scrollLength: 3, progress });

// Dispatches a real keydown on `target` and maps it as the window listener will see it.
function press(init: KeyboardEventInit, ctx: Ctx = base, target: EventTarget = document.body): NavAction | null {
  let action: NavAction | null | undefined;
  const handler = (e: KeyboardEvent) => {
    action = keyToAction(e, ctx);
  };
  window.addEventListener('keydown', handler);
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }));
  window.removeEventListener('keydown', handler);
  if (action === undefined) throw new Error('keydown did not reach window');
  return action;
}

const goTo = (slide: number): NavAction => ({ type: 'goTo', slide });
const SPACE = ' ';

describe('keyToAction key table', () => {
  it.each([
    ['ArrowDown', false],
    ['PageDown', false],
    [SPACE, false],
    ['ArrowDown', true], // Shift does not change arrows or Page keys
    ['PageDown', true],
  ])('%j (shift %s) unpinned -> next scene', (key, shiftKey) => {
    expect(press({ key, shiftKey })).toEqual(goTo(11));
  });

  it.each([
    ['ArrowUp', false],
    ['PageUp', false],
    [SPACE, true],
    ['ArrowUp', true],
    ['PageUp', true],
  ])('%j (shift %s) unpinned -> previous scene', (key, shiftKey) => {
    expect(press({ key, shiftKey })).toEqual(goTo(9));
  });

  it.each(['ArrowDown', 'PageDown', SPACE])('%j in a pinned scene with progress < 1 scrolls forward', (key) => {
    expect(press({ key }, pinned(0.5))).toEqual({ type: 'scrollBy', direction: 1 });
    expect(press({ key }, pinned(1 / 3))).toEqual({ type: 'scrollBy', direction: 1 });
  });

  it.each(['ArrowDown', 'PageDown', SPACE])('%j in a pinned scene at progress 1 goes to the next scene', (key) => {
    expect(press({ key }, pinned(1))).toEqual(goTo(11));
  });

  it.each([
    ['ArrowUp', false],
    ['PageUp', false],
    [SPACE, true],
  ])('%j (shift %s) in a pinned scene past its top scrolls back', (key, shiftKey) => {
    expect(press({ key, shiftKey }, pinned(0.5))).toEqual({ type: 'scrollBy', direction: -1 });
    expect(press({ key, shiftKey }, pinned(1))).toEqual({ type: 'scrollBy', direction: -1 });
  });

  it.each([
    ['ArrowUp', false],
    ['PageUp', false],
    [SPACE, true],
  ])('%j (shift %s) in a pinned scene at its top goes to the previous scene', (key, shiftKey) => {
    expect(press({ key, shiftKey }, pinned(1 / 3))).toEqual(goTo(9));
    expect(press({ key, shiftKey }, pinned(0))).toEqual(goTo(9));
  });

  describe('pinned edges tolerate PROGRESS_EPSILON (ruling 12)', () => {
    const top = 1 / 3;
    it('within epsilon of an edge, the key goes to the adjacent scene', () => {
      expect(press({ key: 'ArrowDown' }, pinned(1 - 0.0005))).toEqual(goTo(11));
      expect(press({ key: SPACE }, pinned(1 - 0.0005))).toEqual(goTo(11));
      expect(press({ key: 'ArrowUp' }, pinned(top + 0.0005))).toEqual(goTo(9));
      expect(press({ key: SPACE, shiftKey: true }, pinned(top + 0.0005))).toEqual(goTo(9));
    });
    it('just beyond epsilon, the key still scrolls within the scene', () => {
      const beyond = PROGRESS_EPSILON + 0.0005;
      expect(press({ key: 'ArrowDown' }, pinned(1 - beyond))).toEqual({ type: 'scrollBy', direction: 1 });
      expect(press({ key: 'ArrowUp' }, pinned(top + beyond))).toEqual({ type: 'scrollBy', direction: -1 });
    });
  });

  it('Home and End go to the first and last scene, including when already there', () => {
    expect(press({ key: 'Home' })).toEqual(goTo(1));
    expect(press({ key: 'End' })).toEqual(goTo(46));
    expect(press({ key: 'Home' }, { ...base, current: 1 })).toEqual(goTo(1));
    expect(press({ key: 'End' }, { ...base, current: 46 })).toEqual(goTo(46));
  });

  it('returns null when the target slide would leave 1..46', () => {
    const last = { ...base, current: 46 };
    const first = { ...base, current: 1 };
    expect(press({ key: 'ArrowDown' }, last)).toBeNull();
    expect(press({ key: SPACE }, last)).toBeNull();
    expect(press({ key: 'ArrowUp' }, first)).toBeNull();
    expect(press({ key: SPACE, shiftKey: true }, first)).toBeNull();
    // A pinned last scene still scrolls through its range.
    expect(press({ key: 'ArrowDown' }, { ...pinned(0.5), current: 46 })).toEqual({ type: 'scrollBy', direction: 1 });
  });

  it('Escape closes the drawer first, else calls the demo escape, else nothing', () => {
    expect(press({ key: 'Escape' }, { ...base, drawerOpen: true, demoEscape: true })).toEqual({ type: 'closeDrawer' });
    expect(press({ key: 'Escape' }, { ...base, demoEscape: true })).toEqual({ type: 'demoEscape' });
    expect(press({ key: 'Escape' })).toBeNull();
  });

  it.each(['a', 'Tab', 'Enter', 'ArrowLeft', 'ArrowRight'])('%j is not a navigation key', (key) => {
    expect(press({ key })).toBeNull();
  });
});

describe('keyToAction filters', () => {
  function el(html: string): HTMLElement {
    const host = document.createElement('div');
    host.innerHTML = html;
    document.body.appendChild(host);
    // Dispatch from the marked (often nested) element, so ancestors are matched via closest().
    return host.querySelector('[data-t]') as HTMLElement;
  }

  const KEY_IGNORED = [
    '<input data-t>',
    '<textarea data-t></textarea>',
    '<select data-t><option>x</option></select>',
    '<div contenteditable><span data-t>x</span></div>',
    '<div contenteditable="true"><span data-t>x</span></div>',
    '<div contenteditable="plaintext-only"><span data-t>x</span></div>',
    '<div role="textbox"><span data-t>x</span></div>',
    '<div role="slider"><span data-t>x</span></div>',
    '<div role="spinbutton"><span data-t>x</span></div>',
    '<div role="listbox"><span data-t>x</span></div>',
    '<div role="radiogroup"><span data-t>x</span></div>',
    '<div role="tablist"><span data-t>x</span></div>',
    '<div role="menu"><span data-t>x</span></div>',
    '<div role="grid"><div role="row"><button data-t>row</button></div></div>',
  ];
  const NAV_KEYS: KeyboardEventInit[] = [
    { key: 'ArrowDown' },
    { key: 'ArrowUp' },
    { key: 'PageDown' },
    { key: 'PageUp' },
    { key: SPACE },
    { key: SPACE, shiftKey: true },
    { key: 'Home' },
    { key: 'End' },
  ];

  it('the selectors are the CONTRACTS §8 lists', () => {
    expect(KEY_IGNORE_SELECTOR).toBe(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [role="slider"], [role="spinbutton"], [role="listbox"], [role="radiogroup"], [role="tablist"], [role="menu"], [role="grid"]',
    );
    expect(SPACE_IGNORE_SELECTOR).toBe('button, summary, [role="button"], [role="checkbox"], [role="switch"]');
  });

  describe.each(KEY_IGNORED)('inside %s', (html) => {
    it.each(NAV_KEYS)('%j -> null', (init) => {
      expect(press(init, base, el(html))).toBeNull();
    });
    it('Escape still acts', () => {
      expect(press({ key: 'Escape' }, { ...base, drawerOpen: true }, el(html))).toEqual({ type: 'closeDrawer' });
    });
  });

  it('contenteditable="false" does not block navigation', () => {
    expect(press({ key: 'ArrowDown' }, base, el('<div contenteditable="false"><span data-t>x</span></div>'))).toEqual(
      goTo(11),
    );
  });

  describe.each([
    '<button data-t>b</button>',
    '<button><span data-t>icon</span></button>',
    '<details><summary data-t>s</summary></details>',
    '<div role="button" tabindex="0" data-t>b</div>',
    '<div role="checkbox" tabindex="0" data-t>c</div>',
    '<div role="switch" tabindex="0" data-t>s</div>',
  ])('Space inside %s', (html) => {
    it('Space and Shift+Space -> null', () => {
      expect(press({ key: SPACE }, base, el(html))).toBeNull();
      expect(press({ key: SPACE, shiftKey: true }, base, el(html))).toBeNull();
    });
    it('arrows, Page keys and Escape still act', () => {
      expect(press({ key: 'ArrowDown' }, base, el(html))).toEqual(goTo(11));
      expect(press({ key: 'PageUp' }, base, el(html))).toEqual(goTo(9));
      expect(press({ key: 'Escape' }, { ...base, demoEscape: true }, el(html))).toEqual({ type: 'demoEscape' });
    });
  });

  it('Space on a link or plain element navigates', () => {
    expect(press({ key: SPACE }, base, el('<a href="#scene-01" data-t>x</a>'))).toEqual(goTo(11));
    expect(press({ key: SPACE }, base, el('<p data-t>x</p>'))).toEqual(goTo(11));
  });

  describe.each(['altKey', 'ctrlKey', 'metaKey'] as const)('%s', (mod) => {
    it.each([...NAV_KEYS, { key: 'Escape' }])('suppresses %j', (init) => {
      expect(press({ ...init, [mod]: true }, { ...base, drawerOpen: true, demoEscape: true })).toBeNull();
    });
  });
});
