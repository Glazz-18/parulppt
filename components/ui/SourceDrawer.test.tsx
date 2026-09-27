import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import type { Scene } from '@/lib/types';
import { UI_COPY } from '@/lib/constants';
import * as analytics from '@/lib/analytics';
import { getCurrentScene, setCurrentScene, startNavigationEngine, useSourceDrawer } from '@/lib/sceneNavigation';
import { SideNav } from '@/components/presentation/SideNav';
import { SourceDrawer } from './SourceDrawer';

const { fixtureScenes } = vi.hoisted(() => {
  const make = (slide: number, sourceNotes?: string[]): Scene =>
    ({
      id: `scene-${String(slide).padStart(2, '0')}`,
      slide,
      act: 'act-1',
      theme: slide === 1 ? 'dark' : 'light',
      pin: false,
      scrollLength: 1,
      kind: 'editorial',
      title: `Scene ${slide}`,
      content: { blocks: [] },
      ...(sourceNotes ? { sourceNotes } : {}),
    }) as Scene;
  const fixtureScenes: Scene[] = [make(1, ['Fact one · Fact two']), make(2)];
  return { fixtureScenes };
});

vi.mock('@/lib/scenes', () => ({ scenes: fixtureScenes }));

// Real exit animations are async (RAF-driven) and would make DOM-removal assertions racy; this
// unit-tests SourceDrawer's own open/close/focus logic, not framer-motion's animation timing.
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

// The real SOURCE trigger (SceneRenderer's), reproduced minimally so this file stays focused on
// the drawer itself rather than the whole scene-rendering pipeline.
function Trigger({ slide }: { slide: number }) {
  const drawer = useSourceDrawer();
  return (
    <button
      type="button"
      aria-expanded={drawer.slide === slide}
      aria-controls="source-drawer"
      onClick={(event) => {
        event.currentTarget.focus();
        if (drawer.slide === slide) drawer.close();
        else drawer.open(slide);
      }}
    >
      {UI_COPY.source}
    </button>
  );
}

let stopEngine: (() => void) | undefined;

beforeEach(() => {
  if (!document.getElementById('scene-01')) document.body.appendChild(sectionEl(1));
  if (!document.getElementById('scene-02')) document.body.appendChild(sectionEl(2));
});

function sectionEl(slide: number): HTMLElement {
  const el = document.createElement('section');
  el.id = `scene-${String(slide).padStart(2, '0')}`;
  el.tabIndex = -1;
  return el;
}

afterEach(() => {
  stopEngine?.();
  stopEngine = undefined;
  cleanup();
  document.body.innerHTML = '';
  setCurrentScene(2);
  setCurrentScene(1);
  vi.restoreAllMocks();
});

describe('SourceDrawer', () => {
  it('opens via the SOURCE trigger, tracks source_open, focuses Close, and closes via the Close button, returning focus', () => {
    const trackSpy = vi.spyOn(analytics, 'track');
    render(
      <>
        <Trigger slide={1} />
        <SourceDrawer />
      </>,
    );
    const trigger = document.querySelector('button[aria-controls="source-drawer"]') as HTMLButtonElement;

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trackSpy).toHaveBeenCalledWith('source_open', { slide: 1 });

    const drawer = document.getElementById('source-drawer');
    expect(drawer).not.toBeNull();
    expect(drawer?.getAttribute('role')).toBe('dialog');
    expect(drawer?.getAttribute('aria-modal')).toBe('false');
    expect(drawer?.getAttribute('aria-labelledby')).toBe('source-drawer-title');
    expect(document.getElementById('source-drawer-title')?.textContent).toBe(UI_COPY.source);

    const closeButton = drawer?.querySelector('button') as HTMLButtonElement;
    expect(closeButton.textContent).toBe(UI_COPY.close);
    expect(document.activeElement).toBe(closeButton);

    fireEvent.click(closeButton);
    expect(document.getElementById('source-drawer')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('splits each sourceNotes entry on " · " into one <li> per piece', () => {
    render(
      <>
        <Trigger slide={1} />
        <SourceDrawer />
      </>,
    );
    fireEvent.click(document.querySelector('button[aria-controls="source-drawer"]')!);

    const items = document.querySelectorAll('#source-drawer li');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toBe('Fact one');
    expect(items[1].textContent).toBe('Fact two');
  });

  it('closes on Escape via the real engine listener', () => {
    stopEngine = startNavigationEngine();
    render(
      <>
        <Trigger slide={1} />
        <SourceDrawer />
      </>,
    );
    fireEvent.click(document.querySelector('button[aria-controls="source-drawer"]')!);
    expect(document.getElementById('source-drawer')).not.toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.getElementById('source-drawer')).toBeNull();
  });

  it('closes on a pointerdown outside the drawer, without preventDefault (non-modal)', () => {
    render(
      <>
        <Trigger slide={1} />
        <SourceDrawer />
        <button type="button">elsewhere</button>
      </>,
    );
    fireEvent.click(document.querySelector('button[aria-controls="source-drawer"]')!);
    expect(document.getElementById('source-drawer')).not.toBeNull();

    const elsewhere = Array.from(document.querySelectorAll('button')).find((b) => b.textContent === 'elsewhere')!;
    const event = new window.PointerEvent('pointerdown', { bubbles: true, cancelable: true });
    act(() => {
      elsewhere.dispatchEvent(event);
    });
    expect(document.getElementById('source-drawer')).toBeNull();
    expect(event.defaultPrevented).toBe(false);
  });

  it('a pointerdown on another SOURCE trigger does not close-then-reopen; the click toggles it directly', () => {
    render(
      <>
        <Trigger slide={1} />
        <Trigger slide={2} />
        <SourceDrawer />
      </>,
    );
    const [trigger1, trigger2] = Array.from(document.querySelectorAll('button[aria-controls="source-drawer"]'));
    fireEvent.click(trigger1);
    expect((trigger1 as HTMLElement).getAttribute('aria-expanded')).toBe('true');

    act(() => {
      trigger2.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    });
    fireEvent.click(trigger2);

    expect((trigger1 as HTMLElement).getAttribute('aria-expanded')).toBe('false');
    expect((trigger2 as HTMLElement).getAttribute('aria-expanded')).toBe('true');
  });

  it('closes on a current-scene change, and is non-modal: a SideNav click still calls goToScene', () => {
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    render(
      <>
        <Trigger slide={1} />
        <SourceDrawer />
        <SideNav />
      </>,
    );
    fireEvent.click(document.querySelector('button[aria-controls="source-drawer"]')!);
    expect(document.getElementById('source-drawer')).not.toBeNull();

    const link = document.querySelector('a[href="#scene-02"]') as HTMLAnchorElement;
    act(() => {
      fireEvent.click(link);
    });

    expect(document.getElementById('source-drawer')).toBeNull(); // scene change closed it
    expect(getCurrentScene()).toBe(2); // the click was not swallowed by the drawer
  });
});
