import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { BigNumber } from './BigNumber';

afterEach(cleanup);

describe('BigNumber', () => {
  it('renders heading, value, and label as separate data-part runs', () => {
    const { container } = render(<BigNumber heading="Cost per seat" value="$8.80" label="per month" />);
    const parts = Array.from(container.querySelectorAll('[data-part]'));

    expect(parts.map((el) => el.getAttribute('data-part'))).toEqual(['label', 'value', 'label']);
    expect(parts.map((el) => el.textContent)).toEqual(['Cost per seat', '$8.80', 'per month']);
  });

  it('renders versus as three runs: value, label, value ($8.80 / vs / $25)', () => {
    const { container } = render(<BigNumber value="$8.80" versus={['vs', '$25']} />);
    const parts = Array.from(container.querySelectorAll('[data-part]'));

    expect(parts.map((el) => el.getAttribute('data-part'))).toEqual(['value', 'label', 'value']);
    expect(parts.map((el) => el.textContent)).toEqual(['$8.80', 'vs', '$25']);
  });

  it('renders only the value run when label, heading, and versus are absent', () => {
    const { container } = render(<BigNumber value="42" />);
    const parts = Array.from(container.querySelectorAll('[data-part]'));

    expect(parts.length).toBe(1);
    expect(parts[0].getAttribute('data-part')).toBe('value');
    expect(parts[0].textContent).toBe('42');
  });

  // Overflow fix: several deck metrics (CONTRACTS §3.1) are sentence-shaped, not short numerics
  // (e.g. "−$1.93M per breach"), and rendering every value at the hero scale overflowed the
  // pinned viewport (slide 27, measured 1284px in a 796px viewport). Values of >8 chars drop to a
  // compact scale instead; ≤8 chars keep the hero scale.
  it('gives an 8-char (short) value the hero font-size expression', () => {
    const { container } = render(<BigNumber value="12345678" />);
    const valueEl = container.querySelector('[data-part="value"]');
    const p = valueEl?.parentElement as HTMLElement;
    expect(p.style.fontSize).toBe('clamp(64px, 8vw, 140px)');
  });

  it('gives a 14-char (long, sentence-shaped) value the compact font-size expression', () => {
    const { container } = render(<BigNumber value="65 days faster" />);
    const valueEl = container.querySelector('[data-part="value"]');
    const p = valueEl?.parentElement as HTMLElement;
    expect(p.style.fontSize).toBe('clamp(28px, 3.4vw, 52px)');
  });

  // Review fix (round 2 addendum): fontWeight:700 must not leak onto the hero tier (it bolded
  // every short deck value, e.g. slide 24's "$8.80", which was never requested) -- only the
  // compact (long-value) tier gets it.
  it('does not bold the hero-scale (short) value, but does bold the compact (long) value', () => {
    const { container } = render(<BigNumber value="$8.80" />);
    const heroValueEl = container.querySelector('[data-part="value"]');
    const heroP = heroValueEl?.parentElement as HTMLElement;
    expect(heroP.style.fontWeight).toBe('');

    cleanup();

    const { container: container2 } = render(<BigNumber value="65 days faster" />);
    const compactValueEl = container2.querySelector('[data-part="value"]');
    const compactP = compactValueEl?.parentElement as HTMLElement;
    expect(compactP.style.fontWeight).toBe('700');
  });
});
