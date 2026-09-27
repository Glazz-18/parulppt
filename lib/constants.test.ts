import { describe, it, expect } from 'vitest';
import { ACTS, KIND_COMPONENT, UI_COPY, LINKEDIN_HREF } from './constants';

describe('constants', () => {
  it('(a) ACTS ranges are contiguous and cover 2..46 exactly once', () => {
    const acts = ACTS;

    // Check that acts are in order
    for (let i = 0; i < acts.length - 1; i++) {
      expect(acts[i].to).toBe(acts[i + 1].from - 1);
    }

    // Check that first starts at 2 and last ends at 46
    expect(acts[0].from).toBe(2);
    expect(acts[acts.length - 1].to).toBe(46);

    // Check that all scenes 2..46 are covered exactly once
    const covered = new Set<number>();
    for (const act of acts) {
      for (let slide = act.from; slide <= act.to; slide++) {
        expect(covered.has(slide)).toBe(false); // not already covered
        covered.add(slide);
      }
    }
    expect(covered.size).toBe(45); // 2..46 = 45 scenes
  });

  it('(b) Object.keys(KIND_COMPONENT) equals the ten SceneKind values', () => {
    const sceneKinds: string[] = [
      'title',
      'editorial',
      'diagram',
      'data',
      'timeline',
      'challenge',
      'demo',
      'meme',
      'network',
      'cta',
    ];
    expect(Object.keys(KIND_COMPONENT)).toEqual(sceneKinds);
  });

  it('(c) UI_COPY.soc has exactly the six SocState keys', () => {
    const socKeys = Object.keys(UI_COPY.soc);
    expect(socKeys).toEqual([
      'queue',
      'investigating',
      'correlated',
      'pending-approval',
      'approved',
      'rejected',
    ]);
  });

  it('(d) LINKEDIN_HREF starts with https://linkedin.com/in/', () => {
    expect(LINKEDIN_HREF).toMatch(/^https:\/\/linkedin\.com\/in\//);
  });
});
