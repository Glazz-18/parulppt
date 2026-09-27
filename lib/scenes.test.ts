import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { scenes } from '@/lib/scenes';

describe('scenes manifest', () => {
  // Appendix A encoded independently: [slide, kind, theme, component|null, memeId|null, pin, scrollLength, act]
  const appendixA = [
    [1, 'title', 'dark', null, null, false, 1, 'act-0'],
    [2, 'editorial', 'light', null, null, false, 1, 'act-1'],
    [3, 'diagram', 'light', 'RolePathScene', null, false, 1, 'act-1'],
    [4, 'demo', 'dark', 'CampusBotDemo', null, false, 1, 'act-2'],
    [5, 'diagram', 'dark', 'RagFlowScene', null, true, 3, 'act-2'],
    [6, 'demo', 'dark', 'RagDemo', null, false, 1, 'act-2'],
    [7, 'meme', 'orange', null, 4, false, 1, 'act-2'],
    [8, 'diagram', 'dark', null, null, true, 2, 'act-2'],
    [9, 'diagram', 'dark', null, null, true, 3, 'act-3'],
    [10, 'meme', 'orange', null, 22, false, 1, 'act-3'],
    [11, 'diagram', 'dark', 'AgentLoopScene', null, true, 3, 'act-3'],
    [12, 'meme', 'orange', null, 3, false, 1, 'act-3'],
    [13, 'diagram', 'dark', null, null, true, 3, 'act-3'],
    [14, 'data', 'dark', 'SupplyChainScene', null, true, 3, 'act-3'],
    [15, 'data', 'dark', null, null, false, 1, 'act-3'],
    [16, 'editorial', 'dark', null, null, false, 1, 'act-4'],
    [17, 'editorial', 'dark', null, null, true, 3, 'act-4'],
    [18, 'editorial', 'dark', null, null, true, 3, 'act-4'],
    [19, 'timeline', 'dark', null, null, true, 3, 'act-4'],
    [20, 'timeline', 'dark', null, null, true, 3, 'act-4'],
    [21, 'meme', 'orange', null, 14, false, 1, 'act-4'],
    [22, 'meme', 'orange', null, 12, false, 1, 'act-4'],
    [23, 'demo', 'dark', 'SocDemo', null, false, 1, 'act-4'],
    [24, 'data', 'dark', null, null, true, 3, 'act-4'],
    [25, 'data', 'dark', 'AiWritesBugScene', null, true, 2, 'act-4'],
    [26, 'diagram', 'dark', 'AiFixesBugScene', null, true, 3, 'act-4'],
    [27, 'data', 'dark', null, null, true, 3, 'act-4'],
    [28, 'diagram', 'dark', null, null, true, 2, 'act-4'],
    [29, 'diagram', 'light', 'ProblemProductScene', null, true, 3, 'act-5'],
    [30, 'meme', 'orange', null, 15, false, 1, 'act-5'],
    [31, 'data', 'light', null, null, false, 1, 'act-5'],
    [32, 'editorial', 'light', null, null, false, 1, 'act-5'],
    [33, 'meme', 'orange', null, 6, false, 1, 'act-5'],
    [34, 'diagram', 'light', 'GovernanceCurveScene', null, true, 2, 'act-5'],
    [35, 'timeline', 'light', null, null, true, 2, 'act-5'],
    [36, 'diagram', 'light', null, null, true, 2, 'act-5'],
    [37, 'editorial', 'light', null, null, false, 1, 'act-5'],
    [38, 'diagram', 'light', 'ProgrammeScene', null, false, 1, 'act-5'],
    [39, 'editorial', 'dark', null, null, false, 1, 'act-5'],
    [40, 'meme', 'orange', null, 18, false, 1, 'act-5'],
    [41, 'diagram', 'light', null, null, true, 2, 'act-6'],
    [42, 'meme', 'orange', null, 19, false, 1, 'act-7'],
    [43, 'network', 'light', null, null, false, 1, 'act-7'],
    [44, 'challenge', 'light', null, null, true, 3, 'act-8'],
    [45, 'meme', 'orange', null, 28, false, 1, 'act-8'],
    [46, 'cta', 'dark', null, null, false, 1, 'act-8'],
  ] as const;

  const accentSlides = new Set([4, 5, 6, 8, 19, 39]);

  it('has 46 scenes', () => {
    expect(scenes).toHaveLength(46);
  });

  it('each scene has id === scene-NN format with correct slide', () => {
    scenes.forEach((scene, index) => {
      const slide = index + 1;
      const expectedId = 'scene-' + String(slide).padStart(2, '0');
      expect(scene.id).toBe(expectedId);
      expect(scene.slide).toBe(slide);
    });
  });

  it('all scenes match Appendix A fields', () => {
    appendixA.forEach(([slide, kind, theme, component, memeId, pin, scrollLength, act], index) => {
      const scene = scenes[index];
      expect(scene.slide).toBe(slide);
      expect(scene.kind).toBe(kind);
      expect(scene.theme).toBe(theme);
      expect(scene.pin).toBe(pin);
      expect(scene.scrollLength).toBe(scrollLength);
      expect(scene.act).toBe(act);

      // component is only set on rows marked * in Appendix A: 3, 4, 5, 6, 11, 14, 23, 25, 26, 29, 34, 38
      const hasComponentOverride = [3, 4, 5, 6, 11, 14, 23, 25, 26, 29, 34, 38].includes(slide);
      if (hasComponentOverride) {
        expect(scene.component).toBe(component);
      } else {
        expect(scene.component).toBeUndefined();
      }

      // memeId is present only for meme scenes
      if (kind === 'meme') {
        const memeContent = scene.content as { memeId: number; lines: string[] };
        expect(memeContent.memeId).toBe(memeId);
      }
    });
  });

  it('accent === orange exactly on slides 4, 5, 6, 8, 19, 39', () => {
    scenes.forEach((scene) => {
      if (accentSlides.has(scene.slide)) {
        expect(scene.accent).toBe('orange');
      } else {
        expect(scene.accent).toBeUndefined();
      }
    });
  });

  it('scrollLength === 1 iff pin === false', () => {
    scenes.forEach((scene) => {
      if (scene.pin === false) {
        expect(scene.scrollLength).toBe(1);
      } else {
        expect(scene.scrollLength).toBeGreaterThanOrEqual(2);
      }
    });
  });

  it('lib/scenes.ts uses import type only (no runtime imports)', () => {
    const scenesPath = path.resolve(__dirname, 'scenes.ts');
    const content = fs.readFileSync(scenesPath, 'utf8');
    const lines = content.split('\n');
    const importLines = lines.filter((line) => line.trim().startsWith('import'));

    importLines.forEach((line) => {
      expect(line).toMatch(/^\s*import\s+type\s+/);
    });
  });

  // Task 20 fills slides 1, 2, 8, 15; Task 21 (part A) fills slide 7; Task 21 (part B) fills slides 10, 12, 21, 22, 30, 33, 40, 42, 45;
  // Task 22 fills slide 3; Task 23 fills slides 19, 20; Task 24 fills slides 9, 13, 16, 17, 18, 24, 27, 28.
  // Task 25 fills slides 31, 32, 35, 36, 37, 39, 41, 44. Task 26 fills slide 5. Task 27 fills slide 11.
  // Task 28 fills slide 14. Task 29 fills slide 25. Task 30 fills slide 26. Task 31 fills slide 29.
  // Task 32 fills slide 34. Task 34 fills slide 43. Task 35 fills slide 46. Task 36 fills the
  // three demos, 4, 6, 23. Every other slide is still the W2 skeleton (empty strings) until its
  // own manifest task lands.
  const filledSlides = new Set([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46,
  ]);

  it('slides not yet filled keep the skeleton empty eyebrow and title', () => {
    scenes.forEach((scene) => {
      if (filledSlides.has(scene.slide)) return;
      expect(scene.eyebrow).toBe('');
      expect(scene.title).toBe('');
    });
  });

  it('slide 1 (title) has its tagline eyebrow and no title field (§3.1 recipe row 1)', () => {
    const scene = scenes[0];
    expect(scene.eyebrow).toBe('AI × CYBERSECURITY × ENTREPRENEURSHIP');
    expect(scene.title).toBeUndefined();
    expect(scene.kind).toBe('title');
    const content = scene.content as { words: string[]; speaker: string; role: string };
    expect(content.words).toEqual(['BUILD.', 'BREAK.', 'SECURE.', 'SCALE.']);
    expect(content.speaker).toBe('Atharv Tiwari');
    expect(content.role).toBe('COO, Nevis Infosystems · Cybersecurity Researcher and Trainer');
  });

  it('slide 2 (editorial) has eyebrow, title and a steps block of 3 items', () => {
    const scene = scenes[1];
    expect(scene.eyebrow).toBe('ACT 1 · THE WORLD CHANGED');
    expect(scene.title).toBe('Three hands');
    const content = scene.content as { blocks: { type: string; items?: unknown[] }[] };
    expect(content.blocks).toHaveLength(1);
    expect(content.blocks[0].type).toBe('steps');
    expect(content.blocks[0].items).toHaveLength(3);
  });

  it('slide 3 (diagram) has a flow block with the "You are here" marker and five roles in deck order', () => {
    const scene = scenes[2];
    expect(scene.eyebrow).toBe('ACT 1 · THE WORLD CHANGED');
    expect(scene.title).toBe('AI is bigger than ChatGPT');
    const content = scene.content as { blocks: { type: string; marker?: string; items?: string[] }[] };
    expect(content.blocks).toHaveLength(1);
    expect(content.blocks[0].type).toBe('flow');
    expect(content.blocks[0].marker).toBe('You are here');
    expect(content.blocks[0].items).toEqual(['User', 'Power user', 'Builder', 'Founder', 'System designer']);
  });

  it('slide 4 (demo) has eyebrow, title and subtitle from source/slides.json paragraphs [0], [2], [1], with no extra content fields', () => {
    const scene = scenes[3];
    expect(scene.eyebrow).toBe('ACT 2 · LIVE DEMO 1 · 5 MIN');
    expect(scene.title).toBe('Talk the assistant out of its secret');
    expect(scene.kind).toBe('demo');
    const content = scene.content as { subtitle: string };
    expect(content.subtitle).toBe('Instruction hierarchy → role-play → guardrail');
    expect(Object.keys(content)).toEqual(['subtitle']);
  });

  it('slide 6 (demo) has eyebrow, title and subtitle from source/slides.json paragraphs [0], [2], [1], with no extra content fields', () => {
    const scene = scenes[5];
    expect(scene.eyebrow).toBe('ACT 2 · LIVE DEMO 2 · 6 MIN');
    expect(scene.title).toBe('Poison the policy folder');
    expect(scene.kind).toBe('demo');
    const content = scene.content as { subtitle: string };
    expect(content.subtitle).toBe('University assistant · 3 policies + 1 plant');
    expect(Object.keys(content)).toEqual(['subtitle']);
  });

  it('slide 23 (demo) has eyebrow, title and subtitle from source/slides.json paragraphs [0], [2], [1], with no extra content fields', () => {
    const scene = scenes[22];
    expect(scene.eyebrow).toBe('ACT 4 · LIVE DEMO 3 · 6 MIN');
    expect(scene.title).toBe('10,000 alerts, one story');
    expect(scene.kind).toBe('demo');
    const content = scene.content as { subtitle: string };
    expect(content.subtitle).toBe('Synthetic logs · aarav-startup.example');
    expect(Object.keys(content)).toEqual(['subtitle']);
  });

  it('slide 7 (meme) has its eyebrow and memeId 4 content.lines, and no title field', () => {
    const scene = scenes[6];
    expect(scene.eyebrow).toBe('RAG ≠ AUTHORIZATION');
    expect(scene.title).toBeUndefined();
    expect(scene.kind).toBe('meme');
    const content = scene.content as { memeId: number; lines: string[] };
    expect(content.memeId).toBe(4);
    expect(content.lines).toEqual(['RAG hai bhai.']);
  });

  it('slide 8 (diagram) has a flow block with connectors and a lines block, plus sourceNotes', () => {
    const scene = scenes[7];
    expect(scene.eyebrow).toBe('ACT 2 · BREAK AI');
    expect(scene.title).toBe('The lethal trifecta');
    expect(scene.sourceNotes).toEqual(['Concept: Simon Willison, 2025 · CVE-2025-32711, Microsoft MSRC, 2025']);
    const content = scene.content as { blocks: { type: string; items?: string[]; lines?: string[] }[] };
    expect(content.blocks[0].type).toBe('flow');
    expect(content.blocks[0].items).toEqual([
      'Private data',
      '+',
      'Untrusted content',
      '+',
      'A way to send data out',
      '=',
      'Exploitable',
    ]);
    expect(content.blocks[1].type).toBe('lines');
    expect(content.blocks[1].lines).toEqual([
      'EchoLeak, 2025 · one crafted email, zero clicks, data pulled out of Microsoft 365 Copilot.',
    ]);
  });

  it('slide 15 (data) has a metrics block of 3 and a lines block, plus sourceNotes', () => {
    const scene = scenes[14];
    expect(scene.eyebrow).toBe('ACT 3 · GUARDRAILS');
    expect(scene.title).toBe('Shadow AI');
    expect(scene.sourceNotes).toEqual([
      'Verizon DBIR 2026 · IBM Cost of a Data Breach 2026 · IBM Cost of a Data Breach, India, 2026',
    ]);
    const content = scene.content as { blocks: { type: string; items?: unknown[]; lines?: string[] }[] };
    expect(content.blocks[0].type).toBe('metrics');
    expect(content.blocks[0].items).toHaveLength(3);
    expect(content.blocks[1].type).toBe('lines');
    expect(content.blocks[1].lines).toEqual([
      'The college project you built on a free API key, with the placement data in it.',
    ]);
  });

  it('slide 19 (timeline) has a marks block of 5 in deck order, plus sourceNotes', () => {
    const scene = scenes[18];
    expect(scene.eyebrow).toBe('ACT 4 · TIMELINE COMPRESSION · 1 OF 2');
    expect(scene.title).toBe('The attacker’s clock');
    expect(scene.accent).toBe('orange');
    expect(scene.sourceNotes).toEqual([
      'CrowdStrike 2026 Global Threat Report (2025 data) · Mandiant M-Trends 2026',
    ]);
    const content = scene.content as { blocks: { type: string; items?: { at: string; text: string }[] }[] };
    expect(content.blocks).toHaveLength(1);
    expect(content.blocks[0].type).toBe('marks');
    expect(content.blocks[0].items).toEqual([
      { at: '22s', text: 'access broker hands off to ransomware crew' },
      { at: '27s', text: 'fastest breakout' },
      { at: '4m', text: 'to first data out' },
      { at: '29m', text: 'average breakout' },
      { at: '−7 days', text: 'mean time-to-exploit: used before the patch exists' },
    ]);
  });

  it('slide 20 (timeline) has a marks block of 4 plus a closing lines block, plus sourceNotes', () => {
    const scene = scenes[19];
    expect(scene.eyebrow).toBe('ACT 4 · TIMELINE COMPRESSION · 2 OF 2');
    expect(scene.title).toBe('The defender’s clock');
    expect(scene.accent).toBeUndefined();
    expect(scene.sourceNotes).toEqual([
      'Mandiant M-Trends 2026 · IBM Cost of a Data Breach 2026 · IBM Cost of a Data Breach, India, 2026',
    ]);
    const content = scene.content as {
      blocks: { type: string; items?: { at: string; text: string }[]; lines?: string[] }[];
    };
    expect(content.blocks).toHaveLength(2);
    expect(content.blocks[0].type).toBe('marks');
    expect(content.blocks[0].items).toEqual([
      { at: '14d', text: 'median dwell time, up from 11' },
      { at: '236d', text: 'to identify, India, no automation · 175 with it' },
      { at: '247d', text: 'to identify and contain, global' },
      { at: '−$1.93M', text: 'and 65 days faster with extensive security AI and automation' },
    ]);
    expect(content.blocks[1].type).toBe('lines');
    expect(content.blocks[1].lines).toEqual([
      'The human doesn’t get faster. The tooling and the design do.',
    ]);
  });

  it('slide 29 (diagram) has five flow blocks of problem, →, product in deck order', () => {
    const scene = scenes[28];
    expect(scene.eyebrow).toBe('ACT 5 · SECURITY → STARTUP');
    expect(scene.title).toBe('Every security problem is a product');
    const content = scene.content as { blocks: { type: string; items: string[] }[] };
    expect(content.blocks).toHaveLength(5);
    content.blocks.forEach((block) => expect(block.type).toBe('flow'));
    expect(content.blocks.map((b) => b.items)).toEqual([
      ['Phishing', '→', 'Security awareness'],
      ['Deepfakes', '→', 'Identity verification'],
      ['RAG leakage', '→', 'AI data security'],
      ['Prompt injection', '→', 'AI red-teaming platforms'],
      ['Alert fatigue', '→', 'SOC automation for SMEs'],
    ]);
  });

  it('slide 46 (cta) has no eyebrow and no title field (§3.1 recipe rules 1, 3) and the closing content', () => {
    const scene = scenes[45];
    expect(scene.eyebrow).toBeUndefined();
    expect(scene.title).toBeUndefined();
    expect(scene.kind).toBe('cta');
    const content = scene.content as { lines: string[]; closing: string; speaker: string; role: string; linkedin: string };
    expect(content.lines).toEqual(['Build something.', 'Break something.', 'Secure something.', 'Scale something.']);
    expect(content.closing).toBe('And find the people who will build it with you.');
    expect(content.speaker).toBe('Atharv Tiwari');
    expect(content.role).toBe('COO, Nevis Infosystems · Cybersecurity Researcher and Trainer');
    expect(content.linkedin).toBe('linkedin.com/in/atharvtiwari');
  });

  it('every scene has appropriate content shape', () => {
    scenes.forEach((scene) => {
      if (scene.kind === 'title') {
        const content = scene.content as { words: string[]; speaker: string; role: string };
        expect(content).toHaveProperty('words');
        expect(content).toHaveProperty('speaker');
        expect(content).toHaveProperty('role');
        expect(Array.isArray(content.words)).toBe(true);
        expect(typeof content.speaker).toBe('string');
        expect(typeof content.role).toBe('string');
      } else if (['editorial', 'diagram', 'data', 'timeline', 'challenge'].includes(scene.kind)) {
        const content = scene.content as { blocks: unknown[] };
        expect(content).toHaveProperty('blocks');
        expect(Array.isArray(content.blocks)).toBe(true);
      } else if (scene.kind === 'demo') {
        const content = scene.content as { subtitle: string };
        expect(content).toHaveProperty('subtitle');
        expect(typeof content.subtitle).toBe('string');
      } else if (scene.kind === 'meme') {
        const content = scene.content as { memeId: number; lines: string[] };
        expect(content).toHaveProperty('memeId');
        expect(content).toHaveProperty('lines');
        expect(typeof content.memeId).toBe('number');
        expect(Array.isArray(content.lines)).toBe(true);
      } else if (scene.kind === 'network') {
        const content = scene.content as { lead: string; timer: string; seconds: number; prompts: unknown[] };
        expect(content).toHaveProperty('lead');
        expect(content).toHaveProperty('timer');
        expect(content).toHaveProperty('seconds');
        expect(content).toHaveProperty('prompts');
        expect(typeof content.lead).toBe('string');
        expect(typeof content.timer).toBe('string');
        expect(typeof content.seconds).toBe('number');
        expect(Array.isArray(content.prompts)).toBe(true);
      } else if (scene.kind === 'cta') {
        const content = scene.content as { lines: string[]; closing: string; speaker: string; role: string; linkedin: string };
        expect(content).toHaveProperty('lines');
        expect(content).toHaveProperty('closing');
        expect(content).toHaveProperty('speaker');
        expect(content).toHaveProperty('role');
        expect(content).toHaveProperty('linkedin');
        expect(Array.isArray(content.lines)).toBe(true);
        expect(typeof content.closing).toBe('string');
        expect(typeof content.speaker).toBe('string');
        expect(typeof content.role).toBe('string');
        expect(typeof content.linkedin).toBe('string');
      }
    });
  });

  it('no scene has sourceNotes yet, except 8, 9, 11, 14, 15, 17, 18, 19, 20, 24, 25, 26, 27, 31, 35, 36, 37, 41 (Tasks 20, 23, 24, 25, 27, 28, 29, 30)', () => {
    const sourceNotesSlides = new Set([8, 9, 11, 14, 15, 17, 18, 19, 20, 24, 25, 26, 27, 31, 35, 36, 37, 41]);
    scenes.forEach((scene) => {
      if (sourceNotesSlides.has(scene.slide)) {
        expect(scene.sourceNotes).toBeDefined();
      } else {
        expect(scene.sourceNotes).toBeUndefined();
      }
    });
  });

  // Manager ruling (Task 32 fix round 1): bars.ratios carry EVERY measured bar in deck shape
  // order, normalised to the longest bar = 1; slide 28 has 2 rows of 2 series (MTTD, MTTR) = 4;
  // slide 34 has 4 rows of 2 series (one per phase) = 8.
  it('every bars block (slides 28, 34) carries measured ratios for every bar, in (0, 1], max 1', () => {
    const expectedLengths: Record<number, number> = { 28: 4, 34: 8 };
    Object.entries(expectedLengths).forEach(([slideStr, length]) => {
      const slide = Number(slideStr);
      const scene = scenes[slide - 1];
      const content = scene.content as { blocks: Array<{ type: string; series?: string[]; ratios?: number[] }> };
      const barsBlock = content.blocks.find((b) => b.type === 'bars');
      expect(barsBlock).toBeTruthy();
      const ratios = barsBlock!.ratios;
      expect(ratios).toHaveLength(length);
      expect(length % barsBlock!.series!.length).toBe(0);
      ratios!.forEach((r) => {
        expect(r).toBeGreaterThan(0);
        expect(r).toBeLessThanOrEqual(1);
      });
      expect(Math.max(...ratios!)).toBe(1);
    });
  });
});
