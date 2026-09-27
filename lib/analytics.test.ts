import { describe, expect, it } from 'vitest';
import { track, type AnalyticsEvent } from './analytics';

describe('track', () => {
  it('returns undefined and does not throw', () => {
    expect(track('scene_enter', { slide: 1 })).toBeUndefined();
  });

  it('accepts every AnalyticsEvent literal', () => {
    const events = [
      'scene_enter',
      'scene_complete',
      'demo_interaction',
      'cta_click',
      'source_open',
    ] satisfies AnalyticsEvent[];

    events.forEach((event) => {
      expect(() => track(event)).not.toThrow();
    });
  });
});
