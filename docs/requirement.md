# Requirements & Acceptance Checklist

## A. Content fidelity
- [ ] Exactly 46 source scenes exist.
- [ ] Scene numbering matches source pages 1–46.
- [ ] Acts and act labels are preserved.
- [ ] Text is transcribed from the supplied source, not re-written for style.
- [ ] Source notes are retained on applicable scenes.
- [ ] Speaker attribution is preserved.
- [ ] Final LinkedIn destination is preserved.

## B. Visual fidelity to the source language
- [ ] Dark/light/orange rhythm is preserved.
- [ ] Orange and green accent roles remain recognizable.
- [ ] Arial / Courier New baseline is preserved.
- [ ] Mono metadata is distinct from headline copy.
- [ ] Large editorial typography is a core composition tool.
- [ ] Thin rules and generous whitespace remain part of the design.
- [ ] Meme slides remain visually disruptive rather than becoming generic cards.

## C. Interaction
- [ ] Scroll advances through all scenes.
- [ ] Scroll-driven beats are reversible.
- [ ] Soft scene snapping does not trap or lock the user.
- [ ] Side navigation works.
- [ ] Previous/Next controls work.
- [ ] Keyboard navigation works outside text-entry controls.
- [ ] Home/End work.
- [ ] Source drawer opens/closes.

## D. Live demo 1 — CampusBot
- [ ] Baseline refusal is visible.
- [ ] Role-play interaction can be triggered.
- [ ] Guardrail-off state demonstrates the fictional secret leak.
- [ ] Guardrail-on state blocks the leak.
- [ ] Status text changes deterministically.
- [ ] Reset is available.

## E. Live demo 2 — RAG
- [ ] Indexed documents visible.
- [ ] Hidden planted instruction represented.
- [ ] Before answer represented.
- [ ] Poisoned answer represented.
- [ ] Fixed answer represented.
- [ ] Unapproved source exclusion is visible.
- [ ] Link stripping is visible.
- [ ] Retrieval ≠ authorization message remains clear.

## F. Live demo 3 — SOC
- [ ] Queue count 10,412 is shown.
- [ ] Four linked events are inspectable.
- [ ] Remaining 10,408 alerts are represented without 10,408 DOM nodes.
- [ ] AI summary is visible.
- [ ] Evidence chain is visible.
- [ ] Human approval gate exists.
- [ ] Approve and Reject are distinct outcomes.
- [ ] Reset is available.

## G. Navigation edge cases
- [ ] User cannot navigate before Scene 1.
- [ ] User cannot navigate after Scene 46.
- [ ] Repeated clicks do not queue hundreds of scroll animations.
- [ ] Rapid scroll input does not create duplicate ScrollTriggers.
- [ ] Navigation remains usable while a source drawer is open.
- [ ] Escape closes transient overlays.

## H. Motion edge cases
- [ ] Reduced-motion mode renders all content.
- [ ] A disabled animation does not hide text permanently.
- [ ] Scroll-linked elements cannot become stuck offscreen.
- [ ] Refresh in the middle of the page still renders the nearest scene correctly.

## I. Asset edge cases
- [ ] Broken meme asset has a fallback.
- [ ] No runtime dependency on external Memegen URLs is required.
- [ ] Alt text exists for meaningful images.
- [ ] Meme assets remain legible at 1280×720.

## J. Desktop constraints
- [ ] Primary target is desktop/presentation view.
- [ ] 1440×900 is the reference design canvas.
- [ ] 1920×1080 is visually stable.
- [ ] 1280×720 remains usable.
- [ ] Narrow layouts degrade gracefully without introducing a separate mobile design system.

## K. Quality
- [ ] No console errors in production build.
- [ ] No hydration mismatch warnings.
- [ ] No abandoned event listeners/ScrollTriggers after route lifecycle changes.
- [ ] No unbounded animation loops.
- [ ] No unneeded third-party trackers.
- [ ] `npm run build` succeeds.
