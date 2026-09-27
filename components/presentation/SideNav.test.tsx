import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { ACTS } from '@/lib/constants';
import { setCurrentScene } from '@/lib/sceneNavigation';
import { SideNav, sceneAriaLabel } from './SideNav';

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

describe('sceneAriaLabel', () => {
  it('builds "Go to scene NN" without a title', () => {
    expect(sceneAriaLabel(1)).toBe('Go to scene 01');
    expect(sceneAriaLabel(9, '')).toBe('Go to scene 09');
  });

  it('builds "Go to scene NN: <title>" with a title', () => {
    expect(sceneAriaLabel(9, 'Guardrails')).toBe('Go to scene 09: Guardrails');
  });
});

describe('SideNav', () => {
  it('has the Scenes nav landmark', () => {
    const { container } = render(<SideNav />);
    const nav = container.querySelector('nav');
    expect(nav?.getAttribute('aria-label')).toBe('Scenes');
  });

  it('renders 46 scene links with the correct #scene-NN hrefs, in slide order', () => {
    const { container } = render(<SideNav />);
    const links = container.querySelectorAll('nav a[href^="#scene-"]');
    expect(links).toHaveLength(46);
    links.forEach((link, i) => {
      const nn = String(i + 1).padStart(2, '0');
      expect(link.getAttribute('href')).toBe(`#scene-${nn}`);
    });
  });

  it('gives every link (empty manifest titles) the accessible name "Go to scene NN"', () => {
    const { container } = render(<SideNav />);
    const first = container.querySelector('a[href="#scene-01"]');
    const last = container.querySelector('a[href="#scene-46"]');
    expect(first?.getAttribute('aria-label')).toBe('Go to scene 01');
    expect(last?.getAttribute('aria-label')).toBe('Go to scene 46');
  });

  it('marks exactly one link aria-current="step", and it moves when the current scene changes', () => {
    const { container } = render(<SideNav />);

    let current = container.querySelectorAll('a[aria-current="step"]');
    expect(current).toHaveLength(1);
    expect(current[0].getAttribute('href')).toBe('#scene-01');

    act(() => setCurrentScene(5));

    current = container.querySelectorAll('a[aria-current="step"]');
    expect(current).toHaveLength(1);
    expect(current[0].getAttribute('href')).toBe('#scene-05');

    const others = container.querySelectorAll('nav a:not([aria-current])');
    expect(others).toHaveLength(45);
  });

  it('renders exactly 8 act headings with the exact "Act N — label" text from ACTS', () => {
    const { container } = render(<SideNav />);
    const headings = ACTS.map((a) => container.querySelector(`#${a.id}-heading`));
    headings.forEach((heading, i) => {
      expect(heading).not.toBeNull();
      expect(heading?.textContent).toBe(`Act ${ACTS[i].n} — ${ACTS[i].label}`);
    });
  });

  it('sets data-current="true" on the current act heading only', () => {
    const { container } = render(<SideNav />);
    act(() => setCurrentScene(9)); // act-3: from 9 to 15

    const trueHeadings = container.querySelectorAll('[data-current="true"]');
    expect(trueHeadings).toHaveLength(1);
    expect(trueHeadings[0].id).toBe('act-3-heading');

    const falseHeadings = container.querySelectorAll('[data-current="false"]');
    expect(falseHeadings).toHaveLength(ACTS.length - 1);
  });

  it('has no act heading marked current while on scene 1 (above Act 1)', () => {
    const { container } = render(<SideNav />);
    expect(container.querySelectorAll('[data-current="true"]')).toHaveLength(0);
  });

  it('calls goToScene(n) and prevents default when a link is clicked', () => {
    const { container } = render(<SideNav />);
    const link = container.querySelector('a[href="#scene-10"]') as HTMLAnchorElement;
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(event);

    expect(goToSceneMock).toHaveBeenCalledWith(10);
    expect(event.defaultPrevented).toBe(true);
  });
});
