# AI × Cybersecurity × Entrepreneurship Site — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the 46-scene, single-page, desktop-first interactive keynote described in `docs/`, with three deterministic demos, scroll choreography, side navigation, and a source drawer, passing `requirement.md` A–K.

**Architecture:** A data-driven manifest (`lib/scenes.ts`, 46 `Scene` objects) is rendered by one `SceneRenderer` into `SceneShell` sections; a single engine (`Presentation.tsx`) owns every ScrollTrigger, snapping, keyboard, and current-scene state, and exposes `useSceneProgress()` to scenes. Demos are pure reducers plus Framer-Motion UI. Work is split into workstreams W1 Foundation → W2 Engine ‖ W3 Demos → W4 Scenes, each run by an Opus manager per `docs/AGENT_HIERARCHY.md`.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind 4, GSAP + @gsap/react (ScrollTrigger), framer-motion, Vitest + @testing-library/react + jsdom. Node 24, npm.

**Spec:** `docs/CONTRACTS.md` (interface authority, wins on conflict) → `docs/main.md`, `PRD.md`, `TRD.md`, `technical.md`, `design.md`, `content-map.md`, `requirement.md`, `MASTER_PROMPT.md`. Source of copy: `source/slides.json` (per CONTRACTS §3.1 and §7). Org: `docs/AGENT_HIERARCHY.md`.

## Global Constraints

- Copy is verbatim from `source/slides.json` `texts` per CONTRACTS §3.1; characters exact (’ “ ” … × → ≠ ₹ − · •); no ASCII substitution; figures stay deck strings. Only `UI_COPY` (CONTRACTS §5.4) adds visible words.
- Tokens exactly TRD §10 plus `--orange-ink: #AF4000`; fonts Arial / Courier New only; no web font; no other colour.
- Dependencies exactly CONTRACTS §2 runtime + dev list; nothing else without a ruling. No Lenis, no state library, no chart library, no Playwright.
- TypeScript strict; no `any`; ESLint clean; `npm run lint && npm run test && npm run build` exit 0 at every task commit.
- `components/**` are client components (`'use client'`); `app/layout.tsx`, `app/page.tsx` stay server components; demos load via `next/dynamic` (SSR on).
- File ownership per CONTRACTS §2; `lib/scenes.ts` and `components/scenes/index.ts` have one writer at a time (W2 creates the skeletons, then W4 only).
- DOM/ARIA per CONTRACTS §5: `<section id="scene-NN" data-scene data-slide data-act data-theme data-pin>`, `aria-current="step"`, `aria-expanded`, `role="status" aria-live="polite"`; every control a `<button>` or `<a>`; state never by colour alone.
- Motion per CONTRACTS §11: only the engine imports ScrollTrigger; scenes build paused GSAP timelines and call `tl.progress(p)`; markup visible by default; reduced-motion = no timelines; no `Date`/`Math.random`/`window` reads during render.
- Demos per CONTRACTS §9: no network, no LLM, no storage; `RESET` always available; `track('demo_interaction', …)` on every state change.
- `LINKEDIN_HREF = 'https://linkedin.com/in/atharvtiwari'` is provisional (user will supply the final URL); it lives only in `lib/constants.ts`.
- Colocated tests `*.test.ts(x)` beside the file, never under `app/`; every task ends with a passing run of its own tests and a commit on branch `build/site`.
- Speaker notes in `source/slides.json` are reference for intent only, never on-screen copy.

## Review Focus

1. Refresh with `scrollY` inside a pinned scene's sticky range must land on the nearest scene with correct progress and no layout jump (test in Task 9: `useSceneProgress` initial value after mount equals ScrollTrigger's measured progress, not 0).
2. Rapid wheel input followed by a SideNav click must never queue two smooth scrolls or fight snapping (test in Task 11: latest `goToScene` wins; snap timer cancelled by new input).
3. Space/Arrow pressed while focus is inside a demo button or the SOC event row must not navigate (test in Task 10: key filter table from CONTRACTS §8).
4. Meme ids 4 and 17 have no local file; `MemeInterstitial` must render the styled fallback without issuing a request (test in Task 5: `src === ''` → no `<img>`).
5. Under `prefers-reduced-motion: reduce`, all 46 scenes' text is present in the DOM on first render and no ScrollTrigger exists (tests in Tasks 8 and 9).

---

## Workstream W1 — Foundation (manager: Opus; workers noted per task)

### Task 1: Scaffold, toolchain, analytics no-op

**Model:** Sonnet
**Files:**
- Create (via create-next-app): `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
- Create: `vitest.config.ts`, `vitest.setup.ts`, `lib/analytics.ts`, `lib/analytics.test.ts`
- Modify: `.gitignore` (keep existing entries; merge create-next-app's)

**Interfaces:**
- Produces: `npm run dev|build|start|lint|test`; `track(event, payload)` per CONTRACTS §12; `@/` alias to repo root.

- [ ] **Step 1:** Run `npx create-next-app@latest . --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm --yes` in the worktree root (it must be otherwise empty of app files; `docs/`, `source/`, `scripts/` may exist). If the CLI refuses a non-empty dir, scaffold into `.scaffold/` and move the generated files up, then delete `.scaffold/`.
- [ ] **Step 2:** `npm i gsap @gsap/react framer-motion` and `npm i -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom`. Confirm `next` is 16.x, `tailwindcss` 4.x.
- [ ] **Step 3:** Write `vitest.config.ts`: `environment: 'jsdom'`, `esbuild: { jsx: 'automatic' }`, `resolve.alias: { '@': __dirname }`, `setupFiles: ['./vitest.setup.ts']` (imports `@testing-library/jest-dom/vitest`), `include: ['**/*.test.{ts,tsx}']`, `exclude: ['node_modules', '.next']`. Add `"test": "vitest run"` to scripts.
- [ ] **Step 4:** Write the failing test `lib/analytics.test.ts`: `track('scene_enter', { slide: 1 })` returns `undefined`, does not throw, and `track` accepts every `AnalyticsEvent` literal (type-level via a `satisfies AnalyticsEvent[]` array of the five names). Run `npm test`; expected FAIL (module missing).
- [ ] **Step 5:** Implement `lib/analytics.ts` exactly as CONTRACTS §12 (type + no-op). Run `npm test`; expected PASS.
- [ ] **Step 6:** Replace the generated `app/page.tsx` body with `<main id="presentation" />` and strip create-next-app demo markup/assets (`public/*.svg`). `npm run lint && npm run build` exit 0.
- [ ] **Step 7:** Commit: `chore: scaffold Next.js 16 + Tailwind 4 + Vitest; analytics no-op`.

### Task 2: Types, constants, tokens, theme CSS

**Model:** Haiku (transcription from CONTRACTS §3, §4, §5.3, §5.4, TRD §10)
**Files:**
- Create: `lib/types.ts`, `lib/constants.ts`, `lib/constants.test.ts`
- Modify: `app/globals.css`

**Interfaces:**
- Produces: every type in CONTRACTS §3 verbatim (`Scene`, `Block`, `Step`, `Mark`, `Metric`, `SceneBeat`, `SceneProps`, `SceneComponentName`, …); `ACTS`, `KIND_COMPONENT`, `UI_COPY`, `LINKEDIN_HREF`; CSS custom properties `--bg-dark … --border-light`, `--orange-ink`, `--font-sans`, `--font-mono`, `--rail-w`; theme vars `--bg --fg --muted --rule --label` keyed on `[data-theme]` and `[data-accent="orange"]` per §5.3; `[data-pin]` and `.scene-viewport` rules and the reduced-motion override per §5.1.

- [ ] **Step 1:** Write failing `lib/constants.test.ts`: (a) `ACTS` ranges are contiguous and cover 2..46 exactly once; (b) `Object.keys(KIND_COMPONENT)` equals the ten `SceneKind` values; (c) `UI_COPY.soc` has the six `SocState` keys; (d) `LINKEDIN_HREF` starts with `https://linkedin.com/in/`. Run; expected FAIL.
- [ ] **Step 2:** Transcribe `lib/types.ts` and `lib/constants.ts` from CONTRACTS §3 and §4/§5.4 verbatim (no renames). Run test; expected PASS.
- [ ] **Step 3:** Rewrite `app/globals.css`: Tailwind 4 `@import "tailwindcss"`; `:root` tokens (TRD §10 + `--orange-ink`, fonts, `--rail-w: 56px`); `[data-theme]` tables from §5.3; `[data-pin="true"]` / `[data-pin="false"]` / `.scene-viewport` rules and `@media (prefers-reduced-motion: reduce)` override from §5.1; `body { background: var(--bg-dark); color: var(--text-light); font-family: var(--font-sans) }`; `.sr-only`; a global `:focus-visible` ring using `--green` on dark and `--orange-ink` on light. No other colour literal anywhere in the file.
- [ ] **Step 4:** `npm run lint && npm test && npm run build`; commit `feat(w1): types, constants, tokens and theme CSS`.

### Task 3: SceneShell and MonoLabel

**Model:** Sonnet
**Files:**
- Create: `components/ui/SceneShell.tsx`, `components/ui/SceneShell.test.tsx`, `components/ui/MonoLabel.tsx`, `components/ui/MonoLabel.test.tsx`

**Interfaces:**
- Consumes: `Scene`, `SceneShellProps` (CONTRACTS §3.2), theme CSS (Task 2).
- Produces: `<SceneShell scene>{children}</SceneShell>` rendering the exact §5.1 root (`id`, `data-scene`, `data-slide` two-digit, `data-act`, `data-theme`, `data-pin`, `data-accent` only when set, `style="--scroll-length: L"`, `tabIndex={-1}`, inner `.scene-viewport`); `<MonoLabel as?="span"|"p"|"h2" tone?="label"|"muted">` mono, letter-spaced, uppercase via CSS.

- [ ] **Step 1:** Failing tests: render `SceneShell` with a fixture scene `{ slide: 5, pin: true, scrollLength: 3, theme: 'dark', accent: 'orange', act: 'act-2', … }` → assert every attribute value from §5.1 including `data-slide="05"` and `style` containing `--scroll-length: 3`; a `pin: false` scene has no `data-accent` when unset; children render inside `.scene-viewport`. `MonoLabel` renders its text and the chosen element.
- [ ] **Step 2:** Implement; padding-inline-start ≥ `calc(var(--rail-w) + 5vw)`; padding-block per design §5. Run tests; PASS. `npm run lint`.
- [ ] **Step 3:** Commit `feat(w1): SceneShell and MonoLabel`.

### Task 4: BigNumber, StepList, Timeline, StatusPill

**Model:** Sonnet
**Files:**
- Create: `components/ui/BigNumber.tsx` (+ `.test.tsx`), `components/ui/StepList.tsx` (+ `.test.tsx`), `components/ui/Timeline.tsx` (+ `.test.tsx`), `components/ui/StatusPill.tsx` (+ `.test.tsx`)

**Interfaces:**
- Consumes: `Metric`, `Step`, `Mark` types; props per CONTRACTS §3.2.
- Produces: presentational components, no GSAP/scroll code; animatable parts carry `data-part="step"|"mark"|"value"|"label"`; `StatusPill` renders an inline SVG icon per tone plus text, colours via `--green`/`--orange`/`--muted`.

- [ ] **Step 1:** Failing tests: `BigNumber` renders `value`, optional `label`/`heading`, and `versus` as three runs (`$8.80`, `vs`, `$25`) each with `data-part`; `StepList` renders `items.length` `<li>` with `n`, optional `term`, `text`, each `data-part="step"`; `Timeline` renders marks with `at` and `text`, `data-part="mark"`, in order; `StatusPill` renders an `<svg aria-hidden>` and the label text for all three tones and sets `data-tone`.
- [ ] **Step 2:** Implement with Tailwind + CSS vars; type scale per design §4 (value 64–140px fluid via `clamp`). Tests PASS; lint clean.
- [ ] **Step 3:** Commit `feat(w1): BigNumber, StepList, Timeline, StatusPill`.

### Task 5: MemeInterstitial and ApprovalGate

**Model:** Sonnet
**Files:**
- Create: `components/ui/MemeInterstitial.tsx` (+ `.test.tsx`), `components/ui/ApprovalGate.tsx` (+ `.test.tsx`)

**Interfaces:**
- Consumes: `MemeAsset` type (import from `lib/memes.ts` once Task 6 lands; until then declare the type in `lib/types.ts` re-exported by `lib/memes.ts` — Task 6 must keep the name `MemeAsset`), `ApprovalGateProps` (§3.2), `UI_COPY.soc`.
- Produces: `MemeInterstitial({ meme, eyebrow, lines })`: fixed-aspect box; when `meme?.src` is a non-empty string render `<img src alt loading="lazy" decoding="async">` and on `onError` swap to the fallback; when `meme` is `undefined` or `src === ''` render the fallback immediately (mono `title` label + each `caption` line) with **no `<img>`**; `eyebrow` and `lines` always rendered. `ApprovalGate` click mode: heading, proposal, two buttons, outcome text `UI_COPY.soc.approved|rejected` with icon; scroll mode: heading + a `data-lit` attribute true when `progress >= 1`.

- [ ] **Step 1:** Failing tests covering: image render with alt; `onError` → fallback and no `<img>`; `undefined` meme → fallback, no `<img>`; `src: ''` → fallback, no `<img>` (Review Focus 4); click-mode buttons call handlers; outcome text for approved/rejected; scroll mode `data-lit`.
- [ ] **Step 2:** Implement (Framer Motion allowed for the outcome presence only, `initial={false}`). Tests PASS; lint.
- [ ] **Step 3:** Commit `feat(w1): MemeInterstitial with fallback; ApprovalGate click and scroll modes`.

### Task 6: Meme asset build (`lib/memes.ts`, `public/memes/`)

**Model:** Haiku
**Files:**
- Create: `scripts/build-memes.mjs`, `lib/memes.ts` (generated), `lib/memes.test.ts`, `public/memes/*.png` (copied)

**Interfaces:**
- Consumes: `source/memes.json` (CONTRACTS §7 shape; entries 4 and 17 have `file: null`).
- Produces: `export type MemeAsset` and `export const memes: MemeAsset[]` per CONTRACTS §10; for `file: null` entries `src` is `''` (ruling: no dead URL, fallback path per Task 5).

- [ ] **Step 1:** Failing test `lib/memes.test.ts`: 28 entries sorted by id; every `src` is `''` or starts with `/memes/` and the file exists under `public/memes/`; ids 4 and 17 have `src === ''`; `alt === \`${title}: ${caption.join(' / ')}\``; `suggestedScenes` non-empty.
- [ ] **Step 2:** Write `scripts/build-memes.mjs` (plain Node): copy each non-null `file` to `public/memes/<basename>`, emit `lib/memes.ts` with a header comment `// generated by scripts/build-memes.mjs — do not edit`. Add `"build:memes": "node scripts/build-memes.mjs"` to package.json scripts. Run it; run test; PASS.
- [ ] **Step 3:** `grep -r "api.memegen.link" lib components app` returns only `sourceUrl` values inside `lib/memes.ts`. Lint. Commit `feat(w1): vendored meme assets and lib/memes.ts`.

---

## Workstream W2 — Engine & Navigation (manager: Opus)

### Task 7: Manifest skeleton and registry skeleton

**Model:** Haiku
**Files:**
- Create: `lib/scenes.ts`, `lib/scenes.test.ts`, `components/scenes/index.ts`

**Interfaces:**
- Consumes: CONTRACTS Appendix A (all 46 rows), `Scene` union.
- Produces: `export const scenes: Scene[]` with 46 entries in slide order; per row `id`, `slide`, `act`, `theme`, `accent` (4, 5, 6, 8, 19, 39), `pin`, `scrollLength`, `kind`, `component` (only rows marked `*`), `content` as the kind's empty shape (`{ blocks: [] }`, `{ words: [], speaker: '', role: '' }`, `{ subtitle: '' }`, `{ memeId: N, lines: [] }`, `{ lead: '', timer: '', seconds: 0, prompts: [] }`, `{ lines: [], closing: '', speaker: '', role: '', linkedin: '' }`), `eyebrow: ''`, `title: ''`. `components/scenes/index.ts`: `export const registry: Partial<Record<SceneComponentName, ComponentType<SceneProps>>> = {}`. After this task **W4 is the only writer** of both files.

- [ ] **Step 1:** Failing test `lib/scenes.test.ts`: encode Appendix A as a 46-row array of `[slide, kind, theme, component|null, memeId|null, pin, scrollLength, act]` and assert every manifest entry matches; `id === 'scene-' + slide.padStart(2,'0')`; `accent === 'orange'` exactly on {4,5,6,8,19,39}; `scrollLength === 1` iff `pin === false`.
- [ ] **Step 2:** Transcribe the manifest and the empty registry. Test PASS; lint; `tsc` clean.
- [ ] **Step 3:** Commit `feat(w2): manifest skeleton from Appendix A; empty scene registry`.

### Task 8: SceneRenderer, Presentation shell, page and metadata

**Model:** Sonnet
**Files:**
- Create: `components/presentation/SceneRenderer.tsx` (+ `.test.tsx`), `components/presentation/Presentation.tsx`
- Modify: `app/page.tsx` (render `<Presentation />` inside `<main id="presentation">`), `app/layout.tsx` (metadata: title, description, Open Graph, speaker attribution per TRD §13; `<html lang="en">`; `<MotionConfig reducedMotion="user">` in a small client wrapper)

**Interfaces:**
- Consumes: `scenes`, `registry`, `KIND_COMPONENT`, `SceneShell`, `UI_COPY.source`.
- Produces: `SceneRenderer({ scene })` → `SceneShell` + resolved component (`scene.component ?? KIND_COMPONENT[scene.kind]`), fallback to `SceneShell` with eyebrow/title + `console.warn` only when `process.env.NODE_ENV !== 'production'`; SOURCE `<button aria-expanded aria-controls="source-drawer">` rendered only when `sourceNotes?.length` (wired to `useSourceDrawer` in Task 13 — until then a no-op prop `onSource?`). `Presentation` renders the 46 `SceneRenderer`s in order as direct children of `<main id="presentation">` (engine hooks added in Tasks 9–12).

- [ ] **Step 1:** Failing tests: renders 46 `section[data-scene]` in slide order; unknown component name → fallback markup and `console.warn` called in test env, not called when `NODE_ENV=production`; SOURCE button present only for a scene with `sourceNotes`; each section contains `.scene-viewport` (the non-empty-text assertion is added in Task 36 once copy exists).
- [ ] **Step 2:** Implement. `npm run build` must succeed (server components import only the manifest and the client `Presentation`). Tests PASS; lint.
- [ ] **Step 3:** Commit `feat(w2): SceneRenderer with fallback; Presentation shell; metadata`.

### Task 9: Scene progress engine

**Model:** Opus (architect builds this)
**Files:**
- Create: `components/presentation/SceneProgress.tsx` (+ `.test.tsx`)
- Modify: `components/presentation/Presentation.tsx` (register ScrollTrigger, create one trigger per section per CONTRACTS §6, provide progress context)

**Interfaces:**
- Produces: `useSceneProgress(): number`, `beatProgress(p, beat): number` exactly per CONTRACTS §6; per-scene subscription (a change re-renders only that scene); returns 1 during SSR, before first measurement, and under reduced motion; `track('scene_complete', { slide })` when progress reaches 1 from below; all triggers created inside `gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', …)` and killed on unmount (`gsap.context` / `useGSAP` cleanup).

- [ ] **Step 1:** Failing tests: `beatProgress` math (below start → 0, above end → 1, midpoint → 0.5); with `matchMedia` mocked to `reduce`, mounting `Presentation` creates zero ScrollTriggers (spy `ScrollTrigger.create`) and `useSceneProgress()` returns 1; with `no-preference`, exactly 46 triggers are created with `start: 'top bottom'` and `end` per pin; unmount kills all 46; the initial value after the first `onRefresh/onUpdate` equals the trigger's `progress` (Review Focus 1).
- [ ] **Step 2:** Implement with a `Map<slide, Set<listener>>` store and `useSyncExternalStore` per scene. Tests PASS; lint; build.
- [ ] **Step 3:** Commit `feat(w2): scene progress engine (ScrollTrigger measurement only)`.

### Task 10: Navigation core and keyboard map

**Model:** Sonnet
**Files:**
- Create: `lib/sceneNavigation.ts`, `lib/sceneNavigation.test.ts`

**Interfaces:**
- Produces: `goToScene(slide)` (rules 1–5 in CONTRACTS §8), `useCurrentScene()`, a store `setCurrentScene(slide)` / `subscribeCurrentScene(fn)`, `computeIdleScene(sectionTops: number[], scrollY, innerHeight): number`, `keyToAction(event: KeyboardEvent, ctx: { current: number; pinned: boolean; progress: number; drawerOpen: boolean; demoEscape: boolean }): NavAction | null` implementing the §8 key table and both filter lists (`closest(...)` selector string exported as `KEY_IGNORE_SELECTOR`, plus `SPACE_IGNORE_SELECTOR`), and `isNavigationInFlight()`.

- [ ] **Step 1:** Failing tests: `goToScene(0)`, `goToScene(47)`, `goToScene(2.5)` do nothing; `goToScene(3)` calls `window.scrollTo` with the section's top and `behavior: 'smooth'` (or `'auto'` when reduced motion), sets current to 3 immediately, focuses the section with `preventScroll: true`; a second call replaces the first target (no queue); calling for the in-flight target is a no-op; `computeIdleScene` picks the last top ≤ `scrollY + innerHeight/2`; `keyToAction` returns `null` for every entry of the ignore lists (build a table: `input`, `textarea`, `[contenteditable]`, `[role="slider"]`, `button` with Space, `altKey`) and the right action for each row of the key table (Review Focus 3).
- [ ] **Step 2:** Implement (pure functions + a tiny external store; no React in the pure parts). Tests PASS; lint.
- [ ] **Step 3:** Commit `feat(w2): goToScene, current-scene store, keyboard map`.

### Task 11: Engine wiring: keyboard listener, current scene, soft snapping

**Model:** Opus
**Files:**
- Modify: `components/presentation/Presentation.tsx`
- Create: `components/presentation/snapping.ts` (+ `.test.ts`)

**Interfaces:**
- Consumes: Task 9 progress store, Task 10 navigation API.
- Produces: one `window` `keydown` listener dispatching `keyToAction` results (`preventDefault` on handled keys); scroll listener updating current scene via `computeIdleScene` when no navigation is in flight; `track('scene_enter')` on change; snapping per §8: `nearestSnapTarget(scrollY, sections: {top, pinned, height}[], innerHeight): number | null` returns `null` inside a pinned scene's sticky range, otherwise the nearest section top; snap fires after `SNAP_IDLE_MS = 160` of no wheel/touch/key input, is cancelled by any input, uses smooth scroll, and is disabled under reduced motion.

- [ ] **Step 1:** Failing tests for `nearestSnapTarget` (null inside pinned range; nearest top otherwise; exact boundary) and for the idle timer with fake timers (new input cancels; `goToScene` in flight suppresses snap; reduced motion → never snaps) (Review Focus 2).
- [ ] **Step 2:** Implement and wire. Tests PASS; lint; build.
- [ ] **Step 3:** Browser check (Chrome tools, `npm run dev`, 1440×900): wheel through scenes 1–8 forwards and backwards, keyboard Home/End/Arrows, refresh mid-page inside scene 5; record observations in the report. Commit `feat(w2): keyboard, current scene, soft snapping`.

### Task 12: SideNav and SceneControls

**Model:** Sonnet
**Files:**
- Create: `components/presentation/SideNav.tsx` (+ `.test.tsx`), `components/presentation/SceneControls.tsx` (+ `.test.tsx`)
- Modify: `components/presentation/Presentation.tsx` (mount both)

**Interfaces:**
- Consumes: `ACTS`, `scenes`, `useCurrentScene`, `goToScene`, `UI_COPY`.
- Produces: `<nav aria-label="Scenes">` with scene 1 above Act 1, act headings `Act ${n} — ${label}`, one `<a href="#scene-NN">` per scene with `aria-current="step"` only on the current one; collapsed width `var(--rail-w)`, expands on hover/focus-within (Framer Motion, `initial={false}`); progress indicator (current/46) ; `SceneControls`: `Previous`/`Next` buttons (disabled at 1 / 46), scene number; clicks call `goToScene` and `preventDefault` on the anchors.

- [ ] **Step 1:** Failing tests: 46 links, correct hrefs, exactly one `aria-current`, 8 act headings with exact labels, Previous disabled on 1, Next disabled on 46, click → `goToScene(n)`.
- [ ] **Step 2:** Implement per design §13–14 (mono uppercase act labels, small numeric markers). Tests PASS; lint.
- [ ] **Step 3:** Commit `feat(w2): SideNav and SceneControls`.

### Task 13: SourceDrawer, useSourceDrawer, useDemoEscape

**Model:** Sonnet
**Files:**
- Create: `components/ui/SourceDrawer.tsx` (+ `.test.tsx`)
- Modify: `lib/sceneNavigation.ts` (add `useSourceDrawer`, `useDemoEscape` per CONTRACTS §8), `components/presentation/SceneRenderer.tsx` (SOURCE button → `open(slide)`), `components/presentation/Presentation.tsx` (mount drawer; Escape precedence: drawer → demo escape → nothing)

**Interfaces:**
- Produces: `<aside id="source-drawer" role="dialog" aria-modal="false" aria-labelledby="source-drawer-title">` listing `sourceNotes` split on ` · ` as `<li>`; opens with focus on `Close`, closes on Escape / click outside / Close / current-scene change and returns focus to the trigger; trigger `aria-expanded` reflects state; `track('source_open', { slide })`; `useDemoEscape(slide, fn)` registers the current scene's escape handler.

- [ ] **Step 1:** Failing tests: open/close via button and Escape; `aria-expanded` toggles; focus lands on Close then returns; notes split into `<li>`; drawer is non-modal (a SideNav click still calls `goToScene`); Escape with drawer closed and a registered demo escape calls the demo handler; `track` called on open.
- [ ] **Step 2:** Implement (Framer Motion `AnimatePresence`, `initial={false}` not needed since it mounts on action). Tests PASS; lint; build.
- [ ] **Step 3:** Commit `feat(w2): SourceDrawer and escape precedence`.

---

## Workstream W3 — Demos (manager: Opus)

### Task 14: Demo reducers and fixtures

**Model:** Haiku (tables are complete in CONTRACTS §9; manager escalates to Sonnet if BLOCKED)
**Files:**
- Create: `lib/demoState.ts`, `lib/demoState.test.ts`

**Interfaces:**
- Produces: everything in CONTRACTS §9.1–9.3 verbatim: `campusBotReducer`, `ragReducer`, `socReducer`, all fixture consts (`campusBot`, `campusBotCopy`, `ragDocs`, `ragCopy`, `ragRanking`, `linkedEvents`, `socCopy`, `SOC_TOTAL`, `SOC_UNRELATED`, `SOC_NOISE_ROWS`, `SOC_PROPOSE_DELAY_MS`), and the action/state types.

- [ ] **Step 1:** Failing tests: every row of the three transition tables; every (state, action) pair **not** in a table returns the same reference; `RESET` from every state returns the initial state; `SOC_UNRELATED === SOC_TOTAL - linkedEvents.length`; every string in `campusBotCopy`, `ragCopy`, `socCopy`, `linkedEvents` occurs verbatim in `source/slides.json` `texts` of slide 4, 6 or 23 respectively **except** `ragCopy.labels.before` and the label strings listed in CONTRACTS §9 as deck-derived (assert the manager-approved exception list explicitly).
- [ ] **Step 2:** Transcribe and implement pure reducers. Tests PASS; lint.
- [ ] **Step 3:** Commit `feat(w3): demo reducers and fixtures`.

### Task 15: DemoShell

**Model:** Sonnet
**Files:**
- Create: `components/scenes/DemoShell.tsx` (+ `.test.tsx`)

**Interfaces:**
- Consumes: `SceneShell`, `MonoLabel`, `StatusPill`, `UI_COPY.reset`, `track`.
- Produces: `DemoShell({ scene, label, tone, detail, caption, actions, onReset, children })` laying out design §11 (eyebrow/title/subtitle from `scene`, narrative left, workspace `children`, StatusPill, actions, Reset, and the single `<p role="status" aria-live="polite" aria-atomic="true" class="sr-only">` that is empty on first render and set to `label · detail` (or `label`) only on transitions).

- [ ] **Step 1:** Failing tests: live region empty on mount; after a `label` prop change it reads `label · detail`; detail `'–'` drops the suffix; Reset button always enabled and calls `onReset`.
- [ ] **Step 2:** Implement. Tests PASS; lint.
- [ ] **Step 3:** Commit `feat(w3): DemoShell`.

### Task 16: CampusBotDemo (scene 4)

**Model:** Sonnet
**Files:**
- Create: `components/scenes/CampusBotDemo.tsx` (+ `.test.tsx`)

**Interfaces:**
- Consumes: Task 14 reducer/fixtures, `DemoShell`, `UI_COPY.fictional`, `track`.
- Produces: the state → workspace/controls/tone/detail table in CONTRACTS §9.1 exactly; `aria-pressed` on the guardrail pair; orange emphasis + warning icon on leak; green + shield on blocked; `track('demo_interaction', { slide: 4, demo: 'campusbot', action, from, to })`.

- [ ] **Step 1:** Failing tests walking the table: baseline shows system/question/refusal and the `role-play` chip; ROLEPLAY adds the roleplay message and the two buttons with `aria-pressed="false"`; GUARDRAIL_OFF shows `leak` and `aria-pressed="true"` on `No guardrail`; GUARDRAIL_ON shows `blocked`; Reset returns to baseline; `track` called with the right payload; live region announcements match `label · detail`.
- [ ] **Step 2:** Implement with Framer Motion for card presence (`AnimatePresence`). Tests PASS; lint.
- [ ] **Step 3:** Commit `feat(w3): CampusBot demo`.

### Task 17: RagDemo (scene 6)

**Model:** Sonnet
**Files:**
- Create: `components/scenes/RagDemo.tsx` (+ `.test.tsx`)

**Interfaces:**
- Consumes: Task 14, `DemoShell`, `UI_COPY.relevance|authorization`.
- Produces: CONTRACTS §9.2 table; stepper of three buttons (deck order, `aria-current="step"` on current, only the next enabled); index rows with rank under `Retrieval relevance` and trust badge under `Authorization`; `link` rendered as plain text with an untrusted marker, never an `<a>`; excluded row in `fixed` shows strike + `unapproved` badge.

- [ ] **Step 1:** Failing tests per state: row order equals `ragRanking[state]`; hidden text visible only from `poisoned`; answers exact; no `<a>` contains `campus-verify.example`; stepper enablement; Reset; `track` payload `demo: 'rag'`.
- [ ] **Step 2:** Implement. Tests PASS; lint.
- [ ] **Step 3:** Commit `feat(w3): RAG poison demo`.

### Task 18: SocDemo (scene 23)

**Model:** Sonnet
**Files:**
- Create: `components/scenes/SocDemo.tsx` (+ `.test.tsx`)

**Interfaces:**
- Consumes: Task 14, `DemoShell`, `ApprovalGate` (click mode), `useDemoEscape`.
- Produces: CONTRACTS §9.3 table; exactly `SOC_NOISE_ROWS` textless `aria-hidden` rows plus 4 event `<button>` rows; `investigating` splits the inspected string into time/source/detail; `correlated` collapses noise (Framer Motion layout) and auto-dispatches PROPOSE after `SOC_PROPOSE_DELAY_MS` (0 under reduced motion); `pending-approval` mounts `ApprovalGate`; approved/rejected outcomes per table; `useDemoEscape(23, …)` only while `investigating`.

- [ ] **Step 1:** Failing tests (fake timers): initial DOM has 4 buttons + 12 noise rows and never more than 20 row elements; INSPECT highlights and splits; Escape → CLOSE via the registered handler; CORRELATE shows summary/evidence/suggested and, after 1200 ms, the gate; APPROVE → `Approved` outcome green icon; REJECT → `Rejected` neutral, `suggested` struck through; Reset cancels a pending timer; `track` payload `demo: 'soc'`.
- [ ] **Step 2:** Implement. Tests PASS; lint.
- [ ] **Step 3:** Commit `feat(w3): SOC correlation demo`.

---

## Workstream W4 — Scenes & Manifest (manager: Opus; single writer of `lib/scenes.ts` and `components/scenes/index.ts`)

### Task 19: Copy verification script

**Model:** Haiku
**Files:**
- Create: `scripts/verify-copy.mjs`; add `"verify:copy": "node scripts/verify-copy.mjs"` to package.json scripts

**Interfaces:**
- Consumes: `lib/scenes.ts` (import it with Node's built-in TypeScript type stripping: `import('../lib/scenes.ts')`; `lib/scenes.ts` must use `import type` only), `source/slides.json`.
- Produces: exit 0 when every string value in each manifest entry, except fields `id`, `act`, `theme`, `accent`, `kind`, `component`, `type`, `n`, `at` **when purely numeric/time**, occurs verbatim (after collapsing whitespace) inside some `texts` entry of the same slide; otherwise prints `slide NN: "<string>"` per miss and exits 1. Empty strings are ignored (skeleton state passes).

- [ ] **Step 1:** Run against the skeleton: exit 0. Temporarily add a bogus string in a scratch copy to confirm exit 1 and the message format. Commit `feat(w4): copy verification script`.

### Task 20: Blocks, ContentScene, TitleScene; copy for slides 1 and 2

**Model:** Sonnet
**Files:**
- Create: `components/scenes/Blocks.tsx` (+ `.test.tsx`), `components/scenes/ContentScene.tsx` (+ `.test.tsx`), `components/scenes/TitleScene.tsx` (+ `.test.tsx`)
- Modify: `components/scenes/index.ts` (register `TitleScene`, `ContentScene`), `lib/scenes.ts` (slides 1, 2 per CONTRACTS §3.1 recipes)

**Interfaces:**
- Consumes: primitives (Tasks 3–5), `useSceneProgress`, `beatProgress`, `SceneBeat`.
- Produces: `Blocks({ blocks })` rendering every `Block` type (`lines`, `steps`→StepList, `terms`, `layers`, `marks`→Timeline, `metrics`→BigNumber, `flow` with `→ + = ↺` as connector elements, `columns`, `bars` as CSS bars from `ratios`); `ContentScene` = eyebrow (MonoLabel) → `<h2>` title → Blocks, with a paused GSAP timeline (inside `useGSAP` + `gsap.matchMedia` no-preference) scrubbed by progress: metadata → title → supporting for `editorial`, sequential causality for `diagram`, label → number → context for `data`; `TitleScene` renders the `<h1>` with the four words (`BREAK.` orange, `SECURE.` green) and a one-shot restrained intro (design §16) with the 3 s CSS failsafe from CONTRACTS §11; `data-part` targets used by tweens.

- [ ] **Step 1:** Failing tests: `Blocks` renders each type from a fixture with the right primitive and connector glyphs as separate elements; `ContentScene` renders eyebrow/h2/blocks with all text present under reduced motion (no timeline); `TitleScene` has exactly one `<h1>` and the six lines from slide 1.
- [ ] **Step 2:** Fill slides 1 and 2 in the manifest from `source/slides.json` per §3.1; `npm run verify:copy` exit 0.
- [ ] **Step 3:** Implement; tests PASS; lint; build. Browser check scenes 1–2 at 1440×900. Commit `feat(w4): Blocks, ContentScene, TitleScene; slides 1–2`.

### Task 21: MemeScene and the ten meme rows

**Model:** Sonnet (component + slide 7) then Haiku batch (slides 10, 12, 21, 22, 30, 33, 40, 42, 45)
**Files:**
- Create: `components/scenes/MemeScene.tsx` (+ `.test.tsx`)
- Modify: `components/scenes/index.ts`, `lib/scenes.ts` (10 meme rows: `eyebrow` ← [0], `content.lines` ← [1…], `memeId` already set)

**Interfaces:**
- Produces: `MemeScene` = orange interruption: `MemeInterstitial` with `memes.find(m => m.id === content.memeId)`, eyebrow, lines; huge punchline typography; minimal UI; short punchy motion (design §10) that never hides text under reduced motion.

- [ ] **Step 1:** Failing tests: renders eyebrow + lines; passes the right meme; slide 7 (memeId 4, no file) renders the fallback and no `<img>`.
- [ ] **Step 2:** Implement + slide 7 copy; then batch the other nine rows; `npm run verify:copy` exit 0. Tests PASS. Commit `feat(w4): MemeScene and ten meme scenes`.

### Task 22: RolePathScene (slide 3)

**Model:** Sonnet
**Files:**
- Create: `components/scenes/RolePathScene.tsx` (+ `.test.tsx`); register; fill slide 3 (`flow` with marker `You are here`, five roles).
- Behavior: pointer/path moves across the five roles with progress (MASTER_PROMPT §19); under reduced motion the full path and marker are static and visible.

- [ ] **Step 1:** Failing test: five role labels rendered in deck order; marker text present. **Step 2:** Implement + copy; verify:copy; tests; lint; browser check scenes 1–3 + 7 (**Phase 1 visual-proof gate package**). Commit `feat(w4): RolePathScene; slide 3`.

### Task 23: TimelineScene; slides 19 and 20

**Model:** Sonnet
**Files:**
- Create: `components/scenes/TimelineScene.tsx` (+ `.test.tsx`); register; fill 19 (`marks` ×5) and 20 (`marks` ×4 + `lines`).
- Behavior: horizontal scrub left→right with values locking in (design §9); 19 attacker (orange accent), 20 defender (green); `challenge` kind (44) later reuses it with week fills.

- [ ] **Step 1:** Failing tests: marks in order with `at`/`text`; all text present under reduced motion. **Step 2:** Implement + copy; verify:copy; tests; commit `feat(w4): TimelineScene; slides 19–20`.

### Task 24: Manifest copy, Acts 1–4 ContentScene slides

**Model:** Haiku (batch; Sonnet example exists)
**Files:** Modify `lib/scenes.ts` for slides 8, 9, 13, 15, 16, 17, 18, 24, 27, 28 exactly per the CONTRACTS §3.1 recipe table, including `sourceNotes` on 8, 9, 15, 17, 18, 24, 27 (from the citation paragraph) and 24's `$8.80 / vs / $25` split. Leave `bars.ratios` for slide 28 to Task 32.

- [ ] **Step 1:** Fill; `npm run verify:copy` exit 0; `npm test` (manifest test still passes); lint. Commit `feat(w4): copy for Acts 1–4 content scenes`.

### Task 25: Manifest copy, Acts 5–8 ContentScene/TimelineScene slides

**Model:** Haiku (batch)
**Files:** Modify `lib/scenes.ts` for slides 31, 32, 35, 36, 37, 39, 41, 44 per recipes (`sourceNotes` on 31, 35, 36, 37, 41).

- [ ] **Step 1:** Fill; verify:copy; tests; lint. Commit `feat(w4): copy for Acts 5–8 content and timeline scenes`.

### Task 26: RagFlowScene (slide 5)
**Model:** Sonnet. Create `components/scenes/RagFlowScene.tsx` (+ test); register; fill slide 5 (`steps` ×5 with `term`). Pipeline reveals one stage at a time on scroll using the design §9 beat table (0.00–0.16 … 0.84–1.00) mapped into `[1/3, 1]` (pinned, scrollLength 3). Test: five stages present and ordered; reduced motion shows all. Commit `feat(w4): RagFlowScene; slide 5`.

### Task 27: AgentLoopScene (slide 11)
**Model:** Sonnet. Create `AgentLoopScene.tsx` (+ test); register; fill slide 11 (`flow` Chatbot; `flow` Agent with `→`/`↺` connectors; `metrics` `#3`); `sourceNotes`. Loop cycles physically with progress; static ring under reduced motion. Commit.

### Task 28: SupplyChainScene (slide 14)
**Model:** Sonnet. Create `SupplyChainScene.tsx` (+ test); register; fill slide 14 (`flow` `Your agent app` ×4; `lines`; `metrics`); `sourceNotes`. Dependency graph expands from three visible actors into many dependencies (SVG lines drawn by progress). Commit.

### Task 29: AiWritesBugScene (slide 25)
**Model:** Sonnet. Create `AiWritesBugScene.tsx` (+ test); register; fill slide 25 (`metrics`; `terms`; `lines` ×2); `sourceNotes`. Metric lands, then the code story. Commit.

### Task 30: AiFixesBugScene (slide 26)
**Model:** Sonnet. Create `AiFixesBugScene.tsx` (+ test); register; fill slide 26 (`flow` ×4 `Find → Verify → Patch → Human approves`; `terms` ×2; `lines`); `sourceNotes`. Uses `ApprovalGate` scroll mode, lit at progress 1 (hand-off pose per A9). Test: gate `data-lit` true when progress 1. Commit.

### Task 31: ProblemProductScene (slide 29)
**Model:** Sonnet. Create `ProblemProductScene.tsx` (+ test); register; fill slide 29 (`flow` ×5, three items each). Problem → product mappings appear as transformations. Commit.

### Task 32: GovernanceCurveScene (slide 34) and bar ratios (slides 28, 34)
**Model:** Sonnet. Create `GovernanceCurveScene.tsx` (+ test); register; fill slide 34 (`flow` 4 phases; `bars` series ×2 with `note`); measure `bars.ratios` for slides 28 and 34 from PPTX shape widths in `source/pptx-raw/ppt/slides/slide28.xml` / `slide34.xml` (`<a:ext cx=…>` of the bar shapes, normalised 0..1) and set them in the manifest (the only non-`texts` manifest values; log the two measurements in the report). Curve rises across growth phases with progress. Commit.

### Task 33: ProgrammeScene (slide 38)
**Model:** Sonnet. Create `ProgrammeScene.tsx` (+ test); register; fill slide 38 (`lines`; `lines` `Owner: ______` / `Reviewed: __ / __`; `steps` ×5). Lightweight checklist: five real `<button role="checkbox" aria-checked>` items, state in component memory only, all questions in markup before interaction, Escape not used. Commit.

### Task 34: NetworkScene (slide 43)
**Model:** Sonnet. Create `NetworkScene.tsx` (+ test); register; fill slide 43 (`lead` ← [2], `timer` `60s`, `seconds: 60`, `prompts` ← five steps per ruling A1). Countdown from 60 with Start/Pause/Restart (`UI_COPY`), `setInterval(1000)` only while running, prompts revealed one per 15 s but all present in markup (visually staged only), no network/submission; test with fake timers: start → 59 after 1 s, pause holds, restart → 60. Commit.

### Task 35: FinalScene (slide 46)
**Model:** Sonnet. Create `FinalScene.tsx` (+ test); register; fill slide 46 (`lines` ← [0–3], `closing`, `speaker`, `role`, `linkedin` ← [7]). LinkedIn `<a href={LINKEDIN_HREF} target="_blank" rel="noopener noreferrer">` labelled `content.linkedin` + `track('cta_click', { target: 'linkedin' })`; `UI_COPY.challengeCta` button → `goToScene(44)` + `track('cta_click', { target: 'scene-44' })`. Tests for both. Commit.

### Task 36: Register demos; demo manifest rows (slides 4, 6, 23)
**Model:** Haiku (after W3 completes). Modify `components/scenes/index.ts`: `CampusBotDemo`, `RagDemo`, `SocDemo` via `next/dynamic` (SSR on); fill slides 4, 6, 23 (`eyebrow` ← [0], `content.subtitle` ← [1], `title` ← [2]). verify:copy; `SceneRenderer.test` now asserts every section has non-empty text; build. Commit `feat(w4): register demos; demo scene rows`.

### Task 37: Scene hand-offs and final manifest audit
**Model:** Sonnet. Implement design §8 hand-off poses in the outgoing scenes only (A9) for at least: 5→6 (document card → source card), 22→23 (orange cut → dark SOC), 14 number → 15 metric, 26 green approval → 27 accent line; confirm `lib/scenes.test.ts` still matches Appendix A; run `npm run verify:copy`, `npm run lint`, `npm test`, `npm run build`. Browser pass at 1440×900, 1920×1080, 1280×720, 1024×768 through all 46 scenes, reduced-motion on and off; record findings. Commit `feat(w4): scene hand-offs; manifest audit`.

---

## Phase gates (Fable records, Opus signs) — see `docs/AGENT_HIERARCHY.md` §11
- **Phase 1 exit (visual proof):** Tasks 1–22 complete; scenes 1, 2, 3 and 7 run in a browser at 1440×900 and Opus approves the motion grammar; engine tests (Tasks 9–13) and demo tests (Tasks 14–18) green.
- **Phase 2 exit:** Tasks 19–37 complete; 46 scenes render with copy; `verify:copy` exit 0; `requirement.md` A and B ticked.
- **Phase 3:** Opus whole-branch review (superpowers:requesting-code-review), one fix wave, one scoped re-review; `requirement.md` A–K; TRD §16 tests; technical.md §18 QA viewports; `main.md` steps 10–11; `npm run lint && npm test && npm run build` exit 0; Fable writes the MASTER_PROMPT §28 report including the pending LinkedIn URL and the two missing meme rasters.
