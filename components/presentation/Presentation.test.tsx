import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// CONTRACTS §5.3/Task 42: the fixed HUD chrome must take every colour from the theme variables
// (--bg/--fg/--muted/--rule/--label), never a fixed token, so it stays readable whatever scene
// theme is current. This is a source-text guard, not a render: rendering the full <Presentation />
// (46 scenes, demos, GSAP/ScrollTrigger wiring) is unnecessary weight for a "no literal colour
// token" check, and each chrome component's own test file already covers its data-theme wiring.
const HUD_FILES = ['SideNav.tsx', 'SceneControls.tsx', 'IndexOverlay.tsx'];

describe('HUD chrome source', () => {
  it('never references --text-light or --text-dark literally', () => {
    for (const file of HUD_FILES) {
      const source = readFileSync(path.join(process.cwd(), 'components/presentation', file), 'utf8');
      expect(source, `${file} should not use --text-light`).not.toMatch(/--text-light/);
      expect(source, `${file} should not use --text-dark`).not.toMatch(/--text-dark/);
    }
  });
});
