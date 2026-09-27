# Master Prompt — Build the AI × Cybersecurity × Entrepreneurship Animated Website

You are a senior creative developer, product designer, motion designer, and frontend engineer. Build a production-quality single-page interactive website from the supplied 46-page presentation and accompanying meme HTML.

## 0. Non-negotiable source rule
The supplied PPT/PDF is the content and narrative source of truth. Preserve its order, terminology, labels, numbers, names, quotes, and source lines. Do not silently fact-check, update, correct, replace, or expand the presentation's claims.

Use the accompanying meme HTML as the source for the supplied meme assets/captions. Use memes selectively, according to the scene map.

## 1. Product brief
Transform a 46-page presentation titled around **AI × Cybersecurity × Entrepreneurship** into a web-native keynote.

The presentation's visual identity is editorial, dark, technical, warm, restrained, and slightly irreverent. It is not a generic futuristic AI landing page.

The site is a **single page** containing **46 scenes**, exactly one scene corresponding to each source page.

## 2. Locked requirements
- Hybrid presentation + scrollytelling.
- 46 scenes, 1:1 source-page mapping.
- Web-native visual reinterpretation, not pixel-for-pixel PPT recreation.
- Scroll-driven, step-by-step animation.
- Three genuine interactive mini-demos.
- Selective meme use with local production assets.
- Persistent side navigation.
- Desktop-first / presentation-oriented experience.
- No sound.
- Single route.
- Clickable speaker CTA.
- Same overall PPT-to-animated-website system used for the previous project.

## 3. Sensible implementation defaults
Where the user did not answer a remaining design choice, use these defaults:
- soft scene snapping rather than hard scroll trapping;
- interactive demos are experimentable but have a guided default flow;
- opening uses a short cinematic entrance;
- keyboard controls include arrows, PageUp/PageDown, Home, End, and Space where appropriate;
- source lines use a compact expandable drawer;
- final scene contains a secondary `Start the 30-day challenge` jump to Scene 44;
- meme images are vendored locally rather than fetched live at runtime.

## 4. Tech stack
Use:
- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- GSAP + ScrollTrigger
- Framer Motion

Do not add large libraries unless necessary. Keep the runtime lean.

## 5. Build architecture
Create a data-driven scene manifest with 46 objects.

Suggested structure:
```text
app/
components/
  presentation/
  scenes/
  ui/
lib/
public/
  memes/
```

Create one `SceneRenderer` that maps scene `kind` to reusable scene components.

Do not scatter all 46 scene definitions across arbitrary components.

## 6. Design tokens
Use these starting tokens derived from the supplied deck:
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

Typography baseline:
```css
--font-sans: Arial, Helvetica, sans-serif;
--font-mono: "Courier New", Courier, monospace;
```

Do not replace this with a cyberpunk/web3 palette.

## 7. Design behavior
Think like a magazine and a keynote at the same time.

Use:
- massive headline typography;
- mono micro-labels;
- asymmetric compositions;
- deliberate whitespace;
- thin rules;
- high contrast;
- a small number of accent colors;
- shared geometry between transitions.

Avoid:
- neon gradients;
- glowing grid backgrounds;
- fake 3D space imagery;
- generic SaaS dashboards;
- unnecessary glassmorphism;
- constant parallax.

## 8. Opening sequence
Scene 1 should recreate the supplied title concept as motion:
1. mono eyebrow `AI × CYBERSECURITY × ENTREPRENEURSHIP`;
2. `BUILD.`
3. `BREAK.` in orange;
4. `SECURE.` in green;
5. `SCALE.`;
6. speaker attribution.

Use staggered timing and a slight sense of physical type movement. Keep it restrained.

## 9. Scroll engine
The page contains 46 sections.

Use ScrollTrigger for scenes that need scrubbed progression. Avoid pinning all scenes.

At scene boundaries, use soft snapping when input stops. The user must always be able to reverse scroll.

Do not create a scroll jail where the browser wheel is trapped for long periods.

## 10. Scene choreography rules
For standard scenes:
- metadata enters first;
- title follows;
- supporting details appear last.

For diagrams:
- reveal causality in sequence.

For data scenes:
- introduce the label before the number;
- number lands with a small emphasized motion;
- context follows.

For memes:
- hard visual interruption;
- minimal UI;
- short, punchy motion.

For demos:
- animate only meaningful state changes;
- user action should produce immediate deterministic feedback.

## 11. Demo 1 — CampusBot
Source scene: 4.

Build a real interactive UI.

Required states:
```text
baseline
roleplay
no-guardrail / leak
guardrail-on / blocked
```

The fictional system prompt includes a hidden staff code. The fictional leaked value is `CAMPUS-42`.

Important:
- This is a local deterministic simulation.
- Do not call an LLM.
- Do not make network requests.
- Make the system prompt, user prompt, assistant response, and guardrail status visually clear.
- Include reset.

## 12. Demo 2 — poisoned RAG
Source scene: 6.

Build a local simulated document index.

Documents:
- attendance_policy.pdf
- exam_policy.pdf
- placement_policy.pdf
- policy_update_oct.docx

Represent the hidden planted instruction exactly as supplied in the deck.

States:
1. `Before` → correct answer from approved source.
2. `After the plant` → poisoned answer + untrusted link.
3. `Fixed` → unapproved source excluded + link stripped.

Make the distinction between **retrieval** and **authorization** one of the core visual lessons.

## 13. Meme interstitials
The HTML contains 28 meme assets. Do not make a meme gallery.

Use the relevant meme at the moment where the talk itself uses a reaction-image beat. Replace/augment some meme slides with a custom web-native treatment only when it improves pacing, while preserving the original joke/copy intent.

Vendor images locally.

## 14. Demo 3 — SOC alert correlation
Source scene: 23.

Create a synthetic SOC interface.

Initial view:
- `Alert queue · 10,412`
- four linked events;
- 10,408 unrelated represented compactly;
- AI copilot summary;
- evidence chain;
- risk;
- suggested response;
- `Approve` / `Reject`.

When the user triggers correlation:
- visually collapse unrelated noise;
- highlight the four evidence events;
- form the attack path;
- show the AI summary;
- require human approval.

Do not render 10,412 individual DOM nodes.

## 15. Navigation
Persistent desktop side rail should show:
- current Act;
- current scene;
- progress;
- click targets for navigation.

Implement:
- previous;
- next;
- arrow keys;
- PageUp/PageDown;
- Home/End;
- Space where safe.

Never hijack keyboard input inside a text field/control.

## 16. Sources
On applicable scenes, show a small mono `SOURCE` trigger.

When opened, display the source text supplied by the deck in a compact drawer.

Do not add external sources or current-date research unless a later user explicitly requests verification.

## 17. Final CTA
Scene 46 must preserve the closing copy and speaker attribution from the source.

Provide:
- clickable LinkedIn CTA using the supplied destination;
- in-page `Start the 30-day challenge` action that jumps to Scene 44.

## 18. Scene list
Implement these exact scene purposes:
1 title
2 three hands
3 AI is bigger than ChatGPT
4 CampusBot demo
5 RAG flow
6 RAG poisoning demo
7 RAG ≠ authorization meme
8 lethal trifecta
9 guardrails
10 chatbot vs agent meme
11 agent loop
12 over-permissioned agent meme
13 attack surface
14 supply chain
15 shadow AI
16 six security letters
17 human attack surface/Aarav
18 verify a human
19 attacker clock
20 defender clock
21 MTTR meme
22 alert fatigue meme
23 SOC demo
24 AI finds bug
25 AI writes bug
26 AI fixes bug
27 defender AI stack
28 MTTD/MTTR
29 every security problem is a product
30 problem discovery meme
31 security is a market
32 feature moat vs trust moat
33 governance debt meme
34 governance debt curve
35 India governance runway
36 MOAT
37 KISS
38 security programme on one page
39 simple system closing statement
40 hackathon meme
41 student skill stack
42 networking meme
43 networking 60s interaction
44 30-day challenge
45 start now meme
46 closing CTA

Use `content-map.md` for detailed scene descriptions.

## 19. Scene-specific interaction ideas
Implement at minimum:
- Scene 2: numbered items reveal one by one.
- Scene 3: pointer/path moves across role progression.
- Scene 5: RAG pipeline reveals one stage at a time on scroll.
- Scene 8: three threat conditions build until `Exploitable` lands.
- Scene 9: guardrail layers stack into the frame.
- Scene 11: agent loop physically cycles.
- Scene 13: five attack-surface layers appear as an expanding system.
- Scene 14: dependency graph expands from three visible actors into many dependencies.
- Scenes 19–20: timelines scrub horizontally.
- Scene 24: chronological cards reveal findings.
- Scene 26: `Find → Verify → Patch → Human approves` animates into an approval gate.
- Scene 27: stack reveals from AI apps to code.
- Scene 29: problem → product mapping appears as transformations.
- Scene 32: feature moat and trust moat separate spatially.
- Scene 34: governance debt curve rises across growth phases.
- Scene 35: date timeline progresses through the supplied governance milestones.
- Scene 36: M.O.A.T. letters reveal one at a time.
- Scene 37: K.I.S.S. letters reveal one at a time.
- Scene 38: five-question security programme behaves like a lightweight checklist/form.
- Scene 41: skill stack builds across Human / Business / Building / Technical.
- Scene 43: 60-second networking challenge can visually count down.
- Scene 44: four-week challenge fills across the timeline.

## 20. 60-second networking interaction
Scene 43 should include a local countdown UI:
- start at 60s;
- reveal four prompts:
  1. Name
  2. Course and year
  3. One skill
  4. One thing you're building
- allow pause/restart;
- no network or submission.

This is a presentation interaction, not a backend form.

## 21. 30-day challenge
Scene 44 should make the supplied sequence legible:
- Day 1–3 — Find one problem
- Day 4–7 — Talk to five people
- Week 2 — Build one workflow
- Week 3 — Test with real users
- Week 4 — Secure it, then publish

Animate the timeline as the visitor progresses through the scene.

## 22. Accessibility
Implement:
- semantic buttons/links;
- focus states;
- keyboard navigation;
- `aria-current` on current scene;
- `aria-expanded` for drawer states;
- `aria-live="polite"` for demo status changes;
- `prefers-reduced-motion` support.

In reduced-motion mode, keep all information visible using simple opacity/instant state changes and remove scrub-heavy choreography.

## 23. Performance rules
- Use transforms/opacity where possible.
- Lazy-load below-the-fold images.
- Locally serve meme images.
- Avoid huge SVGs.
- Do not render the 10,408 unrelated alerts individually.
- Avoid continuous RAF loops when ScrollTrigger can handle the job.
- No autoplay video.

## 24. Failure handling
If an animation fails:
- scene content must remain visible;
- navigation must remain functional;
- demos must still have usable state controls.

If an image is missing:
- show a styled fallback block with the meme title/caption.

## 25. Implementation workflow
Before writing the entire site:
1. Inspect the existing repo.
2. Reuse existing infrastructure where possible.
3. Set up tokens/fonts.
4. Build a polished SceneShell.
5. Build side nav and global navigation.
6. Implement scenes 1–3 as a visual proof.
7. Implement CampusBot/RAG/SOC demos.
8. Implement the remaining scenes from `content-map.md`.
9. Run through the acceptance checklist.
10. Refine motion and performance.

Do not stop after scaffolding. Complete the functional website.

## 26. Code quality
- TypeScript strict mode.
- No `any` unless unavoidable and documented.
- Reusable components.
- Small, readable scene components.
- Clear naming.
- No magic numeric scroll offsets scattered across files.
- No duplicated navigation logic.
- No dead dependencies.

## 27. Visual QA standard
The finished result must feel like a coherent authored experience. Do not make 46 unrelated webpage sections that merely contain the PPT copy.

Every scene should share:
- type system;
- metadata language;
- spacing rhythm;
- motion grammar;
- transition discipline.

## 28. Final response after implementation
When the implementation is complete, report:
- what was built;
- which scenes/demos were implemented;
- build/test status;
- any known deviations from source.

Do not claim exact fidelity where the provided assets/text do not support it.
