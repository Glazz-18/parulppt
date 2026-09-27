import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import type { Scene } from '@/lib/types';
import { UI_COPY, LINKEDIN_HREF } from '@/lib/constants';

const track = vi.fn();
vi.mock('@/lib/analytics', () => ({
  track: (...args: unknown[]) => track(...args),
}));

const goToSceneMock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/sceneNavigation', async () => {
  const actual = await vi.importActual<typeof import('@/lib/sceneNavigation')>('@/lib/sceneNavigation');
  return { ...actual, goToScene: goToSceneMock };
});

import { FinalScene } from './FinalScene';

afterEach(() => {
  cleanup();
  track.mockClear();
  goToSceneMock.mockClear();
});

type CtaScene = Extract<Scene, { kind: 'cta' }>;

function makeScene(): CtaScene {
  return {
    id: 'scene-46',
    slide: 46,
    act: 'act-8',
    theme: 'dark',
    pin: false,
    scrollLength: 1,
    kind: 'cta',
    content: {
      lines: ['Build something.', 'Break something.', 'Secure something.', 'Scale something.'],
      closing: 'And find the people who will build it with you.',
      speaker: 'Atharv Tiwari',
      role: 'COO, Nevis Infosystems · Cybersecurity Researcher and Trainer',
      linkedin: 'linkedin.com/in/atharvtiwari',
    },
  };
}

describe('FinalScene', () => {
  it('renders the four lines in order inside one h2, and no eyebrow element', () => {
    const { container } = render(<FinalScene scene={makeScene()} />);
    const h2 = container.querySelector('h2');
    expect(h2).toBeTruthy();
    expect(h2?.textContent).toBe('Build something.Break something.Secure something.Scale something.');
    expect(Array.from(h2?.children ?? []).map((el) => el.textContent)).toEqual([
      'Build something.',
      'Break something.',
      'Secure something.',
      'Scale something.',
    ]);
    expect(container.querySelector('[data-eyebrow]')).toBeNull();
  });

  it('renders closing, speaker and role', () => {
    const { container } = render(<FinalScene scene={makeScene()} />);
    expect(container.textContent).toContain('And find the people who will build it with you.');
    expect(container.textContent).toContain('Atharv Tiwari');
    expect(container.textContent).toContain('COO, Nevis Infosystems · Cybersecurity Researcher and Trainer');
  });

  it('the LinkedIn link has the right href/target/rel/text and tracks cta_click on click', () => {
    const { getByText } = render(<FinalScene scene={makeScene()} />);
    const link = getByText('linkedin.com/in/atharvtiwari') as HTMLAnchorElement;
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe(LINKEDIN_HREF);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');

    fireEvent.click(link);
    expect(track).toHaveBeenCalledWith('cta_click', { target: 'linkedin' });
  });

  it('the challenge button navigates to scene 44 and tracks cta_click', () => {
    const { getByText } = render(<FinalScene scene={makeScene()} />);
    const button = getByText(UI_COPY.challengeCta) as HTMLButtonElement;
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');

    fireEvent.click(button);
    expect(track).toHaveBeenCalledWith('cta_click', { target: 'scene-44' });
    expect(goToSceneMock).toHaveBeenCalledWith(44);
  });

  it('under reduced motion, all text still renders (no timeline)', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
    const { container } = render(<FinalScene scene={makeScene()} />);
    expect(container.querySelector('h2')?.textContent).toBe(
      'Build something.Break something.Secure something.Scale something.',
    );
    expect(container.textContent).toContain('And find the people who will build it with you.');
    expect(container.textContent).toContain(UI_COPY.challengeCta);
  });
});
