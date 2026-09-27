# AI × Cybersecurity × Entrepreneurship — Animated Website

Documentation package for converting the supplied 46-page presentation into a single-page, scroll-driven interactive web experience.

## Source material
- `Missing_design_files.pptx` — 46-page source presentation.
- `Missing design files.pdf` — rendered/reference version of the same presentation.
- `AI_Cyber_Startup_28_Memes.html` — 28 meme assets and captions.

## Decisions locked from requirements
- Hybrid presentation + scrollytelling.
- All 46 source pages remain 1:1 as web scenes.
- Visual direction is a web-native reinterpretation of the deck, not a pixel copy.
- Key concepts animate step-by-step on scroll.
- The three live demos become real interactive mini-apps.
- Memes are used selectively; custom web-native meme treatments may be added.
- Persistent side navigation.
- Desktop-first/presentation experience.
- No sound.
- Single-page application.
- Speaker CTA is clickable.
- Same overall PPT-to-animated-website system as the previous project.

## Additional defaults used because they were not answered before generation
1. Scene navigation uses soft snapping: the page can scroll freely, but settles cleanly onto scene boundaries after input. It must not trap the user in a scroll jail.
2. The three demos are genuinely interactive and can be experimented with, while still having a guided default narrative.
3. The opening has a short cinematic entrance before the first scroll interaction.
4. Mouse wheel, trackpad, touchpad, `Arrow` keys, `PageUp/PageDown`, `Home/End`, and `Space` are supported where sensible.
5. Sources are presented minimally on-scene and can expand into a compact source drawer.
6. The final scene includes a secondary `Start the 30-day challenge` action that jumps to Scene 44.
7. Meme images should be vendored locally for production reliability rather than depending on live Memegen URLs at runtime.

## Files
- `PRD.md` — product requirements and user experience.
- `TRD.md` — technical requirements and architecture.
- `design.md` — visual system, motion, layouts, and interaction language.
- `technical.md` — implementation details, modules, state machines, performance, accessibility, and deployment.
- `requirement.md` — acceptance criteria and edge-case checklist.
- `main.md` — master project brief / build contract.
- `content-map.md` — complete 46-scene content and interaction map.
- `MASTER_PROMPT.md` — ready-to-use prompt for Claude/code-generation agents.
