import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { Step } from '@/lib/types';
import { StepList } from './StepList';

afterEach(cleanup);

describe('StepList', () => {
  it('renders one <li data-part="step"> per item, with n and text, term omitted when absent', () => {
    const items: Step[] = [
      { n: '01', text: 'Map the risk' },
      { n: '02', text: 'Assign an owner' },
    ];
    const { container } = render(<StepList items={items} />);
    const list = container.querySelector('ol');
    const lis = Array.from(container.querySelectorAll('li'));

    expect(list).not.toBeNull();
    expect(lis.length).toBe(2);
    lis.forEach((li) => expect(li.getAttribute('data-part')).toBe('step'));
    expect(lis[0].textContent).toBe('01Map the risk');
    expect(container.querySelector('strong')).toBeNull();
  });

  it('renders term when present', () => {
    const items: Step[] = [{ n: '01', term: 'Discover', text: 'Find the gap' }];
    const { container } = render(<StepList items={items} />);
    const li = container.querySelector('li');

    expect(li?.textContent).toBe('01DiscoverFind the gap');
    expect(container.querySelector('strong')?.textContent).toBe('Discover');
  });
});
