import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { Scene } from '@/lib/types';
import { SceneShell } from './SceneShell';

const globalsCss = readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8');

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

  it('gives .scene-viewport the I1 padding floor so the fixed HUD never overlaps content', () => {
    const { container } = render(
      <SceneShell scene={pinnedScene}>
        <p>child content</p>
      </SceneShell>,
    );
    const viewport = container.querySelector('.scene-viewport') as HTMLElement;

    expect(viewport.style.paddingInline).toBe('calc(var(--rail-w) + 5vw) 5vw');
    expect(viewport.style.paddingBlock).toBe('max(7vh, 72px)');
  });

  it('makes an unpinned .scene-viewport a full-height flex column so flex-1 scene roots fill it (I2)', () => {
    expect(globalsCss).toMatch(
      /\[data-pin="false"\]\s*\.scene-viewport\s*\{[^}]*min-height:\s*100vh;?[^}]*\}/,
    );
    expect(globalsCss).toMatch(
      /\[data-pin="false"\]\s*\.scene-viewport\s*\{[^}]*display:\s*flex;?[^}]*\}/,
    );
    expect(globalsCss).toMatch(
      /\[data-pin="false"\]\s*\.scene-viewport\s*\{[^}]*flex-direction:\s*column;?[^}]*\}/,
    );
  });

  it('keeps the pinned .scene-viewport sticky and full height (I2 regression guard)', () => {
    expect(globalsCss).toMatch(
      /\[data-pin="true"\]\s*\.scene-viewport\s*\{[^}]*position:\s*sticky;?[^}]*\}/,
    );
    expect(globalsCss).toMatch(
      /\[data-pin="true"\]\s*\.scene-viewport\s*\{[^}]*height:\s*100vh;?[^}]*\}/,
    );
  });

  it('unpins scenes on viewports shorter than 720px (§18 floor fallback)', () => {
    const maxHeightBlockMatch = globalsCss.match(
      /@media \(max-height:\s*719px\)\s*\{([\s\S]*?)\n\}/,
    );

    expect(maxHeightBlockMatch).not.toBeNull();

    const block = maxHeightBlockMatch?.[1] ?? '';

    expect(block).toMatch(
      /section\[data-scene\]\s*\.scene-viewport\s*\{[^}]*position:\s*static;?[^}]*\}/,
    );
    expect(block).toMatch(
      /section\[data-scene\]\s*\.scene-viewport\s*\{[^}]*height:\s*auto;?[^}]*\}/,
    );
    expect(block).toMatch(
      /section\[data-scene\]\s*\.scene-viewport\s*\{[^}]*min-height:\s*100vh;?[^}]*\}/,
    );
  });
});
