import { describe, expect, it } from 'vitest';
import { scenes } from '@/lib/scenes';
import type { Block } from '@/lib/types';

// Overflow-fix tripwire (item 7 of the layout-overflow fix set). A jsdom test can't measure real
// layout (no browser, no font metrics), so this is a rough, DATA-ONLY per-block "cost" heuristic
// over lib/scenes.ts, not a layout engine: it can't tell you a scene overflows by how many px, only
// that its block list has grown heavier than every pinned scene that's known (measured in a real
// browser) to fit today. Weights (deliberately crude, calibrated against the measured overflow set
// in the fix brief -- pinned scenes 27/14/11 overflowed a 796px viewport, none of the other 18
// pinned scenes did):
//   - lines: 1 per line
//   - steps / terms / layers: 1 per item
//   - metrics: 2 per item when its value is >8 chars (BigNumber.tsx's own compact-scale cutoff --
//     these now render small, CONTRACTS §3.1 sentence-shaped values like slide 27's), else 3 (short
//     values still render at BigNumber's hero scale, 64-140px -- costlier per item even though
//     there's less text)
//   - bars: 2 per rendered bar (every ratio entry; Blocks.tsx stacks every bar, not just every row)
//   - flow / marks: 1 per item
//   - anything else with an `items` array: 1 per item (safe default for block types not yet seen
//     on a pinned scene)
// BUDGET is not a pixel count -- it's "the highest real cost among scenes that fit today, plus a
// small margin," recalibrated whenever a scene's blocks change enough to need it.
const LONG_METRIC_VALUE_THRESHOLD = 8; // mirrors components/ui/BigNumber.tsx
const BUDGET = 22;

function blockCost(block: Block): number {
  switch (block.type) {
    case 'lines':
      return block.lines.length;
    case 'steps':
    case 'terms':
    case 'layers':
      return block.items.length;
    case 'metrics':
      return block.items.reduce(
        (sum, item) => sum + (item.value.length > LONG_METRIC_VALUE_THRESHOLD ? 2 : 3),
        0,
      );
    case 'bars': {
      const rowCount = block.ratios && block.series.length > 0 ? block.ratios.length / block.series.length : 1;
      return Math.round(rowCount * block.series.length) * 2;
    }
    case 'flow':
      return block.items.length;
    case 'marks':
      return block.items.length;
    default:
      return 'items' in block && Array.isArray((block as { items?: unknown }).items)
        ? (block as { items: unknown[] }).items.length
        : 1;
  }
}

function sceneCost(blocks: Block[]): number {
  return blocks.reduce((sum, block) => sum + blockCost(block), 0);
}

describe('layout budget tripwire (lib/scenes.ts, pinned scenes)', () => {
  const pinnedWithBlocks = scenes.filter(
    (scene): scene is typeof scene & { content: { blocks: Block[] } } => scene.pin && 'blocks' in scene.content,
  );

  it('has at least the known pinned scenes (sanity: the filter above is finding real data)', () => {
    expect(pinnedWithBlocks.length).toBeGreaterThanOrEqual(21);
  });

  it.each(pinnedWithBlocks.map((scene) => [scene.slide, scene] as const))(
    'slide %i stays under the layout budget',
    (_slide, scene) => {
      const cost = sceneCost(scene.content.blocks);
      expect(cost).toBeLessThanOrEqual(BUDGET);
    },
  );

  // Demonstrates the tripwire has teeth: it's not calibrated so loosely that any plausible shape
  // passes. Before the BigNumber length-aware fix (item 1), EVERY metric value -- short or
  // sentence-shaped -- rendered at BigNumber's hero scale (64-140px, measured 118px each on slide
  // 27) with no compact fallback, and a long value at that scale wraps across multiple hero-height
  // lines rather than rendering small. This reconstructs that shape's rough cost (hero weight 3,
  // scaled by how many ~8-char hero-scale chunks the value's text would wrap across) purely to show
  // it clears BUDGET -- it is not a live regression guard for BigNumber.tsx itself (see
  // components/ui/BigNumber.test.tsx for that).
  it('would have flagged slide 27’s pre-length-fix shape (metrics forced to hero scale)', () => {
    const slide27 = pinnedWithBlocks.find((scene) => scene.slide === 27);
    expect(slide27).toBeTruthy();
    const metricsBlock = slide27!.content.blocks.find((b) => b.type === 'metrics');
    if (metricsBlock?.type !== 'metrics') throw new Error('slide 27 must have a metrics block');
    const values = metricsBlock.items.map((m) => m.value);

    const preFixHeroWeight = 3;
    const preFixMetricsCost = values.reduce(
      (sum, value) => sum + Math.ceil(value.length / LONG_METRIC_VALUE_THRESHOLD) * preFixHeroWeight,
      0,
    );
    const otherBlocksCost = slide27!.content.blocks
      .filter((b) => b.type !== 'metrics')
      .reduce((sum, b) => sum + blockCost(b), 0);

    expect(preFixMetricsCost + otherBlocksCost).toBeGreaterThan(BUDGET);
  });
});
