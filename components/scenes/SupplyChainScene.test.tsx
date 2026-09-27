import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import gsap from 'gsap';
import { SupplyChainScene } from './SupplyChainScene';
import type { Scene } from '@/lib/types';

const DEPENDENCY_ITEMS = ['CrewAI', 'DSPy', 'Mem0', 'litellm 1.82.7 / 1.82.8'];
const ROOT_LABEL = 'Your agent app';
const INCIDENT_LINE = '24 Mar 2026 · live ~40 min · stole credentials';

const baseScene = (overrides: Partial<Scene> = {}): Scene =>
  ({
    id: 'scene-14',
    slide: 14,
    act: 'act-3',
    theme: 'dark',
    component: 'SupplyChainScene',
    pin: true,
    scrollLength: 3,
    kind: 'data',
    eyebrow: 'ACT 3 · MODEL SUPPLY CHAIN',
    title: 'Three people, thirty dependencies',
    sourceNotes: ['LiteLLM PyPI advisory, Mar 2026 · Verizon Data Breach Investigations Report 2026'],
    content: {
      blocks: [
        { type: 'flow', label: ROOT_LABEL, items: DEPENDENCY_ITEMS },
        { type: 'lines', lines: [INCIDENT_LINE] },
        { type: 'metrics', items: [{ value: '48%', label: 'of breaches involved a third party' }] },
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

// Matches the component's own beat math (headEnd = 1/3, then 0.15 / 0.45 / 0.15 / 0.25 of the
// remaining span) so tests can pick progress values inside a specific beat without duplicating
// the production formula's *meaning*, only its shape (as AgentLoopScene.test.tsx does).
const HEAD_END = 1 / 3;
const SUPPORTING = 1 - HEAD_END;
const INITIAL_END = HEAD_END + SUPPORTING * 0.15;
const HANDOFF_START = 0.85;

describe('SupplyChainScene', () => {
  it('renders the eyebrow and h2 title, no scene chrome of its own', () => {
    const { container } = render(<SupplyChainScene scene={baseScene()} />);
    expect(screen.getByText('ACT 3 · MODEL SUPPLY CHAIN')).toBeTruthy();
    const h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe('Three people, thirty dependencies');
    expect(container.querySelector('section')).toBeNull();
  });

  it('renders the root label then the four dependency items, in deck order', () => {
    const { container } = render(<SupplyChainScene scene={baseScene()} />);
    const nodes = Array.from(container.querySelectorAll('[data-part="node"]'));
    expect(nodes.map((el) => el.textContent?.trim())).toEqual([
      ROOT_LABEL,
      DEPENDENCY_ITEMS[0],
      DEPENDENCY_ITEMS[1],
      DEPENDENCY_ITEMS[2],
      expect.stringContaining(DEPENDENCY_ITEMS[3]),
    ]);
  });

  it('renders the incident line', () => {
    render(<SupplyChainScene scene={baseScene()} />);
    expect(screen.getByText(INCIDENT_LINE)).toBeTruthy();
  });

  it('renders the 48% metric with its label', () => {
    const { container } = render(<SupplyChainScene scene={baseScene()} />);
    const metric = container.querySelector('[data-part="metric"]') as HTMLElement;
    expect(metric.querySelector('[data-part="value"]')?.textContent).toBe('48%');
    expect(metric.textContent).toContain('of breaches involved a third party');
  });

  it('marks the compromised litellm node with a non-colour cue, not colour alone', () => {
    const { container } = render(<SupplyChainScene scene={baseScene()} />);
    const compromised = container.querySelector('[data-part="node"][data-compromised="true"]') as HTMLElement;
    expect(compromised).toBeTruthy();
    expect(compromised.textContent).toContain(DEPENDENCY_ITEMS[3]);
    expect(compromised.querySelector('[data-part="alert-icon"]')).toBeTruthy();
  });

  it('the decorative dependency graph is aria-hidden with a fixed, deterministic node count', () => {
    const { container: c1 } = render(<SupplyChainScene scene={baseScene()} />);
    const graph = c1.querySelector('[data-part="graph"]') as HTMLElement;
    expect(graph.getAttribute('aria-hidden')).toBe('true');
    const count1 = graph.querySelectorAll('[data-part="dep-node"]').length;
    expect(count1).toBeGreaterThan(0);
    cleanup();

    const { container: c2 } = render(<SupplyChainScene scene={baseScene()} />);
    const count2 = c2.querySelector('[data-part="graph"]')!.querySelectorAll('[data-part="dep-node"]').length;
    expect(count2).toBe(count1);
  });

  it('under reduced motion, all text is present (full static graph) and no GSAP timeline is created', () => {
    reduced = true;
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<SupplyChainScene scene={baseScene()} />);
    expect(screen.getByText('Three people, thirty dependencies')).toBeTruthy();
    [ROOT_LABEL, ...DEPENDENCY_ITEMS.slice(0, 3)].forEach((item) => {
      expect(screen.getAllByText(item).length).toBeGreaterThan(0);
    });
    expect(container.querySelector('[data-part="node"][data-compromised="true"]')).toBeTruthy();
    expect(screen.getByText(INCIDENT_LINE)).toBeTruthy();
    expect(screen.getByText('48%')).toBeTruthy();
    const graph = container.querySelector('[data-part="graph"]') as HTMLElement;
    expect(graph.querySelectorAll('[data-part="dep-node"]').length).toBeGreaterThan(0);
    expect(timelineSpy).not.toHaveBeenCalled();
  });

  it('under no-preference, builds exactly one paused GSAP timeline of duration 1', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<SupplyChainScene scene={baseScene()} />);
    expect(timelineSpy).toHaveBeenCalledTimes(1);
    const [vars] = timelineSpy.mock.calls[0] as [{ paused?: boolean }];
    expect(vars?.paused).toBe(true);
    const created = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    expect(created.duration()).toBe(1);
  });

  it('the graph is not yet expanded early in the initial beat, and fully in at progress 1', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<SupplyChainScene scene={baseScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;

    const early = HEAD_END + (INITIAL_END - HEAD_END) * 0.5;
    tl.progress(early);
    const edge = container.querySelector('[data-part="graph"] [data-part="edge"]') as HTMLElement;
    const depNode = container.querySelector('[data-part="graph"] [data-part="dep-node"]') as HTMLElement;
    expect(edge.style.opacity).toBe('0');
    expect(depNode.style.opacity).toBe('0');

    tl.progress(1);
    expect(edge.style.opacity || '1').toBe('1');
    expect(depNode.style.opacity || '1').toBe('1');
  });

  it('at progress 1, everything settles to the static markup (no leftover hidden opacity/transform)', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<SupplyChainScene scene={baseScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    tl.progress(1);

    const eyebrowEl = screen.getByText('ACT 3 · MODEL SUPPLY CHAIN').parentElement as HTMLElement;
    const h2 = container.querySelector('h2') as HTMLElement;
    const nodes = Array.from(container.querySelectorAll('[data-part="node"]')) as HTMLElement[];
    const line = screen.getByText(INCIDENT_LINE) as HTMLElement;
    const metricValue = container.querySelector('[data-part="value"]') as HTMLElement;
    const metricLabel = container.querySelector('[data-part="label"]') as HTMLElement;
    const edges = Array.from(container.querySelectorAll('[data-part="edge"]')) as HTMLElement[];
    const depNodes = Array.from(container.querySelectorAll('[data-part="dep-node"]')) as HTMLElement[];

    [eyebrowEl, h2, ...nodes, line, metricValue, metricLabel, ...edges, ...depNodes].forEach((el) => {
      expect(el.style.opacity || '1').toBe('1');
    });
    nodes.forEach((el) => expect(gsap.getProperty(el, 'scale')).toBe(1));
    expect(gsap.getProperty(line, 'y')).toBe(0);
    expect(gsap.getProperty(metricValue, 'scale')).toBe(1);

    // duration 1 guarantee (CONTRACTS §6): progress(1) is a valid, settled state, not clamped.
    expect(tl.duration()).toBe(1);
  });

  // Task 37 hand-off (design §8, A9, 14->15): the 48% metric collapses/shifts left into scene
  // 15's first-metric role only in the final 15% of the timeline, after it has already landed.
  it('the metric hand-off pose is not yet applied just before HANDOFF_START, and is fully applied by tl.progress(1)', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<SupplyChainScene scene={baseScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    const handoff = container.querySelector('[data-part="metric-handoff"]') as HTMLElement;
    expect(handoff).toBeTruthy();

    tl.progress(HANDOFF_START - 0.02);
    expect(gsap.getProperty(handoff, 'x')).toBe(0);
    expect(gsap.getProperty(handoff, 'scale')).toBe(1);

    tl.progress(1);
    expect(gsap.getProperty(handoff, 'x')).toBe(-8);
    expect(gsap.getProperty(handoff, 'scale')).toBe(0.94);
  });

  it('under reduced motion, the metric hand-off wrapper renders its settled pose statically', () => {
    reduced = true;
    const { container } = render(<SupplyChainScene scene={baseScene()} />);
    const handoff = container.querySelector('[data-part="metric-handoff"]') as HTMLElement;
    expect(handoff.style.transform).toContain('translateX(-8px)');
    expect(handoff.style.transform).toContain('scale(0.94)');
  });
});
