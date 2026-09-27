import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { UI_COPY } from '@/lib/constants';
import { getPenEscape, setCurrentScene } from '@/lib/sceneNavigation';
import { PresenterPen } from './PresenterPen';

// jsdom has no canvas backend: a minimal recording context is enough since this file asserts on
// DOM state (aria-pressed, style.pointerEvents, data-strokes), never on drawn pixels.
function installCanvasMock() {
  const ctx = {
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    clearRect: vi.fn(),
    setTransform: vi.fn(),
    scale: vi.fn(),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  return ctx;
}

function getToolbar() {
  const pen = document.body.querySelector(`button[aria-pressed]`) as HTMLButtonElement;
  const buttons = Array.from(document.body.querySelectorAll('button'));
  const undo = buttons.find((b) => b.textContent === UI_COPY.undo) as HTMLButtonElement;
  const clear = buttons.find(
    (b) => b.textContent === UI_COPY.clear || b.textContent === UI_COPY.clearConfirm,
  ) as HTMLButtonElement;
  const canvas = document.body.querySelector('canvas') as HTMLCanvasElement;
  return { pen, undo, clear, canvas };
}

function draw(canvas: HTMLCanvasElement, points: Array<[number, number]>) {
  const [first, ...rest] = points;
  fireEvent.pointerDown(canvas, { pointerId: 1, clientX: first[0], clientY: first[1] });
  for (const [x, y] of rest) {
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: x, clientY: y });
  }
  const [lastX, lastY] = points[points.length - 1];
  fireEvent.pointerUp(canvas, { pointerId: 1, clientX: lastX, clientY: lastY });
}

const ORIGINAL_VIEWPORT = {
  width: window.innerWidth,
  height: window.innerHeight,
  dpr: window.devicePixelRatio,
};

function setViewport(width: number, height: number, dpr: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: height, configurable: true });
  Object.defineProperty(window, 'devicePixelRatio', { value: dpr, configurable: true });
}

let ctx: ReturnType<typeof installCanvasMock>;

beforeEach(() => {
  ctx = installCanvasMock();
  act(() => setCurrentScene(1));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setViewport(ORIGINAL_VIEWPORT.width, ORIGINAL_VIEWPORT.height, ORIGINAL_VIEWPORT.dpr);
  act(() => setCurrentScene(2));
  act(() => setCurrentScene(1));
});

describe('PresenterPen', () => {
  it('renders the three toolbar buttons labelled from UI_COPY', () => {
    render(<PresenterPen />);
    const { pen, undo, clear } = getToolbar();
    expect(pen.textContent).toBe(UI_COPY.pen);
    expect(undo.textContent).toBe(UI_COPY.undo);
    expect(clear.textContent).toBe(UI_COPY.clear);
  });

  it('PEN toggles aria-pressed and the canvas pointer-events', () => {
    render(<PresenterPen />);
    const { pen, canvas } = getToolbar();
    expect(pen.getAttribute('aria-pressed')).toBe('false');
    expect(canvas.style.pointerEvents).toBe('none');

    fireEvent.click(pen);
    expect(pen.getAttribute('aria-pressed')).toBe('true');
    expect(canvas.style.pointerEvents).toBe('auto');

    fireEvent.click(pen);
    expect(pen.getAttribute('aria-pressed')).toBe('false');
    expect(canvas.style.pointerEvents).toBe('none');
  });

  it('a pointerdown/move/up sequence with pen mode on adds exactly one stroke', () => {
    render(<PresenterPen />);
    const { pen, canvas } = getToolbar();
    fireEvent.click(pen);
    draw(canvas, [
      [10, 10],
      [20, 20],
      [30, 15],
    ]);
    expect(canvas.dataset.strokes).toBe('1');
  });

  it('drawing with pen mode off adds nothing', () => {
    render(<PresenterPen />);
    const { canvas } = getToolbar();
    draw(canvas, [
      [10, 10],
      [20, 20],
    ]);
    expect(canvas.dataset.strokes).toBe('0');
  });

  it('UNDO removes the last stroke', () => {
    render(<PresenterPen />);
    const { pen, undo, canvas } = getToolbar();
    fireEvent.click(pen);
    draw(canvas, [
      [0, 0],
      [5, 5],
    ]);
    draw(canvas, [
      [1, 1],
      [6, 6],
    ]);
    expect(canvas.dataset.strokes).toBe('2');

    fireEvent.click(undo);
    expect(canvas.dataset.strokes).toBe('1');

    fireEvent.click(undo);
    expect(canvas.dataset.strokes).toBe('0');

    // Undoing with nothing left is a no-op, not an error.
    fireEvent.click(undo);
    expect(canvas.dataset.strokes).toBe('0');
  });

  it('redraws sized to the new devicePixelRatio on resize, without losing the existing stroke', () => {
    setViewport(1024, 768, 1);
    render(<PresenterPen />);
    const { pen, canvas } = getToolbar();
    fireEvent.click(pen);
    draw(canvas, [
      [0, 0],
      [5, 5],
    ]);
    expect(canvas.dataset.strokes).toBe('1');

    const strokeCallsBeforeResize = ctx.stroke.mock.calls.length;
    setViewport(1440, 900, 2);
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(canvas.width).toBe(1440 * 2);
    expect(canvas.height).toBe(900 * 2);
    expect(ctx.setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0);
    expect(ctx.stroke.mock.calls.length).toBeGreaterThan(strokeCallsBeforeResize); // redrawn
    expect(canvas.dataset.strokes).toBe('1'); // the stroke itself survives the resize
  });

  describe('CLEAR (two-step, 4000 ms revert)', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('first click asks to confirm; a second click within 4000 ms clears everything', () => {
      render(<PresenterPen />);
      const { pen, canvas } = getToolbar();
      fireEvent.click(pen);
      draw(canvas, [
        [0, 0],
        [5, 5],
      ]);
      expect(canvas.dataset.strokes).toBe('1');

      const { clear: clearBtn } = getToolbar();
      fireEvent.click(clearBtn);
      expect(clearBtn.textContent).toBe(UI_COPY.clearConfirm);
      expect(canvas.dataset.strokes).toBe('1'); // untouched by the first click

      vi.advanceTimersByTime(3000);
      fireEvent.click(getToolbar().clear);
      expect(canvas.dataset.strokes).toBe('0');
      expect(getToolbar().clear.textContent).toBe(UI_COPY.clear);
    });

    it('reverts to CLEAR after 4000 ms without a second click, leaving strokes untouched', () => {
      render(<PresenterPen />);
      const { pen, canvas } = getToolbar();
      fireEvent.click(pen);
      draw(canvas, [
        [0, 0],
        [5, 5],
      ]);

      fireEvent.click(getToolbar().clear);
      expect(getToolbar().clear.textContent).toBe(UI_COPY.clearConfirm);

      act(() => vi.advanceTimersByTime(4000));
      expect(getToolbar().clear.textContent).toBe(UI_COPY.clear);
      expect(canvas.dataset.strokes).toBe('1'); // the revert never touched the strokes

      // A click now starts a fresh confirm window rather than firing a stale timer.
      fireEvent.click(getToolbar().clear);
      expect(getToolbar().clear.textContent).toBe(UI_COPY.clearConfirm);
      act(() => vi.advanceTimersByTime(3999));
      expect(getToolbar().clear.textContent).toBe(UI_COPY.clearConfirm);
      act(() => vi.advanceTimersByTime(1));
      expect(getToolbar().clear.textContent).toBe(UI_COPY.clear);
    });

    it('unmounting mid-confirm cancels the pending revert timer without throwing', () => {
      const { unmount } = render(<PresenterPen />);
      const { pen, canvas } = getToolbar();
      fireEvent.click(pen);
      fireEvent.click(getToolbar().clear);
      expect(() => unmount()).not.toThrow();
      expect(() => act(() => vi.advanceTimersByTime(4000))).not.toThrow();
      void canvas;
    });
  });

  it('all strokes are cleared when the current scene changes', () => {
    render(<PresenterPen />);
    const { pen, canvas } = getToolbar();
    fireEvent.click(pen);
    draw(canvas, [
      [0, 0],
      [5, 5],
    ]);
    expect(canvas.dataset.strokes).toBe('1');

    act(() => setCurrentScene(2));
    expect(canvas.dataset.strokes).toBe('0');
  });

  it('Escape in pen mode turns it off via the engine listener (A21)', () => {
    render(<PresenterPen />);
    const { pen, canvas } = getToolbar();
    fireEvent.click(pen);
    expect(pen.getAttribute('aria-pressed')).toBe('true');
    expect(getPenEscape()).toBeTypeOf('function');

    act(() => getPenEscape()?.());
    expect(pen.getAttribute('aria-pressed')).toBe('false');
    expect(canvas.style.pointerEvents).toBe('none');
  });

  it('does not register a pen escape handler while pen mode is off', () => {
    render(<PresenterPen />);
    expect(getPenEscape()).toBeNull();
  });
});
