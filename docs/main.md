# Main Project Brief

## One-line brief
Turn the supplied 46-page `AI × Cybersecurity × Entrepreneurship` presentation into a single-page, desktop-first, web-native interactive keynote with scroll choreography, real mini-demos, editorial typography, and selective meme interruptions.

## Core rule
**The PPT is the narrative source of truth. The website is the interaction layer.**

Do not create a different talk. Do not remove scenes. Do not compress the story without explicit approval.

## Experience statement
The visitor should feel as though the presentation has escaped PowerPoint and become a living interface: text enters with intent, diagrams unfold as causality, noisy systems collapse into evidence, and demos respond to the visitor.

## Visual statement
The experience should feel:
- intelligent;
- editorial;
- technical;
- slightly irreverent;
- premium;
- human.

It should not feel:
- like a SaaS dashboard;
- like a cyberpunk landing page;
- like a 3D game;
- like a generic AI template.

## Build order
1. Scaffold Next.js/TypeScript/Tailwind.
2. Implement design tokens and typography.
3. Build SceneShell + side navigation + global scroll state.
4. Implement title + three core scene archetypes: editorial, meme, diagram.
5. Implement the three real demos.
6. Implement all 46 scenes using the content map.
7. Add sources/drawer.
8. Add navigation controls and CTA.
9. Add reduced-motion fallback.
10. Performance pass.
11. Visual QA across desktop sizes.

## Scene implementation principle
Do not spend all engineering effort making every scene unique. Reuse a strong visual grammar and reserve custom complexity for the moments where interaction materially improves the story.

## Custom-heavy scenes
- 1 title
- 4 CampusBot
- 5 RAG explainer
- 6 RAG poison demo
- 8 lethal trifecta
- 9 guardrails
- 11 agent loop
- 13 attack surface
- 14 supply chain
- 17 human attack surface
- 18 verification
- 19–20 timelines
- 23 SOC demo
- 24–27 AI finds/fixes stack
- 28 MTTD/MTTR
- 29 startup problem map
- 34 governance debt
- 35 compliance timeline
- 36 MOAT
- 38 one-page programme
- 41 skill stack
- 43 networking interaction
- 44 challenge
- 46 closing

## Lightweight scenes
Meme/reaction scenes should stay fast and simple: 7, 10, 12, 21, 22, 30, 33, 40, 42, 45.

## Final handoff
A code-generation model should be able to read:
- this file for overall direction;
- `PRD.md` for product behavior;
- `TRD.md` + `technical.md` for implementation;
- `design.md` for visual language;
- `content-map.md` for exact scene inventory;
- `requirement.md` for acceptance tests;
- `MASTER_PROMPT.md` for execution instructions.
