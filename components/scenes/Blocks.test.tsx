import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { Block } from '@/lib/types';
import { Blocks } from './Blocks';

// This file had no per-test cleanup, so every test's rendered DOM piled up in document.body for
// the rest of the file (harmless while each test used distinct text, but it silently double- or
// triple-counts anything reused across tests, e.g. plain series labels like 'A'/'B' -- Task 32 fix
// round 1 finding). Matches the afterEach(cleanup) every other *.test.tsx in this folder already has.
afterEach(() => {
  cleanup();
});

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

  // Overflow fix: ≥3 metrics stacked vertically overflowed the pinned viewport (slide 27,
  // measured). They now render as a responsive grid instead; ≤2 items are unaffected.
  it('renders a metrics block with 2 items as the original flow layout, not a grid', () => {
    const blocks: Block[] = [{ type: 'metrics', items: [{ value: 'A' }, { value: 'B' }] }];
    const { container } = render(<Blocks blocks={blocks} />);
    const wrapper = container.querySelector('[data-block="metrics"]') as HTMLElement;
    expect(wrapper.className).toContain('flex');
    expect(wrapper.style.gridTemplateColumns).toBe('');
  });

  it('renders a metrics block with 3+ items as a responsive auto-fit grid', () => {
    const blocks: Block[] = [
      { type: 'metrics', items: [{ value: 'A' }, { value: 'B' }, { value: 'C' }] },
    ];
    const { container } = render(<Blocks blocks={blocks} />);
    const wrapper = container.querySelector('[data-block="metrics"]') as HTMLElement;
    expect(wrapper.className).toContain('grid');
    expect(wrapper.style.gridTemplateColumns).toBe('repeat(auto-fit, minmax(240px, 1fr))');
    expect(container.querySelectorAll('[data-part="metric"]')).toHaveLength(3);
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

  // Manager ruling (Task 32 fix round 1): ratios carry every measured bar in deck shape order, so
  // a `ratios` array longer than `series.length` groups into multiple rows of `series.length`.
  it('renders a bars block with multiple rows when ratios carries more than one row', () => {
    const blocks: Block[] = [
      { type: 'bars', series: ['A', 'B'], note: 'a note', ratios: [1, 0.14, 0.86, 0.08] },
    ];
    const { container } = render(<Blocks blocks={blocks} />);
    const bars = container.querySelectorAll('[data-part="bar"]');
    expect(bars).toHaveLength(4);
    const rows = container.querySelectorAll('[data-part="bar-row"]');
    expect(rows).toHaveLength(2);
    const fills = Array.from(container.querySelectorAll('[data-part="fill"]')) as HTMLElement[];
    expect(fills.map((f) => f.style.width)).toEqual(['100%', '14%', '86%', '8%']);
    // Every bar is identifiable by its own series label, not colour alone (both rows repeat A/B).
    expect(screen.getAllByText('A')).toHaveLength(2);
    expect(screen.getAllByText('B')).toHaveLength(2);
  });

  // CONTRACTS A27: bars.groups labels each row of series.length bars with a mono group heading,
  // in order; a row with no corresponding group entry renders no heading.
  it('renders a group heading above each row when bars.groups is present, in order', () => {
    const blocks: Block[] = [
      {
        type: 'bars',
        series: ['A', 'B'],
        ratios: [1, 0.14, 0.86, 0.08],
        groups: ['MTTD', 'MTTR'],
      },
    ];
    const { container } = render(<Blocks blocks={blocks} />);
    const rows = container.querySelectorAll('[data-part="bar-row"]');
    expect(rows).toHaveLength(2);
    const labels = Array.from(container.querySelectorAll('[data-part="label"]')) as HTMLElement[];
    expect(labels.map((l) => l.textContent)).toEqual(['MTTD', 'MTTR']);
    // Each heading lives inside its own row, ahead of that row's bars.
    rows.forEach((row, i) => {
      const label = row.querySelector('[data-part="label"]');
      expect(label?.textContent).toBe(blocks[0]!.type === 'bars' ? blocks[0].groups?.[i] : undefined);
      expect(row.firstElementChild).toBe(label);
    });
  });

  it('renders no group heading when bars.groups is absent (unchanged output)', () => {
    const blocks: Block[] = [{ type: 'bars', series: ['A', 'B'], note: 'a note', ratios: [0.3, 0.9] }];
    const { container } = render(<Blocks blocks={blocks} />);
    expect(container.querySelectorAll('[data-part="label"]')).toHaveLength(0);
  });
});
