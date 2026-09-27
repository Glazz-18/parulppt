# Design System & Interaction Direction

## 1. Creative direction
**Dark editorial × technical field notes × live demo interface × startup culture.**

The web experience should inherit the supplied deck's visual restraint and contrast but use the dimensionality of a browser: layers, sticky elements, scroll choreography, cursor/focus states, and interactive panels.

Do not redesign the concept into a generic "futuristic AI" website. Avoid glowing neon grids, space backgrounds, 3D planets, terminal cosplay, or generic cyberpunk motifs.

## 2. Visual language
The presentation is built around:
- near-black canvas for technical/dense scenes;
- warm paper canvas for reflective/editorial scenes;
- orange interruption scenes for memes and strong rhetorical beats;
- green as a security/approval/safe-state accent;
- mono typography for metadata, source lines, labels, times, and system messages;
- large sans typography for headlines.

## 3. Typography
### Sans
Arial, Helvetica, sans-serif.
Use for:
- scene titles;
- explanatory copy;
- large numbers;
- CTA labels.

### Mono
Courier New, Courier, monospace.
Use for:
- act labels;
- system prompt text;
- timestamps;
- event IDs;
- source labels;
- small technical annotation.

## 4. Type hierarchy
Use a fluid scale rather than copying PPT point sizes literally.

Suggested 1440px reference:
- Hero statement: 96–148px, tight line-height.
- Major title: 56–84px.
- Section title: 40–64px.
- Numeric emphasis: 64–140px depending on scene.
- Body: 20–28px.
- Metadata: 12–16px mono, letter-spaced.

The goal is visual hierarchy, not maximal text size on every slide.

## 5. Layout grid
Reference canvas: 1440 × 900.

Use a 12-column grid with generous outer margins.

Desktop scene padding:
- horizontal: 5–6vw;
- vertical: 6–8vh.

Complex diagrams may use full-width inner canvases.

## 6. Shape language
- Mostly rectangular containers.
- Thin 1px rules.
- Minimal corner radius on functional cards.
- Avoid excessive pill UI.
- Large numerals and labels are encouraged.
- Use asymmetry and whitespace deliberately.

## 7. Background strategy
### Dark
`#0F1217`

Use white/off-white type and restrained gray structure.

### Light
`#F4F1EA`

Use dark type, orange micro-labels, gray rules.

### Orange
`#F47F46`

Use as an interruption color for meme slides, reactions, and hard rhetorical resets.

### Green
`#12C281`

Use for safe/approved/security-positive states, especially in interactive demos.

## 8. Scene transition grammar
Every scene should feel like it belongs to the same system.

### Enter
- Metadata appears first.
- Main title or central object follows.
- Supporting content reveals last.

### Exit
- Do not simply fade the whole screen out.
- Let the dominant visual hand off into the next scene through shared geometry, color, or a moving anchor.

Examples:
- a large number collapses into a timeline marker;
- a document card becomes a source card in the next scene;
- an orange meme field cuts abruptly into a dark technical scene;
- a green approval state becomes the accent line of the next scene.

## 9. Scroll choreography
Scroll should reveal narrative beats.

### Example — RAG
```text
0.00–0.16  Question appears
0.16–0.34  Search activates
0.34–0.52  Vector DB expands
0.52–0.68  Top-3 chunks rank in
0.68–0.84  LLM receives chunks
0.84–1.00  Answer lands
```

### Example — attacker timeline
Animate the timeline left-to-right while values lock into their positions.

### Example — defender stack
Reveal from top application layer downward into runtime/dependencies/code, then show the human approval gate.

## 10. Meme/interstitial scenes
Orange scenes should be fast, bold interruptions.

Rules:
- minimal UI;
- single dominant meme/image or custom comic treatment;
- huge headline or punchline;
- optional tiny `ACT / SECTION` metadata;
- short dwell, then immediate transition back to content.

The supplied deck uses reaction-image placeholders on multiple slides. The web implementation can replace those placeholders with the corresponding local meme assets while preserving the timing role of the scene.

## 11. Interactive demo design
### Shared demo shell
Each demo gets:
- top metadata;
- title;
- left narrative area;
- right/center interactive workspace;
- state indicator;
- one or two obvious actions;
- small explanatory caption.

Avoid dashboard overload. These are demonstrations, not production tools.

### CampusBot
Visual motif: prompt/system message stack.

- System prompt = muted mono card.
- User = light card.
- Bot = dark/contrast card.
- Blocked = green status.
- Guardrail-off leak = orange/red emphasis.

### RAG poison
Visual motif: document stack + retrieval path.

Use an indexed-document list, ranking indicators, and a compact answer panel.

### SOC
Visual motif: overwhelming event stream collapsing into one incident narrative.

10,412 should initially feel dense. When correlation is activated, unrelated alerts compress visually and four evidence events form a coherent chain.

## 12. Data visualization
Do not use generic chart libraries for simple deck-native visuals unless needed.

Prefer:
- CSS bars;
- SVG lines;
- DOM markers;
- text-led timelines;
- animated counters;
- simple geometric diagrams.

Charts should remain faithful to the source deck's visual intent. Avoid changing values or creating extra quantitative interpretation.

## 13. Side navigation
Persistent desktop rail:
- narrow by default;
- expands on hover/focus if helpful;
- current scene gets a visible marker;
- act labels use mono uppercase typography;
- scene number uses a small numeric marker.

On very narrow widths, collapse to a top/bottom compact progress indicator rather than covering content.

## 14. Controls
Visible controls should remain subtle:
`Previous`, `Next`, scene number, progress.

Do not turn the website into a video player UI.

## 15. Source drawer
Default state: tiny mono `SOURCE` label.

On click/focus:
- open a compact side panel;
- list exactly the source text supplied in the deck for that scene;
- allow escape/click-outside close;
- do not dominate the primary narrative.

## 16. Opening
The opening should feel cinematic but restrained.

Suggested sequence:
1. black background;
2. tiny mono eyebrow;
3. `BUILD.` appears;
4. `BREAK.` cuts in;
5. `SECURE.` lands in green;
6. `SCALE.` returns to off-white;
7. speaker attribution settles at the bottom.

This mirrors the supplied title slide while using motion to establish the site's language.

## 17. Final scene
Use the source closing copy as the hero statement. Speaker information is a clear secondary block.

CTA options:
- primary external CTA: LinkedIn;
- secondary in-page CTA: `Start the 30-day challenge` → Scene 44.

## 18. Motion accessibility
Reduced motion should retain:
- scene order;
- content visibility;
- demo interactions;
- navigation.

Only remove choreography, parallax, large scale transitions, and scrub-heavy animation.
