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
});
