# Product Requirements Document

## 1. Product
**AI × Cybersecurity × Entrepreneurship — Interactive Animated Presentation**

A single-page, desktop-first web experience that translates the supplied 46-page presentation into an immersive, scroll-driven narrative. The site should feel like an editorial interactive keynote rather than a conventional slide deck.

## 2. Source of truth
The supplied PPT/PDF defines the content order, wording, narrative, facts, labels, and scene inventory. The meme HTML defines the supplemental meme library. Do not invent new claims or substitute outside facts unless explicitly instructed in a future revision.

## 3. Product goals
1. Preserve the complete 46-scene story in order.
2. Make the story feel native to the web through scroll choreography, spatial transitions, and interactive demos.
3. Turn the three live demos into usable interactions rather than static screenshots.
4. Retain the deck's dark editorial visual identity while improving web hierarchy and responsiveness.
5. Make the audience feel progression through the Acts without adding unnecessary UI chrome.
6. Keep the presentation usable for a speaker/demo setting as well as a self-guided viewer.

## 4. Non-goals
- Building a CMS.
- Building authentication or user accounts.
- Building a general-purpose presentation editor.
- Replacing the supplied source content with a new talk.
- Adding background music.
- Designing a full mobile-first version.

## 5. Primary user journeys
### Journey A — self-guided visitor
Landing → opening title → scroll through all scenes → interact with demos → inspect source notes → reach challenge → connect with speaker.

### Journey B — presenter/demo mode
Open page → navigate with keyboard/scroll/side nav → pause on a scene → run a demo → move to next scene → jump to a target Act when necessary.

### Journey C — return to challenge
From final scene → `Start the 30-day challenge` → Scene 44 → complete the challenge narrative → return/end.

## 6. Information architecture
Single route:

`/`

The route contains 46 ordered scenes grouped into Acts. There may be utility overlays/drawers, but no page navigation is required.

### Acts
- Act 1 — The World Changed: Scenes 2–3
- Act 2 — Break AI / Live Demos: Scenes 4–8
- Act 3 — Guardrails: Scenes 9–15
- Act 4 — Cyber in the AI Era: Scenes 16–28
- Act 5 — Security → Startup / Compliance / Keep It Simple: Scenes 29–40
- Act 6 — Students as Builders: Scenes 41–41
- Act 7 — Network: Scenes 42–43
- Act 8 — Call to Action: Scenes 44–46

Scene 1 is the global title/opening.

## 7. Experience principles
### Editorial first
Large type, deliberate whitespace, small metadata labels, strong pacing, and occasional full-bleed statement scenes.

### Motion explains, not decorates
Animation must communicate sequence, causality, comparison, or emphasis. Avoid continuous decorative motion that competes with reading.

### Contrast creates rhythm
Alternate dark informational scenes, warm paper-like scenes, orange meme/interstitial scenes, and a small number of green security/highlight moments.

### Interactive where the talk invites it
The three demo scenes must behave like simplified product interfaces with deterministic outcomes.

## 8. Scene model
Every scene is a structured object, not hard-coded JSX scattered through the tree.

Suggested schema:
```ts
export type Scene = {
  id: string;
  slide: number;
  act?: string;
  kind: 'title' | 'content' | 'demo' | 'meme' | 'timeline' | 'diagram' | 'cta' | 'network' | 'challenge';
  theme: 'dark' | 'light' | 'orange';
  eyebrow?: string;
  title?: string;
  content?: unknown;
  sourceNotes?: string[];
  memeId?: number;
  interactions?: string[];
};
```

## 9. Live demos
### Demo 1 — CampusBot prompt injection
Scene 4.

Required interaction:
- Show system instruction.
- Show user question.
- Show compliant rejection.
- Allow user to trigger a role-play attack.
- Provide a `Guardrail OFF` and `Guardrail ON` state.
- OFF can expose the fictional training secret `CAMPUS-42`.
- ON blocks and records a protected-value event.
- Make it clear this is a fictional demonstration.

### Demo 2 — poisoned RAG policy folder
Scene 6.

Required interaction:
- Show indexed documents.
- Show a hidden planted instruction.
- Ask `What is the minimum attendance?`
- Provide a `Before` state with the source answer from `attendance_policy.pdf`.
- Provide an `After the plant` state showing the poisoned answer and untrusted link.
- `Fixed` state excludes the unapproved source and strips the link.
- The interaction should visually separate retrieval from authorization.

### Demo 3 — SOC alert correlation
Scene 23.

Required interaction:
- Show 10,412 alerts.
- Let the user inspect the four linked events.
- Collapse the 10,408 unrelated alerts.
- Show AI copilot summary.
- Require human approval before the proposed response is committed.
- `Approve` and `Reject` are both explicit UI outcomes.
- The experience should visually communicate MTTD/MTTR improvement without pretending the data is a live SOC.

## 10. Navigation
Persistent side rail on desktop:
- Act label.
- Scene progress.
- Current scene indicator.
- Clickable Act/scene navigation.

Additional controls:
- Previous/next affordance.
- Keyboard controls.
- Progress indicator.

The nav must never obscure critical scene content.

## 11. Sources
On-scene source lines remain visually minimal. Clicking/expanding a source indicator opens a compact drawer or popover. The source wording comes from the PPT/PDF. Do not replace it with invented references.

## 12. Speaker CTA
Final scene:
- Preserve the supplied speaker name, title, and LinkedIn destination.
- Add a secondary `Start the 30-day challenge` action jumping to Scene 44.
- CTA should be keyboard accessible and visually distinct.

## 13. Responsive requirement
Desktop is the primary target. The experience should gracefully degrade below the intended presentation viewport, but no separate mobile art direction is required.

Recommended baseline:
- Design target: 1440×900.
- Supported desktop range: approximately 1280px wide and above.
- Below that, preserve content access with reduced decorative scale and fewer simultaneous elements.

## 14. Accessibility
- Respect `prefers-reduced-motion`.
- Every interactive control has a visible focus state.
- Semantic landmarks where appropriate.
- Keyboard navigation works for all meaningful interactions.
- Color is not the only way to communicate a state.
- Text remains selectable/readable.

## 15. Performance goals
- No single scene should require large synchronous JavaScript payloads.
- Lazy-load meme assets and noncritical media.
- Keep animation transforms GPU-friendly.
- Avoid rendering all heavy demo DOM at once when it is not necessary.
- Use local assets in production.

## 16. Definition of done
The product is complete when:
- All 46 scenes exist in order.
- Every scene matches the source content intent.
- The three demos are genuinely interactive.
- Scroll animation is deterministic and reversible.
- Side navigation, keyboard controls, CTA, and source drawer work.
- Reduced-motion mode is usable.
- No runtime dependency on the external meme CDN is required.
- The site can be built and deployed as a normal Next.js production build.
