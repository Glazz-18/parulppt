'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { SceneProps } from '@/lib/types';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { useSceneProgress } from '@/components/presentation/SceneProgress';
import { Blocks } from './Blocks';

// Idempotent (Presentation.tsx also registers this); needed here too since ContentScene may be
// the first client component to mount in isolation (tests render it directly).
gsap.registerPlugin(useGSAP);

const titleStyle = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'clamp(40px, 4.4vw, 64px)',
  lineHeight: 1.05,
  margin: 0,
};

const eyebrowStyle = { fontSize: 'clamp(12px, 1vw, 16px)' };

type BlockAnim = { selector: string; from: gsap.TweenVars; to: gsap.TweenVars };

// CONTRACTS §11 grammar (MASTER_PROMPT §19 beats): choreography keyed by block type, not by
// scene kind — editorial/diagram/data all fall out of this table (design §8, §9 scroll examples).
const BLOCK_ANIM: Partial<Record<string, BlockAnim>> = {
  lines: { selector: '[data-part="line"]', from: { opacity: 0, y: 12 }, to: { opacity: 1, y: 0 } },
  steps: { selector: '[data-part="step"]', from: { opacity: 0, y: 12 }, to: { opacity: 1, y: 0 } },
  terms: { selector: '[data-part="term"]', from: { opacity: 0, y: 12 }, to: { opacity: 1, y: 0 } },
  // Layers stack in from below (MASTER_PROMPT beats 9, 13, 27, 41): larger rise than the default reveal.
  layers: { selector: '[data-part="layer"]', from: { opacity: 0, y: 32 }, to: { opacity: 1, y: 0 } },
  marks: { selector: '[data-part="mark"]', from: { opacity: 0, y: 12 }, to: { opacity: 1, y: 0 } },
  // Flow items (nodes and connectors alike) build left to right until the last one lands (beat 8).
  flow: {
    selector: '[data-part="node"], [data-part="connector"]',
    from: { opacity: 0, scale: 0.92 },
    to: { opacity: 1, scale: 1 },
  },
  // Columns separate spatially: alternating sides converge into their final position (beat 32).
  columns: {
    selector: '[data-part="column"]',
    from: { opacity: 0, x: (i: number) => (i % 2 === 0 ? -24 : 24) },
    to: { opacity: 1, x: 0 },
  },
};

function revealStagger(
  tl: gsap.core.Timeline,
  els: NodeListOf<Element> | Element[],
  start: number,
  end: number,
  from: gsap.TweenVars,
  to: gsap.TweenVars,
) {
  const list = Array.from(els);
  if (!list.length || end <= start) return;
  const step = (end - start) / list.length;
  tl.fromTo(list, from, { ...to, duration: step, stagger: step, ease: 'power2.out' }, start);
}

// Metrics land value-first, then context (data grammar, beats 15, 24): the number is the
// headline, the label is confirmation that follows it in.
function revealMetrics(tl: gsap.core.Timeline, metricEls: Element[], start: number, end: number) {
  if (!metricEls.length || end <= start) return;
  const step = (end - start) / metricEls.length;
  metricEls.forEach((el, i) => {
    const itemStart = start + i * step;
    const values = el.querySelectorAll('[data-part="value"]');
    const labels = el.querySelectorAll('[data-part="label"]');
    if (values.length) {
      tl.fromTo(
        values,
        { opacity: 0, scale: 0.85 },
        { opacity: 1, scale: 1, duration: step * 0.6, ease: 'power2.out' },
        itemStart,
      );
    }
    if (labels.length) {
      tl.fromTo(
        labels,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: step * 0.5, stagger: step * 0.1, ease: 'power2.out' },
        itemStart + step * 0.35,
      );
    }
  });
}

// Bars grow (beat 28): the fill scales in from the left; the row itself also fades up so a
// bar with no ratio yet (undefined -> full width, see Blocks.tsx) still reads as a reveal.
function revealBars(tl: gsap.core.Timeline, barEls: Element[], start: number, end: number) {
  if (!barEls.length || end <= start) return;
  const step = (end - start) / barEls.length;
  tl.fromTo(
    barEls,
    { opacity: 0, y: 8 },
    { opacity: 1, y: 0, duration: step, stagger: step, ease: 'power2.out' },
    start,
  );
  const fills = barEls.map((el) => el.querySelector('[data-part="fill"]')).filter((el): el is Element => !!el);
  if (fills.length) {
    tl.fromTo(
      fills,
      { scaleX: 0, transformOrigin: 'left center' },
      { scaleX: 1, duration: step, stagger: step, ease: 'power2.out' },
      start,
    );
  }
}

export function ContentScene({ scene }: SceneProps) {
  const progress = useSceneProgress();
  const containerRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const blocks = 'blocks' in scene.content ? scene.content.blocks : [];

  useGSAP(
    () => {
      tlRef.current = null;
      if (typeof window.matchMedia !== 'function') return;
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ paused: true });
        tlRef.current = tl;

        // Arrival pose (CONTRACTS §6/§11, A9): pinned scenes complete metadata+title by
        // 1/scrollLength and keep supporting beats in [that, 1]; unpinned scenes (scrollLength
        // 1) play the whole metadata -> title -> supporting sequence across 0..1.
        const arrival = 1 / scene.scrollLength;
        const headEnd = scene.pin ? arrival : 0.35;

        if (eyebrowRef.current) {
          tl.fromTo(eyebrowRef.current, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: headEnd * 0.4 }, 0);
        }
        if (titleRef.current) {
          tl.fromTo(
            titleRef.current,
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: headEnd * 0.6 },
            headEnd * 0.35,
          );
        }

        const wrappers = containerRef.current
          ? Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-block]'))
          : [];
        const supportingSpan = Math.max(1 - headEnd, 0);
        const perBlock = blocks.length ? supportingSpan / blocks.length : 0;

        blocks.forEach((block, i) => {
          const wrapper = wrappers[i];
          if (!wrapper) return;
          const start = headEnd + i * perBlock;
          const end = i === blocks.length - 1 ? 1 : headEnd + (i + 1) * perBlock;
          if (block.type === 'metrics') {
            revealMetrics(tl, Array.from(wrapper.querySelectorAll('[data-part="metric"]')), start, end);
            return;
          }
          if (block.type === 'bars') {
            revealBars(tl, Array.from(wrapper.querySelectorAll('[data-part="bar"]')), start, end);
            return;
          }
          const cfg = BLOCK_ANIM[block.type];
          if (!cfg) return;
          revealStagger(tl, wrapper.querySelectorAll(cfg.selector), start, end, cfg.from, cfg.to);
        });

        // Guarantees total duration 1 (CONTRACTS §6) even when content is empty or float
        // rounding left the last beat a hair short.
        tl.set({}, {}, 1);
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
      <Blocks blocks={blocks} />
    </div>
  );
}
