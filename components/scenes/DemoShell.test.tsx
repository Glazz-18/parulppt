import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { Scene } from '@/lib/types';
import { UI_COPY } from '@/lib/constants';
import { DemoShell } from './DemoShell';

afterEach(cleanup);

type DemoScene = Extract<Scene, { kind: 'demo' }>;

function makeScene(overrides: Partial<DemoScene> = {}): DemoScene {
  return {
    id: 'scene-04',
    slide: 4,
    act: 'act-2',
    theme: 'dark',
    pin: true,
    scrollLength: 2,
    kind: 'demo',
    component: 'CampusBotDemo',
    eyebrow: 'Break AI',
    title: 'CampusBot',
    content: { subtitle: 'A support bot with a secret.' },
    ...overrides,
  };
}

function getLiveRegion(container: HTMLElement) {
  return container.querySelector('[role="status"]');
}

describe('DemoShell', () => {
  it('renders eyebrow, h2 title, and subtitle once; no caption when not passed', () => {
    const scene = makeScene();
    const { container } = render(
      <DemoShell scene={scene} label="Instruction hierarchy" tone="neutral" detail="Sorry" onReset={() => {}}>
        <div>workspace</div>
      </DemoShell>
    );

    expect(container.querySelectorAll('h2').length).toBe(1);
    expect(container.querySelector('h2')?.textContent).toBe('CampusBot');
    expect(container.textContent).toContain('Break AI');
    expect(container.textContent).toContain('A support bot with a secret.');
    expect(container.textContent).not.toContain(UI_COPY.fictional);
  });

  it('renders caption only when passed', () => {
    const scene = makeScene();
    const { container } = render(
      <DemoShell
        scene={scene}
        label="Instruction hierarchy"
        tone="neutral"
        detail="Sorry"
        caption={UI_COPY.fictional}
        onReset={() => {}}
      >
        <div>workspace</div>
      </DemoShell>
    );

    expect(container.textContent).toContain(UI_COPY.fictional);
  });

  it('renders no <section> element (SceneShell owns it, A12)', () => {
    const scene = makeScene();
    const { container } = render(
      <DemoShell scene={scene} label="Instruction hierarchy" tone="neutral" detail="Sorry" onReset={() => {}}>
        <div>workspace</div>
      </DemoShell>
    );

    expect(container.querySelector('section')).toBeNull();
  });

  it('Reset button is always enabled and calls onReset', () => {
    const scene = makeScene();
    const onReset = vi.fn();
    const { container } = render(
      <DemoShell scene={scene} label="Instruction hierarchy" tone="neutral" detail="Sorry" onReset={onReset}>
        <div>workspace</div>
      </DemoShell>
    );
    const buttons = Array.from(container.querySelectorAll('button'));
    const resetButton = buttons.find((b) => b.textContent === UI_COPY.reset);

    expect(resetButton).toBeDefined();
    expect(resetButton?.disabled).toBe(false);
    fireEvent.click(resetButton as HTMLButtonElement);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  describe('live region', () => {
    it('is empty on mount, and is the only status live region', () => {
      const scene = makeScene();
      const { container } = render(
        <DemoShell scene={scene} label="Instruction hierarchy" tone="neutral" detail="Sorry" onReset={() => {}}>
          <div>workspace</div>
        </DemoShell>
      );

      expect(container.querySelectorAll('[role="status"]').length).toBe(1);
      expect(getLiveRegion(container)?.textContent).toBe('');
    });

    it('reads "label · detail" after a label change', () => {
      const scene = makeScene();
      const { container, rerender } = render(
        <DemoShell
          scene={scene}
          label="Instruction hierarchy"
          tone="neutral"
          detail="refusal text"
          onReset={() => {}}
        >
          <div>workspace</div>
        </DemoShell>
      );

      rerender(
        <DemoShell scene={scene} label="role-play" tone="neutral" detail="refusal text" onReset={() => {}}>
          <div>workspace</div>
        </DemoShell>
      );

      expect(getLiveRegion(container)?.textContent).toBe('role-play · refusal text');
    });

    it('updates on a detail-only change (SOC inspecting a second event)', () => {
      const scene = makeScene();
      const { container, rerender } = render(
        <DemoShell scene={scene} label="Investigating" tone="neutral" detail="event A" onReset={() => {}}>
          <div>workspace</div>
        </DemoShell>
      );

      rerender(
        <DemoShell scene={scene} label="Investigating" tone="neutral" detail="event B" onReset={() => {}}>
          <div>workspace</div>
        </DemoShell>
      );

      expect(getLiveRegion(container)?.textContent).toBe('Investigating · event B');
    });

    it('drops the " · detail" suffix when detail is the EN DASH placeholder', () => {
      const scene = makeScene();
      const { container, rerender } = render(
        <DemoShell scene={scene} label="Queue" tone="neutral" detail="–" onReset={() => {}}>
          <div>workspace</div>
        </DemoShell>
      );

      rerender(
        <DemoShell scene={scene} label="Investigating" tone="neutral" detail="–" onReset={() => {}}>
          <div>workspace</div>
        </DemoShell>
      );

      expect(getLiveRegion(container)?.textContent).toBe('Investigating');
    });

    it('does not change when unrelated props are unchanged across a rerender', () => {
      const scene = makeScene();
      const { container, rerender } = render(
        <DemoShell scene={scene} label="Queue" tone="neutral" detail="–" onReset={() => {}}>
          <div>workspace</div>
        </DemoShell>
      );

      rerender(
        <DemoShell scene={scene} label="Queue" tone="neutral" detail="–" onReset={() => {}}>
          <div>workspace v2</div>
        </DemoShell>
      );

      expect(getLiveRegion(container)?.textContent).toBe('');
    });
  });
});
