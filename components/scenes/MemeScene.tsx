'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { SceneProps } from '@/lib/types';
import { MemeInterstitial } from '@/components/ui/MemeInterstitial';
import { memes } from '@/lib/memes';
import { useSceneProgress } from '@/components/presentation/SceneProgress';
import { useProgressRef } from './ContentScene';

// design §10: fast, bold orange interruption — minimal UI, one dominant meme, huge punchline.
// MemeInterstitial (W1, not edited here) renders eyebrow/h2/lines/box as flat siblings inside
// one wrapper div, so typography and layout are applied here via descendant selectors on that
// wrapper (CONTRACTS/design instruction) rather than per-element refs or new props.
const BASE_WRAPPER_CLASSES = [
  'relative flex flex-1 flex-col justify-center gap-6',
  // MemeInterstitial's own root div: lay its children out with breathing room, AND cap its own
  // width here (fix round 2, finding 1 -- moved off the outer wrapper below, which must now span
  // the full content column so the hand-off field's vw-based bleed margins reach the section's
  // true edges instead of an 880px-narrower box's edges).
  // gap-5 -> gap-4 (overflow fix, round 2): a small, universal trim -- every meme scene has 3-4
  // gaps here (eyebrow/headline/body-lines/box), so this buys back a little headroom on the
  // tightest slides without being noticeable on the roomy ones.
  '[&>div]:flex [&>div]:flex-col [&>div]:gap-4 [&>div]:max-w-[880px]',
  // Zero default margins; the flex gap above owns all spacing.
  '[&_h2]:m-0 [&_p]:m-0',
  // Eyebrow (MonoLabel as="p", carries data-tone) and the fallback's title label share the mono
  // metadata tier (design §4: 12–16px mono); every other <p> (lines + fallback captions) is body tier.
  '[&_p[data-tone]]:text-[clamp(12px,1vw,16px)]',
  '[&_p:not([data-tone])]:text-[clamp(20px,1.6vw,28px)] [&_p:not([data-tone])]:leading-snug',
  // Punchline (design §4 hero/major tier; design §10 "huge headline or punchline") -- font-size
  // itself is length-aware (headlineSizeClasses below), so it's not listed here.
  '[&_h2]:font-bold [&_h2]:leading-[0.98]',
  // The meme box is the root div's last child (image or fallback); cap its width so the
  // punchline + box fit a 1440x900 viewport without a second scroll.
  // Overflow fix, this task's pass (Fable measurement at 1440x757, slides 22/30, tier-1 headline,
  // still over the 720px floor): 420px -> 340px. The box's own `aspectRatio: '4/3'` (boxStyle
  // below) derives its HEIGHT from this width (420*0.75=315px, comfortably under either
  // maxHeight cap this file or MemeInterstitial.tsx have ever set) -- so maxHeight was never the
  // real lever for this box's rendered size, only its width is. 340*0.75=255px, a real 60px cut.
  '[&>div>*:last-child]:w-full [&>div>*:last-child]:max-w-[340px]',
];

// Overflow fix, round 2 (Fable browser measurement at 1470x740, slide 33): a single punchline
// scale doesn't work across the deck's meme headlines -- CONTRACTS §3.1 lines aren't all short
// phrases, some are full sentences (slide 33's is 66 characters) that still overflowed a 796px
// viewport at a flat clamp(40px,6vw,96px) (wraps to ~5 lines at that scale). The headline scale is
// length-aware instead: short phrases keep the original hero punchline scale; longer ones drop to
// progressively smaller tiers, and the longest tier also caps line length (max-width: 60ch) so it
// wraps into a readable paragraph rather than one very wide line. Body lines after the headline
// (MemeInterstitial's `lines.slice(1)`) already render at the deck's fixed body-text scale
// (`[&_p:not([data-tone])]` above) regardless of headline tier -- unchanged by this fix.
// Round 2 (Fable measurement at 1440x757: slide 22, tier 1, short headline, 829px -- still over the
// 720px floor even with the box cap and gap trims below): tier 1's own scale also drops a step,
// clamp(56px,8vw,118px) -> clamp(48px,7vw,104px). Tiers 2/3 were never the problem (they already
// measured under budget per the round-1 report) and are unchanged.
const HEADLINE_TIERS: { max: number; classes: string[] }[] = [
  { max: 24, classes: ['[&_h2]:text-[clamp(48px,7vw,104px)]'] },
  { max: 48, classes: ['[&_h2]:text-[clamp(36px,4vw,64px)]'] },
  { max: Infinity, classes: ['[&_h2]:text-[clamp(24px,2.4vw,36px)]', '[&_h2]:max-w-[60ch]'] },
];

function headlineSizeClasses(headline: string): string[] {
  const tier = HEADLINE_TIERS.find(({ max }) => headline.length <= max) ?? HEADLINE_TIERS[HEADLINE_TIERS.length - 1];
  return tier.classes;
}

// Fix round 2 (finding 2): scoped to slide 22 only. With the hand-off field below as a second
// in-flow child, its own `mt-auto` would otherwise be the only auto margin on this flex column,
// which pushes the interstitial to the very top (an auto margin beats `justify-content` once any
// sibling has one). Giving the interstitial `my-auto` too keeps it vertically centred in the
// space above the field. For every other meme slide (no field, interstitial is the sole child)
// this would be a no-op even if applied unconditionally -- `my-auto` on a lone flex item centers
// it exactly like `justify-center` already does -- but it's scoped here anyway so the change is
// explicit and never touches those slides.
function wrapperClassName(hasHandoff: boolean, headline: string): string {
  const classes = [...BASE_WRAPPER_CLASSES, ...headlineSizeClasses(headline)];
  if (hasHandoff) classes.push('[&>div]:my-auto');
  return classes.join(' ');
}

// Task 37 hand-off (design §8, A9, 22->23): slide 22 only -- "orange field cuts abruptly into a
// dark technical scene" -- so the dark field the SocDemo scene continues is already present here.
// This scene is unpinned (scrollLength 1): per the manager ruling for unpinned hand-offs, there's
// no separate beat to carve out of the timeline, so the field is a static compositional element,
// not GSAP-animated. Raw --bg-dark/--text-dark (not the theme-switched --bg/--fg, since this
// scene's own theme is 'orange') keep the field dark regardless of the outgoing scene's theme.
const HANDOFF_SLIDES = new Set([22]);

export function MemeScene({ scene }: SceneProps) {
  const progress = useSceneProgress();
  const containerRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const progressRef = useProgressRef(progress);

  // MemeScene only ever renders for kind 'meme' (KIND_COMPONENT); this keeps hooks unconditional
  // (rules of hooks) while staying type-safe for the Scene union (TitleScene's same pattern).
  const content = scene.kind === 'meme' ? scene.content : { memeId: -1, lines: [] as string[] };
  const meme = memes.find((m) => m.id === content.memeId);
  const hasHandoff = HANDOFF_SLIDES.has(scene.slide);

  useGSAP(
    () => {
      tlRef.current = null;
      if (typeof window.matchMedia !== 'function') return;
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ paused: true });
        tlRef.current = tl;

        // design §10 / CONTRACTS §11 meme grammar: hard cut, short punchy motion — a quick
        // scale/translate snap that lands well before the scene's short dwell ends, so the
        // rest of the (unpinned) scroll length reads as a settled, static interruption.
        if (containerRef.current) {
          tl.fromTo(
            containerRef.current,
            { opacity: 0, scale: 0.94, y: 12 },
            { opacity: 1, scale: 1, y: 0, duration: 0.18, ease: 'power3.out' },
            0,
          );
        }
        tl.set({}, {}, 1); // guarantees total duration 1 (CONTRACTS §6) even with no content
        tl.progress(progressRef.current);

        return () => {
          tlRef.current = null;
        };
      });
    },
    { scope: containerRef, dependencies: [scene.id] },
  );

  // Scrubs the paused timeline; runs after the matchMedia effect above has (re)built it.
  useEffect(() => {
    tlRef.current?.progress(progress);
  }, [progress]);

  return (
    <div ref={containerRef} className={wrapperClassName(hasHandoff, content.lines[0] ?? '')}>
      <MemeInterstitial meme={meme} eyebrow={scene.eyebrow} lines={content.lines} />
      {hasHandoff ? (
        <div
          data-part="handoff-field"
          aria-hidden="true"
          // Fix round 1 (finding 2), corrected fix round 2 (finding 1): in-flow (mt-auto, last
          // child) so it reserves its own height and never overlays the meme content above it;
          // shrink-0 keeps that height at short viewports. The negative margins bleed it past
          // THIS OUTER wrapper -- which, as of fix round 2, carries no width cap of its own (the
          // 880px cap now lives on the interstitial's inner root div instead, above) -- to the
          // section's true edges. They exactly cancel SceneShell.tsx's `.scene-viewport` padding
          // (paddingInline 'calc(var(--rail-w) + 5vw) 5vw', paddingBlock 'max(7vh, 72px)', not
          // edited here). vw-based lengths are absolute, not relative to any ancestor's own
          // width -- but that only reaches the section's true edge when THIS element's own
          // containing block (the outer wrapper) already spans the full content column; the
          // pre-fix-round-2 version put the 880px cap on this same outer wrapper, so the margin
          // reached only 5vw past an 880px-wide box, well short of the section edge at wider
          // viewports.
          // Round 2 (measured 829px for slide 22 in a 757px viewport, still over the 720px floor):
          // 12vh -> 8vh. Still reads as the same dark field cutting into scene 23 (design/Task 37
          // intent unchanged), just a shorter reserved strip.
          className="pointer-events-none mt-auto h-[8vh] shrink-0"
          style={{
            background: 'var(--bg-dark)',
            borderTop: '2px solid var(--text-dark)',
            marginInlineStart: 'calc(-1 * (var(--rail-w) + 5vw))',
            marginInlineEnd: '-5vw',
            marginBottom: 'calc(-1 * max(7vh, 72px))',
          }}
        />
      ) : null}
    </div>
  );
}
