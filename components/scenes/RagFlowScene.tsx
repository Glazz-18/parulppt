'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { SceneProps, Step } from '@/lib/types';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { useSceneProgress } from '@/components/presentation/SceneProgress';
import { titleStyle, eyebrowStyle, revealHead, useProgressRef } from './ContentScene';

const numberStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'clamp(12px, 1vw, 16px)',
  letterSpacing: '0.08em',
  color: 'var(--label)',
};

const termStyle: CSSProperties = {
  fontSize: 'clamp(18px, 1.4vw, 24px)',
  lineHeight: 1.3,
};

const textStyle: CSSProperties = { ...termStyle, color: 'var(--muted)' };

// design §9 RAG beats (0..1). Deck ships 5 stage cards but the spec's scroll example has 6
// narrative beats; per manager ruling (Task 26) Search + Vector DB (0.16-0.52) merge into stage
// 02 "Search", the rest map one-to-one.
const BEAT_WINDOWS: [number, number][] = [
  [0.0, 0.16],
  [0.16, 0.52],
  [0.52, 0.68],
  [0.68, 0.84],
  [0.84, 1.0],
];

// Maps each design §9 beat window (0..1) into the pinned scene's supporting span
// [headEnd, 1] (CONTRACTS §6, shared revealHead arrival pose).
function stageWindows(headEnd: number, supportingSpan: number): [number, number][] {
  return BEAT_WINDOWS.map(([b0, b1]) => [headEnd + b0 * supportingSpan, headEnd + b1 * supportingSpan]);
}

// The stage whose window has most recently started is the one to emphasise (design §9: latest
// revealed stage, not by colour alone -> paired with a scale transform on a separate element from
// the one GSAP animates, so the two never fight over the same `transform`/`opacity`, CONTRACTS §11).
function activeStageIndex(progress: number, windows: [number, number][]): number {
  let idx = 0;
  windows.forEach(([start], i) => {
    if (progress >= start) idx = i;
  });
  return idx;
}

export function RagFlowScene({ scene }: SceneProps) {
  const progress = useSceneProgress();
  const containerRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const progressRef = useProgressRef(progress);

  const blocks = 'blocks' in scene.content ? scene.content.blocks : [];
  const stepsBlock = blocks.find((b) => b.type === 'steps');
  const stages: Step[] = stepsBlock?.items ?? [];

  const arrival = 1 / scene.scrollLength;
  const headEnd = scene.pin ? arrival : 0.35;
  const windows = stageWindows(headEnd, Math.max(1 - headEnd, 0));
  const activeIndex = activeStageIndex(progress, windows);

  useGSAP(
    () => {
      tlRef.current = null;
      if (typeof window.matchMedia !== 'function') return;
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ paused: true });
        tlRef.current = tl;

        revealHead(tl, eyebrowRef.current, titleRef.current, scene);

        const stageEls = containerRef.current
          ? Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-part="stage"]'))
          : [];
        stageEls.forEach((el, i) => {
          const win = windows[i];
          if (!win) return;
          const [start, end] = win;
          tl.fromTo(
            el,
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: Math.max(end - start, 0), ease: 'power2.out' },
            start,
          );
        });

        // Guarantees total duration 1 (CONTRACTS §6) even when float rounding left a beat short.
        tl.set({}, {}, 1);
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
    <div ref={containerRef} className="flex flex-col gap-8">
      {scene.eyebrow ? (
        <div ref={eyebrowRef} style={eyebrowStyle}>
          <MonoLabel as="p" tone="label">
            {scene.eyebrow}
          </MonoLabel>
        </div>
      ) : null}
      {scene.title ? (
        <h2 ref={titleRef} style={titleStyle}>
          {scene.title}
        </h2>
      ) : null}
      <div data-part="diagram" className="relative mt-4 pb-2">
        {/* Decorative connecting line behind the stage cards (CONTRACTS: decorative shapes aria-hidden). */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[8%] right-[8%] top-1/2 hidden h-px -translate-y-1/2 md:block"
          style={{ background: 'var(--rule)' }}
        />
        <ol className="relative grid grid-cols-1 gap-4 sm:grid-cols-5">
          {stages.map((stage, i) => {
            const isLast = i === stages.length - 1;
            const isActive = i === activeIndex;
            const card = (
              <div
                className="flex flex-col gap-2 transition-transform duration-300"
                style={{ transform: isActive ? 'scale(1.04)' : 'scale(1)' }}
              >
                <span data-part="n" style={numberStyle}>
                  {stage.n}
                </span>
                <strong data-part="term" style={termStyle}>
                  {stage.term}
                </strong>
                <span data-part="text" style={textStyle}>
                  {stage.text}
                </span>
              </div>
            );
            return (
              <li
                key={stage.n}
                data-part="stage"
                className="relative flex flex-col rounded-lg border p-4"
                style={{ borderColor: isActive ? 'var(--orange)' : 'var(--rule)', background: 'var(--bg)' }}
              >
                {isLast ? (
                  <div data-part="answer" className="contents">
                    {card}
                  </div>
                ) : (
                  card
                )}
                {!isLast ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-3 top-1/2 hidden -translate-y-1/2 sm:block"
                    style={{ color: 'var(--label)' }}
                  >
                    →
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
