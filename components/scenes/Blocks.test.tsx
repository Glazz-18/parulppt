import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Block } from '@/lib/types';
import { Blocks } from './Blocks';

describe('Blocks', () => {
  it('renders a lines block with each line as a separate part', () => {
    const blocks: Block[] = [{ type: 'lines', lines: ['First line.', 'Second line.'] }];
    render(<Blocks blocks={blocks} />);
    const parts = screen.getAllByText(/First line\.|Second line\./);
    expect(parts).toHaveLength(2);
  });

  it('renders a steps block via StepList (n, term, text)', () => {
    const blocks: Block[] = [
      { type: 'steps', items: [{ n: '01', text: 'Who used AI today?' }, { n: '02', term: 'Term', text: 'Second' }] },
    ];
    const { container } = render(<Blocks blocks={blocks} />);
    const items = container.querySelectorAll('[data-part="step"]');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('01');
    expect(items[0].textContent).toContain('Who used AI today?');
    expect(items[1].textContent).toContain('Term');
  });

  it('renders a terms block with letter, term, text, note', () => {
    const blocks: Block[] = [
      {
        type: 'terms',
        items: [
          { letter: 'O', term: 'Orange', text: 'The colour.', note: 'A note.' },
          { term: 'Green', text: 'Another colour.' },
        ],
      },
    ];
    const { container } = render(<Blocks blocks={blocks} />);
    const items = container.querySelectorAll('[data-part="term"]');
    expect(items).toHaveLength(2);
    expect(container.querySelector('[data-part="letter"]')?.textContent).toBe('O');
    expect(items[0].textContent).toContain('Orange');
    expect(items[0].textContent).toContain('The colour.');
    expect(items[0].textContent).toContain('A note.');
    expect(items[1].textContent).not.toContain('undefined');
  });

  it('renders a layers block with term, text, aside, footer, marker', () => {
    const blocks: Block[] = [
      {
        type: 'layers',
        items: [{ term: 'App', text: 'Application layer', aside: 'aside text' }, { text: 'No term layer' }],
        footer: 'Every layer logged',
        marker: '1',
      },
    ];
    const { container } = render(<Blocks blocks={blocks} />);
    const items = container.querySelectorAll('[data-part="layer"]');
    expect(items).toHaveLength(2);
    expect(container.querySelector('[data-part="footer"]')?.textContent).toBe('Every layer logged');
    expect(container.querySelector('[data-part="marker"]')?.textContent).toBe('1');
  });

  it('renders a marks block via Timeline', () => {
    const blocks: Block[] = [{ type: 'marks', items: [{ at: 'T+0', text: 'Event one' }] }];
    const { container } = render(<Blocks blocks={blocks} />);
    expect(container.querySelectorAll('[data-part="mark"]')).toHaveLength(1);
  });

  it('renders a metrics block via BigNumber, including versus split', () => {
    const blocks: Block[] = [
      { type: 'metrics', items: [{ value: '$8.80', label: 'cost', heading: 'Heading', versus: ['vs', '$25'] }] },
    ];
    const { container } = render(<Blocks blocks={blocks} />);
    expect(container.querySelectorAll('[data-part="value"]')).toHaveLength(2); // value + versus[1]
    expect(screen.getByText('Heading')).toBeTruthy();
    expect(screen.getByText('vs')).toBeTruthy();
  });

  it('renders flow connectors → + = ↺ as distinct, non-hidden connector elements, others as nodes', () => {
    const blocks: Block[] = [
      { type: 'flow', label: 'Agent · loops until done', items: ['Plan', '→', 'Act', '↺'], marker: 'You are here' },
    ];
    const { container } = render(<Blocks blocks={blocks} />);
    const connectors = container.querySelectorAll('[data-part="connector"]');
    const nodes = container.querySelectorAll('[data-part="node"]');
    expect(connectors).toHaveLength(2);
    expect(nodes).toHaveLength(2);
    connectors.forEach((el) => expect(el.getAttribute('aria-hidden')).not.toBe('true'));
    expect(screen.getByText('You are here')).toBeTruthy();
  });

  it('renders lethal-trifecta style flow with + and = connectors', () => {
    const blocks: Block[] = [
      {
        type: 'flow',
        items: ['Private data', '+', 'Untrusted content', '+', 'A way to send data out', '=', 'Exploitable'],
      },
    ];
    const { container } = render(<Blocks blocks={blocks} />);
    expect(container.querySelectorAll('[data-part="connector"]')).toHaveLength(3);
    expect(container.querySelectorAll('[data-part="node"]')).toHaveLength(4);
  });

  it('renders a columns block with heading and lines', () => {
    const blocks: Block[] = [
      { type: 'columns', items: [{ heading: 'Col A', lines: ['a1', 'a2'] }, { heading: 'Col B', lines: ['b1'] }] },
    ];
    const { container } = render(<Blocks blocks={blocks} />);
    expect(container.querySelectorAll('[data-part="column"]')).toHaveLength(2);
    expect(screen.getByText('Col A')).toBeTruthy();
    expect(screen.getByText('a1')).toBeTruthy();
  });

  it('renders a bars block sensibly with ratios present', () => {
    const blocks: Block[] = [{ type: 'bars', series: ['A', 'B'], note: 'a note', ratios: [0.3, 0.9] }];
    const { container } = render(<Blocks blocks={blocks} />);
    const bars = container.querySelectorAll('[data-part="bar"]');
    expect(bars).toHaveLength(2);
    const fills = container.querySelectorAll('[data-part="fill"]');
    expect((fills[0] as HTMLElement).style.width).toBe('30%');
    expect((fills[1] as HTMLElement).style.width).toBe('90%');
    expect(screen.getByText('a note')).toBeTruthy();
  });

  it('renders a bars block sensibly with ratios undefined (no crash, no NaN)', () => {
    const blocks: Block[] = [{ type: 'bars', series: ['A', 'B'] }];
    const { container } = render(<Blocks blocks={blocks} />);
    const fills = container.querySelectorAll('[data-part="fill"]');
    fills.forEach((fill) => {
      expect((fill as HTMLElement).style.width).not.toContain('NaN');
      expect((fill as HTMLElement).style.width).not.toBe('');
    });
  });
});
