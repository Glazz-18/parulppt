import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { Scene } from '@/lib/types';
import { UI_COPY } from '@/lib/constants';
import { SceneRenderer } from './SceneRenderer';
import { Presentation } from './Presentation';

let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  // baseScene below uses kind 'timeline', which Task 20 (W4) leaves unregistered (only
  // TitleScene and ContentScene are registered so far), so every scene here still hits the
  // fallback and would warn. Silence it here so test output stays pristine; specific tests
  // assert on it directly.
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
  kind: 'timeline',
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
