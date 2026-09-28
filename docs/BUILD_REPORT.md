# Build report — AI × Cybersecurity × Entrepreneurship interactive keynote

Per `MASTER_PROMPT.md` §28. Build dates: 2026-09-27 → 2026-09-28. Org: `docs/AGENT_HIERARCHY.md` (Fable 5.1 orchestrating four Opus 5.5 managers over Sonnet 5 and Haiku 4.5 workers). Interface authority: `docs/CONTRACTS.md` v1.3. Plan: `docs/superpowers/plans/2026-09-27-parul-site-build.md` (Tasks 1–42).

## What was built
- Next.js 16 App Router, TypeScript strict, Tailwind 4, GSAP + ScrollTrigger, Framer Motion. Single route `/`.
- 46 scenes, one per source slide, as a data-driven manifest (`lib/scenes.ts`) rendered by `SceneRenderer` into `SceneShell` sections; every manifest string verified word-for-word against the extracted deck text (`npm run verify:copy`).
- Scene system: `ContentScene` + `Blocks` (steps, terms, layers, marks, metrics, flow, columns, bars) with a scroll-scrubbed GSAP grammar keyed by block type; `TitleScene` (cinematic intro + boot sequence), `TimelineScene` (19, 20, 35, 44 week-fill), `MemeScene` (10 orange interruptions), and 12 one-off scenes (3, 5, 11, 14, 25, 26, 29, 34, 38, 43, 46 plus the title).
- Engine: one ScrollTrigger per scene measuring progress (`useSceneProgress`), soft snapping at section tops (suppressed inside tall sections), keyboard map (arrows, PageUp/Down, Home/End, Space, Escape precedence index → drawer → pen → demo), `goToScene`, current-scene store, reduced-motion path with no timelines.
- Chrome: left rail (SideNav, act-grouped dots, `aria-current`), SceneControls (Previous/Next, counter, Act label), SourceDrawer (deck citations), INDEX overlay (all 46 scenes), all theme-aware per scene. (A presenter pen was built as Task 39 and withdrawn by the user on 2026-09-28.)
- Three deterministic demos with pure reducers and exhaustive transition tests: CampusBot (scene 4), poisoned RAG (scene 6), SOC correlation with human approval gate (scene 23). No LLM, no network, no storage.
- 26 meme images vendored locally with a manifest; styled fallback for the two whose Memegen template no longer exists.

## Build and test status (branch `main` after merge, HEAD = merge of `build/site` 6897ce8)
- `npm run lint` exit 0 · `npm test` 764 tests / 43 files, output silent · `npm run verify:copy` "All strings verified OK" (one documented exemption: slide 46 link text, CONTRACTS A28) · `npm run build` exit 0 (static `/`).
- Every task reviewed (spec + quality) by an independent reviewer; Phase 1 gate signed with conditions by Opus; Phase 3 whole-branch review: 0 Critical, 5 Important (all fixed), 19 Minor (8 fixed, rest triaged in `.superpowers/sdd/…/final-review.md`). Post-release browser passes (2026-09-28) fixed: HUD theme on light scenes, scene-frame padding floor, reduced-motion overlay timing, and a layout overflow class (long metric values at hero size, meme headline length, pinned scenes 11/14/18/27 and meme scenes at ≤ 757px viewport height); a data-level layout-budget test now trips on the pattern that caused it.

## Known deviations from source
1. Memes 4 and 17 lost their `two-buttons` template upstream (404). Meme 4 ("Connect AI to every company document" / "Add proper access control first") was recreated on Memegen's Drake template with the identical captions and is back on scene 7; meme 17 (MVP) has no image and no scene uses it. The other nine meme scenes carry the deck's own words in the image (Spider-Man drops its third caption and Change-My-Mind shows only the setup line; both are template limits and the slide text completes the joke).
2. LinkedIn: `LINKEDIN_HREF` = `https://www.linkedin.com/in/iamatharvtiwari/` (user-supplied 2026-09-28); the visible link text on slide 46 reads `linkedin.com/in/iamatharvtiwari` (deck said `linkedin.com/in/atharvtiwari`).
3. Speaker role line on slides 1 and 46: `Founder, Sotillion · COO, Nevis Infosystems · Cybersecurity Researcher and Trainer` (deck said `COO, Nevis Infosystems · Cybersecurity Researcher and Trainer`), at the user's request.
These three fields (slide 46 `linkedin`, slides 1 and 46 `role`) are the only copy that deviates from the deck; each is exempted by name in `scripts/verify-copy.mjs` and recorded in CONTRACTS A28/A30.
4. Display choices (copy unchanged): slide 26 "Human approves" appears once as the ApprovalGate heading; slide 46's four lines form the `<h2>` with no eyebrow; slide 43's timer shows the deck string "60s" until Start; slides 28 and 34 bar lengths are measured from the PPTX shape widths; slide 28's bar groups are labelled with the slide's own MTTD / MTTR terms.
5. Boot-sequence copy (`UI_COPY.boot`), INDEX and the other `UI_COPY` words are the only visible words not in the deck (user-approved).
6. Scene 43 has five prompts as in the deck (MASTER_PROMPT §20 listed four).
7. Screen sizes: designed for 1280–1920 wide at ≥ 760px tall (fullscreen laptops and projectors). Below 760px of viewport height the pinned scenes switch to a flowing layout so nothing overlaps; below 1024px wide the rail collapses to a compact progress strip. Present in fullscreen (F11).

## Open items
- **Browser pass status**: verified live at 1440×757 on the production build — smooth scroll and End/Home landing, deep links, keyboard state, the three demos in motion, the 22→23 hand-off, INDEX open/close, scenes 1/3/7/8/15/27/28/33/46, and a zero-overflow measurement of all 46 scene viewports. Not yet verified live: the 1280×720 viewport (the browser window could not be resized below 757px on the remote desktop; fits are by arithmetic with ≥ 20px margin except slide 22 ≈ 9px), reduced-motion rendering, and the boot-sequence timing. Every earlier "frozen" symptom was the hidden/occluded window, not the site.
- `requirement.md` static verdicts: ✅ 52 · ⚠️ 14 browser-dependent (most now covered live) · ❌ 0.
- Commit trailers are mixed after Task 28 (workers used their own attribution line); cosmetic.

## How to run
```bash
npm ci
npm run dev        # http://localhost:3000  (add 127.0.0.1 to allowedDevOrigins to use that host in dev)
npm run build && npm run start
npm test · npm run lint · npm run verify:copy
```
Presenter controls: arrows / PageUp / PageDown / Home / End / Space; INDEX (top-left); SOURCE on cited scenes; Escape closes index → drawer → demo state.
