import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { Scene } from '@/lib/types';
import { UI_COPY } from '@/lib/constants';
import { campusBotCopy } from '@/lib/demoState';

const track = vi.fn();
vi.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => track(...args),
}));

import { CampusBotDemo } from './CampusBotDemo';

afterEach(() => {
  cleanup();
  track.mockClear();
});

type DemoScene = Extract<Scene, { kind: 'demo' }>;

function makeScene(): DemoScene {
  return {
    id: 'scene-04',
    slide: 4,
    act: 'act-2',
    theme: 'dark',
    pin: false,
    scrollLength: 1,
    kind: 'demo',
    component: 'CampusBotDemo',
    eyebrow: 'Break AI',
    title: 'CampusBot',
    content: { subtitle: 'A support bot with a secret.' },
  };
}

function getLiveRegion(container: HTMLElement) {
  return container.querySelector('[role="status"]');
}

function getButton(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll('button')).find((b) => b.textContent === text);
}

describe('CampusBotDemo', () => {
  it('baseline: shows system/question/refusal and the role-play chip only', () => {
    const { container } = render(<CampusBotDemo scene={makeScene()} />);

    expect(container.textContent).toContain(campusBotCopy.systemLabel);
    expect(container.textContent).toContain('You are CampusBot');
    expect(container.textContent).toContain(campusBotCopy.question);
    expect(container.textContent).toContain(campusBotCopy.refusal);
    expect(container.textContent).not.toContain(campusBotCopy.roleplay);
    expect(container.textContent).not.toContain(campusBotCopy.leak);
    expect(container.textContent).not.toContain(campusBotCopy.blocked);

    // I4 (residual): the refusal card was the last cream (--fg) background card in this demo —
    // its default-tone MonoLabel (--label, --orange on this dark+accent-orange scene) on cream
    // measured ~2.3:1. It now sits on the dark ground like every other card.
    const refusalText = Array.from(container.querySelectorAll('p')).find(
      (p) => p.textContent === campusBotCopy.refusal,
    );
    const refusalCard = refusalText?.parentElement as HTMLElement;
    expect(refusalCard.style.backgroundColor).not.toBe('var(--fg)');
    expect(refusalCard.style.backgroundColor).toBe('var(--bg)');

    const chip = getButton(container, campusBotCopy.labels.roleplay);
    expect(chip).toBeDefined();
    expect(getButton(container, campusBotCopy.labels['guardrail-off'])).toBeUndefined();
    expect(getButton(container, campusBotCopy.labels['guardrail-on'])).toBeUndefined();
    expect(container.textContent).toContain(UI_COPY.fictional);
    expect(getLiveRegion(container)?.textContent).toBe('');
  });

  it('ROLEPLAY: adds the roleplay message, swaps chip for the guardrail pair (both unpressed), tracks', () => {
    const { container } = render(<CampusBotDemo scene={makeScene()} />);
    fireEvent.click(getButton(container, campusBotCopy.labels.roleplay) as HTMLButtonElement);

    expect(container.textContent).toContain(campusBotCopy.roleplay);
    expect(getButton(container, campusBotCopy.labels.roleplay)).toBeUndefined();

    const off = getButton(container, campusBotCopy.labels['guardrail-off']);
    const on = getButton(container, campusBotCopy.labels['guardrail-on']);
    expect(off?.getAttribute('aria-pressed')).toBe('false');
    expect(on?.getAttribute('aria-pressed')).toBe('false');

    expect(track).toHaveBeenCalledWith('demo_interaction', {
      slide: 4,
      demo: 'campusbot',
      action: 'ROLEPLAY',
      from: 'baseline',
      to: 'roleplay',
    });
    expect(getLiveRegion(container)?.textContent).toBe(`${campusBotCopy.labels.roleplay} · ${campusBotCopy.roleplay}`);
  });

  it('GUARDRAIL_OFF: shows the leak, pressed states, tracks', () => {
    const { container } = render(<CampusBotDemo scene={makeScene()} />);
    fireEvent.click(getButton(container, campusBotCopy.labels.roleplay) as HTMLButtonElement);
    track.mockClear();
    fireEvent.click(getButton(container, campusBotCopy.labels['guardrail-off']) as HTMLButtonElement);

    expect(container.textContent).toContain(campusBotCopy.leak);
    expect(container.textContent).not.toContain(campusBotCopy.blocked);
    expect(getButton(container, campusBotCopy.labels['guardrail-off'])?.getAttribute('aria-pressed')).toBe('true');
    expect(getButton(container, campusBotCopy.labels['guardrail-on'])?.getAttribute('aria-pressed')).toBe('false');

    // I4: the leak card must not pair --orange text with --fg (cream on this dark scene, ~2.3:1).
    // It sits on the dark ground (--bg) instead, keeping --orange text and the warning icon.
    const leakText = Array.from(container.querySelectorAll('p')).find((p) =>
      p.textContent?.includes(campusBotCopy.leak),
    );
    const leakCard = leakText?.parentElement as HTMLElement;
    expect(leakCard.style.color).toBe('var(--orange)');
    expect(leakCard.style.backgroundColor).not.toBe('var(--fg)');
    expect(leakCard.style.backgroundColor).toBe('var(--bg)');

    expect(track).toHaveBeenCalledWith('demo_interaction', {
      slide: 4,
      demo: 'campusbot',
      action: 'GUARDRAIL_OFF',
      from: 'roleplay',
      to: 'guardrail-off',
    });
    expect(getLiveRegion(container)?.textContent).toBe(
      `${campusBotCopy.labels['guardrail-off']} · ${campusBotCopy.leak}`
    );
  });

  it('GUARDRAIL_ON: shows blocked, leak is gone, pressed states swap', async () => {
    const { container } = render(<CampusBotDemo scene={makeScene()} />);
    fireEvent.click(getButton(container, campusBotCopy.labels.roleplay) as HTMLButtonElement);
    fireEvent.click(getButton(container, campusBotCopy.labels['guardrail-off']) as HTMLButtonElement);
    track.mockClear();
    fireEvent.click(getButton(container, campusBotCopy.labels['guardrail-on']) as HTMLButtonElement);

    expect(container.textContent).toContain(campusBotCopy.blocked);
    await waitFor(() => expect(container.textContent).not.toContain(campusBotCopy.leak));
    expect(getButton(container, campusBotCopy.labels['guardrail-on'])?.getAttribute('aria-pressed')).toBe('true');
    expect(getButton(container, campusBotCopy.labels['guardrail-off'])?.getAttribute('aria-pressed')).toBe('false');

    expect(track).toHaveBeenCalledWith('demo_interaction', {
      slide: 4,
      demo: 'campusbot',
      action: 'GUARDRAIL_ON',
      from: 'guardrail-off',
      to: 'guardrail-on',
    });
  });

  it('Reset returns to baseline', async () => {
    const { container } = render(<CampusBotDemo scene={makeScene()} />);
    fireEvent.click(getButton(container, campusBotCopy.labels.roleplay) as HTMLButtonElement);
    fireEvent.click(getButton(container, campusBotCopy.labels['guardrail-off']) as HTMLButtonElement);
    track.mockClear();

    fireEvent.click(getButton(container, UI_COPY.reset) as HTMLButtonElement);

    await waitFor(() => expect(container.textContent).not.toContain(campusBotCopy.roleplay));
    expect(container.textContent).not.toContain(campusBotCopy.leak);
    expect(getButton(container, campusBotCopy.labels.roleplay)).toBeDefined();
    expect(track).toHaveBeenCalledWith('demo_interaction', {
      slide: 4,
      demo: 'campusbot',
      action: 'RESET',
      from: 'guardrail-off',
      to: 'baseline',
    });
  });

  it('pressing an already-pressed guardrail button is a no-op: no extra track call', () => {
    const { container } = render(<CampusBotDemo scene={makeScene()} />);
    fireEvent.click(getButton(container, campusBotCopy.labels.roleplay) as HTMLButtonElement);
    fireEvent.click(getButton(container, campusBotCopy.labels['guardrail-off']) as HTMLButtonElement);
    track.mockClear();

    fireEvent.click(getButton(container, campusBotCopy.labels['guardrail-off']) as HTMLButtonElement);

    expect(track).not.toHaveBeenCalled();
  });

  it('Reset in baseline is a no-op: no track call', () => {
    const { container } = render(<CampusBotDemo scene={makeScene()} />);
    track.mockClear();

    fireEvent.click(getButton(container, UI_COPY.reset) as HTMLButtonElement);

    expect(track).not.toHaveBeenCalled();
  });
});
