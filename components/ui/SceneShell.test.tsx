import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { Scene } from '@/lib/types';
import { SceneShell } from './SceneShell';

afterEach(cleanup);

const pinnedScene: Scene = {
  id: 'scene-05',
  slide: 5,
  act: 'act-2',
  theme: 'dark',
  accent: 'orange',
  pin: true,
  scrollLength: 3,
  kind: 'editorial',
  content: { blocks: [] },
};

const unpinnedScene: Scene = {
  id: 'scene-12',
  slide: 12,
  act: 'act-3',
  theme: 'light',
  pin: false,
  scrollLength: 1,
  kind: 'editorial',
  content: { blocks: [] },
};

describe('SceneShell', () => {
  it('renders the §5.1 root attributes for a pinned, accented scene', () => {
    const { container } = render(
      <SceneShell scene={pinnedScene}>
        <p>child content</p>
      </SceneShell>,
    );
    const section = container.querySelector('section');

    expect(section).not.toBeNull();
    expect(section?.getAttribute('id')).toBe('scene-05');
    expect(section?.getAttribute('data-scene')).toBe('scene-05');
    expect(section?.getAttribute('data-slide')).toBe('05');
    expect(section?.getAttribute('data-act')).toBe('act-2');
    expect(section?.getAttribute('data-theme')).toBe('dark');
    expect(section?.getAttribute('data-pin')).toBe('true');
    expect(section?.getAttribute('data-accent')).toBe('orange');
    expect(section?.style.getPropertyValue('--scroll-length')).toBe('3');
    expect(section?.getAttribute('tabindex')).toBe('-1');
  });

  it('renders data-pin="false" and no data-accent for an unpinned, unaccented scene', () => {
    const { container } = render(
      <SceneShell scene={unpinnedScene}>
        <p>child content</p>
      </SceneShell>,
    );
    const section = container.querySelector('section');

    expect(section?.getAttribute('data-pin')).toBe('false');
    expect(section?.hasAttribute('data-accent')).toBe(false);
    expect(section?.getAttribute('data-slide')).toBe('12');
    expect(section?.style.getPropertyValue('--scroll-length')).toBe('1');
  });

  it('renders children inside .scene-viewport, which is the section\'s only child', () => {
    const { container } = render(
      <SceneShell scene={pinnedScene}>
        <p>child content</p>
      </SceneShell>,
    );
    const section = container.querySelector('section');
    const viewport = section?.querySelector(':scope > .scene-viewport');

    expect(viewport).not.toBeNull();
    expect(section?.children.length).toBe(1);
    expect(section?.children[0]).toBe(viewport);
    expect(viewport?.textContent).toBe('child content');
  });
});
