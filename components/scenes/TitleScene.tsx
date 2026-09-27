'use client';

import { useRef, useState, type CSSProperties } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { SceneProps } from '@/lib/types';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { UI_COPY } from '@/lib/constants';

// Design §16 opening: BUILD./SCALE. stay the section's foreground colour; BREAK. and SECURE.
// take the deck's attacker/defender accents (CONTRACTS §3.1 recipe row 1).
const WORD_COLORS = ['var(--fg)', 'var(--orange)', 'var(--green)', 'var(--fg)'];

// Task 40 (A19): boot-sequence timing. CONTRACTS §11 asks for lines "~350ms apart" and a fade
// before the word intro; transform/opacity only (motion contract), so "types" here means a
// staggered reveal of whole lines rather than a per-character typewriter (that would need a
// width/clip-path trick or a GSAP text plugin, neither allowed — ponytail: line-reveal is the
// lazy, contract-compliant reading of "typed"; upgrade to real per-character typing only if a
// reviewer insists on the literal terminal effect).
const BOOT_STEP = 0.35;
const BOOT_HEADING_DUR = 0.15;
const BOOT_LINE_DUR = 0.12;
const BOOT_HOLD = 0.15; // pause after STATUS/READY lands before the block fades
const BOOT_FADE_DUR = 0.25;
const BOOT_STATUS_POS = (UI_COPY.boot.lines.length + 1) * BOOT_STEP;
const BOOT_FADE_START = BOOT_STATUS_POS + BOOT_HOLD;
const BOOT_END = BOOT_FADE_START + BOOT_FADE_DUR; // word intro starts here (≈1.8s)

const WORD_START_DELAY = 0.2; // BUILD. becomes visible at BOOT_END + this (≤2.5s, CONTRACTS §11)
const WORD_STAGGER = 0.08;
const SPEAKER_DELAY = 0.7;
const ROLE_DELAY = 0.8;

// Once per page load: a remount (StrictMode, or the scene mounting again) must not replay the
// boot text — this is process/module state, not component state, by design (Manager addition).
let hasBooted = false;

// Test-only: give each test a pristine module instance without resorting to vi.resetModules()
// dynamic-import gymnastics in every spec that cares about "once per page load".
export function __resetBootForTests() {
  hasBooted = false;
}

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

const bootTextStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'clamp(11px, 0.9vw, 14px)',
  color: 'var(--muted)',
  letterSpacing: '0.02em',
  margin: 0,
};

export function TitleScene({ scene }: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const speakerRef = useRef<HTMLParagraphElement>(null);
  const roleRef = useRef<HTMLParagraphElement>(null);
  const bootRef = useRef<HTMLDivElement>(null);
  const bootHeadingRef = useRef<HTMLParagraphElement>(null);
  const bootLineRefs = useRef<(HTMLParagraphElement | null)[]>([]);
  const bootStatusRef = useRef<HTMLDivElement>(null);
  // Default true on both server and first client render (no window/matchMedia read here) — an
  // effect flips it once the intro finishes or input cuts it short (CONTRACTS §11 determinism).
  const [bootVisible, setBootVisible] = useState(true);

  // TitleScene only ever renders for kind 'title' (KIND_COMPONENT); this keeps hooks
  // unconditional (rules of hooks) while staying type-safe for the Scene union.
  const content = scene.kind === 'title' ? scene.content : { words: [], speaker: '', role: '' };

  useGSAP(
    () => {
      if (typeof window.matchMedia !== 'function') return;
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const words = wordRefs.current.filter((el): el is HTMLSpanElement => !!el);
        // Cancel both 3s CSS failsafes (words-in, boot-out) the instant the real intro starts:
        // an inline `animation: none` beats the stylesheet's `animation` property (cascade), so
        // the keyframes only ever fire if this callback never runs at all (matchMedia missing,
        // or GSAP setup throwing before this line) — CONTRACTS §11's "GSAP throws → static
        // markup stands" fallback, covering the boot overlay the same way it already covers the
        // words.
        words.forEach((el) => {
          el.style.animation = 'none';
        });
        if (bootRef.current) {
          bootRef.current.style.animation = 'none';
        }

        const alreadyBooted = hasBooted;
        hasBooted = true;
        const bootEnd = alreadyBooted ? 0 : BOOT_END;

        const tl = gsap.timeline({ onComplete: () => setBootVisible(false) });

        if (!alreadyBooted) {
          if (bootHeadingRef.current) {
            tl.fromTo(bootHeadingRef.current, { opacity: 0 }, { opacity: 1, duration: BOOT_HEADING_DUR }, 0);
          }
          bootLineRefs.current.forEach((el, i) => {
            if (!el) return;
            tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: BOOT_LINE_DUR }, (i + 1) * BOOT_STEP);
          });
          if (bootStatusRef.current) {
            tl.fromTo(bootStatusRef.current, { opacity: 0 }, { opacity: 1, duration: BOOT_LINE_DUR }, BOOT_STATUS_POS);
          }
          if (bootRef.current) {
            tl.to(bootRef.current, { opacity: 0, duration: BOOT_FADE_DUR }, BOOT_FADE_START);
          }
        } else if (bootRef.current) {
          tl.set(bootRef.current, { opacity: 0 }, 0);
        }

        if (eyebrowRef.current) {
          tl.fromTo(eyebrowRef.current, { opacity: 0 }, { opacity: 1, duration: 0.3 }, bootEnd);
        }
        if (words.length) {
          tl.set(words, { opacity: 0, y: 16 }, bootEnd);
          tl.to(
            words,
            { opacity: 1, y: 0, duration: 0.3, stagger: WORD_STAGGER, ease: 'power2.out' },
            bootEnd + WORD_START_DELAY,
          );
        }
        if (speakerRef.current) {
          tl.fromTo(speakerRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.2 }, bootEnd + SPEAKER_DELAY);
        }
        if (roleRef.current) {
          tl.fromTo(roleRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.2 }, bootEnd + ROLE_DELAY);
        }

        // Any scroll, key or pointer input ends the intro at once and shows the resting title
        // (Manager addition): never preventDefault, never block scroll — passive listeners only.
        const finish = () => {
          tl.progress(1);
          setBootVisible(false);
          window.removeEventListener('wheel', finish);
          window.removeEventListener('touchstart', finish);
          window.removeEventListener('keydown', finish);
          window.removeEventListener('pointerdown', finish);
        };
        window.addEventListener('wheel', finish, { passive: true });
        window.addEventListener('touchstart', finish, { passive: true });
        window.addEventListener('keydown', finish, { passive: true });
        window.addEventListener('pointerdown', finish, { passive: true });

        return () => {
          window.removeEventListener('wheel', finish);
          window.removeEventListener('touchstart', finish);
          window.removeEventListener('keydown', finish);
          window.removeEventListener('pointerdown', finish);
        };
      });
    },
    { scope: containerRef },
  );

  return (
    <div ref={containerRef} data-title-root={scene.id} className="relative flex flex-1 flex-col justify-between gap-10">
      {/*
        Task 40 (A19/A20): the boot block is always in the markup (server and first client render
        are identical — CONTRACTS §11 render determinism), aria-hidden throughout, and hidden
        under reduced motion by the scoped CSS rule below (never by a matchMedia/window read
        during render). Under no-preference, GSAP reveals it, then fades it and `bootVisible`
        hides it once the intro completes or input cuts it short. No SKIP control.
      */}
      <div
        ref={bootRef}
        data-boot
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex flex-col items-start justify-center gap-1"
        style={bootVisible ? undefined : { display: 'none' }}
      >
        <p ref={bootHeadingRef} style={bootTextStyle}>
          {UI_COPY.boot.heading}
        </p>
        {UI_COPY.boot.lines.map((line, i) => (
          <p
            key={line}
            ref={(el) => {
              bootLineRefs.current[i] = el;
            }}
            style={bootTextStyle}
          >
            {line}
          </p>
        ))}
        <div ref={bootStatusRef} style={bootTextStyle}>
          {UI_COPY.boot.status} {UI_COPY.boot.ready}
        </div>
      </div>
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
        Task 40's boot sequence finishes well before this — total intro ≤2.9s). A matching
        failsafe hides the boot overlay after 3s for the same reason (CONTRACTS §11: "if GSAP
        setup throws, the scene keeps its static markup" — without this, a thrown setup would
        leave the boot text permanently overlapping the eyebrow/h1/speaker/role). Both failsafes
        are cancelled the instant the real GSAP run starts (inline `animation: none`, set above),
        so they never fight a normal run or the input-abort path. `visibility: hidden` is added
        alongside `opacity: 0` because `display` itself isn't animatable. React 19 href+
        precedence dedupes this across re-renders/mounts of the same scene. Scoped to this scene's
        own id so it never touches any other section, and wrapped in the same no-preference media
        query so reduced motion never sees an opacity:0 word or a hidden boot block (it's already
        `display: none` there via the rule above).
      */}
      <style href={`${scene.id}-word-failsafe`} precedence="medium">{`
        @media (prefers-reduced-motion: reduce) {
          [data-title-root="${scene.id}"] [data-boot] {
            display: none;
          }
        }
        @media (prefers-reduced-motion: no-preference) {
          [data-title-root="${scene.id}"] [data-word] {
            opacity: 0;
            animation: ${scene.id}-words-in 0.01s linear 3s forwards;
          }
          @keyframes ${scene.id}-words-in {
            to { opacity: 1; }
          }
          [data-title-root="${scene.id}"] [data-boot] {
            animation: ${scene.id}-boot-out 0.01s linear 3s forwards;
          }
          @keyframes ${scene.id}-boot-out {
            to { opacity: 0; visibility: hidden; }
          }
        }
      `}</style>
    </div>
  );
}
