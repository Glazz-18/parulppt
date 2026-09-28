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

  it('slide 7 renders the meme 4 image (src /memes/04-rag-authorization.png, alt starting "RAG ≠ authorization")', () => {
    const meme = memes.find((m) => m.id === 4)!;
    const { container } = render(<MemeScene scene={baseScene()} />);
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.getAttribute('src')).toBe('/memes/04-rag-authorization.png');
    expect(img?.getAttribute('src')).toBe(meme.src);
    expect(img?.getAttribute('alt')).toMatch(/^RAG ≠ authorization/);
  });

  it('a meme with no image (memeId 17, src "") renders the fallback and no <img>', () => {
    const meme = memes.find((m) => m.id === 17)!;
    expect(meme.src).toBe('');
    const { container } = render(
      <MemeScene scene={baseScene({ content: { memeId: 17, lines: ['RAG hai bhai.'] } })} />,
    );
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
  it('slide 22 renders the dark hand-off field as its last, in-flow, aria-hidden child (--bg-dark/--text-dark tokens); other meme slides do not', () => {
    const { container: c22 } = render(<MemeScene scene={baseScene({ slide: 22 })} />);
    const root = c22.firstElementChild as HTMLElement;
    const field = c22.querySelector('[data-part="handoff-field"]') as HTMLElement;
    expect(field).toBeTruthy();
    expect(root.lastElementChild).toBe(field);
    expect(field.getAttribute('aria-hidden')).toBe('true');
    expect(field.style.background).toBe('var(--bg-dark)');
    expect(field.style.borderTop).toContain('var(--text-dark)');
    // In-flow (fix round 1, finding 2), not absolutely positioned over the content above it.
    expect(field.style.position).not.toBe('absolute');
    cleanup();

    const { container: c7 } = render(<MemeScene scene={baseScene({ slide: 7 })} />);
    expect(c7.querySelector('[data-part="handoff-field"]')).toBeNull();
  });

  it('slide 22 renders the hand-off field under reduced motion too (it is not GSAP-driven)', () => {
    reduced = true;
    const { container } = render(<MemeScene scene={baseScene({ slide: 22 })} />);
    expect(container.querySelector('[data-part="handoff-field"]')).toBeTruthy();
  });

  // Fix round 2 (finding 1): the 880px cap must live on the interstitial's own root div, never on
  // the outer wrapper -- otherwise the hand-off field's vw-based bleed margins reach only 5vw past
  // an 880px-wide box, not the section's true edge, on any viewport wider than ~1038px.
  it('the outer wrapper applies no max-w- utility to itself; it only targets the interstitial child via a descendant selector', () => {
    const { container } = render(<MemeScene scene={baseScene({ slide: 22 })} />);
    const root = container.firstElementChild as HTMLElement;
    // No class token on the wrapper's OWN className directly applies max-w- to itself (only the
    // `[&>div]:max-w-[880px]` descendant-variant selector below, which targets its child instead,
    // may mention "max-w-").
    const ownClasses = root.className.split(/\s+/);
    expect(ownClasses.some((c) => c.startsWith('max-w-'))).toBe(false);
    expect(root.className).toContain('[&>div]:max-w-[880px]');
  });

  // Fix round 2 (finding 2): only slide 22 (which has the field, a second in-flow sibling) needs
  // `my-auto` on the interstitial to stay vertically centred; every other meme slide is unaffected.
  it('scopes the interstitial’s my-auto centring fix to the hand-off slide only', () => {
    const { container: c22 } = render(<MemeScene scene={baseScene({ slide: 22 })} />);
    expect((c22.firstElementChild as HTMLElement).className).toMatch(/\[&>div\]:my-auto/);
    cleanup();

    const { container: c7 } = render(<MemeScene scene={baseScene({ slide: 7 })} />);
    expect((c7.firstElementChild as HTMLElement).className).not.toMatch(/my-auto/);
  });

  // Overflow fix, round 2 (Fable browser measurement at 1470x740, slide 33): a flat punchline
  // scale overflowed a 796px viewport once a headline ran to a full sentence (slide 33: 66 chars,
  // measured h2 alone 691px tall at the pre-fix clamp). The headline scale is length-aware in
  // three tiers by `lines[0]` character count: <=24 keeps the hero punchline scale, 25-48 drops to
  // a mid scale, and >48 drops further and caps line length (max-width: 60ch) so a long sentence
  // wraps as a readable paragraph instead of one very wide line.
  it('gives a short headline (<=24 chars) the hero punchline scale', () => {
    const { container } = render(
      // 23 chars.
      <MemeScene scene={baseScene({ content: { memeId: 25, lines: ['“Who has this problem?”'] } })} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('[&_h2]:text-[clamp(48px,7vw,104px)]');
  });

  it('gives a mid-length headline (25-48 chars) the compact mid scale', () => {
    const { container } = render(
      // 42 chars.
      <MemeScene scene={baseScene({ content: { memeId: 3, lines: ['Bhai intern ko CEO ki permissions kyun di?'] } })} />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('[&_h2]:text-[clamp(36px,4vw,64px)]');
  });

  it('gives a long, sentence-shaped headline (>48 chars) the smallest scale with a 60ch cap', () => {
    const { container } = render(
      // 66 chars -- slide 33's own headline.
      <MemeScene
        scene={baseScene({
          content: {
            memeId: 6,
            lines: ['Customer: Please complete our 187-question security questionnaire.', 'Founder: …'],
          },
        })}
      />,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toContain('[&_h2]:text-[clamp(24px,2.4vw,36px)]');
    expect(root.className).toContain('[&_h2]:max-w-[60ch]');
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
