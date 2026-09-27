import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import gsap from 'gsap';
import { TitleScene } from './TitleScene';
import type { Scene } from '@/lib/types';

const scene1: Scene = {
  id: 'scene-01',
  slide: 1,
  act: 'act-0',
  theme: 'dark',
  pin: false,
  scrollLength: 1,
  kind: 'title',
  eyebrow: 'AI × CYBERSECURITY × ENTREPRENEURSHIP',
  content: {
    words: ['BUILD.', 'BREAK.', 'SECURE.', 'SCALE.'],
    speaker: 'Atharv Tiwari',
    role: 'COO, Nevis Infosystems · Cybersecurity Researcher and Trainer',
  },
};

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

describe('TitleScene', () => {
  it('renders exactly one h1 containing the four words as separate elements', () => {
    const { container } = render(<TitleScene scene={scene1} />);
    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    const words = h1s[0].querySelectorAll('[data-word]');
    expect(words).toHaveLength(4);
    expect(words[0].textContent).toBe('BUILD.');
    expect(words[1].textContent).toBe('BREAK.');
    expect(words[2].textContent).toBe('SECURE.');
    expect(words[3].textContent).toBe('SCALE.');
  });

  it('colours BREAK. orange and SECURE. green, others fg', () => {
    const { container } = render(<TitleScene scene={scene1} />);
    const words = container.querySelectorAll('h1 [data-word]');
    expect((words[1] as HTMLElement).style.color).toBe('var(--orange)');
    expect((words[2] as HTMLElement).style.color).toBe('var(--green)');
    expect((words[0] as HTMLElement).style.color).toBe('var(--fg)');
    expect((words[3] as HTMLElement).style.color).toBe('var(--fg)');
  });

  it('renders six lines total: four words + speaker + role, plus the tagline eyebrow', () => {
    const { container } = render(<TitleScene scene={scene1} />);
    expect(container.textContent).toContain('AI × CYBERSECURITY × ENTREPRENEURSHIP');
    expect(container.textContent).toContain('Atharv Tiwari');
    expect(container.textContent).toContain('COO, Nevis Infosystems · Cybersecurity Researcher and Trainer');
  });

  // Finding 7 (Task 22b): the words were adjacent spans with no space text node between them, so
  // reading the h1's full text ran the words together (e.g. for a screen reader or a copy/paste).
  it('reads the four words with spaces between them (not run together)', () => {
    const { container } = render(<TitleScene scene={scene1} />);
    const h1 = container.querySelector('h1')!;
    expect(h1.textContent).toBe('BUILD. BREAK. SECURE. SCALE.');
  });

  it('renders a scoped <style> failsafe under no-preference, targeting scene 1 words', () => {
    render(<TitleScene scene={scene1} />);
    // React 19 hoists <style href/precedence> into <head>; assert it exists in the document
    // and references this scene's id for scoping.
    const styles = Array.from(document.querySelectorAll('style'));
    const match = styles.find((s) => s.textContent?.includes(scene1.id));
    expect(match).toBeTruthy();
    expect(match?.textContent).toContain('prefers-reduced-motion: no-preference');
  });

  // Finding 2 (Task 22b): the words must start at opacity 0 in CSS itself (scoped to the
  // no-preference query), not just via the GSAP effect after mount, so there is no
  // server-paint-then-hide flash.
  it('the no-preference style rule starts the words at opacity 0 (failsafe still present)', () => {
    render(<TitleScene scene={scene1} />);
    const styles = Array.from(document.querySelectorAll('style'));
    const match = styles.find((s) => s.textContent?.includes(scene1.id));
    const noPreferenceBlock = match?.textContent?.match(
      /prefers-reduced-motion: no-preference\)\s*{([\s\S]*)}\s*$/,
    )?.[1];
    expect(noPreferenceBlock).toBeTruthy();
    expect(noPreferenceBlock).toContain('opacity: 0');
    expect(noPreferenceBlock).toContain('animation:');
  });

  // Finding 2 (Task 22b): the opacity:0 rule lives only inside the no-preference media query, so
  // under reduced motion the words are never hidden — no timeline runs and no CSS rule applies.
  it('under reduced motion, the words are not hidden (no inline opacity 0)', () => {
    reduced = true;
    const { container } = render(<TitleScene scene={scene1} />);
    const words = Array.from(container.querySelectorAll('[data-word]')) as HTMLElement[];
    expect(words).toHaveLength(4);
    words.forEach((word) => expect(word.style.opacity).not.toBe('0'));
  });

  it('builds a GSAP timeline only under no-preference, never under reduce', () => {
    const timelineSpy = vi.spyOn(gsap, 'timeline');

    reduced = true;
    const { unmount } = render(<TitleScene scene={scene1} />);
    expect(timelineSpy).not.toHaveBeenCalled();
    unmount();

    reduced = false;
    render(<TitleScene scene={scene1} />);
    expect(timelineSpy).toHaveBeenCalledTimes(1);
  });
});
