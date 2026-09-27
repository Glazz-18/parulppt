import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import gsap from 'gsap';
import { TimelineScene } from './TimelineScene';
import type { Scene } from '@/lib/types';

const baseScene = (overrides: Partial<Scene> = {}): Scene =>
  ({
    id: 'scene-19',
    slide: 19,
    act: 'act-4',
    theme: 'dark',
    accent: 'orange',
    pin: true,
    scrollLength: 3,
    kind: 'timeline',
    eyebrow: 'ACT 4 · TIMELINE COMPRESSION · 1 OF 2',
    title: 'The attacker’s clock',
    content: {
      blocks: [
        {
          type: 'marks',
          items: [
            { at: '22s', text: 'access broker hands off to ransomware crew' },
            { at: '27s', text: 'fastest breakout' },
            { at: '4m', text: 'to first data out' },
            { at: '29m', text: 'average breakout' },
            { at: '−7 days', text: 'mean time-to-exploit: used before the patch exists' },
          ],
        },
      ],
    },
    ...overrides,
  }) as Scene;

const slide20Scene = (): Scene =>
  baseScene({
    id: 'scene-20',
    slide: 20,
    accent: undefined,
    eyebrow: 'ACT 4 · TIMELINE COMPRESSION · 2 OF 2',
    title: 'The defender’s clock',
    content: {
      blocks: [
        {
          type: 'marks',
          items: [
            { at: '14d', text: 'median dwell time, up from 11' },
            { at: '236d', text: 'to identify, India, no automation · 175 with it' },
            { at: '247d', text: 'to identify and contain, global' },
            { at: '−$1.93M', text: 'and 65 days faster with extensive security AI and automation' },
          ],
        },
        { type: 'lines', lines: ['The human doesn’t get faster. The tooling and the design do.'] },
      ],
    },
  });

// Fixture only (decision 3): kind 'challenge' (slide 44's real copy lands in Task 25).
const challengeScene = (): Scene =>
  ({
    id: 'scene-44',
    slide: 44,
    act: 'act-8',
    theme: 'light',
    pin: true,
    scrollLength: 3,
    kind: 'challenge',
    eyebrow: 'ACT 8 · THE 30-DAY CHALLENGE',
    title: 'Do this in the next 30 days',
    content: {
      blocks: [
        {
          type: 'marks',
          items: [
            { at: 'Day 1–3', text: 'Find one problem' },
            { at: 'Day 4–7', text: 'Talk to five people' },
            { at: 'Week 2', text: 'Build one workflow' },
            { at: 'Week 3', text: 'Test with real users' },
            { at: 'Week 4', text: 'Secure it, then publish' },
          ],
        },
        { type: 'lines', lines: ['Line one.', 'Line two.'] },
      ],
    },
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

describe('TimelineScene (kind timeline)', () => {
  it('renders eyebrow, h2 title, and five marks in order with at/text', () => {
    const { container } = render(<TimelineScene scene={baseScene()} />);
    expect(screen.getByText('ACT 4 · TIMELINE COMPRESSION · 1 OF 2')).toBeTruthy();
    const h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe('The attacker’s clock');
    const marks = Array.from(container.querySelectorAll('[data-part="mark"]'));
    expect(marks).toHaveLength(5);
    const ats = marks.map((m) => m.children[0]?.textContent);
    const texts = marks.map((m) => m.children[1]?.textContent);
    expect(ats).toEqual(['22s', '27s', '4m', '29m', '−7 days']);
    expect(texts).toEqual([
      'access broker hands off to ransomware crew',
      'fastest breakout',
      'to first data out',
      'average breakout',
      'mean time-to-exploit: used before the patch exists',
    ]);
  });

  it('slide 20 shape: renders four marks plus the closing lines block', () => {
    const { container } = render(<TimelineScene scene={slide20Scene()} />);
    const marks = Array.from(container.querySelectorAll('[data-part="mark"]'));
    expect(marks).toHaveLength(4);
    expect(screen.getByText('The human doesn’t get faster. The tooling and the design do.')).toBeTruthy();
  });

  it('under reduced motion, all text is present and no GSAP timeline is created', () => {
    reduced = true;
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<TimelineScene scene={slide20Scene()} />);
    expect(screen.getByText('ACT 4 · TIMELINE COMPRESSION · 2 OF 2')).toBeTruthy();
    expect(screen.getByText('The defender’s clock')).toBeTruthy();
    expect(screen.getByText('14d')).toBeTruthy();
    expect(screen.getByText('The human doesn’t get faster. The tooling and the design do.')).toBeTruthy();
    expect(timelineSpy).not.toHaveBeenCalled();
  });

  it('under no-preference, builds exactly one paused GSAP timeline of duration 1', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<TimelineScene scene={baseScene()} />);
    expect(timelineSpy).toHaveBeenCalledTimes(1);
    const [vars] = timelineSpy.mock.calls[0] as [{ paused?: boolean }];
    expect(vars?.paused).toBe(true);
    const created = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    expect(created.duration()).toBe(1);
  });

  it('at progress 1, the axis and every mark settle to the static markup (no leftover transform/hidden opacity)', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<TimelineScene scene={baseScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    tl.progress(1);

    const axis = container.querySelector('[data-part="axis"]') as HTMLElement;
    expect(axis.style.opacity === '' || axis.style.opacity === '1').toBe(true);
    expect(gsap.getProperty(axis, 'scaleX')).toBe(1);

    const marks = Array.from(container.querySelectorAll('[data-part="mark"]')) as HTMLElement[];
    marks.forEach((mark) => {
      const value = mark.children[0] as HTMLElement;
      const text = mark.children[1] as HTMLElement;
      expect(value.style.opacity).toBe('1');
      expect(gsap.getProperty(value, 'y')).toBe(0);
      expect(gsap.getProperty(value, 'scale')).toBe(1);
      expect(text.style.opacity).toBe('1');
      expect(gsap.getProperty(text, 'y')).toBe(0);
    });
  });

  it('before progress 1, an early mark has already settled while a later one has not', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<TimelineScene scene={baseScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    tl.progress(0.4);
    const marks = Array.from(container.querySelectorAll('[data-part="mark"]')) as HTMLElement[];
    const firstValue = marks[0].children[0] as HTMLElement;
    const lastValue = marks[marks.length - 1].children[0] as HTMLElement;
    expect(Number(firstValue.style.opacity)).toBeGreaterThan(0);
    expect(Number(lastValue.style.opacity || '0')).toBeLessThan(1);
  });
});

describe('TimelineScene (kind challenge, fixture)', () => {
  it('renders marks as segments in a row, each with a fill element and at/text', () => {
    const { container } = render(<TimelineScene scene={challengeScene()} />);
    const marks = Array.from(container.querySelectorAll('[data-part="mark"]'));
    expect(marks).toHaveLength(5);
    marks.forEach((mark) => {
      expect(mark.querySelector('[data-part="fill"]')).toBeTruthy();
    });
    expect(screen.getByText('Day 1–3')).toBeTruthy();
    expect(screen.getByText('Secure it, then publish')).toBeTruthy();
    expect(screen.getByText('Line one.')).toBeTruthy();
    expect(screen.getByText('Line two.')).toBeTruthy();
  });

  it('at progress 1, every segment fill is complete (scaleX 1) and readable', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<TimelineScene scene={challengeScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    tl.progress(1);
    const fills = Array.from(container.querySelectorAll('[data-part="fill"]')) as HTMLElement[];
    expect(fills).toHaveLength(5);
    fills.forEach((fill) => expect(gsap.getProperty(fill, 'scaleX')).toBe(1));
  });

  it('before progress 1, an early segment fill is further along than a later one', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<TimelineScene scene={challengeScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    tl.progress(0.5);
    const fills = Array.from(container.querySelectorAll('[data-part="fill"]')) as HTMLElement[];
    const firstScale = Number(gsap.getProperty(fills[0], 'scaleX'));
    const lastScale = Number(gsap.getProperty(fills[fills.length - 1], 'scaleX'));
    expect(firstScale).toBeGreaterThan(lastScale);
  });
});
