'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { SceneProps } from '@/lib/types';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { useSceneProgress } from '@/components/presentation/SceneProgress';
import { titleStyle, eyebrowStyle, revealHead, headArrival, useProgressRef } from './ContentScene';
import { Blocks } from './Blocks';

// MASTER_PROMPT §19 scene 29 / brief (Manager additions, Task 31): each row's problem -> product
// mapping "appears as a transformation" — the problem lands, the → connector draws, then the
// product transforms out of the problem (the problem dims/shifts slightly to make room while the
// product slides + scales in from the problem's position). Rows play top to bottom, one per slot
// of the pinned scene's [headEnd, 1] supporting span (CONTRACTS §6, scrollLength 3 -> headEnd =
// 1/3). Markup itself is plain <Blocks> flow rows (§3.1: problem/connector/product stay separate
// elements, connector via Blocks' CONNECTORS treatment, never aria-hidden); only the choreography
// is bespoke, since the sequenced problem->connector->product beat isn't the generic flow reveal
// ContentScene's BLOCK_ANIM table gives (that fades every item in together).
export function ProblemProductScene({ scene }: SceneProps) {
  const progress = useSceneProgress();
  const containerRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const progressRef = useProgressRef(progress);

  const blocks = 'blocks' in scene.content ? scene.content.blocks : [];
  const rows = blocks.filter((b) => b.type === 'flow');

  const headEnd = headArrival(scene);
  const supportingSpan = Math.max(1 - headEnd, 0);
  const rowStep = rows.length ? supportingSpan / rows.length : 0;

  useGSAP(
    () => {
      tlRef.current = null;
      if (typeof window.matchMedia !== 'function') return;
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ paused: true });
        tlRef.current = tl;

        revealHead(tl, eyebrowRef.current, titleRef.current, scene);

        const rowEls = containerRef.current
          ? Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-block="flow"]'))
          : [];

        rowEls.forEach((rowEl, i) => {
          const start = headEnd + i * rowStep;
          const end = i === rowEls.length - 1 ? 1 : start + rowStep;
          const [problemEl, productEl] = Array.from(rowEl.querySelectorAll<HTMLElement>('[data-part="node"]'));
          const connectorEl = rowEl.querySelector<HTMLElement>('[data-part="connector"]');

          const problemDur = rowStep * 0.25;
          const connectorStart = start + problemDur;
          const connectorDur = rowStep * 0.15;
          const transformStart = connectorStart + connectorDur;
          const transformDur = Math.max(end - transformStart, 0);
          const half = transformDur / 2;

          if (problemEl) {
            tl.fromTo(problemEl, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: problemDur }, start);
          }
          if (connectorEl) {
            tl.fromTo(
              connectorEl,
              { opacity: 0, scale: 0.92 },
              { opacity: 1, scale: 1, duration: connectorDur },
              connectorStart,
            );
          }
          if (productEl) {
            tl.fromTo(
              productEl,
              { opacity: 0, scale: 0.85, x: -16 },
              { opacity: 1, scale: 1, x: 0, duration: transformDur },
              transformStart,
            );
          }
          if (problemEl && transformDur > 0) {
            // The problem shifts/dims slightly while its product transforms out of it, then
            // settles back to full opacity/position by the end of this row's own slot -- so
            // progress 1 (and every later row's slot) never leaves a dimmed problem behind.
            tl.to(problemEl, { opacity: 0.55, x: -6, duration: half }, transformStart);
            tl.to(problemEl, { opacity: 1, x: 0, duration: half }, transformStart + half);
          }
        });

        // Guarantees total duration 1 (CONTRACTS §6) even when float rounding left the last beat short.
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
      <Blocks blocks={rows} />
    </div>
  );
}
