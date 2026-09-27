import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import gsap from 'gsap';
import { AiWritesBugScene } from './AiWritesBugScene';
import type { Scene } from '@/lib/types';

const EYEBROW = 'AI FINDS · AI FIXES · HUMANS DECIDE · 2 OF 4';
const TITLE = 'AI writes the bug too';
const METRIC_VALUE = '2.74×';
const METRIC_LABEL = 'more likely to introduce XSS · 1.57× more security findings, AI-assisted code';
const TERM = 'Codex CLI';
const TERM_TEXT = 'command injection via an unsanitised branch name · patched Feb 2026';
const LINE_1 = 'The models hold. The wrappers, connectors, skills and configs around them don’t.';
const LINE_2 = 'Vibe coding without vibe reviewing is how your startup ships its first CVE.';

const baseScene = (overrides: Partial<Scene> = {}): Scene =>
  ({
    id: 'scene-25',
    slide: 25,
    act: 'act-4',
    theme: 'dark',
    component: 'AiWritesBugScene',
    pin: true,
    scrollLength: 2,
    kind: 'data',
    eyebrow: EYEBROW,
    title: TITLE,
    sourceNotes: ['CodeRabbit, Dec 2025 (one vendor’s study) · OpenAI, Feb 2026 · Google Threat Intelligence Group, May 2026'],
    content: {
      blocks: [
        { type: 'metrics', items: [{ value: METRIC_VALUE, label: METRIC_LABEL }] },
        { type: 'terms', items: [{ term: TERM, text: TERM_TEXT }] },
        { type: 'lines', lines: [LINE_1, LINE_2] },
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

// Matches the component's own beat math (headEnd = 1/2, then 0.25 / 0.45 of the remaining span)
// so tests can pick progress values inside a specific beat without duplicating the production
// formula's *meaning*, only its shape (as SupplyChainScene.test.tsx does).
const HEAD_END = 1 / 2;
const SUPPORTING = 1 - HEAD_END;
const METRIC_END = HEAD_END + SUPPORTING * 0.25;
const CODE_CARD_END = METRIC_END + SUPPORTING * 0.45;

describe('AiWritesBugScene', () => {
  it('renders the eyebrow and h2 title, no scene chrome of its own', () => {
    const { container } = render(<AiWritesBugScene scene={baseScene()} />);
    expect(screen.getByText(EYEBROW)).toBeTruthy();
    const h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe(TITLE);
    expect(container.querySelector('section')).toBeNull();
  });

  it('renders the 2.74x metric with its label', () => {
    const { container } = render(<AiWritesBugScene scene={baseScene()} />);
    const metric = container.querySelector('[data-part="metric"]') as HTMLElement;
    expect(metric.querySelector('[data-part="value"]')?.textContent).toBe(METRIC_VALUE);
    expect(metric.textContent).toContain(METRIC_LABEL);
  });

  it('renders the Codex CLI term and text inside a code-like card', () => {
    const { container } = render(<AiWritesBugScene scene={baseScene()} />);
    const card = container.querySelector('[data-part="code-card"]') as HTMLElement;
    expect(card).toBeTruthy();
    expect(card.textContent).toContain(TERM);
    expect(card.textContent).toContain(TERM_TEXT);
  });

  it('renders both lines in order, the last marked as the punchline', () => {
    const { container } = render(<AiWritesBugScene scene={baseScene()} />);
    const lines = Array.from(container.querySelectorAll('[data-part="line"]'));
    expect(lines.map((el) => el.textContent)).toEqual([LINE_1, LINE_2]);
    expect(lines[0]!.getAttribute('data-emphasis')).not.toBe('punchline');
    expect(lines[1]!.getAttribute('data-emphasis')).toBe('punchline');
  });

  it('invents no text: the scene textContent is exactly the manifest strings, in DOM order', () => {
    const { container } = render(<AiWritesBugScene scene={baseScene()} />);
    // DOM order: eyebrow, title, metric (value then label, BigNumber's own order), the code card
    // (term then text), then the two closing lines.
    const manifestStrings = [EYEBROW, TITLE, METRIC_VALUE, METRIC_LABEL, TERM, TERM_TEXT, LINE_1, LINE_2];
    expect(container.textContent).toBe(manifestStrings.join(''));
  });

  it('under reduced motion, all text is present and no GSAP timeline is created', () => {
    reduced = true;
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<AiWritesBugScene scene={baseScene()} />);
    expect(screen.getByText(TITLE)).toBeTruthy();
    expect(screen.getByText(METRIC_VALUE)).toBeTruthy();
    expect(screen.getByText((_, el) => el?.textContent === METRIC_LABEL)).toBeTruthy();
    expect(screen.getByText(TERM)).toBeTruthy();
    expect(screen.getByText(TERM_TEXT)).toBeTruthy();
    expect(screen.getByText(LINE_1)).toBeTruthy();
    expect(screen.getByText(LINE_2)).toBeTruthy();
    expect(timelineSpy).not.toHaveBeenCalled();
  });

  it('under no-preference, builds exactly one paused GSAP timeline of duration 1', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<AiWritesBugScene scene={baseScene()} />);
    expect(timelineSpy).toHaveBeenCalledTimes(1);
    const [vars] = timelineSpy.mock.calls[0] as [{ paused?: boolean }];
    expect(vars?.paused).toBe(true);
    const created = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    expect(created.duration()).toBe(1);
  });

  it('the metric lands before the code card, and the code card before the lines', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<AiWritesBugScene scene={baseScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    const metricValue = container.querySelector('[data-part="metric"] [data-part="value"]') as HTMLElement;
    const codeLines = Array.from(container.querySelectorAll('[data-part="code-line"]')) as HTMLElement[];
    const lineEls = Array.from(container.querySelectorAll('[data-part="line"]')) as HTMLElement[];

    // Right at the top of the metric beat: nothing beyond the head has landed yet.
    tl.progress(HEAD_END);
    expect(metricValue.style.opacity).toBe('0');
    codeLines.forEach((el) => expect(el.style.opacity).toBe('0'));
    lineEls.forEach((el) => expect(el.style.opacity).toBe('0'));

    // By the end of the metric beat: metric has landed, code card and lines have not started.
    tl.progress(METRIC_END);
    expect(metricValue.style.opacity || '1').toBe('1');
    codeLines.forEach((el) => expect(el.style.opacity).toBe('0'));
    lineEls.forEach((el) => expect(el.style.opacity).toBe('0'));

    // By the end of the code-card beat: code lines have landed, closing lines have not started.
    tl.progress(CODE_CARD_END);
    codeLines.forEach((el) => expect(el.style.opacity || '1').toBe('1'));
    lineEls.forEach((el) => expect(el.style.opacity).toBe('0'));

    // Progress 1: everything landed.
    tl.progress(1);
    codeLines.forEach((el) => expect(el.style.opacity || '1').toBe('1'));
    lineEls.forEach((el) => expect(el.style.opacity || '1').toBe('1'));
  });

  it('at progress 1, everything settles to the static markup (no leftover hidden opacity/transform)', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<AiWritesBugScene scene={baseScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    tl.progress(1);

    const eyebrowEl = screen.getByText(EYEBROW).parentElement as HTMLElement;
    const h2 = container.querySelector('h2') as HTMLElement;
    const metricValue = container.querySelector('[data-part="value"]') as HTMLElement;
    const metricLabel = container.querySelector('[data-part="label"]') as HTMLElement;
    const codeLines = Array.from(container.querySelectorAll('[data-part="code-line"]')) as HTMLElement[];
    const lineEls = Array.from(container.querySelectorAll('[data-part="line"]')) as HTMLElement[];

    [eyebrowEl, h2, metricValue, metricLabel, ...codeLines, ...lineEls].forEach((el) => {
      expect(el.style.opacity || '1').toBe('1');
    });
    expect(gsap.getProperty(metricValue, 'scale')).toBe(1);
    codeLines.forEach((el) => expect(gsap.getProperty(el, 'y')).toBe(0));
    const punchline = lineEls[1]!;
    expect(gsap.getProperty(punchline, 'scale')).toBe(1);

    // duration 1 guarantee (CONTRACTS §6): progress(1) is a valid, settled state, not clamped.
    expect(tl.duration()).toBe(1);
  });
});
