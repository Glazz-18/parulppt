import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// I1 regression guard: the reduced-motion media block must select .scene-viewport with a
// selector at least as specific as `[data-pin="true"] .scene-viewport` (0,2,0), or a pinned
// scene stays sticky at 100vh under reduced motion and its content hides behind the next
// section. `section[data-scene] .scene-viewport` is (0,2,1), which always wins regardless of
// source order.
const globalsCss = readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8');

function reducedMotionBlock(css: string): string {
  const match = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}\n/);
  if (!match) throw new Error('no @media (prefers-reduced-motion: reduce) block found');
  return match[1];
}

describe('globals.css reduced-motion media block (I1)', () => {
  const block = reducedMotionBlock(globalsCss);

  it('selects .scene-viewport via a selector at least as specific as [data-pin="true"] .scene-viewport', () => {
    expect(block).toMatch(/section\[data-scene\]\s*\.scene-viewport\s*\{/);
  });

  it('sets position: static, height: auto and min-height: 100vh on every scene-viewport', () => {
    expect(block).toMatch(
      /section\[data-scene\]\s*\.scene-viewport\s*\{[^}]*position:\s*static;?[^}]*\}/,
    );
    expect(block).toMatch(
      /section\[data-scene\]\s*\.scene-viewport\s*\{[^}]*height:\s*auto;?[^}]*\}/,
    );
    expect(block).toMatch(
      /section\[data-scene\]\s*\.scene-viewport\s*\{[^}]*min-height:\s*100vh;?[^}]*\}/,
    );
  });

  it('never regresses to a bare .scene-viewport selector, which loses to [data-pin="true"] .scene-viewport', () => {
    expect(/(^|\n)\s*\.scene-viewport\s*\{/.test(block)).toBe(false);
  });
});
