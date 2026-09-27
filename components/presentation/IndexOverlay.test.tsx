import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { ACTS, UI_COPY } from '@/lib/constants';
import { getCurrentScene, setCurrentScene, startNavigationEngine } from '@/lib/sceneNavigation';
import { IndexOverlay, indexSceneLabel } from './IndexOverlay';

const goToSceneMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/sceneNavigation', async () => {
  const actual = await vi.importActual<typeof import('@/lib/sceneNavigation')>('@/lib/sceneNavigation');
  return { ...actual, goToScene: goToSceneMock };
});

// Two real slides get an explicit title / eyebrow-only name; everything else keeps both blank
// (current manifest state, per the brief) so "Go to scene NN" without a suffix is exercised too.
vi.mock('@/lib/scenes', async () => {
  const actual = await vi.importActual<typeof import('@/lib/scenes')>('@/lib/scenes');
  const scenes = actual.scenes.map((s) => {
    if (s.slide === 9) return { ...s, title: 'Guardrails intro', eyebrow: '' };
    if (s.slide === 10) return { ...s, title: '', eyebrow: 'Design pattern' };
    return { ...s, title: '', eyebrow: '' };
  });
  return { scenes };
});

// Real exit animations are async (RAF-driven) and would make DOM-removal assertions racy; this
// unit-tests IndexOverlay's own open/close/focus/trap logic, not framer-motion's animation timing
// (same approach as components/ui/SourceDrawer.test.tsx).
vi.mock('framer-motion', async () => {
  const { forwardRef, createElement } = await import('react');
  const framerOnlyProps = new Set(['initial', 'animate', 'exit', 'transition', 'whileHover', 'whileTap']);
  const motion = new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        forwardRef<HTMLElement, Record<string, unknown>>((props, ref) => {
          const rest: Record<string, unknown> = {};
          for (const [key, value] of Object.entries(props)) {
            if (!framerOnlyProps.has(key)) rest[key] = value;
          }
          return createElement(tag, { ...rest, ref });
        }),
    },
  );
  return { AnimatePresence: ({ children }: { children?: unknown }) => children, motion };
});

let stopEngine: (() => void) | undefined;

beforeEach(() => {
  goToSceneMock.mockClear();
  setCurrentScene(1);
});

afterEach(() => {
  stopEngine?.();
  stopEngine = undefined;
  cleanup();
  setCurrentScene(2);
  setCurrentScene(1);
});

function openOverlay() {
  const trigger = document.querySelector('button[aria-controls="scene-index"]') as HTMLButtonElement;
  fireEvent.click(trigger);
  return { trigger, dialog: document.getElementById('scene-index') as HTMLElement };
}

describe('indexSceneLabel', () => {
  it('builds "Go to scene NN" when both title and eyebrow are absent', () => {
    expect(indexSceneLabel(1)).toBe('Go to scene 01');
    expect(indexSceneLabel(46, '', '')).toBe('Go to scene 46');
  });

  it('prefers title over eyebrow, and falls back to eyebrow when title is empty', () => {
    expect(indexSceneLabel(9, 'Guardrails intro', '')).toBe('Go to scene 09: Guardrails intro');
    expect(indexSceneLabel(10, '', 'Design pattern')).toBe('Go to scene 10: Design pattern');
  });
});

describe('IndexOverlay', () => {
  it('trigger toggles aria-expanded and mounts/unmounts the dialog', () => {
    render(<IndexOverlay />);
    const trigger = document.querySelector('button[aria-controls="scene-index"]') as HTMLButtonElement;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById('scene-index')).toBeNull();

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.getElementById('scene-index')).not.toBeNull();

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.getElementById('scene-index')).toBeNull();
  });

  it('trigger is labelled UI_COPY.index', () => {
    render(<IndexOverlay />);
    const trigger = document.querySelector('button[aria-controls="scene-index"]') as HTMLButtonElement;
    expect(trigger.textContent).toBe(UI_COPY.index);
  });

  it("trigger and dialog carry the current scene's theme (scene 3 = light, scene 7 = orange, scene 1 = dark)", () => {
    setCurrentScene(3);
    const { unmount: unmount1 } = render(<IndexOverlay />);
    let trigger = document.querySelector('button[aria-controls="scene-index"]') as HTMLButtonElement;
    expect(trigger.getAttribute('data-theme')).toBe('light');
    fireEvent.click(trigger);
    expect((document.getElementById('scene-index') as HTMLElement).getAttribute('data-theme')).toBe('light');
    unmount1();

    setCurrentScene(7);
    const { unmount: unmount2 } = render(<IndexOverlay />);
    trigger = document.querySelector('button[aria-controls="scene-index"]') as HTMLButtonElement;
    expect(trigger.getAttribute('data-theme')).toBe('orange');
    unmount2();

    setCurrentScene(1);
    render(<IndexOverlay />);
    trigger = document.querySelector('button[aria-controls="scene-index"]') as HTMLButtonElement;
    expect(trigger.getAttribute('data-theme')).toBe('dark');
  });

  it('dialog has the required role/aria wiring', () => {
    render(<IndexOverlay />);
    const { dialog } = openOverlay();
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBe('scene-index-title');
    expect(document.getElementById('scene-index-title')?.textContent).toBe(UI_COPY.index);
  });

  it('Minor 6: the scrolling dialog contains overscroll so wheel past its end never reaches the deck', () => {
    render(<IndexOverlay />);
    const { dialog } = openOverlay();
    expect((dialog as HTMLElement).style.overscrollBehavior).toBe('contain');
  });

  it('lists exactly 46 scene buttons with the exact accessible names, and 8 act headings', () => {
    render(<IndexOverlay />);
    const { dialog } = openOverlay();

    const buttons = within(dialog).getAllByRole('button', { name: /^Go to scene/ });
    expect(buttons).toHaveLength(46);

    expect(within(dialog).getByRole('button', { name: 'Go to scene 01' })).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Go to scene 09: Guardrails intro' })).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Go to scene 10: Design pattern' })).toBeTruthy();
    expect(within(dialog).getByRole('button', { name: 'Go to scene 46' })).toBeTruthy();

    ACTS.forEach((a) => {
      const heading = dialog.querySelector(`#${a.id}-index-heading`);
      expect(heading?.textContent).toBe(`Act ${a.n} — ${a.label}`);
    });
  });

  it('scene 1 is listed first, ahead of any act heading', () => {
    render(<IndexOverlay />);
    const { dialog } = openOverlay();
    const first = dialog.querySelector('button[aria-label^="Go to scene"]');
    expect(first?.getAttribute('aria-label')).toBe('Go to scene 01');
  });

  it('marks the current scene\'s button aria-current="step", and only that one', () => {
    setCurrentScene(9);
    render(<IndexOverlay />);
    const { dialog } = openOverlay();

    const current = dialog.querySelectorAll('[aria-current="step"]');
    expect(current).toHaveLength(1);
    expect(current[0].getAttribute('aria-label')).toBe('Go to scene 09: Guardrails intro');
  });

  it('clicking a scene button calls goToScene(n) and closes the overlay', () => {
    render(<IndexOverlay />);
    const { trigger, dialog } = openOverlay();

    const button = within(dialog).getByRole('button', { name: 'Go to scene 10: Design pattern' });
    fireEvent.click(button);

    expect(goToSceneMock).toHaveBeenCalledWith(10);
    expect(document.getElementById('scene-index')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('opening focuses the first scene button', () => {
    render(<IndexOverlay />);
    const { dialog } = openOverlay();
    const first = within(dialog).getByRole('button', { name: 'Go to scene 01' });
    expect(document.activeElement).toBe(first);
  });

  it('the Close button closes the overlay and returns focus to the trigger', () => {
    render(<IndexOverlay />);
    const { trigger, dialog } = openOverlay();
    const closeButton = within(dialog).getByRole('button', { name: UI_COPY.close });

    fireEvent.click(closeButton);
    expect(document.getElementById('scene-index')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('a backdrop click closes the overlay', () => {
    render(<IndexOverlay />);
    const { trigger, dialog } = openOverlay();

    fireEvent.click(dialog); // the dialog element itself, not a descendant button
    expect(document.getElementById('scene-index')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('clicking inside the dialog on a non-button element does not close it', () => {
    render(<IndexOverlay />);
    openOverlay();
    const heading = document.getElementById('scene-index-title') as HTMLElement;

    fireEvent.click(heading);
    expect(document.getElementById('scene-index')).not.toBeNull();
  });

  it('closes on Escape via the real engine listener, and returns focus to the trigger', () => {
    stopEngine = startNavigationEngine();
    render(<IndexOverlay />);
    const { trigger } = openOverlay();
    expect(document.getElementById('scene-index')).not.toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.getElementById('scene-index')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('traps Tab: from the last focusable element, Tab wraps to the first', () => {
    render(<IndexOverlay />);
    const { dialog } = openOverlay();
    const focusables = Array.from(dialog.querySelectorAll('button')) as HTMLButtonElement[];
    const last = focusables[focusables.length - 1];
    const first = focusables[0];
    last.focus();

    fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('traps Shift+Tab: from the first focusable element, Shift+Tab wraps to the last', () => {
    render(<IndexOverlay />);
    const { dialog } = openOverlay();
    const focusables = Array.from(dialog.querySelectorAll('button')) as HTMLButtonElement[];
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first.focus();

    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('does not navigate away with Tab in the middle of the list', () => {
    render(<IndexOverlay />);
    const { dialog } = openOverlay();
    const focusables = Array.from(dialog.querySelectorAll('button')) as HTMLButtonElement[];
    const middle = focusables[3];
    middle.focus();

    const event = fireEvent.keyDown(dialog, { key: 'Tab' });
    expect(event).toBe(true); // not prevented; the browser's native Tab order handles it
  });

  it('never shows the current scene twice and stays in slide order within an act', () => {
    render(<IndexOverlay />);
    const { dialog } = openOverlay();
    const act3Heading = dialog.querySelector('#act-3-index-heading') as HTMLElement;
    const list = act3Heading.nextElementSibling as HTMLElement;
    const labels = Array.from(list.querySelectorAll('button')).map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual([
      'Go to scene 09: Guardrails intro',
      'Go to scene 10: Design pattern',
      'Go to scene 11',
      'Go to scene 12',
      'Go to scene 13',
      'Go to scene 14',
      'Go to scene 15',
    ]);
  });

  it('sanity: getCurrentScene reflects the mocked current scene used above', () => {
    setCurrentScene(9);
    expect(getCurrentScene()).toBe(9);
  });
});
