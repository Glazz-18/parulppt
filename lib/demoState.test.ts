import { describe, it, expect } from 'vitest';
import {
  campusBotReducer,
  campusBotInitial,
  campusBot,
  campusBotCopy,
  ragReducer,
  ragInitial,
  ragDocs,
  ragCopy,
  ragRanking,
  socReducer,
  socInitial,
  linkedEvents,
  socCopy,
  SOC_TOTAL,
  SOC_UNRELATED,
  SOC_NOISE_ROWS,
  SOC_PROPOSE_DELAY_MS,
} from './demoState';
import slides from '@/source/slides.json';

describe('demoState: CampusBot reducer', () => {
  it('transitions: baseline ROLEPLAY → roleplay', () => {
    const next = campusBotReducer('baseline', 'ROLEPLAY');
    expect(next).toBe('roleplay');
  });

  it('transitions: roleplay GUARDRAIL_OFF → guardrail-off', () => {
    const next = campusBotReducer('roleplay', 'GUARDRAIL_OFF');
    expect(next).toBe('guardrail-off');
  });

  it('transitions: roleplay GUARDRAIL_ON → guardrail-on', () => {
    const next = campusBotReducer('roleplay', 'GUARDRAIL_ON');
    expect(next).toBe('guardrail-on');
  });

  it('transitions: guardrail-off GUARDRAIL_ON → guardrail-on', () => {
    const next = campusBotReducer('guardrail-off', 'GUARDRAIL_ON');
    expect(next).toBe('guardrail-on');
  });

  it('transitions: guardrail-on GUARDRAIL_OFF → guardrail-off', () => {
    const next = campusBotReducer('guardrail-on', 'GUARDRAIL_OFF');
    expect(next).toBe('guardrail-off');
  });

  it('transitions: RESET from baseline → baseline', () => {
    const next = campusBotReducer('baseline', 'RESET');
    expect(next).toBe('baseline');
  });

  it('transitions: RESET from roleplay → baseline', () => {
    const next = campusBotReducer('roleplay', 'RESET');
    expect(next).toBe('baseline');
  });

  it('transitions: RESET from guardrail-off → baseline', () => {
    const next = campusBotReducer('guardrail-off', 'RESET');
    expect(next).toBe('baseline');
  });

  it('transitions: RESET from guardrail-on → baseline', () => {
    const next = campusBotReducer('guardrail-on', 'RESET');
    expect(next).toBe('baseline');
  });

  it('no-op: baseline GUARDRAIL_OFF returns same reference', () => {
    const s = 'baseline' as const;
    const next = campusBotReducer(s, 'GUARDRAIL_OFF');
    expect(next).toBe(s);
  });

  it('no-op: baseline GUARDRAIL_ON returns same reference', () => {
    const s = 'baseline' as const;
    const next = campusBotReducer(s, 'GUARDRAIL_ON');
    expect(next).toBe(s);
  });

  it('no-op: roleplay ROLEPLAY returns same reference', () => {
    const s = 'roleplay' as const;
    const next = campusBotReducer(s, 'ROLEPLAY');
    expect(next).toBe(s);
  });

  it('no-op: guardrail-off ROLEPLAY returns same reference', () => {
    const s = 'guardrail-off' as const;
    const next = campusBotReducer(s, 'ROLEPLAY');
    expect(next).toBe(s);
  });

  it('no-op: guardrail-off GUARDRAIL_OFF returns same reference', () => {
    const s = 'guardrail-off' as const;
    const next = campusBotReducer(s, 'GUARDRAIL_OFF');
    expect(next).toBe(s);
  });

  it('no-op: guardrail-on ROLEPLAY returns same reference', () => {
    const s = 'guardrail-on' as const;
    const next = campusBotReducer(s, 'ROLEPLAY');
    expect(next).toBe(s);
  });

  it('no-op: guardrail-on GUARDRAIL_ON returns same reference', () => {
    const s = 'guardrail-on' as const;
    const next = campusBotReducer(s, 'GUARDRAIL_ON');
    expect(next).toBe(s);
  });
});

describe('demoState: RAG reducer', () => {
  it('transitions: before PLANT → poisoned', () => {
    const next = ragReducer('before', 'PLANT');
    expect(next).toBe('poisoned');
  });

  it('transitions: poisoned FIX → fixed', () => {
    const next = ragReducer('poisoned', 'FIX');
    expect(next).toBe('fixed');
  });

  it('transitions: RESET from before → before', () => {
    const next = ragReducer('before', 'RESET');
    expect(next).toBe('before');
  });

  it('transitions: RESET from poisoned → before', () => {
    const next = ragReducer('poisoned', 'RESET');
    expect(next).toBe('before');
  });

  it('transitions: RESET from fixed → before', () => {
    const next = ragReducer('fixed', 'RESET');
    expect(next).toBe('before');
  });

  it('no-op: before FIX returns same reference', () => {
    const s = 'before' as const;
    const next = ragReducer(s, 'FIX');
    expect(next).toBe(s);
  });

  it('no-op: poisoned PLANT returns same reference', () => {
    const s = 'poisoned' as const;
    const next = ragReducer(s, 'PLANT');
    expect(next).toBe(s);
  });

  it('no-op: fixed PLANT returns same reference', () => {
    const s = 'fixed' as const;
    const next = ragReducer(s, 'PLANT');
    expect(next).toBe(s);
  });

  it('no-op: fixed FIX returns same reference', () => {
    const s = 'fixed' as const;
    const next = ragReducer(s, 'FIX');
    expect(next).toBe(s);
  });
});

describe('demoState: SOC reducer', () => {
  // INSPECT transitions
  it('transitions: queue INSPECT(0) → investigating with inspected=0', () => {
    const m = socReducer({ state: 'queue', inspected: null }, { type: 'INSPECT', event: 0 });
    expect(m).toEqual({ state: 'investigating', inspected: 0 });
  });

  it('transitions: queue INSPECT(1) → investigating with inspected=1', () => {
    const m = socReducer({ state: 'queue', inspected: null }, { type: 'INSPECT', event: 1 });
    expect(m).toEqual({ state: 'investigating', inspected: 1 });
  });

  it('transitions: queue INSPECT(2) → investigating with inspected=2', () => {
    const m = socReducer({ state: 'queue', inspected: null }, { type: 'INSPECT', event: 2 });
    expect(m).toEqual({ state: 'investigating', inspected: 2 });
  });

  it('transitions: queue INSPECT(3) → investigating with inspected=3', () => {
    const m = socReducer({ state: 'queue', inspected: null }, { type: 'INSPECT', event: 3 });
    expect(m).toEqual({ state: 'investigating', inspected: 3 });
  });

  it('transitions: investigating INSPECT(0) when inspected was 1 → investigating with inspected=0', () => {
    const m = socReducer({ state: 'investigating', inspected: 1 }, { type: 'INSPECT', event: 0 });
    expect(m).toEqual({ state: 'investigating', inspected: 0 });
  });

  it('transitions: investigating INSPECT(j) changes inspected', () => {
    const m1 = socReducer({ state: 'investigating', inspected: 0 }, { type: 'INSPECT', event: 2 });
    expect(m1).toEqual({ state: 'investigating', inspected: 2 });

    const m2 = socReducer(m1, { type: 'INSPECT', event: 3 });
    expect(m2).toEqual({ state: 'investigating', inspected: 3 });
  });

  // CLOSE transition
  it('transitions: investigating CLOSE → queue with inspected=null', () => {
    const m = socReducer({ state: 'investigating', inspected: 1 }, { type: 'CLOSE' });
    expect(m).toEqual({ state: 'queue', inspected: null });
  });

  // CORRELATE transitions
  it('transitions: queue CORRELATE → correlated', () => {
    const m = socReducer({ state: 'queue', inspected: null }, { type: 'CORRELATE' });
    expect(m).toEqual({ state: 'correlated', inspected: null });
  });

  it('transitions: investigating CORRELATE → correlated with inspected=null', () => {
    const m = socReducer({ state: 'investigating', inspected: 2 }, { type: 'CORRELATE' });
    expect(m).toEqual({ state: 'correlated', inspected: null });
  });

  // PROPOSE transition
  it('transitions: correlated PROPOSE → pending-approval', () => {
    const m = socReducer({ state: 'correlated', inspected: null }, { type: 'PROPOSE' });
    expect(m).toEqual({ state: 'pending-approval', inspected: null });
  });

  // APPROVE transition
  it('transitions: pending-approval APPROVE → approved', () => {
    const m = socReducer({ state: 'pending-approval', inspected: null }, { type: 'APPROVE' });
    expect(m).toEqual({ state: 'approved', inspected: null });
  });

  // REJECT transition
  it('transitions: pending-approval REJECT → rejected', () => {
    const m = socReducer({ state: 'pending-approval', inspected: null }, { type: 'REJECT' });
    expect(m).toEqual({ state: 'rejected', inspected: null });
  });

  // RESET transitions
  it('transitions: queue RESET → queue with inspected=null', () => {
    const m = socReducer({ state: 'queue', inspected: null }, { type: 'RESET' });
    expect(m).toEqual({ state: 'queue', inspected: null });
  });

  it('transitions: investigating RESET → queue with inspected=null', () => {
    const m = socReducer({ state: 'investigating', inspected: 1 }, { type: 'RESET' });
    expect(m).toEqual({ state: 'queue', inspected: null });
  });

  it('transitions: correlated RESET → queue with inspected=null', () => {
    const m = socReducer({ state: 'correlated', inspected: null }, { type: 'RESET' });
    expect(m).toEqual({ state: 'queue', inspected: null });
  });

  it('transitions: pending-approval RESET → queue with inspected=null', () => {
    const m = socReducer({ state: 'pending-approval', inspected: null }, { type: 'RESET' });
    expect(m).toEqual({ state: 'queue', inspected: null });
  });

  it('transitions: approved RESET → queue with inspected=null', () => {
    const m = socReducer({ state: 'approved', inspected: null }, { type: 'RESET' });
    expect(m).toEqual({ state: 'queue', inspected: null });
  });

  it('transitions: rejected RESET → queue with inspected=null', () => {
    const m = socReducer({ state: 'rejected', inspected: null }, { type: 'RESET' });
    expect(m).toEqual({ state: 'queue', inspected: null });
  });

  // No-op tests: state/action pairs not in the table
  it('no-op: queue CLOSE returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'queue', inspected: null };
    const next = socReducer(m, { type: 'CLOSE' });
    expect(next).toBe(m);
  });

  it('no-op: queue PROPOSE returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'queue', inspected: null };
    const next = socReducer(m, { type: 'PROPOSE' });
    expect(next).toBe(m);
  });

  it('no-op: queue APPROVE returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'queue', inspected: null };
    const next = socReducer(m, { type: 'APPROVE' });
    expect(next).toBe(m);
  });

  it('no-op: queue REJECT returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'queue', inspected: null };
    const next = socReducer(m, { type: 'REJECT' });
    expect(next).toBe(m);
  });

  it('no-op: investigating PROPOSE returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'investigating', inspected: 0 };
    const next = socReducer(m, { type: 'PROPOSE' });
    expect(next).toBe(m);
  });

  it('no-op: investigating APPROVE returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'investigating', inspected: 0 };
    const next = socReducer(m, { type: 'APPROVE' });
    expect(next).toBe(m);
  });

  it('no-op: investigating REJECT returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'investigating', inspected: 0 };
    const next = socReducer(m, { type: 'REJECT' });
    expect(next).toBe(m);
  });

  it('no-op: correlated CLOSE returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'correlated', inspected: null };
    const next = socReducer(m, { type: 'CLOSE' });
    expect(next).toBe(m);
  });

  it('no-op: correlated APPROVE returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'correlated', inspected: null };
    const next = socReducer(m, { type: 'APPROVE' });
    expect(next).toBe(m);
  });

  it('no-op: correlated REJECT returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'correlated', inspected: null };
    const next = socReducer(m, { type: 'REJECT' });
    expect(next).toBe(m);
  });

  it('no-op: pending-approval CLOSE returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'pending-approval', inspected: null };
    const next = socReducer(m, { type: 'CLOSE' });
    expect(next).toBe(m);
  });

  it('no-op: pending-approval CORRELATE returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'pending-approval', inspected: null };
    const next = socReducer(m, { type: 'CORRELATE' });
    expect(next).toBe(m);
  });

  it('no-op: pending-approval PROPOSE returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'pending-approval', inspected: null };
    const next = socReducer(m, { type: 'PROPOSE' });
    expect(next).toBe(m);
  });

  it('no-op: approved CLOSE returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'approved', inspected: null };
    const next = socReducer(m, { type: 'CLOSE' });
    expect(next).toBe(m);
  });

  it('no-op: approved CORRELATE returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'approved', inspected: null };
    const next = socReducer(m, { type: 'CORRELATE' });
    expect(next).toBe(m);
  });

  it('no-op: approved PROPOSE returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'approved', inspected: null };
    const next = socReducer(m, { type: 'PROPOSE' });
    expect(next).toBe(m);
  });

  it('no-op: approved APPROVE returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'approved', inspected: null };
    const next = socReducer(m, { type: 'APPROVE' });
    expect(next).toBe(m);
  });

  it('no-op: approved REJECT returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'approved', inspected: null };
    const next = socReducer(m, { type: 'REJECT' });
    expect(next).toBe(m);
  });

  it('no-op: rejected CLOSE returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'rejected', inspected: null };
    const next = socReducer(m, { type: 'CLOSE' });
    expect(next).toBe(m);
  });

  it('no-op: rejected CORRELATE returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'rejected', inspected: null };
    const next = socReducer(m, { type: 'CORRELATE' });
    expect(next).toBe(m);
  });

  it('no-op: rejected PROPOSE returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'rejected', inspected: null };
    const next = socReducer(m, { type: 'PROPOSE' });
    expect(next).toBe(m);
  });

  it('no-op: rejected APPROVE returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'rejected', inspected: null };
    const next = socReducer(m, { type: 'APPROVE' });
    expect(next).toBe(m);
  });

  it('no-op: rejected REJECT returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'rejected', inspected: null };
    const next = socReducer(m, { type: 'REJECT' });
    expect(next).toBe(m);
  });

  // Missing no-op exhaustiveness: correlated + INSPECT variants
  it('no-op: correlated INSPECT(0) returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'correlated', inspected: null };
    const next = socReducer(m, { type: 'INSPECT', event: 0 });
    expect(next).toBe(m);
  });

  it('no-op: correlated INSPECT(1) returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'correlated', inspected: null };
    const next = socReducer(m, { type: 'INSPECT', event: 1 });
    expect(next).toBe(m);
  });

  it('no-op: correlated INSPECT(2) returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'correlated', inspected: null };
    const next = socReducer(m, { type: 'INSPECT', event: 2 });
    expect(next).toBe(m);
  });

  it('no-op: correlated INSPECT(3) returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'correlated', inspected: null };
    const next = socReducer(m, { type: 'INSPECT', event: 3 });
    expect(next).toBe(m);
  });

  // Missing no-op exhaustiveness: correlated + CORRELATE
  it('no-op: correlated CORRELATE returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'correlated', inspected: null };
    const next = socReducer(m, { type: 'CORRELATE' });
    expect(next).toBe(m);
  });

  // Missing no-op exhaustiveness: pending-approval + INSPECT variants
  it('no-op: pending-approval INSPECT(0) returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'pending-approval', inspected: null };
    const next = socReducer(m, { type: 'INSPECT', event: 0 });
    expect(next).toBe(m);
  });

  it('no-op: pending-approval INSPECT(1) returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'pending-approval', inspected: null };
    const next = socReducer(m, { type: 'INSPECT', event: 1 });
    expect(next).toBe(m);
  });

  it('no-op: pending-approval INSPECT(2) returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'pending-approval', inspected: null };
    const next = socReducer(m, { type: 'INSPECT', event: 2 });
    expect(next).toBe(m);
  });

  it('no-op: pending-approval INSPECT(3) returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'pending-approval', inspected: null };
    const next = socReducer(m, { type: 'INSPECT', event: 3 });
    expect(next).toBe(m);
  });

  // Missing no-op exhaustiveness: approved + INSPECT variants
  it('no-op: approved INSPECT(0) returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'approved', inspected: null };
    const next = socReducer(m, { type: 'INSPECT', event: 0 });
    expect(next).toBe(m);
  });

  it('no-op: approved INSPECT(1) returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'approved', inspected: null };
    const next = socReducer(m, { type: 'INSPECT', event: 1 });
    expect(next).toBe(m);
  });

  it('no-op: approved INSPECT(2) returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'approved', inspected: null };
    const next = socReducer(m, { type: 'INSPECT', event: 2 });
    expect(next).toBe(m);
  });

  it('no-op: approved INSPECT(3) returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'approved', inspected: null };
    const next = socReducer(m, { type: 'INSPECT', event: 3 });
    expect(next).toBe(m);
  });

  // Missing no-op exhaustiveness: rejected + INSPECT variants
  it('no-op: rejected INSPECT(0) returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'rejected', inspected: null };
    const next = socReducer(m, { type: 'INSPECT', event: 0 });
    expect(next).toBe(m);
  });

  it('no-op: rejected INSPECT(1) returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'rejected', inspected: null };
    const next = socReducer(m, { type: 'INSPECT', event: 1 });
    expect(next).toBe(m);
  });

  it('no-op: rejected INSPECT(2) returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'rejected', inspected: null };
    const next = socReducer(m, { type: 'INSPECT', event: 2 });
    expect(next).toBe(m);
  });

  it('no-op: rejected INSPECT(3) returns same reference', () => {
    const m: Parameters<typeof socReducer>[0] = { state: 'rejected', inspected: null };
    const next = socReducer(m, { type: 'INSPECT', event: 3 });
    expect(next).toBe(m);
  });
});

describe('demoState: Fixtures — CampusBot', () => {
  const slide4 = slides.find((s) => s.slide === 4);
  const slide4Text = slide4?.texts.join('\n') ?? '';

  const flattenCopy = (obj: unknown): string[] => {
    const result: string[] = [];
    if (typeof obj === 'string') {
      result.push(obj);
    } else if (typeof obj === 'object' && obj !== null) {
      for (const val of Object.values(obj)) {
        result.push(...flattenCopy(val));
      }
    }
    return result;
  };

  it('campusBot.system is a substring of slide 4', () => {
    expect(slide4Text).toContain(campusBot.system);
  });

  it('every string in campusBotCopy is a substring of slide 4 texts', () => {
    const strings = flattenCopy(campusBotCopy);
    for (const str of strings) {
      expect(slide4Text).toContain(str);
    }
  });
});

describe('demoState: Fixtures — RAG', () => {
  const slide6 = slides.find((s) => s.slide === 6);
  const slide6Text = slide6?.texts.join('\n') ?? '';

  const flattenCopy = (obj: unknown): string[] => {
    const result: string[] = [];
    if (typeof obj === 'string') {
      result.push(obj);
    } else if (typeof obj === 'object' && obj !== null) {
      for (const val of Object.values(obj)) {
        result.push(...flattenCopy(val));
      }
    }
    return result;
  };

  it('every doc name in ragDocs is a substring of slide 6 texts', () => {
    for (const doc of ragDocs) {
      expect(slide6Text).toContain(doc.name);
    }
  });

  it('every string in ragCopy is a substring of slide 6 texts', () => {
    const strings = flattenCopy(ragCopy);
    for (const str of strings) {
      expect(slide6Text).toContain(str);
    }
  });

  it('every string in ragRanking entries is a substring of slide 6 texts', () => {
    for (const docName of Object.values(ragRanking).flat()) {
      expect(slide6Text).toContain(docName);
    }
  });
});

describe('demoState: Fixtures — SOC', () => {
  const slide23 = slides.find((s) => s.slide === 23);
  const slide23Text = slide23?.texts.join('\n') ?? '';

  const flattenCopy = (obj: unknown): string[] => {
    const result: string[] = [];
    if (typeof obj === 'string') {
      result.push(obj);
    } else if (typeof obj === 'object' && obj !== null) {
      for (const val of Object.values(obj)) {
        result.push(...flattenCopy(val));
      }
    }
    return result;
  };

  it('every linkedEvent string is a substring of slide 23 texts', () => {
    for (const event of linkedEvents) {
      expect(slide23Text).toContain(event);
    }
  });

  it('every string in socCopy is a substring of slide 23 texts', () => {
    const strings = flattenCopy(socCopy);
    for (const str of strings) {
      expect(slide23Text).toContain(str);
    }
  });

  it('SOC_UNRELATED equals SOC_TOTAL minus linkedEvents length', () => {
    expect(SOC_UNRELATED).toBe(SOC_TOTAL - linkedEvents.length);
  });
});

describe('demoState: Initial states', () => {
  it('campusBotInitial is "baseline"', () => {
    expect(campusBotInitial).toBe('baseline');
  });

  it('ragInitial is "before"', () => {
    expect(ragInitial).toBe('before');
  });

  it('socInitial is { state: "queue", inspected: null }', () => {
    expect(socInitial).toEqual({ state: 'queue', inspected: null });
  });
});

describe('demoState: Constants', () => {
  it('SOC_TOTAL is 10412', () => {
    expect(SOC_TOTAL).toBe(10412);
  });

  it('SOC_UNRELATED is 10408', () => {
    expect(SOC_UNRELATED).toBe(10408);
  });

  it('SOC_NOISE_ROWS is 12', () => {
    expect(SOC_NOISE_ROWS).toBe(12);
  });

  it('SOC_PROPOSE_DELAY_MS is 1200', () => {
    expect(SOC_PROPOSE_DELAY_MS).toBe(1200);
  });

  it('linkedEvents has 4 events', () => {
    expect(linkedEvents).toHaveLength(4);
  });
});
