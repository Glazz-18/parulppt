'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { SceneProps } from '@/lib/types';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { ApprovalGate } from '@/components/ui/ApprovalGate';
import { useSceneProgress } from '@/components/presentation/SceneProgress';
import { titleStyle, eyebrowStyle, revealHead, headArrival, revealStagger, useProgressRef } from './ContentScene';
import { Blocks } from './Blocks';

const monoStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  color: 'var(--fg)',
  fontSize: 'clamp(12px, 1vw, 16px)',
  letterSpacing: '0.08em',
};

const nodeStyle: CSSProperties = {
  fontSize: 'clamp(15px, 1.1vw, 20px)',
  lineHeight: 1.3,
  borderColor: 'var(--rule)',
  background: 'var(--bg)',
};

export function AiFixesBugScene({ scene }: SceneProps) {
  const progress = useSceneProgress();
  const containerRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const progressRef = useProgressRef(progress);

  const blocks = 'blocks' in scene.content ? scene.content.blocks : [];
  const flowBlock = blocks.find((b) => b.type === 'flow');
  const termsBlock = blocks.find((b) => b.type === 'terms');
  const linesBlock = blocks.find((b) => b.type === 'lines');
  const flowItems = flowBlock?.items ?? [];
  // Ruling (manager brief, no duplicated text): the deck's 4th flow item ("Human approves") is
  // never rendered as a plain node — it is the ApprovalGate's own heading, so the string appears
  // exactly once. The first three items are the stage nodes.
  const stages = flowItems.slice(0, 3);
  const gateHeading = flowItems[3] ?? '';
  const lines = linesBlock?.lines ?? [];

  // Arrival pose (CONTRACTS §6/§11, A9): pinned, scrollLength 3 -> headEnd = 1/3; the remaining
  // [headEnd, 1] window carries, in order (manager brief / MASTER_PROMPT §19 scene 26): Find ->
  // Verify -> Patch build left-to-right with the gate arriving last in the same stagger (it is the
  // final child in DOM order), then the two evidence-card terms, then the closing line.
  const headEnd = headArrival(scene);
  const supportingSpan = Math.max(1 - headEnd, 0);
  const flowEnd = headEnd + supportingSpan * 0.35;
  const termsEnd = flowEnd + supportingSpan * 0.35;

  useGSAP(
    () => {
      tlRef.current = null;
      if (typeof window.matchMedia !== 'function') return;
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ paused: true });
        tlRef.current = tl;

        revealHead(tl, eyebrowRef.current, titleRef.current, scene);

        // Stage nodes and the gate wrapper build left-to-right as one stagger group; the gate is
        // the last DOM child so it arrives last (brief: "the gate arrives last").
        if (rowRef.current) {
          revealStagger(
            tl,
            rowRef.current.querySelectorAll('[data-part="node"], [data-part="gate"]'),
            headEnd,
            flowEnd,
            { opacity: 0, scale: 0.92 },
            { opacity: 1, scale: 1 },
          );
        }

        // Evidence-card terms, then the closing line (manager brief order).
        const termEls = containerRef.current
          ? Array.from(containerRef.current.querySelectorAll('[data-part="term"]'))
          : [];
        revealStagger(tl, termEls, flowEnd, termsEnd, { opacity: 0, y: 12 }, { opacity: 1, y: 0 });

        const lineEls = containerRef.current
          ? Array.from(containerRef.current.querySelectorAll('[data-part="line"]'))
          : [];
        revealStagger(tl, lineEls, termsEnd, 1, { opacity: 0, y: 12 }, { opacity: 1, y: 0 });

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

  // The gate's lit state (CONTRACTS §3.2: "lit at progress 1") is the ApprovalGate primitive's own
  // job, driven directly by the real scene progress — not by the GSAP reveal timeline above, which
  // only ever handles opacity/scale arrival. This keeps "green ... only at progress 1" true even
  // under reduced motion, where useSceneProgress() itself returns 1 (A9 hand-off pose).
  const flowRow: ReactNode[] = [];
  stages.forEach((item, i) => {
    if (i > 0) {
      flowRow.push(
        <span key={`arrow-${i}`} aria-hidden="true" style={monoStyle}>
          →
        </span>,
      );
    }
    flowRow.push(
      <span key={`node-${i}`} data-part="node" className="border px-4 py-2" style={nodeStyle}>
        {item}
      </span>,
    );
  });
  if (stages.length) {
    flowRow.push(
      <span key="arrow-gate" aria-hidden="true" style={monoStyle}>
        →
      </span>,
    );
  }
  flowRow.push(
    <div
      key="gate"
      data-part="gate"
      className="[&>div]:flex [&>div]:items-center [&>div]:gap-3 [&>div]:rounded-full [&>div]:px-5 [&>div]:py-2.5 [&_h3]:m-0 [&_h3]:text-[length:clamp(15px,1.1vw,20px)] [&_h3]:font-semibold [&_h3]:leading-[1.3]"
    >
      <ApprovalGate mode="scroll" heading={gateHeading} progress={progress} />
    </div>,
  );

  // Task 37 hand-off (design §8, A9, 26->27): once the gate is lit (the same `progress >= 1`
  // condition ApprovalGate itself uses, not the GSAP reveal timeline above -- so this stays true
  // under reduced motion too, where useSceneProgress() reads 1), a green accent line extends
  // across the bottom of the viewport, matching scene 27's own 1px rule weight (Blocks.tsx
  // `layers`' border-t), so the approval "becomes" that scene's accent line.
  const gateLit = progress >= 1;

  return (
    // h-full (with the parent .scene-viewport's own height:100vh while pinned, CONTRACTS §7/§8):
    // makes bottom-0 on the accent line below land at the actual bottom of the viewport, not just
    // under the last line of text. Inert under reduced motion, where the parent reverts to
    // height:auto (percentage heights resolve to auto there) and in jsdom (no real layout).
    <div ref={containerRef} className="relative flex h-full flex-col gap-8">
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
      <div ref={rowRef} className="flex flex-wrap items-center gap-3">
        {flowRow}
      </div>
      {termsBlock ? (
        // Evidence cards (manager brief): reuse Blocks' own terms rendering (data-part="term" per
        // item) and style each item as a bordered card via a descendant selector, rather than
        // duplicating its markup.
        <div className="[&_[data-part=term]]:rounded-lg [&_[data-part=term]]:border [&_[data-part=term]]:border-[color:var(--rule)] [&_[data-part=term]]:p-5">
          <Blocks blocks={[termsBlock]} />
        </div>
      ) : null}
      {lines.length ? (
        <div className="flex flex-col gap-3">
          {lines.map((line, i) => (
            <p key={i} data-part="line" style={{ fontSize: 'clamp(20px, 1.6vw, 28px)', lineHeight: 1.35, fontWeight: 700 }}>
              {line}
            </p>
          ))}
        </div>
      ) : null}
      <div
        data-part="accent-line"
        aria-hidden="true"
        // Fix round 1 (finding 6): extends FROM the gate (the flow row's last, rightmost child)
        // via scaleX anchored on that side (origin-right), rather than a full-width opacity fade
        // at a threshold -- still gated on `gateLit` so progress 1 / reduced motion render the
        // full line, same as before.
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-right transition-transform duration-300 motion-reduce:transition-none"
        style={{ background: 'var(--green)', transform: gateLit ? 'scaleX(1)' : 'scaleX(0)' }}
      />
    </div>
  );
}
