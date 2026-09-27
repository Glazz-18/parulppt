import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import gsap from 'gsap';
import { ContentScene } from './ContentScene';
import type { Scene } from '@/lib/types';

const baseScene = (overrides: Partial<Scene> = {}): Scene =>
  ({
    id: 'scene-02',
    slide: 2,
    act: 'act-1',
    theme: 'light',
    pin: false,
    scrollLength: 1,
    kind: 'editorial',
    eyebrow: 'ACT 1 · THE WORLD CHANGED',
    title: 'Three hands',
    content: {
      blocks: [{ type: 'lines', lines: ['A supporting line.'] }],
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

describe('ContentScene', () => {
  it('renders eyebrow (MonoLabel), h2 title, and Blocks content', () => {
    const { container } = render(<ContentScene scene={baseScene()} />);
    expect(screen.getByText('ACT 1 · THE WORLD CHANGED')).toBeTruthy();
    const h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe('Three hands');
    expect(screen.getByText('A supporting line.')).toBeTruthy();
  });

  it('under reduced motion, all text is present and no GSAP timeline is created', () => {
    reduced = true;
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<ContentScene scene={baseScene()} />);
    expect(screen.getByText('ACT 1 · THE WORLD CHANGED')).toBeTruthy();
    expect(screen.getByText('Three hands')).toBeTruthy();
    expect(screen.getByText('A supporting line.')).toBeTruthy();
    expect(timelineSpy).not.toHaveBeenCalled();
  });

  it('under no-preference, builds exactly one paused GSAP timeline of duration 1', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<ContentScene scene={baseScene()} />);
    expect(timelineSpy).toHaveBeenCalledTimes(1);
    const [vars] = timelineSpy.mock.calls[0] as [{ paused?: boolean }];
    expect(vars?.paused).toBe(true);
    const created = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    expect(created.duration()).toBe(1);
  });
});
