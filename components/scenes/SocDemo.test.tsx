import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import type { Scene } from '@/lib/types';
import { UI_COPY } from '@/lib/constants';
import { linkedEvents, socCopy, SOC_NOISE_ROWS, SOC_PROPOSE_DELAY_MS } from '@/lib/demoState';

const track = vi.fn();
vi.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => track(...args),
}));

import { getDemoEscape } from '@/lib/sceneNavigation';
import { SocDemo } from './SocDemo';

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    value: (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)' && matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  setReducedMotion(false);
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  cleanup();
  track.mockClear();
});

type DemoScene = Extract<Scene, { kind: 'demo' }>;

function makeScene(): DemoScene {
  return {
    id: 'scene-23',
    slide: 23,
    act: 'act-4',
    theme: 'dark',
    pin: false,
    scrollLength: 1,
    kind: 'demo',
    component: 'SocDemo',
    eyebrow: 'SOC',
    title: 'Correlation',
    content: { subtitle: 'Synthetic logs · aarav-startup.example' },
  };
}

function getLiveRegion(container: HTMLElement) {
  return container.querySelector('[role="status"]');
}

function getButton(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll('button')).find((b) => b.textContent === text);
}

function noiseRows(container: HTMLElement) {
  return Array.from(container.querySelectorAll('li[aria-hidden="true"]'));
}

function allRows(container: HTMLElement) {
  return Array.from(container.querySelectorAll('li'));
}

function occurrences(haystack: string, needle: string) {
  return haystack.split(needle).length - 1;
}

describe('SocDemo', () => {
  it('queue: 4 event buttons + SOC_NOISE_ROWS textless aria-hidden rows, never more than 20 row elements, unrelated shown, live region empty', () => {
    const { container } = render(<SocDemo scene={makeScene()} />);

    const eventButtons = linkedEvents.map((text) => getButton(container, text));
    expect(eventButtons.every(Boolean)).toBe(true);
    expect(eventButtons.length).toBe(4);

    const noise = noiseRows(container);
    expect(noise.length).toBe(SOC_NOISE_ROWS);
    expect(noise.every((row) => row.textContent === '')).toBe(true);

    expect(allRows(container).length).toBeLessThanOrEqual(20);
    expect(container.textContent).toContain(socCopy.unrelated);
    expect(getLiveRegion(container)?.textContent).toBe('');
  });

  it('INSPECT: highlights row and splits it into time/source/detail; tracks; live region', () => {
    const { container } = render(<SocDemo scene={makeScene()} />);
    fireEvent.click(getButton(container, linkedEvents[0]) as HTMLButtonElement);

    expect(container.textContent).toContain('15:02');
    expect(container.textContent).toContain('Mail');
    expect(container.textContent).toContain('link clicked');
    expect(getButton(container, linkedEvents[0])).toBeUndefined(); // no longer a plain button once highlighted

    expect(track).toHaveBeenCalledWith('demo_interaction', {
      slide: 23,
      demo: 'soc',
      action: 'INSPECT',
      from: 'queue',
      to: 'investigating',
    });
    expect(getLiveRegion(container)?.textContent).toBe(
      `${UI_COPY.soc.investigating} · ${linkedEvents[0]}`
    );
  });

  it('Escape while investigating dispatches CLOSE via the registered handler; no handler once back in queue', () => {
    const { container } = render(<SocDemo scene={makeScene()} />);
    fireEvent.click(getButton(container, linkedEvents[0]) as HTMLButtonElement);
    expect(getDemoEscape(23)).toBeDefined();
    track.mockClear();

    act(() => {
      getDemoEscape(23)?.();
    });

    expect(getButton(container, linkedEvents[0])).toBeDefined(); // back to a plain button
    expect(track).toHaveBeenCalledWith('demo_interaction', {
      slide: 23,
      demo: 'soc',
      action: 'CLOSE',
      from: 'investigating',
      to: 'queue',
    });
    expect(getDemoEscape(23)).toBeUndefined();
  });

  it('no escape handler registered while in queue', () => {
    render(<SocDemo scene={makeScene()} />);
    expect(getDemoEscape(23)).toBeUndefined();
  });

  it('CORRELATE: shows summary/evidence/suggested immediately, no gate yet; gate mounts after SOC_PROPOSE_DELAY_MS', () => {
    const { container } = render(<SocDemo scene={makeScene()} />);
    fireEvent.click(getButton(container, socCopy.copilot) as HTMLButtonElement);

    expect(container.textContent).toContain(socCopy.summary);
    expect(container.textContent).toContain(socCopy.evidence);
    expect(container.textContent).toContain(socCopy.suggested);
    expect(container.textContent).not.toContain(socCopy.gate);
    expect(getButton(container, linkedEvents[0])).toBeUndefined(); // events no longer interactive

    act(() => vi.advanceTimersByTime(SOC_PROPOSE_DELAY_MS - 1));
    expect(container.textContent).not.toContain(socCopy.gate);

    act(() => vi.advanceTimersByTime(1));
    expect(container.textContent).toContain(socCopy.gate);
    // suggested is the gate's proposal now — a single copy, not also the copilot panel's
    expect(occurrences(container.textContent ?? '', socCopy.suggested)).toBe(1);
  });

  it('reduced motion: PROPOSE fires with 0 delay', () => {
    setReducedMotion(true);
    const { container } = render(<SocDemo scene={makeScene()} />);
    fireEvent.click(getButton(container, socCopy.copilot) as HTMLButtonElement);

    act(() => vi.advanceTimersByTime(0));
    expect(container.textContent).toContain(socCopy.gate);
  });

  it('APPROVE: outcome shows UI_COPY.soc.approved with a safe-tone (green) icon', () => {
    const { container } = render(<SocDemo scene={makeScene()} />);
    fireEvent.click(getButton(container, socCopy.copilot) as HTMLButtonElement);
    act(() => vi.advanceTimersByTime(SOC_PROPOSE_DELAY_MS));
    track.mockClear();

    fireEvent.click(getButton(container, socCopy.approve) as HTMLButtonElement);

    expect(container.textContent).toContain(UI_COPY.soc.approved);
    expect(container.querySelector('[data-tone="safe"]')).toBeTruthy();
    expect(container.querySelector('s')).toBeNull();
    expect(occurrences(container.textContent ?? '', socCopy.suggested)).toBe(1);
    expect(track).toHaveBeenCalledWith('demo_interaction', {
      slide: 23,
      demo: 'soc',
      action: 'APPROVE',
      from: 'pending-approval',
      to: 'approved',
    });

    // Ruling accepted (disputed ruling 1): once decided, ApprovalGate disables both buttons
    // (CONTRACTS §9.3 lists "Controls –" for approved/rejected) — a repeat press is a no-op both
    // because the button is disabled and because the reducer itself no-ops the transition.
    expect((getButton(container, socCopy.approve) as HTMLButtonElement).disabled).toBe(true);
    expect((getButton(container, socCopy.reject) as HTMLButtonElement).disabled).toBe(true);
    track.mockClear();
    fireEvent.click(getButton(container, socCopy.approve) as HTMLButtonElement);
    expect(track).not.toHaveBeenCalled();
  });

  it('REJECT: outcome shows UI_COPY.soc.rejected, suggested struck through, neutral tone (never green/orange)', () => {
    const { container } = render(<SocDemo scene={makeScene()} />);
    fireEvent.click(getButton(container, socCopy.copilot) as HTMLButtonElement);
    act(() => vi.advanceTimersByTime(SOC_PROPOSE_DELAY_MS));
    track.mockClear();

    fireEvent.click(getButton(container, socCopy.reject) as HTMLButtonElement);

    expect(container.textContent).toContain(UI_COPY.soc.rejected);
    const struck = container.querySelector('s');
    expect(struck?.textContent).toBe(socCopy.suggested);
    expect(occurrences(container.textContent ?? '', socCopy.suggested)).toBe(1);
    expect(container.querySelector('[data-tone="neutral"]')).toBeTruthy();
    expect(container.querySelector('[data-tone="safe"]')).toBeNull();
    expect(container.querySelector('[data-tone="alert"]')).toBeNull();
    expect(track).toHaveBeenCalledWith('demo_interaction', {
      slide: 23,
      demo: 'soc',
      action: 'REJECT',
      from: 'pending-approval',
      to: 'rejected',
    });

    // Ruling accepted (disputed ruling 1): decided outcome disables both buttons.
    expect((getButton(container, socCopy.approve) as HTMLButtonElement).disabled).toBe(true);
    expect((getButton(container, socCopy.reject) as HTMLButtonElement).disabled).toBe(true);
    track.mockClear();
    fireEvent.click(getButton(container, socCopy.reject) as HTMLButtonElement);
    expect(track).not.toHaveBeenCalled();
  });

  it('Reset cancels a pending PROPOSE timer: back in queue, and the timer never fires', () => {
    const { container } = render(<SocDemo scene={makeScene()} />);
    fireEvent.click(getButton(container, socCopy.copilot) as HTMLButtonElement);
    track.mockClear();

    fireEvent.click(getButton(container, UI_COPY.reset) as HTMLButtonElement);

    expect(getButton(container, linkedEvents[0])).toBeDefined(); // queue rows are back
    expect(noiseRows(container).length).toBe(SOC_NOISE_ROWS);
    expect(track).toHaveBeenCalledWith('demo_interaction', {
      slide: 23,
      demo: 'soc',
      action: 'RESET',
      from: 'correlated',
      to: 'queue',
    });

    track.mockClear();
    act(() => vi.advanceTimersByTime(SOC_PROPOSE_DELAY_MS * 2));
    expect(container.textContent).not.toContain(socCopy.gate);
    expect(track).not.toHaveBeenCalled();
  });

  it('Reset in queue is a no-op: no track call', () => {
    const { container } = render(<SocDemo scene={makeScene()} />);
    track.mockClear();

    fireEvent.click(getButton(container, UI_COPY.reset) as HTMLButtonElement);

    expect(track).not.toHaveBeenCalled();
  });
});
