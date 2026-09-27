import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import gsap from 'gsap';
import { MemeScene } from './MemeScene';
import { memes } from '@/lib/memes';
import type { Scene } from '@/lib/types';

const baseScene = (overrides: Partial<Scene> = {}): Scene =>
  ({
    id: 'scene-07',
    slide: 7,
    act: 'act-2',
    theme: 'orange',
    pin: false,
    scrollLength: 1,
    kind: 'meme',
    eyebrow: 'RAG ≠ AUTHORIZATION',
    content: { memeId: 4, lines: ['RAG hai bhai.'] },
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

describe('MemeScene', () => {
  it('renders the eyebrow and lines (h2 for lines[0], p for the rest), no scene chrome of its own', () => {
    const { container } = render(
      <MemeScene scene={baseScene({ content: { memeId: 1, lines: ['Punchline.', 'Second line.'] } })} />,
    );
    expect(screen.getByText('RAG ≠ AUTHORIZATION')).toBeTruthy();
    const h2 = container.querySelector('h2');
    expect(h2?.textContent).toBe('Punchline.');
    expect(screen.getByText('Second line.')).toBeTruthy();
    // MemeScene renders no SceneShell/<section> of its own (A12).
    expect(container.querySelector('section')).toBeNull();
  });

  it('passes the meme matching content.memeId: a meme with a file renders an <img> with its src', () => {
    const meme = memes.find((m) => m.id === 1)!;
    const { container } = render(<MemeScene scene={baseScene({ content: { memeId: 1, lines: ['Punchline.'] } })} />);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe(meme.src);
    expect(img?.getAttribute('alt')).toBe(meme.alt);
  });

  it('slide 7 (memeId 4, src "") renders the fallback and no <img>', () => {
    const meme = memes.find((m) => m.id === 4)!;
    expect(meme.src).toBe('');
    const { container } = render(<MemeScene scene={baseScene()} />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText(meme.title)).toBeTruthy();
    for (const line of meme.caption) {
      expect(screen.getByText(line)).toBeTruthy();
    }
  });

  it('under reduced motion, all text is present and no GSAP timeline is created', () => {
    reduced = true;
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<MemeScene scene={baseScene()} />);
    expect(screen.getByText('RAG ≠ AUTHORIZATION')).toBeTruthy();
    expect(screen.getByText('RAG hai bhai.')).toBeTruthy();
    expect(timelineSpy).not.toHaveBeenCalled();
  });

  it('under no-preference, builds exactly one paused GSAP timeline of duration 1', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<MemeScene scene={baseScene()} />);
    expect(timelineSpy).toHaveBeenCalledTimes(1);
    const [vars] = timelineSpy.mock.calls[0] as [{ paused?: boolean }];
    expect(vars?.paused).toBe(true);
    const created = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    expect(created.duration()).toBe(1);
  });

  // Task 37 hand-off (design §8, A9, 22->23): slide 22 only gets the dark field; every other
  // meme slide is unaffected (scoped by data, not by kind).
  it('slide 22 renders the dark hand-off field (aria-hidden, --bg-dark/--text-dark tokens); other meme slides do not', () => {
    const { container: c22 } = render(<MemeScene scene={baseScene({ slide: 22 })} />);
    const field = c22.querySelector('[data-part="handoff-field"]') as HTMLElement;
    expect(field).toBeTruthy();
    expect(field.getAttribute('aria-hidden')).toBe('true');
    expect(field.style.background).toBe('var(--bg-dark)');
    expect(field.style.borderTop).toContain('var(--text-dark)');
    cleanup();

    const { container: c7 } = render(<MemeScene scene={baseScene({ slide: 7 })} />);
    expect(c7.querySelector('[data-part="handoff-field"]')).toBeNull();
  });

  // Finding 4 (Task 22b, fix round 1): scrubbing now goes through the shared `useProgressRef`
  // (`./ContentScene`) instead of a local ref — this confirms the refactor still wires
  // `tl.progress(progressRef.current)` correctly (no provider wraps this render, so
  // `useSceneProgress()` reads its documented no-measurement default of 1, CONTRACTS §6).
  it('scrubs the built timeline to the current progress via the shared progress ref', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');
    render(<MemeScene scene={baseScene()} />);
    const created = timelineSpy.mock.results[0]!.value as gsap.core.Timeline;
    expect(created.progress()).toBe(1);
  });
});
