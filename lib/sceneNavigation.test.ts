import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as analytics from '@/lib/analytics';
import { resetSceneProgress, setSceneProgress } from '@/components/presentation/SceneProgress';
import {
  KEY_IGNORE_SELECTOR,
  PROGRESS_EPSILON,
  SNAP_IDLE_MS,
  SPACE_IGNORE_SELECTOR,
  computeIdleScene,
  endNavigation,
  getCurrentScene,
  getDemoEscape,
  getDrawerSlide,
  getDrawerTrigger,
  getIndexEscape,
  getNavigationTarget,
  goToScene,
  isNavigationInFlight,
  keyToAction,
  nearestSnapTarget,
  setCurrentScene,
  setIndexEscape,
  startNavigationEngine,
  subscribeCurrentScene,
  useCurrentScene,
  useDemoEscape,
  useSourceDrawer,
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
  // Unmounts every renderHook/render from this test (e.g. useDemoEscape, useSourceDrawer), so a
  // registration doesn't leak into the next test — this file has no global RTL auto-cleanup.
  cleanup();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  endNavigation();
  // Force at least one real current-scene transition so the drawer's auto-close subscriber
  // always fires, regardless of what a test left `current` and the drawer at (module singletons).
  setCurrentScene(2);
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

describe('useSourceDrawer (source drawer store)', () => {
  it('starts closed; open sets slide, records the trigger and tracks source_open; close reopens to null', () => {
    const trackSpy = vi.spyOn(analytics, 'track');
    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    const { result } = renderHook(() => useSourceDrawer());
    expect(result.current.slide).toBeNull();
    expect(getDrawerSlide()).toBeNull();

    act(() => result.current.open(9));
    expect(result.current.slide).toBe(9);
    expect(getDrawerSlide()).toBe(9);
    expect(getDrawerTrigger()).toBe(button);
    expect(trackSpy).toHaveBeenCalledWith('source_open', { slide: 9 });

    act(() => result.current.close());
    expect(result.current.slide).toBeNull();
  });

  it('opening for another slide while already open switches in place (still one drawer)', () => {
    const trackSpy = vi.spyOn(analytics, 'track');
    const { result } = renderHook(() => useSourceDrawer());

    act(() => result.current.open(3));
    expect(result.current.slide).toBe(3);
    act(() => result.current.open(5));
    expect(result.current.slide).toBe(5);
    expect(trackSpy.mock.calls.filter(([event]) => event === 'source_open')).toEqual([
      ['source_open', { slide: 3 }],
      ['source_open', { slide: 5 }],
    ]);
  });

  it('a current-scene change closes the drawer, whatever the cause', () => {
    const { result } = renderHook(() => useSourceDrawer());
    act(() => result.current.open(5));
    expect(getDrawerSlide()).toBe(5);
    act(() => setCurrentScene(6));
    expect(getDrawerSlide()).toBeNull();
    expect(result.current.slide).toBeNull();
  });
});

describe('useDemoEscape', () => {
  afterEach(() => {
    // Belt-and-braces: clear any handler a failed assertion left registered for slide 23.
    expect(getDemoEscape(23)).toBeUndefined();
  });

  it('registers only while onEscape is non-null, always calling the latest function, keyed by slide', () => {
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ onEscape }: { onEscape: (() => void) | null }) => useDemoEscape(23, onEscape),
      { initialProps: { onEscape: fn1 as (() => void) | null } },
    );

    expect(getDemoEscape(23)).toBeDefined();
    getDemoEscape(23)?.();
    expect(fn1).toHaveBeenCalledTimes(1);
    expect(fn2).not.toHaveBeenCalled();

    // A fresh closure with the same non-null-ness must not require re-registration to take effect.
    rerender({ onEscape: fn2 });
    getDemoEscape(23)?.();
    expect(fn2).toHaveBeenCalledTimes(1);
    expect(fn1).toHaveBeenCalledTimes(1);

    rerender({ onEscape: null });
    expect(getDemoEscape(23)).toBeUndefined();

    rerender({ onEscape: fn2 });
    expect(getDemoEscape(23)).toBeDefined();

    unmount();
    expect(getDemoEscape(23)).toBeUndefined();
  });

  it('unmounting while onEscape is null is a no-op unregister (nothing to clean up)', () => {
    const { unmount } = renderHook(() => useDemoEscape(23, null));
    expect(getDemoEscape(23)).toBeUndefined();
    expect(() => unmount()).not.toThrow();
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
    expect(
      press({ key: 'Escape' }, { ...base, drawerOpen: true, demoEscape: true }),
    ).toEqual({ type: 'closeDrawer' });
    expect(press({ key: 'Escape' }, { ...base, demoEscape: true })).toEqual({ type: 'demoEscape' });
    expect(press({ key: 'Escape' })).toBeNull();
  });

  it.each([
    ['ArrowDown', false],
    ['ArrowUp', false],
    ['PageDown', false],
    ['PageUp', false],
    ['Home', false],
    ['End', false],
    [SPACE, false],
    [SPACE, true],
  ])('while the index overlay is open, %j (shift %s) is inert (the dialog is modal)', (key, shiftKey) => {
    expect(press({ key, shiftKey }, { ...base, indexOpen: true })).toBeNull();
  });

  it('while the index overlay is open, Escape still closes it, ahead of the drawer and demo escape', () => {
    expect(
      press(
        { key: 'Escape' },
        { ...base, indexOpen: true, drawerOpen: true, demoEscape: true },
      ),
    ).toEqual({ type: 'closeIndex' });
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

describe('nearestSnapTarget', () => {
  const vh = 800;
  // 1 unpinned at 0; 2 pinned (3 viewports) at 800, sticky range (800, 2400]; 3 unpinned at 3200.
  const sections = [
    { top: 0, pinned: false, height: 800 },
    { top: 800, pinned: true, height: 2400 },
    { top: 3200, pinned: false, height: 800 },
  ];
  it.each([
    [0, 0],
    [300, 0],
    [500, 800],
    [800, 800], // exact start of the sticky range: its own top
    [2400.5, 3200], // just past the range end: nearest top
    [2900, 3200],
    [9999, 3200],
  ])('scrollY %d -> %i', (scrollY, top) => {
    expect(nearestSnapTarget(scrollY, sections, vh)).toBe(top);
  });

  it.each([800.5, 1600, 2399, 2400])('scrollY %d in the sticky range past its top (end included) -> null', (scrollY) => {
    expect(nearestSnapTarget(scrollY, sections, vh)).toBeNull();
  });

  it('pinned with 2 viewports: its exact range end holds (ruling 15), not a tie back to its top', () => {
    const two = [
      { top: 0, pinned: true, height: 1600 },
      { top: 1600, pinned: false, height: 800 },
    ];
    expect(nearestSnapTarget(800, two, vh)).toBeNull();
  });

  it('I5: a tall UNPINNED section also suppresses snapping inside its overflow range, not just pinned ones', () => {
    const tallUnpinned = [
      { top: 0, pinned: false, height: 800 },
      { top: 800, pinned: false, height: 2400 }, // 3 viewports, unpinned but taller than the viewport
      { top: 3200, pinned: false, height: 800 },
    ];
    // Strictly inside the overflow range, including the exact end: null (no trap-free zone).
    expect(nearestSnapTarget(800.5, tallUnpinned, vh)).toBeNull();
    expect(nearestSnapTarget(1600, tallUnpinned, vh)).toBeNull();
    expect(nearestSnapTarget(2400, tallUnpinned, vh)).toBeNull();
    // Its own top, and past the range end, still snap normally.
    expect(nearestSnapTarget(800, tallUnpinned, vh)).toBe(800);
    expect(nearestSnapTarget(2400.5, tallUnpinned, vh)).toBe(3200);
  });

  it('a normal unpinned section (height <= viewport) never suppresses snapping', () => {
    const normal = [
      { top: 0, pinned: false, height: 800 },
      { top: 800, pinned: false, height: 400 }, // shorter than the viewport: empty range
      { top: 1200, pinned: false, height: 800 },
    ];
    expect(nearestSnapTarget(900, normal, vh)).toBe(800);
    expect(nearestSnapTarget(1100, normal, vh)).toBe(1200);
  });

  it('a tie goes to the earlier top', () => {
    expect(nearestSnapTarget(400, sections, vh)).toBe(0);
    expect(nearestSnapTarget(2800, sections, vh)).toBe(3200); // not a tie: 800 is 2000 away
  });

  it('returns null when there are no sections', () => {
    expect(nearestSnapTarget(0, [], vh)).toBeNull();
  });
});

describe('navigation engine', () => {
  const VH = 800;
  // Slides 1..8 as in the manifest: 5 pinned x3 (top 3200, range end 4800), 8 pinned x2 (top 7200).
  const HEIGHTS = [800, 800, 800, 800, 2400, 800, 800, 1600];
  const TOPS = HEIGHTS.map((_, i) => HEIGHTS.slice(0, i).reduce((a, b) => a + b, 0));
  let y = 0;
  let stop: (() => void) | undefined;
  let trackSpy: MockInstance<typeof analytics.track>;

  const scrollToY = (next: number) => {
    y = next;
    window.dispatchEvent(new Event('scroll'));
  };
  const wheel = () => window.dispatchEvent(new WheelEvent('wheel', { deltaY: 40 }));
  const key = (init: KeyboardEventInit, target: EventTarget = document.body) => {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    target.dispatchEvent(event);
    return event;
  };
  const start = () => {
    stop = startNavigationEngine();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    y = 0;
    Object.defineProperty(window, 'scrollY', { get: () => y, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: VH, configurable: true });
    setReducedMotion(false);
    const main = document.createElement('main');
    main.id = 'presentation';
    HEIGHTS.forEach((height, i) => {
      const el = document.createElement('section');
      const nn = String(i + 1).padStart(2, '0');
      el.id = `scene-${nn}`;
      el.dataset.scene = `scene-${nn}`;
      el.dataset.pin = String(i === 4 || i === 7);
      el.tabIndex = -1;
      el.getBoundingClientRect = () => ({ top: TOPS[i] - y, height }) as DOMRect;
      main.appendChild(el);
    });
    document.body.appendChild(main);
    trackSpy = vi.spyOn(analytics, 'track');
  });

  afterEach(() => {
    stop?.();
    stop = undefined;
    resetSceneProgress();
    vi.useRealTimers();
  });

  describe('soft snapping', () => {
    it('snaps smoothly to the nearest top after SNAP_IDLE_MS of quiet following wheel input', () => {
      expect(SNAP_IDLE_MS).toBe(160);
      start();
      scrollToY(300);
      wheel();
      vi.advanceTimersByTime(159);
      expect(scrollTo).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      vi.advanceTimersByTime(1000);
      expect(scrollTo).toHaveBeenCalledTimes(1); // disarmed after firing
    });

    it('touchend arms snapping; an unhandled key does not (ruling 14)', () => {
      start();
      scrollToY(500);
      window.dispatchEvent(new Event('touchend'));
      vi.advanceTimersByTime(SNAP_IDLE_MS);
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 800, behavior: 'smooth' });
      scrollToY(1300);
      key({ key: 'a' });
      key({ key: 'ArrowDown' }, document.body.appendChild(document.createElement('input')));
      vi.advanceTimersByTime(1000);
      expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    it('new input restarts the timer', () => {
      start();
      scrollToY(300);
      wheel();
      vi.advanceTimersByTime(100);
      wheel();
      vi.advanceTimersByTime(100);
      expect(scrollTo).not.toHaveBeenCalled();
      vi.advanceTimersByTime(60);
      expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    it('scroll events while armed restart the timer (momentum is never fought)', () => {
      start();
      wheel();
      for (const next of [100, 200, 300]) {
        vi.advanceTimersByTime(100);
        scrollToY(next);
      }
      expect(scrollTo).not.toHaveBeenCalled();
      vi.advanceTimersByTime(SNAP_IDLE_MS);
      expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    });

    it('scrolling alone (e.g. a scrollbar drag) does not arm snapping', () => {
      start();
      scrollToY(300);
      vi.advanceTimersByTime(1000);
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('does not snap strictly inside a pinned sticky range, or within 1px of a top', () => {
      start();
      scrollToY(4000);
      wheel();
      vi.advanceTimersByTime(SNAP_IDLE_MS);
      scrollToY(800.5);
      wheel();
      vi.advanceTimersByTime(SNAP_IDLE_MS);
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('never snaps under reduced motion (read at fire time)', () => {
      start();
      scrollToY(300);
      wheel();
      setReducedMotion(true);
      vi.advanceTimersByTime(1000);
      expect(scrollTo).not.toHaveBeenCalled();
    });

    it('Review Focus 2: rapid wheel then goToScene issues one scrollTo, to the target; snap cancelled', () => {
      start();
      scrollToY(300);
      for (let i = 0; i < 5; i++) {
        wheel();
        vi.advanceTimersByTime(20);
      }
      goToScene(4);
      vi.advanceTimersByTime(1000);
      expect(scrollTo.mock.calls).toEqual([[{ top: 2400, behavior: 'smooth' }]]);
      expect(isNavigationInFlight()).toBe(false);
    });
  });

  describe('navigation settle', () => {
    it('ends when a scroll event reaches the target (within 1px)', () => {
      start();
      goToScene(4);
      scrollToY(1200);
      expect(isNavigationInFlight()).toBe(true);
      scrollToY(2399.5);
      expect(isNavigationInFlight()).toBe(false);
    });

    it('ends on scrollend', () => {
      start();
      goToScene(4);
      scrollToY(1200);
      window.dispatchEvent(new Event('scrollend'));
      expect(isNavigationInFlight()).toBe(false);
    });

    it('ends after SNAP_IDLE_MS when no scroll event ever fires (Home on scene 1 at the top)', () => {
      start();
      key({ key: 'Home' });
      expect(isNavigationInFlight()).toBe(true);
      vi.advanceTimersByTime(SNAP_IDLE_MS);
      expect(isNavigationInFlight()).toBe(false);
    });

    it('scroll events toward the target keep it in flight past SNAP_IDLE_MS', () => {
      start();
      goToScene(6);
      for (let i = 1; i <= 10; i++) {
        vi.advanceTimersByTime(50);
        scrollToY(i * 500);
      }
      expect(isNavigationInFlight()).toBe(true);
    });

    it('wheel input during a navigation ends it', () => {
      start();
      goToScene(6);
      scrollToY(1000);
      wheel();
      expect(isNavigationInFlight()).toBe(false);
    });
  });

  describe('current scene from scroll', () => {
    it('follows the idle scene while no navigation is in flight', () => {
      start();
      scrollToY(TOPS[4] + 1000); // inside pinned 5
      expect(getCurrentScene()).toBe(5);
      scrollToY(TOPS[2] - VH / 2); // midline exactly on 3's top
      expect(getCurrentScene()).toBe(3);
    });

    it('is computed once at start (mid-page refresh without a scroll event)', () => {
      y = TOPS[4] + 1000;
      start();
      expect(getCurrentScene()).toBe(5);
    });

    it('pauses while a navigation is in flight', () => {
      start();
      goToScene(6);
      scrollToY(1000);
      expect(getCurrentScene()).toBe(6);
    });

    it('tracks scene_enter on every change, not at start', () => {
      start();
      scrollToY(900);
      goToScene(7);
      const enters = trackSpy.mock.calls.filter(([event]) => event === 'scene_enter');
      expect(enters).toEqual([
        ['scene_enter', { slide: 2 }],
        ['scene_enter', { slide: 7 }],
      ]);
    });
  });

  describe('keydown', () => {
    it('a handled key calls goToScene and prevents the default', () => {
      start();
      const event = key({ key: 'ArrowDown' });
      expect(event.defaultPrevented).toBe(true);
      expect(scrollTo).toHaveBeenCalledWith({ top: 800, behavior: 'smooth' });
      expect(getCurrentScene()).toBe(2);
    });

    it('PageUp and End read the current scene', () => {
      start();
      scrollToY(TOPS[6]);
      key({ key: 'PageUp' });
      expect(getCurrentScene()).toBe(6);
      expect(key({ key: 'End' }).defaultPrevented).toBe(true); // scene 46 is absent here: goToScene ignores it
      expect(scrollTo).toHaveBeenCalledTimes(1);
    });

    it('an ignored target, a modifier or an unmapped key is not handled', () => {
      start();
      const input = document.createElement('input');
      document.body.appendChild(input);
      expect(key({ key: 'ArrowDown' }, input).defaultPrevented).toBe(false);
      expect(key({ key: 'a' }).defaultPrevented).toBe(false);
      expect(key({ key: 'ArrowDown', ctrlKey: true }).defaultPrevented).toBe(false);
      expect(scrollTo).not.toHaveBeenCalled();
      expect(getCurrentScene()).toBe(1);
    });

    it('in a pinned scene with progress < 1 scrolls one viewport, clamped to the sticky range; never snapped away', () => {
      start();
      scrollToY(4300); // mid 5, no navigation in flight
      setSceneProgress(5, 0.875);
      wheel(); // armed before the key; the handled key cancels it (ruling 14)
      expect(key({ key: 'ArrowDown' }).defaultPrevented).toBe(true);
      expect(scrollTo).toHaveBeenLastCalledWith({ top: 4800, behavior: 'smooth' }); // clamped to the range end
      scrollToY(4800);
      expect(isNavigationInFlight()).toBe(false);
      vi.advanceTimersByTime(1000);
      expect(scrollTo).toHaveBeenCalledTimes(1);
      expect(getCurrentScene()).toBe(5);
    });

    describe('keys pressed while a scroll is still animating act from the pending destination', () => {
      const targets = () => scrollTo.mock.calls.map(([options]) => (options as ScrollToOptions).top);

      it('two quick ArrowDowns from 4 end on 5 second beat (4000)', () => {
        start();
        scrollToY(TOPS[3]);
        key({ key: 'ArrowDown' }); // -> 5 (3200)
        scrollToY(2600); // mid-animation, not at the target
        setSceneProgress(5, 0.1); // live measurement mid-animation
        key({ key: 'ArrowDown' });
        expect(targets()).toEqual([3200, 4000]);
        scrollToY(4000);
        expect(isNavigationInFlight()).toBe(false);
        expect(getCurrentScene()).toBe(5);
      });

      it('two quick ArrowUps from 6 go to 5 top, then to 4', () => {
        start();
        scrollToY(TOPS[5]);
        key({ key: 'ArrowUp' }); // -> 5 (3200)
        scrollToY(5000);
        setSceneProgress(5, 1);
        key({ key: 'ArrowUp' });
        expect(targets()).toEqual([3200, 2400]);
        expect(getCurrentScene()).toBe(4);
      });

      it('repeated PageDown steps in exact viewport multiples, then leaves the scene', () => {
        start();
        scrollToY(TOPS[4]);
        setSceneProgress(5, 1 / 3);
        key({ key: 'PageDown' });
        scrollToY(3500);
        setSceneProgress(5, 0.5);
        key({ key: 'PageDown' });
        scrollToY(3900);
        setSceneProgress(5, 0.66);
        key({ key: 'PageDown' });
        expect(targets()).toEqual([4000, 4800, 5600]);
        expect(getCurrentScene()).toBe(6);
      });

      it('a pending in-scene step clears like a navigation, and goToScene to that scene top is not swallowed', () => {
        start();
        scrollToY(TOPS[4]);
        setSceneProgress(5, 1 / 3);
        key({ key: 'PageDown' });
        expect(isNavigationInFlight()).toBe(true);
        goToScene(5);
        expect(targets()).toEqual([4000, 3200]);
        vi.advanceTimersByTime(SNAP_IDLE_MS);
        expect(isNavigationInFlight()).toBe(false);
      });
    });

    it('scrolls back clamped to the section top, with auto behaviour under reduced motion', () => {
      start();
      scrollToY(TOPS[4] + 300);
      setSceneProgress(5, 0.45);
      setReducedMotion(true);
      key({ key: 'ArrowUp' });
      expect(scrollTo).toHaveBeenLastCalledWith({ top: TOPS[4], behavior: 'auto' });
    });

    it('falls through to the adjacent scene when the clamped target is within 1px (never trapped)', () => {
      start();
      // Unmeasured progress (1) reads as "past its top", but the clamp leaves < 1px to go back.
      scrollToY(TOPS[4] + 0.5);
      key({ key: 'ArrowUp' });
      expect(scrollTo).toHaveBeenLastCalledWith({ top: TOPS[3], behavior: 'smooth' });
      expect(getCurrentScene()).toBe(4);
      endNavigation();
      // Measured just short of 1 at the range end: forward goes to the next scene.
      scrollToY(4800);
      setSceneProgress(5, 0.99);
      key({ key: 'ArrowDown' });
      expect(scrollTo).toHaveBeenLastCalledWith({ top: TOPS[5], behavior: 'smooth' });
      expect(getCurrentScene()).toBe(6);
    });
  });

  describe('Escape precedence: index overlay closes first (A21, Task 38)', () => {
    afterEach(() => setIndexEscape(null)); // module-level singleton; never leak into later tests

    it('closes the index overlay via the real engine listener, even with the drawer and a demo escape also active', () => {
      start();
      const indexClose = vi.fn();
      const demoEscape = vi.fn();
      setIndexEscape(indexClose);
      renderHook(() => useDemoEscape(1, demoEscape));
      const drawer = renderHook(() => useSourceDrawer());
      act(() => drawer.result.current.open(1));

      let event!: KeyboardEvent;
      act(() => {
        event = key({ key: 'Escape' });
      });
      expect(event.defaultPrevented).toBe(true);
      expect(indexClose).toHaveBeenCalledTimes(1);
      expect(drawer.result.current.slide).toBe(1); // untouched: index is the topmost layer
      expect(demoEscape).not.toHaveBeenCalled();
    });

    it('with the index overlay closed, falls through to the drawer as before', () => {
      start();
      expect(getIndexEscape()).toBeNull();
      const drawer = renderHook(() => useSourceDrawer());
      act(() => drawer.result.current.open(1));

      act(() => {
        key({ key: 'Escape' });
      });
      expect(drawer.result.current.slide).toBeNull();
    });
  });

  describe('Escape precedence: drawer close, then demo escape, then nothing (Task 13)', () => {
    it('closes an open drawer via the real engine listener; the demo handler is not called', () => {
      start();
      const demoEscape = vi.fn();
      renderHook(() => useDemoEscape(1, demoEscape)); // current scene starts at 1
      const drawer = renderHook(() => useSourceDrawer());
      act(() => drawer.result.current.open(1));

      let event!: KeyboardEvent;
      act(() => {
        event = key({ key: 'Escape' });
      });
      expect(event.defaultPrevented).toBe(true);
      expect(drawer.result.current.slide).toBeNull();
      expect(demoEscape).not.toHaveBeenCalled();
    });

    it('with the drawer closed, calls the current slide\'s registered demo escape', () => {
      start();
      const demoEscape = vi.fn();
      renderHook(() => useDemoEscape(1, demoEscape));

      let event!: KeyboardEvent;
      act(() => {
        event = key({ key: 'Escape' });
      });
      expect(event.defaultPrevented).toBe(true);
      expect(demoEscape).toHaveBeenCalledTimes(1);
    });

    it('does nothing (no preventDefault) with the drawer closed and no demo escape registered', () => {
      start();
      let event!: KeyboardEvent;
      act(() => {
        event = key({ key: 'Escape' });
      });
      expect(event.defaultPrevented).toBe(false);
    });
  });

  it('removes every listener, subscription and timer on stop', () => {
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    start();
    goToScene(4);
    stop!();
    expect(isNavigationInFlight()).toBe(false);
    start();
    scrollToY(300);
    wheel(); // snap pending
    stop!();
    stop = undefined;
    const added = add.mock.calls.map(([type, fn]) => [type, fn]);
    expect(added.length).toBeGreaterThanOrEqual(10);
    expect(remove.mock.calls.map(([type, fn]) => [type, fn])).toEqual(expect.arrayContaining(added));

    trackSpy.mockClear();
    const scrolls = scrollTo.mock.calls.length;
    vi.advanceTimersByTime(1000); // the pending snap was cleared
    expect(key({ key: 'ArrowDown' }).defaultPrevented).toBe(false);
    scrollToY(2000);
    wheel();
    vi.advanceTimersByTime(1000);
    expect(scrollTo).toHaveBeenCalledTimes(scrolls);
    expect(getCurrentScene()).toBe(1); // unchanged since the last scroll the engine saw (y 300); 2000 would be 3
    setCurrentScene(9);
    expect(trackSpy).not.toHaveBeenCalled();
  });
});
