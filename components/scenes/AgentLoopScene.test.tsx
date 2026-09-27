import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import gsap from 'gsap';
import { AgentLoopScene } from './AgentLoopScene';
import type { Scene } from '@/lib/types';

const CHATBOT_ITEMS = ['Input', '→', 'Answer'];
const AGENT_ITEMS = ['Goal', '→', 'Reason', '→', 'Use a tool', '→', 'Act', '→', 'Observe', '↺'];

const baseScene = (overrides: Partial<Scene> = {}): Scene =>
  ({
    id: 'scene-11',
    slide: 11,
    act: 'act-3',
    theme: 'dark',
    component: 'AgentLoopScene',
    pin: true,
    scrollLength: 3,
    kind: 'diagram',
    eyebrow: 'ACT 3 · GUARDRAILS',
    title: 'What an AI agent does',
    sourceNotes: ['OWASP GenAI Security Project, Top 10 for LLM Applications, 2026'],
    content: {
      blocks: [
        { type: 'flow', label: 'Chatbot', items: CHATBOT_ITEMS },
        { type: 'flow', label: 'Agent · loops until done', items: AGENT_ITEMS },
        { type: 'metrics', items: [{ value: '#3', label: 'Excessive Agency, OWASP LLM Top 10 2026' }] },
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

describe('AgentLoopScene', () => {
  it('renders the eyebrow and h2 title, no scene chrome of its own', () => {
    const { container } = render(<AgentLoopScene scene={baseScene()} />);
    expect(screen.getByText('ACT 3 · GUARDRAILS')).toBeTruthy();
    const h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe('What an AI agent does');
    expect(container.querySelector('section')).toBeNull();
  });

  it('renders the Chatbot items then the Agent items (incl. → and ↺ connectors as their own elements) in deck order', () => {
    const { container } = render(<AgentLoopScene scene={baseScene()} />);
    const parts = Array.from(container.querySelectorAll('[data-part="node"], [data-part="connector"]'));
    const texts = parts.map((el) => el.textContent);
    expect(texts).toEqual([...CHATBOT_ITEMS, ...AGENT_ITEMS]);

    // Connector glyphs are their own elements, never aria-hidden (CONTRACTS §3.1: deck copy).
    const connectors = parts.filter((el) => el.getAttribute('data-part') === 'connector');
    expect(connectors.length).toBe(6); // chatbot's '→' + agent's 4x '→' + 1x '↺'
    connectors.forEach((el) => expect(el.getAttribute('aria-hidden')).toBeNull());
  });

  it('renders metric #3 with its label', () => {
    const { container } = render(<AgentLoopScene scene={baseScene()} />);
    const metric = container.querySelector('[data-part="metric"]') as HTMLElement;
    expect(metric.querySelector('[data-part="value"]')?.textContent).toBe('#3');
    expect(metric.textContent).toContain('Excessive Agency, OWASP LLM Top 10 2026');
  });

  it('under reduced motion, all text is present and no GSAP timeline is created', () => {
    reduced = true;
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<AgentLoopScene scene={baseScene()} />);
    expect(screen.getByText('What an AI agent does')).toBeTruthy();
    [...CHATBOT_ITEMS, ...AGENT_ITEMS].forEach((item) => {
      expect(screen.getAllByText(item).length).toBeGreaterThan(0);
    });
    expect(screen.getByText('#3')).toBeTruthy();
    expect(timelineSpy).not.toHaveBeenCalled();
  });

  it('under no-preference, builds exactly one paused GSAP timeline of duration 1', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<AgentLoopScene scene={baseScene()} />);
    expect(timelineSpy).toHaveBeenCalledTimes(1);
    const [vars] = timelineSpy.mock.calls[0] as [{ paused?: boolean }];
    expect(vars?.paused).toBe(true);
    const created = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    expect(created.duration()).toBe(1);
  });

  it('the ring indicator is mid-cycle (transformed) at an intermediate progress and at rest at progress 1', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<AgentLoopScene scene={baseScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    const indicator = container.querySelector('[data-part="indicator-wrap"]') as HTMLElement;

    // The indicator's rotation tween runs across [chatbotEnd, 1] = [1/3 + 2/3*0.2, 1]. Pick a
    // progress a quarter of the way through that tween: rotation = 180°, clearly mid-cycle.
    const chatbotEnd = 1 / 3 + (2 / 3) * 0.2;
    const quarter = chatbotEnd + (1 - chatbotEnd) * 0.25;
    tl.progress(quarter);
    const midRotation = gsap.getProperty(indicator, 'rotation') as number;
    expect(((midRotation % 360) + 360) % 360).not.toBe(0);

    tl.progress(1);
    const restRotation = gsap.getProperty(indicator, 'rotation') as number;
    expect(((restRotation % 360) + 360) % 360).toBe(0);
  });

  it('at progress 1, everything settles to the static markup (no leftover hidden opacity/transform)', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<AgentLoopScene scene={baseScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    tl.progress(1);

    const eyebrowEl = screen.getByText('ACT 3 · GUARDRAILS').parentElement as HTMLElement;
    const h2 = container.querySelector('h2') as HTMLElement;
    const parts = Array.from(
      container.querySelectorAll('[data-part="node"], [data-part="connector"], [data-part="flow-label"]'),
    ) as HTMLElement[];
    const metricValue = container.querySelector('[data-part="value"]') as HTMLElement;
    const metricLabel = container.querySelector('[data-part="label"]') as HTMLElement;

    [eyebrowEl, h2, ...parts, metricValue, metricLabel].forEach((el) => {
      expect(el.style.opacity || '1').toBe('1');
    });
    parts.forEach((el) => expect(gsap.getProperty(el, 'scale')).toBe(1));
    expect(gsap.getProperty(metricValue, 'scale')).toBe(1);
    expect(gsap.getProperty(metricLabel, 'y')).toBe(0);

    const indicator = container.querySelector('[data-part="indicator-wrap"]') as HTMLElement;
    expect(((gsap.getProperty(indicator, 'rotation') as number) % 360 + 360) % 360).toBe(0);
  });
});
