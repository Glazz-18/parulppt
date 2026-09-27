import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MonoLabel } from './MonoLabel';

afterEach(cleanup);

describe('MonoLabel', () => {
  it('renders as a span with tone "label" by default, text unchanged', () => {
    const { container } = render(<MonoLabel>Mixed Case Text</MonoLabel>);
    const el = container.firstElementChild;

    expect(el?.tagName).toBe('SPAN');
    expect(el?.textContent).toBe('Mixed Case Text');
    expect(el?.getAttribute('data-tone')).toBe('label');
  });

  it('renders the chosen element and tone', () => {
    const { container } = render(
      <MonoLabel as="h2" tone="muted">
        Section Heading
      </MonoLabel>,
    );
    const el = container.firstElementChild;

    expect(el?.tagName).toBe('H2');
    expect(el?.textContent).toBe('Section Heading');
    expect(el?.getAttribute('data-tone')).toBe('muted');
  });

  it('renders "p" as the chosen element', () => {
    const { container } = render(<MonoLabel as="p">Paragraph label</MonoLabel>);
    const el = container.firstElementChild;

    expect(el?.tagName).toBe('P');
  });
});
