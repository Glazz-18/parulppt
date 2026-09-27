import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import type { Scene } from '@/lib/types';
import { UI_COPY } from '@/lib/constants';
import { campusBotCopy, ragCopy, socCopy } from '@/lib/demoState';
import { SceneRenderer } from './SceneRenderer';
import { Presentation } from './Presentation';
import { registry } from '@/components/scenes';

// This file's fallback tests must stay true regardless of which scene components the registry
// gains over time (Task 20 added TitleScene/ContentScene; Task 23 adds TimelineScene, etc.), so
// the registry is forced empty here rather than picking a scene kind that happens to be
// unregistered today.
vi.mock('@/components/scenes', () => ({ registry: {} }));

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // Registry is mocked empty above, so every scene hits the fallback and would warn.
  // Silence it here so test output stays pristine; specific tests assert on it directly.
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
  cleanup();
});

const baseScene: Scene = {
  id: 'scene-09',
  slide: 9,
  act: 'act-3',
  theme: 'dark',
  pin: true,
  scrollLength: 3,
  kind: 'editorial',
  eyebrow: 'Eyebrow text',
  title: 'Scene title',
  content: { blocks: [] },
};

describe('Presentation', () => {
  it('renders all 46 manifest scenes as sections, direct children of <main id="presentation">, in slide order', () => {
    const { container } = render(<Presentation />);
    const main = container.querySelector('main#presentation');
    expect(main).not.toBeNull();

    const sections = main ? Array.from(main.querySelectorAll(':scope > section[data-scene]')) : [];
    expect(sections).toHaveLength(46);
    expect(main?.children.length).toBe(46);

    sections.forEach((section, index) => {
      expect(section.getAttribute('data-slide')).toBe(String(index + 1).padStart(2, '0'));
    });
  });

  it('every section has non-empty text through the real registry, incl. the 3 dynamic demos (TRD §16)', async () => {
    // This file's registry mock is empty (see above) so the fallback tests above stay meaningful;
    // for this one test only, temporarily fill that same (shared) mocked object with the real
    // registry — including the next/dynamic-wrapped demos — then empty it again in `finally` so
    // every later test keeps seeing the empty registry it expects.
    const actual = await vi.importActual<typeof import('@/components/scenes')>('@/components/scenes');
    Object.assign(registry, actual.registry);
    // Reduced motion: no scene builds a GSAP timeline (CONTRACTS §11), so every scene's
    // progress-1 static markup renders immediately with no ScrollTrigger/matchMedia setup needed.
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    try {
      const { container } = render(<Presentation />);

      // The 3 demos are next/dynamic (SSR on); waiting on scene.title text would not discriminate
      // a mounted demo from SceneRenderer's fallback, which renders that identical
      // <h2>{scene.title}</h2> when the registry lookup fails — so instead wait, per demo section,
      // for DemoShell-only markup the fallback never renders: its Reset button, plus one
      // demo-interior fixture string from lib/demoState.ts that only the demo's own body renders.
      const campusBotSection = container.querySelector('section[data-scene="scene-04"]') as HTMLElement;
      await within(campusBotSection).findByRole('button', { name: UI_COPY.reset });
      within(campusBotSection).getByText(campusBotCopy.question);

      const ragSection = container.querySelector('section[data-scene="scene-06"]') as HTMLElement;
      await within(ragSection).findByRole('button', { name: UI_COPY.reset });
      within(ragSection).getByText(ragCopy.index);

      const socSection = container.querySelector('section[data-scene="scene-23"]') as HTMLElement;
      await within(socSection).findByRole('button', { name: UI_COPY.reset });
      within(socSection).getByText(socCopy.queue);

      const sections = Array.from(container.querySelectorAll('main#presentation > section[data-scene]'));
      expect(sections).toHaveLength(46);
      sections.forEach((section) => {
        expect(section.textContent?.trim()).not.toBe('');
      });
    } finally {
      Object.keys(registry).forEach((key) => {
        delete (registry as Record<string, unknown>)[key];
      });
      delete (window as { matchMedia?: unknown }).matchMedia;
    }
  });
});

describe('SceneRenderer', () => {
  it('always renders SceneShell, whose section contains .scene-viewport', () => {
    const { container } = render(<SceneRenderer scene={baseScene} />);
    const section = container.querySelector('section[data-scene="scene-09"]');

    expect(section).not.toBeNull();
    expect(section?.querySelector(':scope > .scene-viewport')).not.toBeNull();
  });

  it('falls back to eyebrow/title markup and warns once when no registry component resolves', () => {
    const { container } = render(<SceneRenderer scene={baseScene} />);

    expect(container.querySelector('h2')?.textContent).toBe('Scene title');
    expect(container.querySelector('[data-tone="label"]')?.textContent).toBe('Eyebrow text');
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('omits the eyebrow and title elements when they are empty (no empty headings)', () => {
    const emptyScene: Scene = { ...baseScene, id: 'scene-10', slide: 10, eyebrow: '', title: '' };
    const { container } = render(<SceneRenderer scene={emptyScene} />);

    expect(container.querySelector('h2')).toBeNull();
    expect(container.querySelector('[data-tone="label"]')).toBeNull();
  });

  it('does not warn when NODE_ENV is production', () => {
    vi.stubEnv('NODE_ENV', 'production');

    render(<SceneRenderer scene={baseScene} />);

    expect(warnSpy).not.toHaveBeenCalled();

    vi.unstubAllEnvs();
  });

  it('renders the SOURCE button only when sourceNotes is non-empty; click opens its slide, toggles aria-expanded', () => {
    const withNotes: Scene = { ...baseScene, sourceNotes: ['Slide 9 · citation text'] };

    const { container, rerender } = render(<SceneRenderer scene={withNotes} />);
    const button = container.querySelector('button[aria-controls="source-drawer"]');

    expect(button).not.toBeNull();
    expect(button?.getAttribute('type')).toBe('button');
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    expect(button?.textContent).toBe(UI_COPY.source);

    fireEvent.click(button!);
    expect(button?.getAttribute('aria-expanded')).toBe('true');

    fireEvent.click(button!); // same slide already open: toggles closed
    expect(button?.getAttribute('aria-expanded')).toBe('false');

    rerender(<SceneRenderer scene={baseScene} />);
    expect(container.querySelector('button[aria-controls="source-drawer"]')).toBeNull();
  });
});
