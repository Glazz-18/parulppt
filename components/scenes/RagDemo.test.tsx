import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import type { Scene } from '@/lib/types';
import { ragCopy, ragDocs, ragRanking } from '@/lib/demoState';

const track = vi.fn();
vi.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => track(...args),
}));

import { RagDemo } from './RagDemo';

afterEach(() => {
  cleanup();
  track.mockClear();
});

type DemoScene = Extract<Scene, { kind: 'demo' }>;

function makeScene(): DemoScene {
  return {
    id: 'scene-06',
    slide: 6,
    act: 'act-2',
    theme: 'dark',
    pin: false,
    scrollLength: 1,
    kind: 'demo',
    component: 'RagDemo',
    eyebrow: 'Break AI',
    title: 'RAG poison',
    content: { subtitle: 'A retrieval demo with a planted instruction.' },
  };
}

function getLiveRegion(container: HTMLElement) {
  return container.querySelector('[role="status"]');
}

function getButton(container: HTMLElement, text: string) {
  return Array.from(container.querySelectorAll('button')).find((b) => b.textContent === text);
}

function rowNames(container: HTMLElement) {
  return Array.from(container.querySelectorAll('th[scope="row"]')).map((th) => {
    const name = ragDocs.find((d) => th.textContent?.startsWith(d.name));
    return name?.name ?? th.textContent;
  });
}

describe('RagDemo', () => {
  it('before: shows 3 approved rows in ranking order, no hidden text, exact answer', () => {
    const { container } = render(<RagDemo scene={makeScene()} />);

    expect(rowNames(container)).toEqual(ragRanking.before);
    expect(container.textContent).not.toContain(ragCopy.hidden);
    expect(container.textContent).toContain(ragCopy.question);
    expect(container.textContent).toContain(ragCopy.answers.before);
    expect(container.querySelectorAll('a').length).toBe(0);
    expect(getLiveRegion(container)?.textContent).toBe('');
    // A15: subtitle rendered exactly once (no duplicate caption)
    const subtitle = makeScene().content.subtitle;
    expect(container.textContent?.split(subtitle).length - 1).toBe(1);
  });

  it('stepper in before: Before current, only "After the plant" enabled', () => {
    const { container } = render(<RagDemo scene={makeScene()} />);

    const beforeBtn = getButton(container, ragCopy.labels.before);
    const poisonedBtn = getButton(container, ragCopy.labels.poisoned);
    const fixedBtn = getButton(container, ragCopy.labels.fixed);

    expect(beforeBtn?.getAttribute('aria-current')).toBe('step');
    expect(poisonedBtn?.getAttribute('aria-current')).toBeNull();
    expect(fixedBtn?.getAttribute('aria-current')).toBeNull();

    expect(beforeBtn?.disabled).toBe(true);
    expect(poisonedBtn?.disabled).toBe(false);
    expect(fixedBtn?.disabled).toBe(true);
  });

  it('the current step (aria-current="step" AND disabled — jsdom has no cascade) keeps full precedence over the plain :disabled look in globals.css', () => {
    // RagDemo's active step is always both aria-current="step" and disabled (it's the current
    // step, not a future one), so .demo-btn[aria-current='step'] and .demo-btn:disabled have
    // equal specificity (0,2,0) and would otherwise fight on source order — leaving the active
    // step looking like the faintest (dashed, 0.45 opacity) control on screen. A higher-
    // specificity override (0,3,0) must win regardless of where it's declared.
    const globalsCss = readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8');
    const override = globalsCss.match(
      /\.demo-btn\[aria-current=['"]?step['"]?\]:disabled\s*\{([^}]*)\}/,
    );
    expect(override).toBeTruthy();
    expect(override![1]).toMatch(/opacity:\s*1;?/);
    expect(override![1]).not.toMatch(/border-style:\s*dashed/);
  });

  it('PLANT: 4 rows with poisoned doc at rank 1, hidden text shown, exact answer, link never an <a>, tracks, live region', () => {
    const { container } = render(<RagDemo scene={makeScene()} />);
    fireEvent.click(getButton(container, ragCopy.labels.poisoned) as HTMLButtonElement);

    expect(rowNames(container)).toEqual(ragRanking.poisoned);
    expect(container.textContent).toContain(ragCopy.hidden);
    expect(container.textContent).toContain(ragCopy.answers.poisoned);

    const anchors = Array.from(container.querySelectorAll('a'));
    expect(anchors.length).toBe(0);
    expect(anchors.some((a) => a.textContent?.includes(ragCopy.link))).toBe(false);

    expect(track).toHaveBeenCalledWith('demo_interaction', {
      slide: 6,
      demo: 'rag',
      action: 'PLANT',
      from: 'before',
      to: 'poisoned',
    });
    expect(getLiveRegion(container)?.textContent).toBe(
      `${ragCopy.labels.poisoned} · ${ragCopy.answers.poisoned}`
    );

    const poisonedBtn = getButton(container, ragCopy.labels.poisoned);
    const fixedBtn = getButton(container, ragCopy.labels.fixed);
    expect(poisonedBtn?.getAttribute('aria-current')).toBe('step');
    expect(poisonedBtn?.disabled).toBe(true);
    expect(fixedBtn?.disabled).toBe(false);
  });

  it('clicking a disabled step is a no-op: no state change, no track call', () => {
    const { container } = render(<RagDemo scene={makeScene()} />);

    fireEvent.click(getButton(container, ragCopy.labels.fixed) as HTMLButtonElement);

    expect(track).not.toHaveBeenCalled();
    expect(rowNames(container)).toEqual(ragRanking.before);
  });

  it('FIX: poisoned row keeps rank 1 but shown struck through with unapproved badge; exact answer; tracks', () => {
    const { container } = render(<RagDemo scene={makeScene()} />);
    fireEvent.click(getButton(container, ragCopy.labels.poisoned) as HTMLButtonElement);
    track.mockClear();
    fireEvent.click(getButton(container, ragCopy.labels.fixed) as HTMLButtonElement);

    expect(rowNames(container)).toEqual(ragRanking.fixed);
    expect(container.textContent).toContain(ragCopy.hidden);
    expect(container.textContent).toContain(ragCopy.answers.fixed);

    const struckRow = Array.from(container.querySelectorAll('tr')).find((tr) =>
      tr.textContent?.includes('policy_update_oct.docx')
    );
    expect(struckRow?.querySelector('s')).toBeTruthy();
    expect(struckRow?.textContent).toContain('unapproved');

    expect(track).toHaveBeenCalledWith('demo_interaction', {
      slide: 6,
      demo: 'rag',
      action: 'FIX',
      from: 'poisoned',
      to: 'fixed',
    });

    const fixedBtn = getButton(container, ragCopy.labels.fixed);
    expect(fixedBtn?.getAttribute('aria-current')).toBe('step');
    const beforeBtn = getButton(container, ragCopy.labels.before);
    const poisonedBtn = getButton(container, ragCopy.labels.poisoned);
    expect(beforeBtn?.disabled).toBe(true);
    expect(poisonedBtn?.disabled).toBe(true);
    expect(fixedBtn?.disabled).toBe(true);
  });

  it('trust badges: approved docs show "approved", poisoned doc shows "unapproved"', () => {
    const { container } = render(<RagDemo scene={makeScene()} />);
    fireEvent.click(getButton(container, ragCopy.labels.poisoned) as HTMLButtonElement);

    for (const doc of ragDocs) {
      const row = Array.from(container.querySelectorAll('tr')).find((tr) => tr.textContent?.includes(doc.name));
      expect(row?.textContent).toContain(doc.trust);
    }
  });

  it('Reset from fixed returns to before (3 rows), tracks RESET', async () => {
    const { container } = render(<RagDemo scene={makeScene()} />);
    fireEvent.click(getButton(container, ragCopy.labels.poisoned) as HTMLButtonElement);
    fireEvent.click(getButton(container, ragCopy.labels.fixed) as HTMLButtonElement);
    track.mockClear();

    fireEvent.click(getButton(container, 'Reset') as HTMLButtonElement);

    await waitFor(() => expect(rowNames(container)).toEqual(ragRanking.before));
    expect(container.textContent).not.toContain(ragCopy.hidden);
    expect(track).toHaveBeenCalledWith('demo_interaction', {
      slide: 6,
      demo: 'rag',
      action: 'RESET',
      from: 'fixed',
      to: 'before',
    });
  });

  it('Reset in before is a no-op: no track call', () => {
    const { container } = render(<RagDemo scene={makeScene()} />);
    track.mockClear();

    fireEvent.click(getButton(container, 'Reset') as HTMLButtonElement);

    expect(track).not.toHaveBeenCalled();
  });
});
