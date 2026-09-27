'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { SceneProps } from '@/lib/types';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { useSceneProgress } from '@/components/presentation/SceneProgress';
import { Blocks } from './Blocks';

// Exported for reuse by one-off scene components (e.g. RolePathScene) that share the same
// eyebrow/title look but draw their own supporting content instead of <Blocks>.
export const titleStyle = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'clamp(40px, 4.4vw, 64px)',
  lineHeight: 1.05,
  margin: 0,
};

export const eyebrowStyle = { fontSize: 'clamp(12px, 1vw, 16px)' };

// Finding 4 (Task 22b, fix round 1): shared by every scene whose `useGSAP` builds its paused
// timeline inside `gsap.matchMedia().add(...)` and scrubs it with `tl.progress(progress)` there
// (ContentScene, MemeScene, RolePathScene, and any later scene with the same shape). That
// matchMedia callback only re-runs when the media query's match state changes at runtime (e.g.
// the OS reduced-motion setting flips mid-scroll) — not on every `progress` change — so reading
// the `progress` closure variable directly would apply whatever value was current when the
// effect last ran, not the latest one. Keep the latest value in a ref instead, updated via effect
// (mutating a ref during render trips the `react-hooks/refs` lint rule), and read `ref.current`
// when (re)building the timeline.
export function useProgressRef(progress: number) {
  const progressRef = useRef(progress);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  return progressRef;
}

export type HeadReveal = { headEnd: number; supportingSpan: number };

// Arrival pose (CONTRACTS §6/§11, A9): pinned scenes complete metadata+title by 1/scrollLength and
// keep supporting beats in [that, 1]; unpinned scenes (scrollLength 1) play the whole metadata ->
// title -> supporting sequence across 0..1. Shared by every scene whose useGSAP timeline opens
// with an eyebrow + title pair before its own beats (ContentScene, RolePathScene, TimelineScene,
// and any later scene with the same shape) — third verbatim copy flagged in Task 23 review round 1.
export function revealHead(
  tl: gsap.core.Timeline,
  eyebrowEl: Element | null,
  titleEl: Element | null,
  scene: { pin: boolean; scrollLength: number },
): HeadReveal {
  const arrival = 1 / scene.scrollLength;
  const headEnd = scene.pin ? arrival : 0.35;

  if (eyebrowEl) {
    tl.fromTo(eyebrowEl, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: headEnd * 0.4 }, 0);
  }
  if (titleEl) {
    tl.fromTo(titleEl, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: headEnd * 0.6 }, headEnd * 0.35);
  }

  return { headEnd, supportingSpan: Math.max(1 - headEnd, 0) };
}

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

// Exported for reuse by one-off scene components (e.g. RolePathScene) that build their own
// paused timeline but want the same "stagger a group of elements across [start, end)" beat.
export function revealStagger(
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

// Data grammar (CONTRACTS §11: label -> number -> context) reconciled with "metrics land
// value-first" (manager ruling, Task 20 review round 1): within each metric, the heading (the
// data-part="label" that BigNumber renders *before* the value) reveals first, then the value
// lands, then everything after the value (the versus comparison and the trailing label) reveals
// as context. BigNumber gives heading and the trailing label the same data-part ("label"), so
// they're told apart by DOM order relative to the first data-part="value" node, not by selector.
// All three phases stay inside this metric's own [itemStart, itemStart + step) slot.
function revealMetrics(tl: gsap.core.Timeline, metricEls: Element[], start: number, end: number) {
  if (!metricEls.length || end <= start) return;
  const step = (end - start) / metricEls.length;
  metricEls.forEach((el, i) => {
    const itemStart = start + i * step;
    const parts = Array.from(el.querySelectorAll('[data-part="value"], [data-part="label"]'));
    const valueIndex = parts.findIndex((p) => p.getAttribute('data-part') === 'value');
    const heading = valueIndex > 0 ? parts.slice(0, valueIndex) : [];
    const value = valueIndex >= 0 ? [parts[valueIndex]] : [];
    const context = valueIndex >= 0 ? parts.slice(valueIndex + 1) : [];

    const headingEnd = heading.length ? itemStart + step * 0.2 : itemStart;
    const valueEnd = headingEnd + step * 0.4;

    if (heading.length) {
      tl.fromTo(
        heading,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: headingEnd - itemStart, ease: 'power2.out' },
        itemStart,
      );
    }
    if (value.length) {
      tl.fromTo(
        value,
        { opacity: 0, scale: 0.85 },
        { opacity: 1, scale: 1, duration: valueEnd - headingEnd, ease: 'power2.out' },
        headingEnd,
      );
    }
    if (context.length) {
      const contextStep = (itemStart + step - valueEnd) / context.length;
      tl.fromTo(
        context,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: contextStep, stagger: contextStep, ease: 'power2.out' },
        valueEnd,
      );
    }
  });
}

// Finding 3 (Task 22b): secondary/annotation parts (layer marker/footer, flow label/marker, bars
// note) were never animated and so showed before their block's own items landed. They now reveal
// at the END of their own block's [start, end) slot, after the items — carving a small tail off
// the slot for them when present, so the block's own span (and the timeline's total duration,
// CONTRACTS §6) is unchanged either way.
const TRAILING_SPAN = 0.15;
function splitTrailing(start: number, end: number, hasTrailing: boolean) {
  if (!hasTrailing) return { itemsEnd: end, trailStart: end };
  const trailStart = start + (end - start) * (1 - TRAILING_SPAN);
  return { itemsEnd: trailStart, trailStart };
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
  const progressRef = useProgressRef(progress);

  const blocks = 'blocks' in scene.content ? scene.content.blocks : [];

  useGSAP(
    () => {
      tlRef.current = null;
      if (typeof window.matchMedia !== 'function') return;
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ paused: true });
        tlRef.current = tl;

        const { headEnd, supportingSpan } = revealHead(tl, eyebrowRef.current, titleRef.current, scene);

        const wrappers = containerRef.current
          ? Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-block]'))
          : [];
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
            const note = wrapper.querySelector('[data-part="note"]');
            const { itemsEnd, trailStart } = splitTrailing(start, end, !!note);
            revealBars(tl, Array.from(wrapper.querySelectorAll('[data-part="bar"]')), start, itemsEnd);
            if (note) revealStagger(tl, [note], trailStart, end, { opacity: 0, y: 8 }, { opacity: 1, y: 0 });
            return;
          }
          if (block.type === 'layers' || block.type === 'flow') {
            const cfg = BLOCK_ANIM[block.type];
            if (!cfg) return;
            // layers' marker/footer (Blocks.tsx ~97-124) and flow's label/marker (~153-162) are
            // never part of the block's own item selector, so they're picked up separately here.
            const trailingSelector =
              block.type === 'layers'
                ? '[data-part="marker"], [data-part="footer"]'
                : '[data-part="flow-label"], [data-part="marker"]';
            const trailing = Array.from(wrapper.querySelectorAll(trailingSelector));
            const { itemsEnd, trailStart } = splitTrailing(start, end, trailing.length > 0);
            revealStagger(tl, wrapper.querySelectorAll(cfg.selector), start, itemsEnd, cfg.from, cfg.to);
            if (trailing.length) revealStagger(tl, trailing, trailStart, end, { opacity: 0, y: 8 }, { opacity: 1, y: 0 });
            return;
          }
          const cfg = BLOCK_ANIM[block.type];
          if (!cfg) return;
          revealStagger(tl, wrapper.querySelectorAll(cfg.selector), start, end, cfg.from, cfg.to);
        });

        // Guarantees total duration 1 (CONTRACTS §6) even when content is empty or float
        // rounding left the last beat a hair short.
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
      <Blocks blocks={blocks} />
    </div>
  );
}
