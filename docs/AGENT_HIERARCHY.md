# Agent Hierarchy — Build Org for the AI × Cybersecurity × Entrepreneurship Website

This file defines **who builds what, on which model, and how work is handed off** when the 46-scene site described in `docs/` is built by a hierarchy of Claude agents inside Claude Code. The orchestrator reads this file first, before `main.md`, before `MASTER_PROMPT.md`.

`docs/` remains the spec. This file only organises the labour.

---

## 1. Org chart

```
Fable 5.1 ─────────────── ORCHESTRATOR (this session)
 │
 ├─ Opus 5.5 ───────────── ARCHITECT / CHIEF REVIEWER / W2 engine core
 │
 ├─ W0 Source extraction ─ Haiku workers, dispatched directly by Fable
 │
 ├─ W1 Foundation ──────── Opus manager
 │     ├─ Haiku  → token CSS, MonoLabel, metadata, analytics no-op
 │     └─ Sonnet → scaffold, SceneShell, BigNumber, StepList, Timeline,
 │                 MemeInterstitial, ApprovalGate, StatusPill
 │
 ├─ W2 Engine & Nav ────── Opus manager
 │     ├─ Opus   → ScrollProgress, scroll + soft snapping, goToScene (core)
 │     └─ Sonnet → SceneRenderer, SideNav, SceneControls, SourceDrawer,
 │                 keyboard map, reduced-motion
 │
 ├─ W3 Demos ───────────── Opus manager
 │     ├─ Sonnet ×3 → CampusBot (4), RAG poison (6), SOC (23) + demo shell
 │     └─ Haiku     → fixtures from the source dump
 │
 └─ W4 Scenes & Manifest ─ Opus manager
       ├─ Sonnet → one example scene per kind, MemeScene, 12 one-off scenes
       └─ Haiku  → manifest skeleton, manifest text per Act, 10 meme rows,
                   letter/timeline data, sourceNotes, mechanical tests
```

Three tiers. Fable decides, Opus checks, managers run workstreams, workers produce diffs. Nested dispatch (a subagent launching subagents) was verified working on 2026-09-27, so managers really do dispatch their own workers.

---

## 2. Tier 0 — Main Mind

| Role | Model | Model ID | Owns | Never |
|---|---|---|---|---|
| **Orchestrator** | Fable 5.1 | `claude-fable-5-1` | Reads `docs/` and this file; writes the implementation plan (`superpowers:writing-plans`); decomposes into workstreams; dispatches managers and W0 workers; keeps the ledger; makes rulings; signs phase gates; writes the MASTER_PROMPT §28 final report | Writes product code. Inherits any worker's context. Pastes `MASTER_PROMPT.md` whole into a worker prompt. |
| **Architect / Chief Reviewer** | Opus 5.5 | `claude-opus-5-5` | Sole editor of `docs/CONTRACTS.md`; the Phase 0 rulings (§10); pre-flight conflict scan of the plan; **builds the W2 engine core itself**; reviews at every phase gate; whole-branch final review; fix-loop escalation rounds 4–5 | Routine implementation. Editing scene copy. |

Disagreement between the two → Fable rules and writes `Ruling: <what> — <why> — <cost if wrong>` to the ledger. Opus may register dissent in the same ledger line.

---

## 3. Tier 1 — Managers (Opus 5.5, `claude-opus-5-5`)

One manager per workstream W1–W4. W0 is small and mechanical, so Fable dispatches it directly.

A manager: reads only its workstream's slice of `docs/` + `CONTRACTS.md` + this file; splits the workstream into worker tasks; writes one brief per task (§7); dispatches its own workers with an explicit `model:`; reviews every worker report for spec compliance and code quality; runs the workstream smoke check; reports to Fable as a file.

| WS | Name | Scope | Depends on | Workers |
|---|---|---|---|---|
| **W0** | Source extraction | PPTX text/notes/links dump to `source/`; per-page PDF renders if tooling is available; meme download script that vendors the 28 images into `public/memes/` and writes `lib/memes.ts` (`MemeAsset` + caption/alt/sourceUrl); verification script: every string in `lib/scenes.ts` must appear word-for-word in the source dump | — | Haiku (Fable dispatches) |
| **W1** | Foundation | Scaffold Next.js App Router / TypeScript strict / Tailwind; tokens from `design.md` §7 and `TRD.md` §10; typography (Arial / Courier New only); `SceneShell`, `MonoLabel`, `BigNumber`, `StepList`, `Timeline`, `MemeInterstitial`, `ApprovalGate` (click mode for scene 23 **and** scroll mode for scene 26), `StatusPill` | — | Haiku, Sonnet |
| **W2** | Engine & Nav | `ScrollProgress` (the engine owns every ScrollTrigger; scenes only read `progress`); `SceneRenderer`; scroll + soft snapping (`TRD.md` §4); `SideNav`; `SceneControls`; keyboard map (`technical.md` §9); `goToScene`; `SourceDrawer` (Escape precedence and nav-while-open are engine concerns); reduced-motion. Manifest carries `pin` and scroll-length fields because pinned scenes move snap targets | W1 `SceneShell` | Opus (core), Sonnet |
| **W3** | Demos | CampusBot (scene 4), RAG poison (scene 6), SOC (scene 23), shared demo shell (`design.md` §11). State types from `TRD.md` §6, fixtures from `technical.md` §10–12 | W1 primitives only → runs **alongside** W2 | Sonnet ×3, Haiku |
| **W4** | Scenes & Manifest | Manifest skeleton → copy per Act → 21 archetype scenes (2, 8, 9, 13, 15, 16, 17, 18, 19, 20, 24, 27, 28, 31, 32, 35, 36, 37, 39, 41, 44) → 12 one-offs (1, 3, 5, 11, 14, 25, 26, 29, 34, 38, 43, 46) → 10 meme rows (7, 10, 12, 21, 22, 30, 33, 40, 42, 45) on one `MemeScene`. Owns every scene-to-scene handoff in `design.md` §8, including 5→6 and 22→23 | W1 primitives; W2 `progress` signature and manifest contract | Sonnet, Haiku |

3 demos + 21 archetype + 12 one-off + 10 meme = 46.

---

## 4. Tier 2 — Workers

| Model | Model ID | Task shape |
|---|---|---|
| **Sonnet 5** | `claude-sonnet-5` | Multi-file implementation from a prose brief: the three demos; `MemeScene`; the first example scene of each `kind`; each of the 12 one-off scenes as its own task; browser-dependent checks (keyboard bounds, reduced-motion, `requirement.md` G/H) using a real browser. Default task reviewer for small and mid diffs. |
| **Haiku 4.5** | `claude-haiku-4-5-20251001` | Transcription with a complete spec, 1–2 files: source dump; meme script; token CSS; demo fixtures; metadata; analytics no-op; `MonoLabel`; manifest skeleton (only after §10 rulings); manifest copy per Act **after** Sonnet's example for that kind exists, then checked by the W0 verification script; the 10 meme rows; letter data for 16/36/37 and timeline data for 19/20/35/44; `sourceNotes`; mechanical tests (46-scene count, `goToScene` mapping, demo state transitions, drawer open/close). |

---

## 5. Routing rules

- 1–2 files with a complete spec → **Haiku**. Multi-file or integration → **Sonnet**. Design judgement or broad codebase understanding → **Opus**. Orchestration only → **Fable**.
- **Always pass `model:` explicitly.** An omitted model inherits the caller's model, which at the top is Fable.
- Batch same-shape work into one dispatch (the 10 meme rows are one Haiku task, not ten).
- Reviewer model scales with diff risk: scoped re-review of a small fix → Haiku or Sonnet; whole-branch final → Opus.
- Turn count beats token price: a cheap model that takes 3× the turns is not cheap. Sonnet is the floor for anyone working from prose.

### Escalation ladder
1. Haiku stuck → same brief to Sonnet.
2. Sonnet stuck at fix round ≥ 4 → fresh Opus implementer.
3. Opus fails round 5 → **stop and ask the user**. Nothing above Opus implements.
4. Spec or plan conflict at any level → `NEEDS_RULING` → manager → Opus rules; if the ruling changes the scene list or visible wording, it goes to the user (§12).

---

## 6. Dispatch mapping (Claude Code)

| Hierarchy role | Call |
|---|---|
| Orchestrator | this session, `/model` → Fable 5.1 |
| Manager | `Agent(subagent_type: "general-purpose", model: "opus")` |
| Worker | `Agent(subagent_type: "general-purpose", model: "sonnet")` or `model: "haiku"` |
| Read-only lookup | `Agent(subagent_type: "Explore", model: "haiku")` |
| Skills the orchestrator invokes | `superpowers:writing-plans` (Phase 0) → `superpowers:subagent-driven-development` (execution) → `superpowers:requesting-code-review` (final) → `superpowers:finishing-a-development-branch` |

Briefs, reports and the ledger live as files under `.superpowers/sdd/<plan>/`. Nothing large is pasted into the orchestrator's context; hand over paths.

---

## 7. Handoff protocol

### Brief (manager → worker), one file per task
```
Task:            <id> — <one line on where it fits>
Files you may write:   <exact paths>
Files to read first:   <paths, including CONTRACTS.md sections by number>
Source excerpt:        <word-for-word text from source/ for this scene>
Requirement IDs:       <requirement.md items this task must tick>
Commands to run:       <lint / test / build, exact>
Out of scope:          <what not to touch>
Retry budget:          <rounds before escalation>
Report to:             <path>
```
The brief is the single source of requirements. Workers never receive `MASTER_PROMPT.md` whole.

### Report (worker → manager, manager → Fable), one file per task
```
STATUS: DONE | DONE_WITH_DEVIATIONS | BLOCKED | NEEDS_RULING
Files touched:         <paths>
Commands + exit codes: <lint 0 / test 0 / build 0>
Requirement IDs verified: <list>
Deviations / questions: <only if status is not DONE>
```

### Ledger (Fable, `progress.md`)
First line names the plan file. One line per task completion, one per ruling, one per phase gate. After any context compaction, the ledger and `git log` are the truth, not memory.

---

## 8. Source precedence

1. **PDF visible wording** (`Missing design files.pdf`)
2. **PPTX text** (`Missing_design_files.pptx`, via the W0 dump)
3. **`content-map.md`** — its "Core content" column is a summary, never copy

Line-break artifacts in the PPTX dump are fixed against the PDF; that is Sonnet judgement, not Haiku transcription. Every manifest string passes the W0 verification script before a scene task is DONE. Every deviation from source is one line in a deviations ledger that feeds the §28 report.

---

## 9. Contracts file — `docs/CONTRACTS.md`

Created in Phase 0. **Only Opus edits it.** Workers read it; a worker who needs it changed files `NEEDS_RULING`.

Must define:
- `Scene` as a discriminated union on `kind`, plus a `component` override for the 12 one-offs
- DOM attributes every scene root carries (`data-scene`, `data-slide`, `data-act`, per `TRD.md` §3)
- `progress` API: signature, range, who writes it (engine) and who reads it (scenes)
- Manifest fields `pin` and scroll-length
- Demo transition tables for `CampusBotState`, `RagState`, `SocState` (`TRD.md` §6)
- `MemeAsset` shape + caption / alt / sourceUrl
- Escape precedence: drawer → demo transient UI → nothing
- "Markup visible by default, motion only in effects" — no text may depend on an animation to appear (`requirement.md` H, K)

---

## 10. Phase 0 rulings (Opus, before Task 1)

The docs disagree in these places. Each gets one ruling line in the ledger and the winning value goes into `CONTRACTS.md`.

| Conflict | Where |
|---|---|
| `kind` vocabulary | `PRD.md` §8 (`content`) vs `technical.md` §3 (`editorial`, `data`) vs `content-map.md` (`interaction`, `diagram/form`) |
| CampusBot state names | `TRD.md` §6 `guardrail-off` vs `MASTER_PROMPT.md` §11 `no-guardrail / leak` |
| SOC initial view | `MASTER_PROMPT.md` §14 lists AI summary + Approve/Reject in the initial view and again only after correlation |
| Per-scene `theme` (dark/light/orange) | not in `content-map.md`; read from the PDF per page |
| Single `memeId` for scenes with several candidates | 7 (4, 25), 12 (3, 23), 30 (5, 15, 17), 33 (6, 7), 45 (21, 28) per `content-map.md` |
| Test runner and browser-check tool | none named in `docs/`; pick one of each |

---

## 11. Phases and exit gates

| Phase | Work | Exit gate (Opus signs, Fable records) |
|---|---|---|
| **0 Plan + contracts** | `git init`; Fable writes the implementation plan; Opus writes `CONTRACTS.md` and the §10 rulings; Opus conflict-scans the plan (table in ledger); W0 dump + meme vendoring | repo exists; `CONTRACTS.md` complete; every §10 row ruled; W0 scripts run clean |
| **1 Foundation + Engine + Demos** | W1 → then W2 ‖ W3 | **Visual proof:** scenes 1–3 + one meme scene run in a browser at 1440×900 and Opus approves the motion grammar (`main.md` build order 4, `MASTER_PROMPT.md` §25.6–8); engine tests pass (scroll, snap, nav, keyboard bounds, reduced-motion); all three demos pass their state-transition tests |
| **2 Scenes** | W4 fan-out: Sonnet example per kind → Haiku copy per Act → Sonnet one-offs → Haiku meme rows | 46 scenes render in order; verification script passes; `requirement.md` A and B ticked |
| **3 Integration + final gate** | Opus whole-branch review; one fix dispatch; scoped re-review | `requirement.md` A–K all ticked; `TRD.md` §16 tests green; `technical.md` §18 QA at 1440×900, 1920×1080, 1280×720, 1024×768; `main.md` steps 10–11 done; `npm run lint && npm run build` exit 0; Fable writes the §28 report |

---

## 12. Definition of done, per tier

- **Worker:** brief's acceptance items met; named commands exit 0; only allowed files touched; report filed with a status.
- **Manager:** every worker report reviewed for spec (against `docs/` + `CONTRACTS.md`) and quality; workstream's `requirement.md` IDs ticked; `next build` passes with the workstream merged; report filed to Fable.
- **Opus (Tier 0):** `CONTRACTS.md` stable since Phase 0 or every change ruled; all phase gates signed; whole-branch review clean or residuals adjudicated in the ledger.
- **Fable:** ledger complete; every ruling recorded; §28 report states what was built, which scenes and demos, build/test status, and known deviations — and claims nothing unverified.

### User-only decisions (no agent rules on these)
- Removing, merging, or reordering any of the 46 scenes
- Adding a web font (docs lock Arial / Courier New)
- A missing or ambiguous LinkedIn destination for scene 46
- Whether the "previous project's system" referenced by `README.md` and `MASTER_PROMPT.md` §2 / §25.1–2 must be supplied or is waived — **it is not in this folder**

---

## 13. Concurrency rules

- `git init` before Task 1; work on a branch, never main (`superpowers:using-git-worktrees`).
- Parallel workers get disjoint files or separate worktrees.
- **Single writer** at any moment for `lib/scenes.ts` and the `SceneRenderer` registry; the W4 manager serialises those edits.
- `next build` runs one at a time; managers queue behind Fable's lock line in the ledger.
- Cap concurrent workers at 4 across the whole tree. `ponytail: fixed cap; raise when the ledger shows managers idle-waiting.`
- This folder is under OneDrive. Keep `node_modules/` and `.next/` out of sync (gitignore them and exclude the folder from OneDrive, or build in a worktree outside the synced path).

---

## 14. Dependency allowlist

`next` (App Router), `react`, `react-dom`, `typescript`, `tailwindcss` 4 + `@tailwindcss/postcss`, `gsap` + `@gsap/react`, `framer-motion`, the one test runner and one browser-check tool ruled in Phase 0. No Lenis, no state library, no chart library, no web fonts, no analytics SDK. Anything else needs a ledger ruling first.

---

## 15. Fallback

If nested dispatch ever stops working, the org chart stays as written but dispatch flattens: managers write briefs and review reports; Fable issues the worker `Agent` calls on the manager's behalf.

---

## 16. Starting a build session

1. `/model` → Fable 5.1.
2. Read this file, then `docs/main.md`, `PRD.md`, `TRD.md`, `technical.md`, `design.md`, `content-map.md`, `requirement.md`.
3. Invoke `superpowers:writing-plans` to produce the implementation plan from `docs/`.
4. Run Phase 0 (§11) with Opus.
5. Invoke `superpowers:subagent-driven-development` and dispatch the four managers per §3.
