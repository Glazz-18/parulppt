'use client';

import { useRef, type CSSProperties } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { SceneProps } from '@/lib/types';
import { MonoLabel } from '@/components/ui/MonoLabel';

// Design §16 opening: BUILD./SCALE. stay the section's foreground colour; BREAK. and SECURE.
// take the deck's attacker/defender accents (CONTRACTS §3.1 recipe row 1).
const WORD_COLORS = ['var(--fg)', 'var(--orange)', 'var(--green)', 'var(--fg)'];

const eyebrowStyle: CSSProperties = { fontSize: 'clamp(12px, 1vw, 16px)' };

const h1Style: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'clamp(56px, 9vw, 148px)',
  lineHeight: 1.02,
  margin: 0,
  display: 'flex',
  flexWrap: 'wrap',
  columnGap: '0.35em',
};

const speakerStyle: CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: 'clamp(20px, 1.6vw, 28px)' };
const roleStyle: CSSProperties = { fontFamily: 'var(--font-mono)', color: 'var(--muted)', fontSize: 'clamp(12px, 1vw, 16px)' };

export function TitleScene({ scene }: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const speakerRef = useRef<HTMLParagraphElement>(null);
  const roleRef = useRef<HTMLParagraphElement>(null);

  // TitleScene only ever renders for kind 'title' (KIND_COMPONENT); this keeps hooks
  // unconditional (rules of hooks) while staying type-safe for the Scene union.
  const content = scene.kind === 'title' ? scene.content : { words: [], speaker: '', role: '' };

  useGSAP(
    () => {
      if (typeof window.matchMedia !== 'function') return;
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        // One-shot restrained intro (design §16), not scroll-driven: plays once on mount and
        // never blocks scroll or input. Task 40 inserts the boot-sequence typing block ahead of
        // this same chain — nothing here needs to change to make room for it.
        const words = wordRefs.current.filter((el): el is HTMLSpanElement => !!el);
        const tl = gsap.timeline();
        if (eyebrowRef.current) {
          tl.fromTo(eyebrowRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 0);
        }
        if (words.length) {
          tl.set(words, { opacity: 0, y: 16 }, 0);
          tl.to(words, { opacity: 1, y: 0, duration: 0.5, stagger: 0.18, ease: 'power2.out' }, 0.3);
        }
        if (speakerRef.current) {
          tl.fromTo(speakerRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 }, '>-0.1');
        }
        if (roleRef.current) {
          tl.fromTo(roleRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4 }, '<0.1');
        }
      });
    },
    { scope: containerRef },
  );

  return (
    <div ref={containerRef} data-title-root={scene.id} className="flex flex-1 flex-col justify-between gap-10">
      <div ref={eyebrowRef} style={eyebrowStyle}>
        {scene.eyebrow ? <MonoLabel as="p">{scene.eyebrow}</MonoLabel> : null}
      </div>
      <h1 style={h1Style}>
        {content.words.flatMap((word, i) => {
          const span = (
            <span
              key={`word-${i}`}
              data-word={i}
              ref={(el) => {
                wordRefs.current[i] = el;
              }}
              style={{ color: WORD_COLORS[i] ?? 'var(--fg)' }}
            >
              {word}
            </span>
          );
          // Finding 7 (Task 22b): a plain space text node between words so h1.textContent reads
          // with spaces; whitespace-only text is not itself rendered as a flex item (CSS Flexbox
          // §4), so this doesn't add visual spacing beyond h1Style's own columnGap.
          return i < content.words.length - 1 ? [span, ' '] : [span];
        })}
      </h1>
      <div className="flex flex-col gap-1">
        <p ref={speakerRef} style={speakerStyle}>
          {content.speaker}
        </p>
        <p ref={roleRef} style={roleStyle}>
          {content.role}
        </p>
      </div>
      {/*
        Finding 2 (Task 22b) + CONTRACTS §11 scene-1 exception: the words start at opacity 0 in
        CSS itself (not just via the GSAP effect after mount), so there is no server-paint-then-
        hide flash — under no-preference they are hidden from first paint, and the GSAP intro
        (which sets their inline opacity) overrides this rule as soon as it runs. A CSS keyframe
        failsafe still shows them after 3s if the GSAP intro above never runs (e.g. it throws;
        Task 40's boot sequence must finish well before this). React 19 href+precedence dedupes
        this across re-renders/mounts of the same scene. Scoped to this scene's own id so it
        never touches any other section, and wrapped in the same no-preference media query so
        reduced motion never sees an opacity:0 word.
      */}
      <style href={`${scene.id}-word-failsafe`} precedence="medium">{`
        @media (prefers-reduced-motion: no-preference) {
          [data-title-root="${scene.id}"] [data-word] {
            opacity: 0;
            animation: ${scene.id}-words-in 0.01s linear 3s forwards;
          }
          @keyframes ${scene.id}-words-in {
            to { opacity: 1; }
          }
        }
      `}</style>
    </div>
  );
}
