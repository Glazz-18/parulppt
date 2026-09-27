# Build report — AI × Cybersecurity × Entrepreneurship interactive keynote

Per `MASTER_PROMPT.md` §28. Build dates: 2026-09-27 → 2026-09-28. Org: `docs/AGENT_HIERARCHY.md` (Fable 5.1 orchestrating four Opus 5.5 managers over Sonnet 5 and Haiku 4.5 workers). Interface authority: `docs/CONTRACTS.md` v1.3. Plan: `docs/superpowers/plans/2026-09-27-parul-site-build.md` (Tasks 1–42).

## What was built
- Next.js 16 App Router, TypeScript strict, Tailwind 4, GSAP + ScrollTrigger, Framer Motion. Single route `/`.
- 46 scenes, one per source slide, as a data-driven manifest (`lib/scenes.ts`) rendered by `SceneRenderer` into `SceneShell` sections; every manifest string verified word-for-word against the extracted deck text (`npm run verify:copy`).
- Scene system: `ContentScene` + `Blocks` (steps, terms, layers, marks, metrics, flow, columns, bars) with a scroll-scrubbed GSAP grammar keyed by block type; `TitleScene` (cinematic intro + boot sequence), `TimelineScene` (19, 20, 35, 44 week-fill), `MemeScene` (10 orange interruptions), and 12 one-off scenes (3, 5, 11, 14, 25, 26, 29, 34, 38, 43, 46 plus the title).
- Engine: one ScrollTrigger per scene measuring progress (`useSceneProgress`), soft snapping at section tops (suppressed inside tall sections), keyboard map (arrows, PageUp/Down, Home/End, Space, Escape precedence index → drawer → pen → demo), `goToScene`, current-scene store, reduced-motion path with no timelines.
- Chrome: left rail (SideNav, act-grouped dots, `aria-current`), SceneControls (Previous/Next, counter, Act label), SourceDrawer (deck citations), INDEX overlay (all 46 scenes), presenter pen (PEN/UNDO/CLEAR with two-step clear), all theme-aware per scene.
- Three deterministic demos with pure reducers and exhaustive transition tests: CampusBot (scene 4), poisoned RAG (scene 6), SOC correlation with human approval gate (scene 23). No LLM, no network, no storage.
- 26 meme images vendored locally with a manifest; styled fallback for the two whose Memegen template no longer exists.

## Build and test status (branch `main` after merge, HEAD = merge of `build/site` 6897ce8)
- `npm run lint` exit 0 · `npm test` 741 tests / 43 files, output silent · `npm run verify:copy` "All strings verified OK" · `npm run build` exit 0 (static `/`).
- 87 commits on the build branch; every task reviewed (spec + quality) by an independent reviewer; Phase 1 gate signed with conditions by Opus; Phase 3 whole-branch review: 0 Critical, 5 Important (all fixed), 19 Minor (8 fixed, rest triaged in `.superpowers/sdd/…/final-review.md`).

## Known deviations from source
1. Meme ids 4 (RAG ≠ authorization) and 17 (MVP) have no raster: their `two-buttons` template returns 404 upstream. Scene 7 uses the typographic fallback block with the meme's caption lines.
2. LinkedIn destination is provisional: `LINKEDIN_HREF` in `lib/constants.ts` = `https://linkedin.com/in/atharvtiwari`, taken from slide 46's visible text (the deck has no hyperlink). Replace when the final URL is supplied.
3. Display choices (copy unchanged): slide 26 "Human approves" appears once as the ApprovalGate heading; slide 46's four lines form the `<h2>` with no eyebrow; slide 43's timer shows the deck string "60s" until Start; slides 28 and 34 bar lengths are measured from the PPTX shape widths.
4. Boot-sequence copy (`UI_COPY.boot`), INDEX, PEN/UNDO/CLEAR and the other `UI_COPY` words are the only visible words not in the deck (user-approved).
5. Scene 43 has five prompts as in the deck (MASTER_PROMPT §20 listed four).

## Open items
- **Animated browser pass at 1440×900 and 1280×720** (scroll feel, snapping, reveals, demo motion, scene hand-offs, INDEX/pen motion, reduced-motion): deferred because the remote desktop was detached during every attempt (hidden tab, no animation frames). Static rendering, hydration, deep links, keyboard state changes and console were verified on a production build. Start the pass with scenes 4, 6 and 23, then the 22→23 hand-off.
- `requirement.md` static verdicts: ✅ 52 · ⚠️ 14 browser-dependent · ❌ 0 after the fix wave (B5, C3, H1 fixed).
- Commit trailers are mixed after Task 28 (workers used their own attribution line); cosmetic.

## How to run
```bash
npm ci
npm run dev        # http://localhost:3000  (add 127.0.0.1 to allowedDevOrigins to use that host in dev)
npm run build && npm run start
npm test · npm run lint · npm run verify:copy
```
Presenter controls: arrows / PageUp / PageDown / Home / End / Space; INDEX (top-left); PEN / UNDO / CLEAR (bottom-left); SOURCE on cited scenes; Escape closes index → drawer → pen → demo state.
