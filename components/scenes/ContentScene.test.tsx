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

  // CONTRACTS §6/§11 motion contract: pinned scenes complete metadata+title by 1/scrollLength
  // and keep supporting beats in [that, 1]; progress 1 must equal the static markup exactly
  // (every part opacity 1, no leftover transform offset).
  it('pinned scene (scrollLength 2): title completes by 1/scrollLength; steps settle with no leftover transform at progress 1', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const scene = baseScene({
      id: 'scene-09',
      slide: 9,
      pin: true,
      scrollLength: 2,
      content: {
        blocks: [
          {
            type: 'steps',
            items: [
              { n: '01', text: 'One' },
              { n: '02', text: 'Two' },
            ],
          },
        ],
      },
    });
    const { container } = render(<ContentScene scene={scene} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    const h2 = container.querySelector('h2')! as HTMLElement;
    const steps = Array.from(container.querySelectorAll('[data-part="step"]')) as HTMLElement[];

    // 1/scrollLength = 0.5: title's fromTo (headEnd*0.35 .. headEnd*0.35+headEnd*0.6) ends at
    // 0.475, strictly before 0.5, so by the arrival pose the title is already settled.
    tl.progress(0.5);
    expect(h2.style.opacity).toBe('1');
    expect(Number(steps[0].style.opacity || '0')).toBeLessThan(1);

    tl.progress(1);
    [h2, ...steps].forEach((el) => {
      expect(el.style.opacity).toBe('1');
      expect(gsap.getProperty(el, 'y')).toBe(0);
    });
  });

  // Manager ruling (Task 20 review round 1): within a metric, heading reveals before the value,
  // the value lands, then versus/the trailing label reveal as context — all inside the metric's
  // own slot.
  it('metrics: heading reveals before the value, which lands before versus/label context', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const scene = baseScene({
      content: {
        blocks: [
          {
            type: 'metrics',
            items: [{ heading: 'Heading', value: '$8.80', versus: ['vs', '$25'], label: 'Context label' }],
          },
        ],
      },
    });
    const { container } = render(<ContentScene scene={scene} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    const parts = Array.from(container.querySelectorAll('[data-part="value"], [data-part="label"]'));
    const heading = parts[0] as HTMLElement; // BigNumber renders heading before the value
    const value = parts[1] as HTMLElement;
    const context = parts.slice(2) as HTMLElement[]; // versus label, versus value, trailing label

    // Unpinned scene: headEnd = 0.35; single metrics block spans [0.35, 1], step = 0.65;
    // headingEnd = 0.35 + 0.65*0.2 = 0.48; valueEnd = 0.48 + 0.65*0.4 = 0.74.
    tl.progress(0.47); // inside the heading tween, before it completes
    expect(Number(heading.style.opacity)).toBeGreaterThan(0);
    expect(Number(value.style.opacity || '0')).toBe(0);

    tl.progress(0.49); // just past headingEnd: heading done, value tween just starting
    expect(heading.style.opacity).toBe('1');
    expect(Number(value.style.opacity || '0')).toBeLessThan(1);

    tl.progress(0.75); // just past valueEnd: value done, context still landing
    expect(value.style.opacity).toBe('1');
    context.forEach((el) => expect(Number(el.style.opacity || '0')).toBeLessThan(1));

    tl.progress(1);
    [heading, value, ...context].forEach((el) => expect(el.style.opacity).toBe('1'));
  });

  // Finding 8 (Task 22b): the progress-1 settle test previously covered `steps` only. Extend it
  // to `flow`, `metrics`, `columns` and `bars` (plus `layers`, whose marker/footer share the same
  // finding-3 trailing-reveal logic as flow's label/marker and bars' note) — every part, including
  // the previously-unanimated layer marker/footer, flow label/marker and bars note (finding 3),
  // must be fully settled (opacity 1, no leftover transform) at progress 1.
  it('progress 1 settles flow, metrics, columns, bars and layers blocks, including their trailing marker/label/note parts', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const scene = baseScene({
      id: 'scene-11',
      slide: 11,
      content: {
        blocks: [
          { type: 'flow', label: 'Agent · loops until done', items: ['Plan', '→', 'Act'], marker: 'You are here' },
          { type: 'metrics', items: [{ value: '$8.80', label: 'cost', heading: 'Heading', versus: ['vs', '$25'] }] },
          { type: 'columns', items: [{ heading: 'Col A', lines: ['a1'] }, { heading: 'Col B', lines: ['b1'] }] },
          { type: 'bars', series: ['A', 'B'], note: 'a note', ratios: [0.3, 0.9] },
          {
            type: 'layers',
            items: [{ term: 'App', text: 'Application layer' }],
            footer: 'Every layer logged',
            marker: '1',
          },
        ],
      },
    });
    const { container } = render(<ContentScene scene={scene} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    tl.progress(1);

    const flowWrapper = container.querySelector('[data-block="flow"]') as HTMLElement;
    const nodes = Array.from(flowWrapper.querySelectorAll('[data-part="node"], [data-part="connector"]')) as HTMLElement[];
    const flowLabel = flowWrapper.querySelector('[data-part="flow-label"]') as HTMLElement;
    const flowMarker = flowWrapper.querySelector('[data-part="marker"]') as HTMLElement;

    const metricsWrapper = container.querySelector('[data-block="metrics"]') as HTMLElement;
    const metricValue = metricsWrapper.querySelector('[data-part="value"]') as HTMLElement;

    const columns = Array.from(container.querySelectorAll('[data-part="column"]')) as HTMLElement[];

    const barsWrapper = container.querySelector('[data-block="bars"]') as HTMLElement;
    const bars = Array.from(barsWrapper.querySelectorAll('[data-part="bar"]')) as HTMLElement[];
    const fills = Array.from(barsWrapper.querySelectorAll('[data-part="fill"]')) as HTMLElement[];
    const barsNote = barsWrapper.querySelector('[data-part="note"]') as HTMLElement;

    const layersWrapper = container.querySelector('[data-block="layers"]') as HTMLElement;
    const layerItems = Array.from(layersWrapper.querySelectorAll('[data-part="layer"]')) as HTMLElement[];
    const layersFooter = layersWrapper.querySelector('[data-part="footer"]') as HTMLElement;
    const layersMarker = layersWrapper.querySelector('[data-part="marker"]') as HTMLElement;

    [
      ...nodes,
      flowLabel,
      flowMarker,
      metricValue,
      ...columns,
      ...bars,
      barsNote,
      ...layerItems,
      layersFooter,
      layersMarker,
    ].forEach((el) => expect(el.style.opacity).toBe('1'));

    nodes.forEach((el) => expect(gsap.getProperty(el, 'scale')).toBe(1));
    [flowLabel, flowMarker, barsNote, layersFooter, layersMarker].forEach((el) =>
      expect(gsap.getProperty(el, 'y')).toBe(0),
    );
    [...columns].forEach((el) => expect(gsap.getProperty(el, 'x')).toBe(0));
    expect(gsap.getProperty(metricValue, 'scale')).toBe(1);
    [...bars, ...layerItems].forEach((el) => expect(gsap.getProperty(el, 'y')).toBe(0));
    fills.forEach((el) => expect(gsap.getProperty(el, 'scaleX')).toBe(1));
  });
});
