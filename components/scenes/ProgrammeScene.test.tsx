import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import gsap from 'gsap';
import { ProgrammeScene } from './ProgrammeScene';
import type { Scene } from '@/lib/types';

const QUESTIONS = [
  'What data do we collect?',
  'Where does it live, and for how long?',
  'Which AI features can reach it?',
  'Which vendors touch it?',
  'What do we do in the first six hours?',
];

const baseScene = (overrides: Partial<Scene> = {}): Scene =>
  ({
    id: 'scene-38',
    slide: 38,
    act: 'act-5',
    theme: 'light',
    component: 'ProgrammeScene',
    pin: false,
    scrollLength: 1,
    kind: 'diagram',
    eyebrow: 'ACT 5 · KEEP IT SIMPLE · 2 OF 3',
    title: 'Your security programme, on one page',
    content: {
      blocks: [
        { type: 'lines', lines: ['One owner. Reviewed monthly. Five questions.'] },
        { type: 'lines', lines: ['Owner: ______', 'Reviewed: __ / __'] },
        {
          type: 'steps',
          items: [
            { n: '01', text: QUESTIONS[0] },
            { n: '02', text: QUESTIONS[1] },
            { n: '03', text: QUESTIONS[2] },
            { n: '04', text: QUESTIONS[3] },
            { n: '05', text: QUESTIONS[4] },
          ],
        },
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

describe('ProgrammeScene', () => {
  it('renders eyebrow, h2 title, the lead line, the Owner/Reviewed lines, and no scene chrome of its own', () => {
    const { container } = render(<ProgrammeScene scene={baseScene()} />);
    expect(screen.getByText('ACT 5 · KEEP IT SIMPLE · 2 OF 3')).toBeTruthy();
    const h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe('Your security programme, on one page');
    expect(screen.getByText('One owner. Reviewed monthly. Five questions.')).toBeTruthy();
    expect(screen.getByText('Owner: ______')).toBeTruthy();
    expect(screen.getByText('Reviewed: __ / __')).toBeTruthy();
    expect(container.querySelector('section')).toBeNull();
  });

  it('renders all five questions in the markup before any interaction', () => {
    render(<ProgrammeScene scene={baseScene()} />);
    QUESTIONS.forEach((q) => expect(screen.getByRole('checkbox', { name: q })).toBeTruthy());
  });

  it('renders exactly five role=checkbox buttons, all aria-checked=false initially', () => {
    const { container } = render(<ProgrammeScene scene={baseScene()} />);
    const boxes = container.querySelectorAll('button[role="checkbox"]');
    expect(boxes).toHaveLength(5);
    boxes.forEach((box) => expect(box.getAttribute('aria-checked')).toBe('false'));
  });

  it('clicking an item toggles its aria-checked to true and back to false, independent of the others', () => {
    render(<ProgrammeScene scene={baseScene()} />);
    const first = screen.getByRole('checkbox', { name: QUESTIONS[0] });
    const second = screen.getByRole('checkbox', { name: QUESTIONS[1] });

    fireEvent.click(first);
    expect(first.getAttribute('aria-checked')).toBe('true');
    expect(second.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(first);
    expect(first.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(second);
    expect(second.getAttribute('aria-checked')).toBe('true');
    expect(first.getAttribute('aria-checked')).toBe('false');
  });

  it('never touches localStorage or sessionStorage', () => {
    const localSpy = vi.spyOn(Storage.prototype, 'setItem');
    render(<ProgrammeScene scene={baseScene()} />);
    const first = screen.getByRole('checkbox', { name: QUESTIONS[0] });
    fireEvent.click(first);
    fireEvent.click(first);
    expect(localSpy).not.toHaveBeenCalled();
  });

  it('a Space keydown on an item is not prevented by the component, and toggles via click semantics', () => {
    render(<ProgrammeScene scene={baseScene()} />);
    const first = screen.getByRole('checkbox', { name: QUESTIONS[0] });

    const event = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    first.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);

    // The engine's own navigation handler skips Space on [role="checkbox"] (CONTRACTS §8); the
    // browser's native default action then fires a click, which this component toggles.
    fireEvent.click(first);
    expect(first.getAttribute('aria-checked')).toBe('true');
  });

  it('under reduced motion, all text is static and no GSAP timeline is created', () => {
    reduced = true;
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<ProgrammeScene scene={baseScene()} />);
    expect(screen.getByText('Your security programme, on one page')).toBeTruthy();
    QUESTIONS.forEach((q) => expect(screen.getByRole('checkbox', { name: q })).toBeTruthy());
    expect(timelineSpy).not.toHaveBeenCalled();
  });

  it('under no-preference, builds exactly one paused GSAP timeline of duration 1', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<ProgrammeScene scene={baseScene()} />);
    expect(timelineSpy).toHaveBeenCalledTimes(1);
    const [vars] = timelineSpy.mock.calls[0] as [{ paused?: boolean }];
    expect(vars?.paused).toBe(true);
    const created = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    expect(created.duration()).toBe(1);
  });

  it('at tl.progress(1), everything is fully settled (no leftover transform/opacity)', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    const { container } = render(<ProgrammeScene scene={baseScene()} />);
    const tl = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    tl.progress(1);

    const eyebrowEl = screen.getByText('ACT 5 · KEEP IT SIMPLE · 2 OF 3').parentElement as HTMLElement;
    const h2 = container.querySelector('h2') as HTMLElement;
    const lines = Array.from(container.querySelectorAll('[data-part="line"]')) as HTMLElement[];
    const steps = Array.from(container.querySelectorAll('[data-part="step"]')) as HTMLElement[];

    [eyebrowEl, h2, ...lines, ...steps].forEach((el) => {
      expect(el.style.opacity || '1').toBe('1');
      expect(gsap.getProperty(el, 'y')).toBe(0);
    });
  });
});
