import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import gsap from 'gsap';
import { ProblemProductScene } from './ProblemProductScene';
import type { Scene } from '@/lib/types';

const ROWS: [string, string][] = [
  ['Phishing', 'Security awareness'],
  ['Deepfakes', 'Identity verification'],
  ['RAG leakage', 'AI data security'],
  ['Prompt injection', 'AI red-teaming platforms'],
  ['Alert fatigue', 'SOC automation for SMEs'],
];

const baseScene = (overrides: Partial<Scene> = {}): Scene =>
  ({
    id: 'scene-29',
    slide: 29,
    act: 'act-5',
    theme: 'light',
    component: 'ProblemProductScene',
    pin: true,
    scrollLength: 3,
    kind: 'diagram',
    eyebrow: 'ACT 5 · SECURITY → STARTUP',
    title: 'Every security problem is a product',
    content: {
      blocks: ROWS.map(([problem, product]) => ({
        type: 'flow' as const,
        items: [problem, '→', product],
      })),
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

describe('ProblemProductScene', () => {
  it('renders the eyebrow and h2 title, no scene chrome of its own', () => {
    const { container } = render(<ProblemProductScene scene={baseScene()} />);
    expect(screen.getByText('ACT 5 · SECURITY → STARTUP')).toBeTruthy();
    const h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe('Every security problem is a product');
    expect(container.querySelector('section')).toBeNull();
  });

  it('renders five rows in deck order, each with problem, → connector (visible, not aria-hidden) and product as separate elements', () => {
    const { container } = render(<ProblemProductScene scene={baseScene()} />);
    const rowEls = Array.from(container.querySelectorAll('[data-block="flow"]'));
    expect(rowEls).toHaveLength(5);

    rowEls.forEach((rowEl, i) => {
      const [problem, product] = ROWS[i]!;
      const nodes = Array.from(rowEl.querySelectorAll('[data-part="node"]'));
      const connector = rowEl.querySelector('[data-part="connector"]');
      expect(nodes).toHaveLength(2);
      expect(nodes[0]?.textContent).toBe(problem);
      expect(nodes[1]?.textContent).toBe(product);
      expect(connector?.textContent).toBe('→');
      expect(connector?.getAttribute('aria-hidden')).toBeNull();
    });
  });

  it('under reduced motion, all text is present and no GSAP timeline is created', () => {
    reduced = true;
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<ProblemProductScene scene={baseScene()} />);
    expect(screen.getByText('Every security problem is a product')).toBeTruthy();
    ROWS.forEach(([problem, product]) => {
      expect(screen.getByText(problem)).toBeTruthy();
      expect(screen.getByText(product)).toBeTruthy();
    });
    expect(screen.getAllByText('→')).toHaveLength(5);
    expect(timelineSpy).not.toHaveBeenCalled();
  });

  it('under no-preference, builds exactly one paused GSAP timeline of duration 1', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<ProblemProductScene scene={baseScene()} />);
    expect(timelineSpy).toHaveBeenCalledTimes(1);
    const [vars] = timelineSpy.mock.calls[0] as [{ paused?: boolean }];
    expect(vars?.paused).toBe(true);
    const created = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    expect(created.duration()).toBe(1);
  });

  it('rows play top to bottom: row 1 product lands before row 5 product starts transforming in', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<ProblemProductScene scene={baseScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    const rowEls = Array.from(container.querySelectorAll('[data-block="flow"]')) as HTMLElement[];
    const row1Product = rowEls[0]!.querySelectorAll('[data-part="node"]')[1] as HTMLElement;
    const row5Product = rowEls[4]!.querySelectorAll('[data-part="node"]')[1] as HTMLElement;

    // headEnd = 1/scrollLength = 1/3; 5 equal row slots span the remaining 2/3 -> each row is
    // 2/15 wide. The start of row index 1 (2nd row) is safely after row 1 finishes and safely
    // before row 5 (index 4) begins.
    const headEnd = 1 / 3;
    const rowStep = (1 - headEnd) / 5;
    tl.progress(headEnd + rowStep);

    expect(row1Product.style.opacity).toBe('1');
    expect(Number(row5Product.style.opacity || '0')).toBeLessThan(1);
  });

  it('at progress 1, every text element (eyebrow, title, problems, connectors, products) settles to opacity 1 with no leftover transform', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<ProblemProductScene scene={baseScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    tl.progress(1);

    const eyebrowEl = screen.getByText('ACT 5 · SECURITY → STARTUP').parentElement as HTMLElement;
    const h2 = container.querySelector('h2') as HTMLElement;
    const parts = Array.from(container.querySelectorAll('[data-part="node"], [data-part="connector"]')) as HTMLElement[];

    [eyebrowEl, h2, ...parts].forEach((el) => {
      expect(el.style.opacity || '1').toBe('1');
    });
    parts.forEach((el) => {
      expect(gsap.getProperty(el, 'x')).toBe(0);
      expect(gsap.getProperty(el, 'y')).toBe(0);
      expect(gsap.getProperty(el, 'scale')).toBe(1);
    });
  });
});
