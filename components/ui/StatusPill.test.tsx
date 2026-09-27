import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { StatusPill } from './StatusPill';

afterEach(cleanup);

describe('StatusPill', () => {
  it.each([
    ['neutral', 'Queued'],
    ['safe', 'Approved'],
    ['alert', 'Rejected'],
  ] as const)('renders an svg icon and label text for tone=%s, with data-tone set', (tone, label) => {
    const { container } = render(<StatusPill label={label} tone={tone} />);
    const root = container.firstElementChild;
    const svg = container.querySelector('svg');

    expect(root?.getAttribute('data-tone')).toBe(tone);
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.getAttribute('focusable')).toBe('false');
    expect(container.textContent).toBe(label);
  });

  it('renders a visually distinct icon shape per tone', () => {
    const neutral = render(<StatusPill label="Queue" tone="neutral" />);
    const safe = render(<StatusPill label="Approved" tone="safe" />);
    const alert = render(<StatusPill label="Rejected" tone="alert" />);

    const neutralSvg = neutral.container.querySelector('svg')?.innerHTML;
    const safeSvg = safe.container.querySelector('svg')?.innerHTML;
    const alertSvg = alert.container.querySelector('svg')?.innerHTML;

    expect(neutralSvg).not.toBe(safeSvg);
    expect(safeSvg).not.toBe(alertSvg);
    expect(neutralSvg).not.toBe(alertSvg);

    neutral.unmount();
    safe.unmount();
    alert.unmount();
  });
});
