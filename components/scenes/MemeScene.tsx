'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { SceneProps } from '@/lib/types';
import { MemeInterstitial } from '@/components/ui/MemeInterstitial';
import { memes } from '@/lib/memes';
import { useSceneProgress } from '@/components/presentation/SceneProgress';

// design §10: fast, bold orange interruption — minimal UI, one dominant meme, huge punchline.
// MemeInterstitial (W1, not edited here) renders eyebrow/h2/lines/box as flat siblings inside
// one wrapper div, so typography and layout are applied here via descendant selectors on that
// wrapper (CONTRACTS/design instruction) rather than per-element refs or new props.
const wrapperClassName = [
  'flex h-full max-w-[880px] flex-col justify-center gap-6',
  // MemeInterstitial's own root div: lay its children out with breathing room.
  '[&>div]:flex [&>div]:flex-col [&>div]:gap-5',
  // Zero default margins; the flex gap above owns all spacing.
  '[&_h2]:m-0 [&_p]:m-0',
  // Eyebrow (MonoLabel as="p", carries data-tone) and the fallback's title label share the mono
  // metadata tier (design §4: 12–16px mono); every other <p> (lines + fallback captions) is body tier.
  '[&_p[data-tone]]:text-[clamp(12px,1vw,16px)]',
  '[&_p:not([data-tone])]:text-[clamp(18px,1.6vw,26px)] [&_p:not([data-tone])]:leading-snug',
  // Huge punchline (design §4 hero/major tier; design §10 "huge headline or punchline").
  '[&_h2]:font-bold [&_h2]:leading-[0.98] [&_h2]:text-[clamp(56px,8vw,120px)]',
  // The meme box is the root div's last child (image or fallback); cap its width so the
  // punchline + box fit a 1440x900 viewport without a second scroll.
  '[&>div>*:last-child]:w-full [&>div>*:last-child]:max-w-[420px]',
].join(' ');

export function MemeScene({ scene }: SceneProps) {
  const progress = useSceneProgress();
  const containerRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  // MemeScene only ever renders for kind 'meme' (KIND_COMPONENT); this keeps hooks unconditional
  // (rules of hooks) while staying type-safe for the Scene union (TitleScene's same pattern).
  const content = scene.kind === 'meme' ? scene.content : { memeId: -1, lines: [] as string[] };
  const meme = memes.find((m) => m.id === content.memeId);

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
        tl.progress(progress);

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
    <div ref={containerRef} className={wrapperClassName}>
      <MemeInterstitial meme={meme} eyebrow={scene.eyebrow} lines={content.lines} />
    </div>
  );
}
