# Technical Requirements Document

## 1. Recommended stack
- Next.js (App Router)
- TypeScript
- React
- Tailwind CSS for utility/layout styling
- GSAP + ScrollTrigger for scroll choreography and timeline control
- Framer Motion for component-level presence, overlays, focus/hover transitions, and lightweight UI motion
- Optional Lenis-style smooth scrolling only if it does not interfere with native input/accessibility
- Local static assets in `public/`

Do not introduce a state-management library unless real global complexity requires it.

## 2. Application architecture
```text
app/
  page.tsx
  layout.tsx
  globals.css
components/
  presentation/
    Presentation.tsx
    SceneRenderer.tsx
    SceneViewport.tsx
    SceneProgress.tsx
    SideNav.tsx
    SceneControls.tsx
  scenes/
    TitleScene.tsx
    ContentScene.tsx
    MemeScene.tsx
    TimelineScene.tsx
    RagDemo.tsx
    CampusBotDemo.tsx
    SocDemo.tsx
    ChallengeScene.tsx
    NetworkScene.tsx
    FinalScene.tsx
  ui/
    SourceDrawer.tsx
    Tooltip.tsx
    StatusPill.tsx
lib/
  scenes.ts
  sceneNavigation.ts
  demoState.ts
  constants.ts
public/
  memes/
  icons/
  textures/
```

## 3. Scene engine
Use a centralized scene manifest.

```ts
export const scenes: Scene[] = [
  // 46 entries, one per supplied source page
];
```

`SceneRenderer` selects a scene component by `kind`.

Every scene should expose a scene root with:
```html
<section data-scene="scene-23" data-slide="23" data-act="act-4"></section>
```

This enables ScrollTrigger, analytics/debugging, and deterministic navigation.

## 4. Scroll system
Use one long page with scene sections.

Recommended pattern:
```text
root
 ├─ scene-01
 ├─ scene-02
 ├─ ...
 └─ scene-46
```

Each scene has a scroll progress range. Within that range, GSAP timelines animate the scene's semantic beats.

Do not create 46 permanently pinned elements. Pin only scenes that need staged visual choreography, and release them predictably.

### Soft snapping
At the end of wheel/touchpad input, snap toward the nearest scene boundary. Snapping must:
- be interruptible;
- never prevent manual backward scrolling;
- avoid fighting keyboard navigation;
- be disabled or simplified under reduced-motion preferences.

## 5. Scene timeline model
Each complex scene can define:
```ts
export type SceneBeat = {
  id: string;
  start: number; // 0..1
  end: number;   // 0..1
  action: 'fade' | 'slide' | 'scale' | 'draw' | 'reveal' | 'counter' | 'state';
};
```

Use scrubbed timelines for diagrams, sequences, and comparisons. Use short non-scrubbed transitions for UI overlays only.

## 6. Interaction states
### CampusBot
```ts
type CampusBotState = 'baseline' | 'roleplay' | 'guardrail-off' | 'guardrail-on';
```

### RAG
```ts
type RagState = 'before' | 'poisoned' | 'fixed';
```

### SOC
```ts
type SocState = 'queue' | 'investigating' | 'correlated' | 'pending-approval' | 'approved' | 'rejected';
```

Each state must have a visible state label and transition.

## 7. Demo safety and scope
The demos are synthetic illustrations, not live cyber tooling.

Do not make network calls to real systems from the demo. Do not execute shell commands. Do not expose real secrets. All sample values are fictional and local to the app.

## 8. Asset strategy
Vendor meme images locally. Preserve a manifest:
```ts
export type MemeAsset = {
  id: number;
  title: string;
  template: string;
  src: string;
  suggestedScenes: number[];
};
```

Keep original source URLs as metadata for attribution/debugging, but runtime rendering should use local copies.

The deck's visual identity can be recreated using CSS rather than rasterizing PPT pages.

## 9. Typography
The supplied PPT uses Arial and Courier New. The implementation should retain these as the baseline font families:
```css
--font-sans: Arial, Helvetica, sans-serif;
--font-mono: "Courier New", Courier, monospace;
```

Do not add a web font dependency unless explicitly approved later.

## 10. Design tokens
```css
--bg-dark: #0F1217;
--bg-light: #F4F1EA;
--orange: #F47F46;
--green: #12C281;
--text-light: #F4F1EA;
--text-dark: #15171B;
--muted-dark: #A7ADB5;
--muted-light: #77736B;
--border-dark: #2B3038;
--border-light: #D9D4C8;
```

These tokens are derived from the supplied presentation styling and should be treated as the initial visual system, not as an invitation to introduce a completely different palette.

## 11. Browser behavior
Target modern Chromium, Safari, and Firefox desktop browsers.

Use feature detection for advanced effects. The experience must retain a readable base layer when GPU-heavy effects fail.

## 12. Accessibility implementation
- Use real buttons for controls.
- Use buttons/links rather than clickable `div`s.
- `aria-current` on current nav scene.
- `aria-expanded` for source drawers.
- `aria-live="polite"` for demo status changes.
- Provide text equivalents for visual-only diagrams when necessary.
- `prefers-reduced-motion: reduce` should replace scrubbed scene choreography with simple reveals or static states.

## 13. SEO / metadata
Because the product is a single interactive page, include:
- title
- description
- Open Graph metadata
- speaker attribution
- no misleading page schema

## 14. Deployment
Recommended deployment target: Vercel or equivalent Node-capable platform.

No server-side database is required for the base experience.

## 15. Analytics
No analytics requirement is currently defined. Do not add third-party tracking by default.

Provide optional internal event hooks so analytics can be added later:
```ts
scene_enter
scene_complete
demo_interaction
cta_click
source_open
```

## 16. Testing
Minimum test coverage:
- scene index renders 46 scenes;
- scene navigation maps correctly;
- each demo transitions through all states;
- keyboard controls do not scroll past bounds unexpectedly;
- source drawer opens/closes;
- reduced-motion mode avoids GSAP-heavy behavior;
- build succeeds without remote asset requirements.
