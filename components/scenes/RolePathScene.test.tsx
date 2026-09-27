import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import gsap from 'gsap';
import { RolePathScene } from './RolePathScene';
import type { Scene } from '@/lib/types';

const ROLES = ['User', 'Power user', 'Builder', 'Founder', 'System designer'];

const baseScene = (overrides: Partial<Scene> = {}): Scene =>
  ({
    id: 'scene-03',
    slide: 3,
    act: 'act-1',
    theme: 'light',
    component: 'RolePathScene',
    pin: false,
    scrollLength: 1,
    kind: 'diagram',
    eyebrow: 'ACT 1 · THE WORLD CHANGED',
    title: 'AI is bigger than ChatGPT',
    content: {
      blocks: [{ type: 'flow', marker: 'You are here', items: ROLES }],
    },
    ...overrides,
  }) as Scene;

let reduced = false;

function mockMatchMedia() {
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
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

beforeEach(() => {
  reduced = false;
  mockMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('RolePathScene', () => {
  it('renders the eyebrow, h2 title, and the five role labels as an ordered list in deck order, no scene chrome of its own', () => {
    const { container } = render(<RolePathScene scene={baseScene()} />);
    expect(screen.getByText('ACT 1 · THE WORLD CHANGED')).toBeTruthy();
    const h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe('AI is bigger than ChatGPT');

    const ol = container.querySelector('ol');
    expect(ol).toBeTruthy();
    const items = Array.from(ol!.querySelectorAll('[data-part="role"]'));
    expect(ROLES.every((role, i) => items[i]?.textContent?.includes(role))).toBe(true);

    // RolePathScene renders no SceneShell/<section> of its own (A12).
    expect(container.querySelector('section')).toBeNull();
  });

  it('renders the "You are here" marker text near its resting role (User, measured from the PPTX offsets)', () => {
    const { container } = render(<RolePathScene scene={baseScene()} />);
    expect(screen.getByText('You are here')).toBeTruthy();
    const items = Array.from(container.querySelectorAll('[data-part="role"]'));
    const userItem = items[0];
    expect(userItem?.textContent).toContain('User');
    expect(userItem?.querySelector('[data-part="marker"]')?.textContent).toContain('You are here');
  });

  // Finding 5 (Task 22b): five equal flex-1 columns put column 1's (User) centre at 10% and
  // column 5's (System designer) centre at 90% — path/pointer must span exactly that, not the
  // full inset-x-0 (0%..100%), or the pointer overshoots past the last dot at rest.
  it('insets the path and pointer to the first/last dot centres (10%), not the full width', () => {
    const { container } = render(<RolePathScene scene={baseScene()} />);
    const path = container.querySelector('[data-part="path"]') as HTMLElement;
    const pointer = container.querySelector('[data-part="pointer"]') as HTMLElement;
    expect(path.style.left).toBe('10%');
    expect(path.style.right).toBe('10%');
    expect(pointer.style.left).toBe('10%');
    expect(pointer.style.right).toBe('10%');
  });

  it('under reduced motion, all text is present and no GSAP timeline is created', () => {
    reduced = true;
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<RolePathScene scene={baseScene()} />);
    expect(screen.getByText('AI is bigger than ChatGPT')).toBeTruthy();
    expect(screen.getByText('You are here')).toBeTruthy();
    ROLES.forEach((role) => expect(screen.getByText(role)).toBeTruthy());
    expect(timelineSpy).not.toHaveBeenCalled();
  });

  it('under no-preference, builds exactly one paused GSAP timeline of duration 1', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<RolePathScene scene={baseScene()} />);
    expect(timelineSpy).toHaveBeenCalledTimes(1);
    const [vars] = timelineSpy.mock.calls[0] as [{ paused?: boolean }];
    expect(vars?.paused).toBe(true);
    const created = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    expect(created.duration()).toBe(1);
  });

  // Finding 4 (Task 22b, fix round 1): scrubbing now goes through the shared `useProgressRef`
  // (`./ContentScene`) instead of a local ref — this confirms the refactor still wires
  // `tl.progress(progressRef.current)` correctly (no provider wraps this render, so
  // `useSceneProgress()` reads its documented no-measurement default of 1, CONTRACTS §6).
  it('scrubs the built timeline to the current progress via the shared progress ref', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<RolePathScene scene={baseScene()} />);
    const created = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    expect(created.progress()).toBe(1);
  });

  it('at tl.progress(1), the eyebrow, title, path, pointer, every role and the marker are fully settled (no leftover transform/opacity)', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<RolePathScene scene={baseScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    tl.progress(1);

    const eyebrowEl = screen.getByText('ACT 1 · THE WORLD CHANGED').parentElement as HTMLElement;
    const h2 = container.querySelector('h2') as HTMLElement;
    const path = container.querySelector('[data-part="path"]') as HTMLElement;
    const pointer = container.querySelector('[data-part="pointer"]') as HTMLElement;
    const roles = Array.from(container.querySelectorAll('[data-part="role"]')) as HTMLElement[];
    const marker = container.querySelector('[data-part="marker"]') as HTMLElement;

    [eyebrowEl, h2, ...roles, marker].forEach((el) => {
      expect(el.style.opacity || '1').toBe('1');
    });
    roles.forEach((el) => expect(gsap.getProperty(el, 'y')).toBe(0));
    expect(gsap.getProperty(marker, 'x')).toBe(0);
    expect(gsap.getProperty(path, 'scaleX')).toBe(1);
    expect(gsap.getProperty(pointer, 'x')).toBe(0);
  });

  // Manager ruling (Task 22 review round 1): the pointer is a decorative path-head that travels
  // from the path start toward its resting position at the path end (System designer), landing
  // exactly at progress 1 — so mid-scroll it must still be short of that resting spot.
  it('at an intermediate progress, the pointer has not yet reached its resting position', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<RolePathScene scene={baseScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    tl.progress(0.5);

    const pointer = container.querySelector('[data-part="pointer"]') as HTMLElement;
    expect(gsap.getProperty(pointer, 'x')).toBeLessThan(0);
  });
});
