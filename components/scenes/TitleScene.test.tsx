import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import gsap from 'gsap';
import { __resetBootForTests, TitleScene } from './TitleScene';
import { UI_COPY } from '@/lib/constants';
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
  // The "once per page load" boot guard is module-level state (by design); reset it so every
  // test starts from a pristine "never booted" instance regardless of execution order.
  __resetBootForTests();
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

  // --- Task 40: boot sequence -------------------------------------------------------------

  describe('boot sequence (A19/A20)', () => {
    it('under reduced motion, the boot block is hidden by the scoped CSS rule, not by omitting it from markup', () => {
      reduced = true;
      const { container } = render(<TitleScene scene={scene1} />);
      const boot = container.querySelector('[data-boot]');
      expect(boot).toBeTruthy();
      expect(boot?.getAttribute('aria-hidden')).toBe('true');
      // Hydration safety (CONTRACTS §11): the block is always in the markup; only a CSS rule
      // (never a matchMedia/window read during render) hides it under reduce.
      const styles = Array.from(document.querySelectorAll('style'));
      const match = styles.find((s) => s.textContent?.includes(scene1.id));
      expect(match?.textContent).toContain('prefers-reduced-motion: reduce');
      const reduceBlock = match?.textContent?.match(
        /prefers-reduced-motion: reduce\)\s*{([\s\S]*?)}\s*}/,
      )?.[1];
      expect(reduceBlock).toContain('[data-boot]');
      expect(reduceBlock).toContain('display: none');
      // all six title lines (four words + speaker + role) stay visible under reduce
      expect(container.querySelectorAll('[data-word]')).toHaveLength(4);
      expect(container.textContent).toContain(scene1.content.speaker);
      expect(container.textContent).toContain(scene1.content.role);
    });

    it('under no-preference, the boot heading is rendered before the h1 in DOM order, and the words exist', () => {
      const { container } = render(<TitleScene scene={scene1} />);
      const boot = container.querySelector('[data-boot]');
      const h1 = container.querySelector('h1');
      expect(boot).toBeTruthy();
      expect(boot?.textContent).toContain(UI_COPY.boot.heading);
      expect(
        boot!.compareDocumentPosition(h1!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(container.querySelectorAll('[data-word]')).toHaveLength(4);
    });

    it('sets animation: none inline on the words and the boot block the instant the intro starts (defuses both 3s CSS failsafes)', () => {
      const { container } = render(<TitleScene scene={scene1} />);
      const words = Array.from(container.querySelectorAll('[data-word]')) as HTMLElement[];
      words.forEach((word) => expect(word.style.animation).toBe('none'));
      const boot = container.querySelector('[data-boot]') as HTMLElement;
      expect(boot.style.animation).toBe('none');
    });

    // Review finding (Important): if GSAP setup throws before ever cancelling the inline
    // `animation: none` above, the boot overlay would otherwise stay visible forever, permanently
    // overlapping the eyebrow/h1/speaker/role — contradicting CONTRACTS §11's "if GSAP setup
    // throws, the scene keeps its static markup". A CSS-only failsafe (scoped to no-preference,
    // same technique as the words-in failsafe) hides it after 3s in that case.
    it('has a CSS-only failsafe that hides the boot block after 3s if GSAP never runs', () => {
      render(<TitleScene scene={scene1} />);
      const styles = Array.from(document.querySelectorAll('style'));
      const match = styles.find((s) => s.textContent?.includes(scene1.id));
      const noPreferenceBlock = match?.textContent?.match(
        /prefers-reduced-motion: no-preference\)\s*{([\s\S]*)}\s*$/,
      )?.[1];
      expect(noPreferenceBlock).toBeTruthy();
      expect(noPreferenceBlock).toContain('[data-boot]');
      expect(noPreferenceBlock).toMatch(/animation:\s*scene-01-boot-out/);
      expect(noPreferenceBlock).toContain('visibility: hidden');
    });

    // Minor 1 (re-raised Task 40): previously the CSS failsafe was cancelled (`animation: none`)
    // before the timeline was built, so a throw partway through setup left the words permanently
    // hidden with no failsafe left to show them. It's now cancelled only after the last tl.* call,
    // inside a try/catch that bails without touching the CSS the instant gsap.timeline() (or any
    // tween built from it) throws.
    it('leaves both CSS failsafes armed if gsap.timeline throws during setup (Minor 1)', () => {
      const timelineSpy = vi.spyOn(gsap, 'timeline').mockImplementation(() => {
        throw new Error('setup boom');
      });

      const { container } = render(<TitleScene scene={scene1} />);

      const words = Array.from(container.querySelectorAll('[data-word]')) as HTMLElement[];
      words.forEach((word) => expect(word.style.animation).not.toBe('none'));
      const boot = container.querySelector('[data-boot]') as HTMLElement;
      expect(boot.style.animation).not.toBe('none');
      // The static markup itself is unaffected: the h1 words are still in the DOM (their CSS
      // opacity: 0 only ever applies under no-preference and is what the 3s keyframe failsafe,
      // still armed, will resolve).
      expect(words).toHaveLength(4);

      timelineSpy.mockRestore();
    });

    it('a keydown ends the intro immediately: words go opaque, boot hides, and listeners are removed', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const removeSpy = vi.spyOn(window, 'removeEventListener');
      const { container } = render(<TitleScene scene={scene1} />);

      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown'));
      });

      const words = Array.from(container.querySelectorAll('[data-word]')) as HTMLElement[];
      words.forEach((word) => expect(word.style.opacity).toBe('1'));
      const boot = container.querySelector('[data-boot]') as HTMLElement;
      expect(boot.style.opacity === '0' || boot.style.display === 'none').toBe(true);

      const addedTypes = addSpy.mock.calls.map((call) => call[0]);
      const removedTypes = removeSpy.mock.calls.map((call) => call[0]);
      ['keydown', 'wheel', 'touchstart', 'pointerdown'].forEach((type) => {
        expect(addedTypes).toContain(type);
        expect(removedTypes).toContain(type);
      });
    });

    it('a wheel event also ends the intro immediately (any input, not just keys)', () => {
      const { container } = render(<TitleScene scene={scene1} />);
      act(() => {
        window.dispatchEvent(new Event('wheel'));
      });
      const words = Array.from(container.querySelectorAll('[data-word]')) as HTMLElement[];
      words.forEach((word) => expect(word.style.opacity).toBe('1'));
    });

    it('never calls preventDefault and never registers non-passive listeners that would block scroll', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      render(<TitleScene scene={scene1} />);
      const wheelCall = addSpy.mock.calls.find((call) => call[0] === 'wheel');
      expect(wheelCall).toBeTruthy();
      const opts = wheelCall?.[2];
      // Either an options object with passive:true, or no options — never { passive: false }.
      if (opts && typeof opts === 'object') {
        expect((opts as AddEventListenerOptions).passive).not.toBe(false);
      }
    });

    it('server-rendered markup is deterministic and matches the client first-paint structure (no window/matchMedia reads during render)', () => {
      const first = renderToString(<TitleScene scene={scene1} />);
      const second = renderToString(<TitleScene scene={scene1} />);
      expect(first).toBe(second);

      expect(first).toContain('aria-hidden="true"');
      expect(first).toContain(UI_COPY.boot.heading);
      // react-dom/server HTML-escapes '>' as '&gt;' in text content.
      UI_COPY.boot.lines.forEach((line) => expect(first).toContain(line.replace('>', '&gt;')));
      expect(first).toContain(UI_COPY.boot.status);
      expect(first).toContain(UI_COPY.boot.ready);

      const { container } = render(<TitleScene scene={scene1} />);
      const boot = container.querySelector('[data-boot]');
      expect(boot?.getAttribute('aria-hidden')).toBe('true');
      expect(boot?.textContent).toContain(UI_COPY.boot.heading);
      UI_COPY.boot.lines.forEach((line) => expect(boot?.textContent).toContain(line));
    });

    // beforeEach's __resetBootForTests() guarantees a pristine "never booted" instance here,
    // regardless of execution order.
    it('keeps the whole intro (boot + words) within budget: timeline ≤2.9s, BUILD. visible by 2.5s', () => {
      const timelineSpy = vi.spyOn(gsap, 'timeline');

      const { container } = render(<TitleScene scene={scene1} />);
      const tl = timelineSpy.mock.results[0]?.value as gsap.core.Timeline;
      expect(tl).toBeTruthy();
      expect(tl.duration()).toBeLessThanOrEqual(2.9);

      const buildWord = container.querySelector('[data-word="0"]') as HTMLElement;
      // Filter to real (non-zero-duration) tweens so this pins the actual BUILD. reveal tween,
      // not the earlier zero-duration `tl.set(words, { opacity: 0, y: 16 }, bootEnd)` call, which
      // also targets the same words array.
      const children = (tl.getChildren(true, true, true) as gsap.core.Tween[]).filter(
        (child) => child.duration() > 0,
      );
      const wordTween = children.find((child) => child.targets().includes(buildWord));
      expect(wordTween).toBeTruthy();
      expect(wordTween!.startTime()).toBeLessThanOrEqual(2.5);
    });

    it('does not replay the boot sequence on a remount within the same module instance', () => {
      const timelineSpy = vi.spyOn(gsap, 'timeline');

      const { unmount } = render(<TitleScene scene={scene1} />);
      const firstTl = timelineSpy.mock.results[0]?.value as gsap.core.Timeline;
      const firstDuration = firstTl.duration();
      unmount();

      render(<TitleScene scene={scene1} />);
      const secondTl = timelineSpy.mock.results[1]?.value as gsap.core.Timeline;
      const secondDuration = secondTl.duration();

      expect(secondDuration).toBeLessThan(firstDuration);
      expect(secondDuration).toBeLessThan(1.2);
    });
  });
});
