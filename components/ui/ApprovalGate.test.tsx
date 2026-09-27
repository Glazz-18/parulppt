import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { UI_COPY } from '@/lib/constants';
import { ApprovalGate } from './ApprovalGate';

afterEach(cleanup);

describe('ApprovalGate click mode', () => {
  it('renders heading as h3, proposal, and two enabled buttons (approve first, reject second)', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const { container } = render(
      <ApprovalGate
        mode="click"
        heading="Escalate to SOC"
        proposal="Isolate host and revoke token"
        approveLabel="Approve"
        rejectLabel="Reject"
        outcome="pending"
        onApprove={onApprove}
        onReject={onReject}
      />
    );
    const h3 = container.querySelector('h3');
    const buttons = Array.from(container.querySelectorAll('button'));

    expect(h3?.textContent).toBe('Escalate to SOC');
    expect(container.textContent).toContain('Isolate host and revoke token');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toBe('Approve');
    expect(buttons[1].textContent).toBe('Reject');
    buttons.forEach((btn) => expect(btn.getAttribute('type')).toBe('button'));
    buttons.forEach((btn) => expect(btn.disabled).toBe(false));
  });

  it('calls onApprove / onReject exactly once per click', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const { container } = render(
      <ApprovalGate
        mode="click"
        heading="Escalate"
        proposal="Do it"
        approveLabel="Approve"
        rejectLabel="Reject"
        outcome="pending"
        onApprove={onApprove}
        onReject={onReject}
      />
    );
    const buttons = Array.from(container.querySelectorAll('button'));

    fireEvent.click(buttons[0]);
    expect(onApprove).toHaveBeenCalledTimes(1);
    expect(onReject).not.toHaveBeenCalled();

    fireEvent.click(buttons[1]);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('shows neither outcome text when pending, and sets data-outcome="pending"', () => {
    const { container } = render(
      <ApprovalGate
        mode="click"
        heading="Escalate"
        proposal="Do it"
        approveLabel="Approve"
        rejectLabel="Reject"
        outcome="pending"
        onApprove={() => {}}
        onReject={() => {}}
      />
    );

    expect(container.textContent).not.toContain(UI_COPY.soc.approved);
    expect(container.textContent).not.toContain(UI_COPY.soc.rejected);
    expect(container.firstElementChild?.getAttribute('data-outcome')).toBe('pending');
  });

  it('shows Approved with an svg icon when outcome is approved, buttons stay rendered and enabled', () => {
    const { container } = render(
      <ApprovalGate
        mode="click"
        heading="Escalate"
        proposal="Do it"
        approveLabel="Approve"
        rejectLabel="Reject"
        outcome="approved"
        onApprove={() => {}}
        onReject={() => {}}
      />
    );

    expect(container.textContent).toContain(UI_COPY.soc.approved);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.firstElementChild?.getAttribute('data-outcome')).toBe('approved');
    const buttons = Array.from(container.querySelectorAll('button'));
    expect(buttons.length).toBe(2);
    buttons.forEach((btn) => expect(btn.disabled).toBe(false));
  });

  it('shows Rejected with an svg icon when outcome is rejected', () => {
    const { container } = render(
      <ApprovalGate
        mode="click"
        heading="Escalate"
        proposal="Do it"
        approveLabel="Approve"
        rejectLabel="Reject"
        outcome="rejected"
        onApprove={() => {}}
        onReject={() => {}}
      />
    );

    expect(container.textContent).toContain(UI_COPY.soc.rejected);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.firstElementChild?.getAttribute('data-outcome')).toBe('rejected');
  });
});

describe('ApprovalGate scroll mode', () => {
  it('renders heading as h3 with no other words, and data-lit="false" below progress 1', () => {
    const { container } = render(<ApprovalGate mode="scroll" heading="SOC lit" progress={0.99} />);
    const root = container.firstElementChild;
    const h3 = container.querySelector('h3');

    expect(h3?.textContent).toBe('SOC lit');
    expect(root?.getAttribute('data-lit')).toBe('false');
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('sets data-lit="true" when progress reaches 1', () => {
    const { container } = render(<ApprovalGate mode="scroll" heading="SOC lit" progress={1} />);
    const root = container.firstElementChild;

    expect(root?.getAttribute('data-lit')).toBe('true');
  });

  it('renders a visually distinct icon shape lit vs unlit', () => {
    const unlit = render(<ApprovalGate mode="scroll" heading="SOC lit" progress={0} />);
    const lit = render(<ApprovalGate mode="scroll" heading="SOC lit" progress={1} />);

    const unlitSvg = unlit.container.querySelector('svg')?.innerHTML;
    const litSvg = lit.container.querySelector('svg')?.innerHTML;

    expect(unlitSvg).not.toBe(litSvg);
    unlit.unmount();
    lit.unmount();
  });
});
