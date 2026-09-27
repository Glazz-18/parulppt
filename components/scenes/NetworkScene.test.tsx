import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NetworkScene } from './NetworkScene';
import { UI_COPY } from '@/lib/constants';
import type { Scene } from '@/lib/types';

const PROMPTS = [
  { n: '01', text: 'Name' },
  { n: '02', text: 'Course and year' },
  { n: '03', text: 'One skill' },
  { n: '04', text: 'One thing you’re building' },
  { n: '05', text: 'One problem you care about' },
];

const baseScene = (): Scene =>
  ({
    id: 'scene-43',
    slide: 43,
    act: 'act-7',
    theme: 'light',
    pin: false,
    scrollLength: 1,
    kind: 'network',
    eyebrow: 'ACT 7 · NETWORK',
    title: 'Look around.',
    content: {
      lead: 'Find one person you don’t know. Swap these, then swap LinkedIn.',
      timer: '60s',
      seconds: 60,
      prompts: PROMPTS,
    },
  }) as Scene;

function mockMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query.includes('no-preference'),
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
  vi.useFakeTimers();
  mockMatchMedia();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
});

describe('NetworkScene', () => {
  it('renders eyebrow, h2 title, the lead, the initial deck timer string, and all five prompts, with no scene chrome of its own', () => {
    const { container } = render(<NetworkScene scene={baseScene()} />);
    expect(screen.getByText('ACT 7 · NETWORK')).toBeTruthy();
    expect(container.querySelector('h2')?.textContent).toBe('Look around.');
    expect(screen.getByText('Find one person you don’t know. Swap these, then swap LinkedIn.')).toBeTruthy();
    expect(screen.getByText('60s')).toBeTruthy();
    PROMPTS.forEach((p) => expect(screen.getByText(p.text)).toBeTruthy());
    expect(container.querySelector('section')).toBeNull();
  });

  it('Start ticks the countdown down to 59s after 1000ms', () => {
    render(<NetworkScene scene={baseScene()} />);
    fireEvent.click(screen.getByRole('button', { name: UI_COPY.start }));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('59s')).toBeTruthy();
  });

  it('Pause holds the display across 3000ms', () => {
    render(<NetworkScene scene={baseScene()} />);
    fireEvent.click(screen.getByRole('button', { name: UI_COPY.start }));
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText('58s')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: UI_COPY.pause }));
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText('58s')).toBeTruthy();
  });

  it('Start resumes counting from where it was paused', () => {
    render(<NetworkScene scene={baseScene()} />);
    fireEvent.click(screen.getByRole('button', { name: UI_COPY.start }));
    act(() => vi.advanceTimersByTime(2000));
    fireEvent.click(screen.getByRole('button', { name: UI_COPY.pause }));
    fireEvent.click(screen.getByRole('button', { name: UI_COPY.start }));
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('57s')).toBeTruthy();
  });

  it('Restart resets the display to 60s and stops the countdown', () => {
    render(<NetworkScene scene={baseScene()} />);
    fireEvent.click(screen.getByRole('button', { name: UI_COPY.start }));
    act(() => vi.advanceTimersByTime(5000));
    fireEvent.click(screen.getByRole('button', { name: UI_COPY.restart }));
    expect(screen.getByText('60s')).toBeTruthy();
    expect(screen.getByRole('button', { name: UI_COPY.start })).toBeTruthy();
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getByText('60s')).toBeTruthy();
  });

  it('runs to 0, stops, and the interval stays cleared (no further ticks)', () => {
    render(<NetworkScene scene={baseScene()} />);
    fireEvent.click(screen.getByRole('button', { name: UI_COPY.start }));
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByText('0s')).toBeTruthy();
    expect(screen.getByRole('button', { name: UI_COPY.start })).toBeTruthy();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('0s')).toBeTruthy();
  });

  it('clears the interval on unmount', () => {
    const clearSpy = vi.spyOn(window, 'clearInterval');
    const { unmount } = render(<NetworkScene scene={baseScene()} />);
    fireEvent.click(screen.getByRole('button', { name: UI_COPY.start }));
    act(() => vi.advanceTimersByTime(1000));
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });

  it('moves the emphasised prompt at each 12s boundary once started', () => {
    const { container } = render(<NetworkScene scene={baseScene()} />);
    const steps = () => Array.from(container.querySelectorAll('[data-part="step"]')) as HTMLElement[];

    // Idle, never started: every prompt fully shown.
    steps().forEach((el) => expect(Number(el.style.opacity)).toBeGreaterThanOrEqual(1));

    fireEvent.click(screen.getByRole('button', { name: UI_COPY.start }));
    act(() => vi.advanceTimersByTime(11_000));
    expect(Number(steps()[0]!.style.opacity)).toBeGreaterThanOrEqual(1);
    expect(Number(steps()[1]!.style.opacity)).toBeLessThan(1);

    act(() => vi.advanceTimersByTime(1000)); // 12s elapsed: window 1 begins
    expect(Number(steps()[1]!.style.opacity)).toBeGreaterThanOrEqual(1);
    expect(Number(steps()[2]!.style.opacity)).toBeLessThan(1);
  });
});
