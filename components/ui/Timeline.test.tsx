import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type { Mark } from '@/lib/types';
import { Timeline } from './Timeline';

afterEach(cleanup);

describe('Timeline', () => {
  it('renders marks in order with at and text, each data-part="mark"', () => {
    const items: Mark[] = [
      { at: '09:00', text: 'Alert fires' },
      { at: '09:14', text: 'Analyst correlates' },
      { at: '09:20', text: 'Approved' },
    ];
    const { container } = render(<Timeline items={items} />);
    const lis = Array.from(container.querySelectorAll('li'));

    expect(lis.length).toBe(3);
    lis.forEach((li) => expect(li.getAttribute('data-part')).toBe('mark'));
    expect(lis.map((li) => li.textContent)).toEqual([
      '09:00Alert fires',
      '09:14Analyst correlates',
      '09:20Approved',
    ]);
  });
});
