import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import gsap from 'gsap';
import { RagFlowScene } from './RagFlowScene';
import type { Scene } from '@/lib/types';

const STAGES = [
  { n: '01', term: 'Question', text: '“Minimum attendance?”' },
  { n: '02', term: 'Search', text: 'Vector database finds similar text' },
  { n: '03', term: 'Top 3 chunks', text: 'Whatever ranks highest wins' },
  { n: '04', term: 'LLM', text: 'Writes from those chunks' },
  { n: '05', term: 'Answer', text: 'Sounds confident either way' },
];

const baseScene = (overrides: Partial<Scene> = {}): Scene =>
  ({
    id: 'scene-05',
    slide: 5,
    act: 'act-2',
    theme: 'dark',
    accent: 'orange',
    component: 'RagFlowScene',
    pin: true,
    scrollLength: 3,
    kind: 'diagram',
    eyebrow: 'ACT 2 · BREAK AI',
    title: 'How RAG answers a question',
    content: {
      blocks: [{ type: 'steps', items: STAGES }],
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

// design §9 RAG beats (0..1) mapped 1/3 + b*(2/3) into the pinned [1/3, 1] window (manager
// ruling, Task 26): Search + Vector DB (0.16-0.52) merge into stage 02 "Search".
const ARRIVAL = 1 / 3;
const SPAN = 2 / 3;
const BEAT_WINDOWS: [number, number][] = [
  [0.0, 0.16],
  [0.16, 0.52],
  [0.52, 0.68],
  [0.68, 0.84],
  [0.84, 1.0],
];
const mapped = BEAT_WINDOWS.map(([b0, b1]) => [ARRIVAL + b0 * SPAN, ARRIVAL + b1 * SPAN]);

describe('RagFlowScene', () => {
  it('renders the eyebrow, h2 title, and five stages as an ordered list in deck order with n/term/text, no scene chrome of its own', () => {
    const { container } = render(<RagFlowScene scene={baseScene()} />);
    expect(screen.getByText('ACT 2 · BREAK AI')).toBeTruthy();
    const h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe('How RAG answers a question');

    const ol = container.querySelector('ol');
    expect(ol).toBeTruthy();
    const items = Array.from(ol!.querySelectorAll('[data-part="stage"]'));
    expect(items.length).toBe(5);
    STAGES.forEach((stage, i) => {
      const item = items[i];
      expect(item?.querySelector('[data-part="n"]')?.textContent).toBe(stage.n);
      expect(item?.querySelector('[data-part="term"]')?.textContent).toBe(stage.term);
      expect(item?.querySelector('[data-part="text"]')?.textContent).toBe(stage.text);
    });

    // RagFlowScene renders no SceneShell/<section> of its own (A12).
    expect(container.querySelector('section')).toBeNull();
  });

  it('has a distinct data-part="answer" element for Task 37 hand-off to scene 6', () => {
    const { container } = render(<RagFlowScene scene={baseScene()} />);
    const answer = container.querySelector('[data-part="answer"]') as HTMLElement | null;
    expect(answer).toBeTruthy();
    expect(answer?.textContent).toContain('Sounds confident either way');

    // Review round 1 (Task 26): the answer element must be the actual card box Task 37 will pose
    // (transforms/getBoundingClientRect), not a `display: contents` wrapper around it, which has
    // no box of its own. It carries the card's own inline transform and its n/term/text children
    // directly, with no intermediate wrapper element.
    expect(answer?.className ?? '').not.toMatch(/\bcontents\b/);
    expect(answer?.style.transform).toBeTruthy();
    expect(answer?.querySelector('[data-part="n"]')?.parentElement).toBe(answer);
    expect(answer?.querySelector('[data-part="term"]')?.parentElement).toBe(answer);
  });

  it('under reduced motion, all text is present and no GSAP timeline is created', () => {
    reduced = true;
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<RagFlowScene scene={baseScene()} />);
    expect(screen.getByText('How RAG answers a question')).toBeTruthy();
    STAGES.forEach((stage) => {
      expect(screen.getByText(stage.term)).toBeTruthy();
      expect(screen.getByText(stage.text)).toBeTruthy();
    });
    expect(timelineSpy).not.toHaveBeenCalled();
  });

  it('under no-preference, builds exactly one paused GSAP timeline of duration 1', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<RagFlowScene scene={baseScene()} />);
    expect(timelineSpy).toHaveBeenCalledTimes(1);
    const [vars] = timelineSpy.mock.calls[0] as [{ paused?: boolean }];
    expect(vars?.paused).toBe(true);
    const created = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    expect(created.duration()).toBe(1);
  });

  it('stage 2 (Search) is not yet revealed before its mapped beat start and is revealed by its end', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<RagFlowScene scene={baseScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    const [start, end] = mapped[1]!;
    const stage = container.querySelectorAll('[data-part="stage"]')[1] as HTMLElement;

    tl.progress(Math.max(start - 0.02, 0));
    expect(Number(stage.style.opacity)).toBe(0);

    tl.progress(end);
    expect(Number(stage.style.opacity)).toBe(1);
  });

  it('stage 4 (LLM) is not yet revealed before its mapped beat start and is revealed by its end', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<RagFlowScene scene={baseScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    const [start, end] = mapped[3]!;
    const stage = container.querySelectorAll('[data-part="stage"]')[3] as HTMLElement;

    tl.progress(Math.max(start - 0.02, 0));
    expect(Number(stage.style.opacity)).toBe(0);

    tl.progress(end);
    expect(Number(stage.style.opacity)).toBe(1);
  });

  it('at tl.progress(1), the eyebrow, title and every stage are fully settled (no leftover transform/opacity)', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<RagFlowScene scene={baseScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    tl.progress(1);

    const eyebrowEl = screen.getByText('ACT 2 · BREAK AI').parentElement as HTMLElement;
    const h2 = container.querySelector('h2') as HTMLElement;
    const stages = Array.from(container.querySelectorAll('[data-part="stage"]')) as HTMLElement[];
    expect(stages.length).toBe(5);

    [eyebrowEl, h2, ...stages].forEach((el) => {
      expect(el.style.opacity || '1').toBe('1');
    });
    stages.forEach((el) => expect(gsap.getProperty(el, 'y')).toBe(0));
  });
});
