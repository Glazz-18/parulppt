import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { setCurrentScene } from '@/lib/sceneNavigation';
import { SceneControls } from './SceneControls';

const goToSceneMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/sceneNavigation', async () => {
  const actual = await vi.importActual<typeof import('@/lib/sceneNavigation')>('@/lib/sceneNavigation');
  return { ...actual, goToScene: goToSceneMock };
});

beforeEach(() => {
  goToSceneMock.mockClear();
  act(() => setCurrentScene(1));
});

afterEach(() => {
  cleanup();
});

describe('SceneControls', () => {
  it('reads the counter as "01 / 46" on scene 1', () => {
    const { getByText } = render(<SceneControls />);
    expect(getByText('01 / 46')).toBeTruthy();
  });

  it('updates the counter when the current scene changes', () => {
    const { getByText, rerender } = render(<SceneControls />);
    act(() => setCurrentScene(9));
    rerender(<SceneControls />);
    expect(getByText('09 / 46')).toBeTruthy();
  });

  it('disables Previous on scene 1 and enables Next', () => {
    const { getByRole } = render(<SceneControls />);
    expect((getByRole('button', { name: 'Previous' }) as HTMLButtonElement).disabled).toBe(true);
    expect((getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables Next on scene 46 and enables Previous', () => {
    act(() => setCurrentScene(46));
    const { getByRole } = render(<SceneControls />);
    expect((getByRole('button', { name: 'Next' }) as HTMLButtonElement).disabled).toBe(true);
    expect((getByRole('button', { name: 'Previous' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('Next click calls goToScene(current + 1)', () => {
    act(() => setCurrentScene(10));
    const { getByRole } = render(<SceneControls />);
    fireEvent.click(getByRole('button', { name: 'Next' }));
    expect(goToSceneMock).toHaveBeenCalledWith(11);
  });

  it('Previous click calls goToScene(current - 1)', () => {
    act(() => setCurrentScene(10));
    const { getByRole } = render(<SceneControls />);
    fireEvent.click(getByRole('button', { name: 'Previous' }));
    expect(goToSceneMock).toHaveBeenCalledWith(9);
  });

  it('shows no act label on scene 1 (act-0, no ACTS entry)', () => {
    const { container } = render(<SceneControls />);
    expect(container.querySelector('[data-act-label]')).toBeNull();
  });

  it('shows the exact "Act N — label" text for the current scene\'s act elsewhere', () => {
    act(() => setCurrentScene(9)); // act-3: Guardrails
    const { container } = render(<SceneControls />);
    expect(container.querySelector('[data-act-label]')?.textContent).toBe('Act 3 — Guardrails');
  });

  it('clips a long act label instead of wrapping, so it never collides with PresenterPen\'s toolbar stacked above it', () => {
    act(() => setCurrentScene(29)); // act-5: the longest label
    const { container } = render(<SceneControls />);
    const label = container.querySelector('[data-act-label]') as HTMLElement;
    expect(label.style.whiteSpace).toBe('nowrap');
    expect(label.style.overflow).toBe('hidden');
    expect(label.style.textOverflow).toBe('ellipsis');
    expect(label.style.maxWidth).toBe('40vw');
  });

  it('never shows the abbreviation PREV or the word INDEX (UI_COPY.previous/next are full words)', () => {
    const { container } = render(<SceneControls />);
    expect(container.textContent).not.toMatch(/\bPREV\b/i);
    expect(container.textContent).not.toMatch(/INDEX/i);
  });
});
