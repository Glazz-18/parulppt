import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import gsap from 'gsap';
import { AiFixesBugScene } from './AiFixesBugScene';
import { SceneProgressProvider, resetSceneProgress, setSceneProgress } from '@/components/presentation/SceneProgress';
import type { Scene } from '@/lib/types';

const EYEBROW = 'AI FINDS · AI FIXES · HUMANS DECIDE · 3 OF 4';
const TITLE = 'AI fixes the bug';
const STAGES = ['Find', 'Verify', 'Patch'];
const GATE_HEADING = 'Human approves';
const TERM_1 = 'Google CodeMender';
const TERM_1_TEXT = '72 upstream fixes · proves exploitability first · never pushes on its own';
const TERM_2 = 'OpenAI Codex Security';
const TERM_2_TEXT = '1.2M commits in 30 days · 792 critical · opens a PR for review';
const LINE_1 = 'AI recommends. Humans remain accountable.';

const baseScene = (overrides: Partial<Scene> = {}): Scene =>
  ({
    id: 'scene-26',
    slide: 26,
    act: 'act-4',
    theme: 'dark',
    component: 'AiFixesBugScene',
    pin: true,
    scrollLength: 3,
    kind: 'diagram',
    eyebrow: EYEBROW,
    title: TITLE,
    sourceNotes: ['Google Cloud Security / DeepMind (CodeMender) · OpenAI (Codex Security launch)'],
    content: {
      blocks: [
        { type: 'flow', items: [...STAGES, GATE_HEADING] },
        {
          type: 'terms',
          items: [
            { term: TERM_1, text: TERM_1_TEXT },
            { term: TERM_2, text: TERM_2_TEXT },
          ],
        },
        { type: 'lines', lines: [LINE_1] },
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

function renderScene(scene: Scene = baseScene()) {
  return render(
    <SceneProgressProvider slide={scene.slide}>
      <AiFixesBugScene scene={scene} />
    </SceneProgressProvider>,
  );
}

beforeEach(() => {
  reduced = false;
  mockMatchMedia();
  resetSceneProgress();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  resetSceneProgress();
});

describe('AiFixesBugScene', () => {
  it('renders the eyebrow and h2 title, no scene chrome of its own', () => {
    const { container } = renderScene();
    expect(screen.getByText(EYEBROW)).toBeTruthy();
    const h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe(TITLE);
    expect(container.querySelector('section')).toBeNull();
  });

  it('renders the three stage nodes in deck order and "Human approves" exactly once, via the gate', () => {
    const { container } = renderScene();
    const nodes = Array.from(container.querySelectorAll('[data-part="node"]'));
    expect(nodes.map((el) => el.textContent)).toEqual(STAGES);
    nodes.forEach((el) => expect(el.textContent).not.toBe(GATE_HEADING));

    const gateHeadings = screen.getAllByText(GATE_HEADING);
    expect(gateHeadings).toHaveLength(1);
    expect(gateHeadings[0]!.tagName).toBe('H3');
  });

  it('has a data-part="gate" wrapper containing the ApprovalGate', () => {
    const { container } = renderScene();
    const gate = container.querySelector('[data-part="gate"]');
    expect(gate).toBeTruthy();
    expect(gate?.querySelector('h3')?.textContent).toBe(GATE_HEADING);
  });

  it('renders both terms and the closing line', () => {
    const { container } = renderScene();
    const terms = Array.from(container.querySelectorAll('[data-part="term"]'));
    expect(terms).toHaveLength(2);
    expect(terms[0]!.textContent).toContain(TERM_1);
    expect(terms[0]!.textContent).toContain(TERM_1_TEXT);
    expect(terms[1]!.textContent).toContain(TERM_2);
    expect(terms[1]!.textContent).toContain(TERM_2_TEXT);

    const lines = Array.from(container.querySelectorAll('[data-part="line"]'));
    expect(lines.map((el) => el.textContent)).toEqual([LINE_1]);
  });

  it('the gate is data-lit="false" below progress 1 and "true" at progress 1', () => {
    const { container } = renderScene();
    const gateRoot = () => container.querySelector('[data-part="gate"] > div') as HTMLElement;

    act(() => setSceneProgress(26, 0.5));
    expect(gateRoot().getAttribute('data-lit')).toBe('false');

    act(() => setSceneProgress(26, 1));
    expect(gateRoot().getAttribute('data-lit')).toBe('true');
  });

  // Task 37 hand-off (design §8, A9, 26->27; fix round 1 finding 6): a green accent-line extends
  // FROM the gate (scaleX, origin-right -- the gate is the flow row's last/rightmost child)
  // across the bottom of the viewport exactly when the gate lights (progress >= 1), anticipating
  // scene 27's own rule.
  it('the accent-line hand-off is collapsed just before progress 1, and fully extended at progress 1', () => {
    const { container } = renderScene();
    const line = container.querySelector('[data-part="accent-line"]') as HTMLElement;
    expect(line).toBeTruthy();
    expect(line.getAttribute('aria-hidden')).toBe('true');
    expect(line.className).toContain('origin-right');

    act(() => setSceneProgress(26, 0.99));
    expect(line.style.transform).toBe('scaleX(0)');

    act(() => setSceneProgress(26, 1));
    expect(line.style.transform).toBe('scaleX(1)');
  });

  it('under reduced motion, all text is present, the gate is lit, and no GSAP timeline is created', () => {
    reduced = true;
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = renderScene();
    expect(screen.getByText(TITLE)).toBeTruthy();
    STAGES.forEach((stage) => expect(screen.getByText(stage)).toBeTruthy());
    expect(screen.getByText(GATE_HEADING)).toBeTruthy();
    expect(screen.getByText(TERM_1)).toBeTruthy();
    expect(screen.getByText(TERM_2)).toBeTruthy();
    expect(screen.getByText(LINE_1)).toBeTruthy();

    const gateRoot = container.querySelector('[data-part="gate"] > div') as HTMLElement;
    expect(gateRoot.getAttribute('data-lit')).toBe('true');
    const line = container.querySelector('[data-part="accent-line"]') as HTMLElement;
    expect(line.style.transform).toBe('scaleX(1)');
    expect(timelineSpy).not.toHaveBeenCalled();
  });

  it('under no-preference, builds exactly one paused GSAP timeline of duration 1', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    renderScene();
    expect(timelineSpy).toHaveBeenCalledTimes(1);
    const [vars] = timelineSpy.mock.calls[0] as [{ paused?: boolean }];
    expect(vars?.paused).toBe(true);
    const created = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    expect(created.duration()).toBe(1);
  });

  it('at progress 1, everything settles to the static markup (no leftover hidden opacity/transform)', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = renderScene();
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    tl.progress(1);

    const eyebrowEl = screen.getByText(EYEBROW).parentElement as HTMLElement;
    const h2 = container.querySelector('h2') as HTMLElement;
    const nodes = Array.from(container.querySelectorAll('[data-part="node"]')) as HTMLElement[];
    const gateWrapper = container.querySelector('[data-part="gate"]') as HTMLElement;
    const terms = Array.from(container.querySelectorAll('[data-part="term"]')) as HTMLElement[];
    const lines = Array.from(container.querySelectorAll('[data-part="line"]')) as HTMLElement[];

    [eyebrowEl, h2, ...nodes, gateWrapper, ...terms, ...lines].forEach((el) => {
      expect(el.style.opacity || '1').toBe('1');
    });
    nodes.forEach((el) => expect(gsap.getProperty(el, 'scale')).toBe(1));
    expect(gsap.getProperty(gateWrapper, 'y')).toBe(0);
    expect(tl.duration()).toBe(1);
  });
});
