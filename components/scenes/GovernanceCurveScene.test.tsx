import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import gsap from 'gsap';
import { GovernanceCurveScene } from './GovernanceCurveScene';
import type { Scene } from '@/lib/types';

const PHASES = ['Prototype', 'First users', 'Enterprise deal', 'Diligence, incident'];
const SERIES = ['Built in', 'Deferred'];
const NOTE = 'Cost to fix · illustrative shape';

const baseScene = (overrides: Partial<Scene> = {}): Scene =>
  ({
    id: 'scene-34',
    slide: 34,
    act: 'act-5',
    theme: 'light',
    component: 'GovernanceCurveScene',
    pin: true,
    scrollLength: 2,
    kind: 'diagram',
    eyebrow: 'ACT 5 · SECURITY → STARTUP',
    title: 'Governance debt',
    content: {
      blocks: [
        { type: 'flow', items: PHASES },
        // Manager ruling (Task 32 fix round 1): one (Built in, Deferred) pair per phase, in deck
        // shape order, normalised to the longest bar = 1 -- the real slide 34 measurement.
        { type: 'bars', series: SERIES, note: NOTE, ratios: [0.14, 0.1, 0.2, 0.26, 0.24, 0.55, 0.28, 1] },
      ],
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

// Matches the component's own beat math (headEnd = 1/2, then 0.25 / 0.55 of the remaining span)
// so tests can pick progress values inside a specific beat without duplicating the production
// formula's *meaning*, only its shape (as SupplyChainScene.test.tsx does).
const HEAD_END = 1 / 2;
const SUPPORTING = 1 - HEAD_END;
const PHASES_END = HEAD_END + SUPPORTING * 0.25;
const CURVES_END = PHASES_END + SUPPORTING * 0.55;

describe('GovernanceCurveScene', () => {
  it('renders the eyebrow and h2 title, no scene chrome of its own', () => {
    const { container } = render(<GovernanceCurveScene scene={baseScene()} />);
    expect(screen.getByText('ACT 5 · SECURITY → STARTUP')).toBeTruthy();
    const h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe('Governance debt');
    expect(container.querySelector('section')).toBeNull();
  });

  it('renders the four phases in deck order', () => {
    const { container } = render(<GovernanceCurveScene scene={baseScene()} />);
    const phaseEls = Array.from(container.querySelectorAll('[data-part="phase"]'));
    expect(phaseEls.map((el) => el.textContent)).toEqual(PHASES);
  });

  it('renders both series labels as the legend', () => {
    render(<GovernanceCurveScene scene={baseScene()} />);
    expect(screen.getByText('Built in')).toBeTruthy();
    expect(screen.getByText('Deferred')).toBeTruthy();
  });

  it('renders the note as a small mono caption', () => {
    render(<GovernanceCurveScene scene={baseScene()} />);
    expect(screen.getByText(NOTE)).toBeTruthy();
  });

  it('the curves live in an aria-hidden SVG', () => {
    const { container } = render(<GovernanceCurveScene scene={baseScene()} />);
    const svgs = Array.from(container.querySelectorAll('svg'));
    expect(svgs.length).toBeGreaterThan(0);
    svgs.forEach((svg) => expect(svg.getAttribute('aria-hidden')).toBe('true'));
    expect(container.querySelectorAll('[data-series="built-in"] [data-part="segment"]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('[data-series="deferred"] [data-part="segment"]').length).toBeGreaterThan(0);
  });

  // Path endpoint coordinates: `segmentPath` emits `M x0 y0 C mx y0 mx y1 x1 y1`, so token index 2
  // is the segment's start y and index 9 is its end y (smaller SVG y = higher on the plot).
  function segEndY(d: string) {
    const t = d.trim().split(/\s+/);
    return { startY: Number(t[2]), endY: Number(t[9]) };
  }

  it('plots each phase’s own measured (Built in, Deferred) pair -- Deferred ends highest, Built in varies by phase', () => {
    const { container } = render(<GovernanceCurveScene scene={baseScene()} />);
    const builtInSegs = Array.from(container.querySelectorAll('[data-series="built-in"] [data-part="segment"]'));
    const deferredSegs = Array.from(container.querySelectorAll('[data-series="deferred"] [data-part="segment"]'));
    expect(builtInSegs).toHaveLength(PHASES.length - 1);
    expect(deferredSegs).toHaveLength(PHASES.length - 1);

    const builtInFirst = segEndY(builtInSegs[0]!.getAttribute('d')!).startY; // phase 0, ratio 0.14
    const builtInLast = segEndY(builtInSegs[builtInSegs.length - 1]!.getAttribute('d')!).endY; // phase 3, ratio 0.28
    expect(builtInFirst).not.toBe(builtInLast); // Built in is NOT flat -- it varies phase to phase

    const deferredLast = segEndY(deferredSegs[deferredSegs.length - 1]!.getAttribute('d')!).endY; // phase 3, ratio 1
    // Deferred's own end (ratio 1, the longest measured bar) is the highest point of either curve:
    // smallest y beats every other endpoint, including Built in's own last phase (ratio 0.28).
    expect(deferredLast).toBeLessThan(builtInLast);
    expect(deferredLast).toBeLessThan(builtInFirst);
  });

  it('under reduced motion, all text is present and no GSAP timeline is created', () => {
    reduced = true;
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<GovernanceCurveScene scene={baseScene()} />);
    expect(screen.getByText('Governance debt')).toBeTruthy();
    PHASES.forEach((phase) => expect(screen.getByText(phase)).toBeTruthy());
    SERIES.forEach((label) => expect(screen.getByText(label)).toBeTruthy());
    expect(screen.getByText(NOTE)).toBeTruthy();
    expect(timelineSpy).not.toHaveBeenCalled();
  });

  it('under no-preference, builds exactly one paused GSAP timeline of duration 1', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<GovernanceCurveScene scene={baseScene()} />);
    expect(timelineSpy).toHaveBeenCalledTimes(1);
    const [vars] = timelineSpy.mock.calls[0] as [{ paused?: boolean }];
    expect(vars?.paused).toBe(true);
    const created = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    expect(created.duration()).toBe(1);
  });

  it('curves are not fully revealed early, and fully revealed at progress 1', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<GovernanceCurveScene scene={baseScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;

    const early = PHASES_END + (CURVES_END - PHASES_END) * 0.1;
    tl.progress(early);
    const lastDeferredSeg = container.querySelectorAll('[data-series="deferred"] [data-part="segment"]');
    const last = lastDeferredSeg[lastDeferredSeg.length - 1] as unknown as SVGElement;
    expect((last as unknown as HTMLElement).style.opacity).toBe('0');

    tl.progress(1);
    expect((last as unknown as HTMLElement).style.opacity || '1').toBe('1');
  });

  it('at progress 1, everything settles to the static markup (no leftover hidden opacity/transform)', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<GovernanceCurveScene scene={baseScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    tl.progress(1);

    const eyebrowEl = screen.getByText('ACT 5 · SECURITY → STARTUP').parentElement as HTMLElement;
    const h2 = container.querySelector('h2') as HTMLElement;
    const phaseEls = Array.from(container.querySelectorAll('[data-part="phase"]')) as HTMLElement[];
    const segments = Array.from(container.querySelectorAll('[data-part="segment"]')) as unknown as HTMLElement[];
    const legendItems = Array.from(container.querySelectorAll('[data-part="legend-item"]')) as HTMLElement[];
    const noteEl = screen.getByText(NOTE) as HTMLElement;

    [eyebrowEl, h2, ...phaseEls, ...segments, ...legendItems, noteEl].forEach((el) => {
      expect(el.style.opacity || '1').toBe('1');
    });

    // duration 1 guarantee (CONTRACTS §6): progress(1) is a valid, settled state, not clamped.
    expect(tl.duration()).toBe(1);
  });
});
