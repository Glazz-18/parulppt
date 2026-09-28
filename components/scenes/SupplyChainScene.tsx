'use client';

import { Fragment, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { SceneProps } from '@/lib/types';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { useSceneProgress } from '@/components/presentation/SceneProgress';
import {
  titleStyle,
  eyebrowStyle,
  revealHead,
  headArrival,
  revealStagger,
  revealMetrics,
  useProgressRef,
} from './ContentScene';
import { Blocks } from './Blocks';

const nodeStyle: CSSProperties = {
  fontSize: 'clamp(15px, 1.1vw, 20px)',
  lineHeight: 1.3,
  borderColor: 'var(--rule)',
  background: 'var(--bg)',
};

// Decorative "many dependencies" field (MASTER_PROMPT §19 scene 14, manager brief): a fixed,
// deterministic fan of unlabelled nodes hanging off the root, no Math.random (CONTRACTS §11
// requirement K: deterministic render). 26 decorative + the 4 named deck dependencies reads as
// the title's "thirty dependencies" without inventing any on-screen word.
const DECORATIVE_COUNT = 26;
const SPREAD_DEG = 170; // fan spread either side of straight-down (0deg)

// Task 37 hand-off (design §8, A9): the final ~15% of the pinned timeline is reserved for the
// 48% metric's hand-off into scene 15's first metric (same BigNumber value-left/numeric-emphasis
// class already; this is the "number collapses into its next role" pose).
const HANDOFF_SPAN = 0.15;

// Position (as % of a square container anchored at its top-center) and the matching edge
// geometry (length %, CSS rotate deg from the anchor) for decorative node `i` of `n`. Deterministic
// in `i` only (trig, no randomness) so the count and layout are stable across renders.
function decorativePoint(i: number, n: number) {
  const angle = -SPREAD_DEG / 2 + (i * SPREAD_DEG) / Math.max(n - 1, 1);
  const radius = 24 + (i % 4) * 9; // layered depth: four repeating branch lengths
  const rad = (angle * Math.PI) / 180;
  const dx = radius * Math.sin(rad);
  const dy = radius * Math.cos(rad);
  const cssAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return { x: 50 + dx, y: dy, length: radius, cssAngle };
}

export function SupplyChainScene({ scene }: SceneProps) {
  const progress = useSceneProgress();
  const containerRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const progressRef = useProgressRef(progress);

  const blocks = 'blocks' in scene.content ? scene.content.blocks : [];
  const flowBlock = blocks.find((b) => b.type === 'flow');
  const linesBlock = blocks.find((b) => b.type === 'lines');
  const metricsBlock = blocks.find((b) => b.type === 'metrics');

  const rootLabel = flowBlock?.label;
  const items = flowBlock?.items ?? [];
  const initialDeps = items.slice(0, 3);
  const compromisedItem = items[3];

  // Arrival pose (CONTRACTS §6/§11, A9): pinned, scrollLength 3 -> headEnd = 1/3; the remaining
  // [headEnd, handoffStart] window carries, in order (manager brief): root + first three
  // dependencies, the graph expanding into many dependencies (with the compromised litellm node),
  // the incident line, then the 48% metric landing value-first -- all scaled into that compressed
  // span (fix round 1: previously scaled into [headEnd, 1], squeezing the metric's own reveal into
  // a ~1.7% sliver of the full timeline) so every beat is comfortably paced before the hand-off.
  const headEnd = headArrival(scene);
  const handoffStart = 1 - HANDOFF_SPAN;
  const supportingSpan = Math.max(handoffStart - headEnd, 0);
  const initialEnd = headEnd + supportingSpan * 0.15;
  const expandEnd = initialEnd + supportingSpan * 0.45;
  const incidentEnd = expandEnd + supportingSpan * 0.15;

  useGSAP(
    () => {
      tlRef.current = null;
      if (typeof window.matchMedia !== 'function') return;
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ paused: true });
        tlRef.current = tl;

        revealHead(tl, eyebrowRef.current, titleRef.current, scene);

        const nodeEls = containerRef.current
          ? Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-part="node"]'))
          : [];
        // Deck order: root, CrewAI, DSPy, Mem0, litellm (compromised) -> first four land together.
        revealStagger(tl, nodeEls.slice(0, 4), headEnd, initialEnd, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1 });

        // Graph expansion: the decorative dependency field and the emphasised compromised node
        // build together (manager brief: "graph expands into many dependencies ... litellm
        // emphasised as the bad node"). Edges scale from their own origin (§11 "prefer transform,
        // scale lines from their origin").
        const graph = graphRef.current;
        const edgeEls = graph ? Array.from(graph.querySelectorAll<HTMLElement>('[data-part="edge"]')) : [];
        const depNodeEls = graph ? Array.from(graph.querySelectorAll<HTMLElement>('[data-part="dep-node"]')) : [];
        revealStagger(tl, edgeEls, initialEnd, expandEnd, { opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1 });
        revealStagger(tl, depNodeEls, initialEnd, expandEnd, { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1 });
        const compromisedEl = nodeEls[4];
        if (compromisedEl) {
          revealStagger(tl, [compromisedEl], initialEnd, expandEnd, { opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1 });
        }

        // Incident line, same treatment ContentScene gives every `lines` block.
        const lineEl = containerRef.current?.querySelector('[data-part="line"]');
        if (lineEl) {
          revealStagger(tl, [lineEl], expandEnd, incidentEnd, { opacity: 0, y: 12 }, { opacity: 1, y: 0 });
        }

        // Data grammar (CONTRACTS §11): metric lands value-first, then its label, fully landed by
        // handoffStart so the hand-off tween below has the whole tail to itself.
        const metricEl = containerRef.current?.querySelector('[data-part="metric"]');
        if (metricEl) {
          revealMetrics(tl, [metricEl], incidentEnd, handoffStart);
        }

        // Task 37 hand-off (design §8, A9, 14->15; fix round 1 ruling): once landed, the metric
        // (our own wrapper, not BigNumber's own value span the settle test above already pins to
        // scale 1 -- a different element, CONTRACTS §11) settles INTO its natural layout -- scale
        // 1, on the shared left edge -- which is exactly scene 15's first-metric class already
        // (same BigNumber). The tween runs from a slightly larger, right-shifted state down to
        // that resting pose, anchored on the left edge (transformOrigin '0% 50%', matching the
        // static default below) so it never drifts off the shared left alignment.
        const handoffEl = containerRef.current?.querySelector<HTMLElement>('[data-part="metric-handoff"]');
        if (handoffEl) {
          tl.fromTo(
            handoffEl,
            { x: 8, scale: 1.06, transformOrigin: '0% 50%' },
            { x: 0, scale: 1, duration: HANDOFF_SPAN, ease: 'power2.out' },
            handoffStart,
          );
        }

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
    // Slide 14 fix (round 1: gap-8 -> gap-5, measured 1119px in a 796px viewport; round 2: measured
    // 864px in a 757px viewport, still overflowing the 720px floor -- gap-5 -> gap-3 for more room).
    <div ref={containerRef} className="flex flex-col gap-3">
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
      <div className="relative flex flex-col items-center gap-2 pb-0">
        {rootLabel ? (
          <span data-part="node" data-role="root" className="border px-4 py-2 font-semibold" style={nodeStyle}>
            {rootLabel}
          </span>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {initialDeps.map((item, i) => (
            <span key={i} data-part="node" data-role="dependency" className="border px-4 py-2" style={nodeStyle}>
              {item}
            </span>
          ))}
          {compromisedItem ? (
            <span
              data-part="node"
              data-role="dependency"
              data-compromised="true"
              className="flex items-center gap-2 border-2 px-4 py-2 font-bold"
              style={{ ...nodeStyle, borderColor: 'var(--orange)' }}
            >
              <span data-part="alert-icon" aria-hidden="true">
                ⚠
              </span>
              {compromisedItem}
            </span>
          ) : null}
        </div>
        {/* Decorative "many dependencies" fan (CONTRACTS: decorative shapes aria-hidden) -- no
            invented deck words, purely unlabelled nodes/edges (manager brief). Capped at
            min(42vh, 360px) square (round 1); round 2 (measured 864px in a 757px viewport, still
            over the 720px floor) shrinks the cap further to min(34vh, 280px) -- the graph is
            decorative, so it can give up the most area per pixel of any element here. */}
        <div
          ref={graphRef}
          data-part="graph"
          aria-hidden="true"
          className="pointer-events-none relative"
          style={{ width: 'min(34vh, 280px)', height: 'min(34vh, 280px)' }}
        >
          {Array.from({ length: DECORATIVE_COUNT }).map((_, i) => {
            const { x, y, length, cssAngle } = decorativePoint(i, DECORATIVE_COUNT);
            return (
              <Fragment key={i}>
                {/* Static positioner (never touched by GSAP) carries the rotate; the inner
                    data-part="edge" carries only the GSAP-driven scaleX/opacity, so the two never
                    fight over the same element's `transform` (CONTRACTS §11: one library per
                    transform/opacity). */}
                <div
                  className="absolute left-1/2 top-0 h-px"
                  style={{ width: `${length}%`, transformOrigin: 'left center', transform: `rotate(${cssAngle}deg)` }}
                >
                  <div
                    data-part="edge"
                    className="h-full w-full"
                    style={{ background: 'var(--rule)', transformOrigin: 'left center' }}
                  />
                </div>
                <div
                  className="absolute h-2 w-2"
                  style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div data-part="dep-node" className="h-full w-full rounded-full" style={{ background: 'var(--muted)' }} />
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
      {linesBlock ? <Blocks blocks={[linesBlock]} /> : null}
      {metricsBlock ? (
        // Task 37 hand-off wrapper (design §8, A9): a wrapper we own, not Blocks'/BigNumber's own
        // markup (never edited here). Its resting style (fix round 1 ruling) IS scene 15's own
        // metric class -- natural layout, scale 1, no offset -- for the reduced-motion static
        // render; GSAP owns the same transform (from a larger/offset state into this one) when
        // animated. transformOrigin '0% 50%' matches the GSAP tween's own origin either way.
        <div
          data-part="metric-handoff"
          // Round 2: force BigNumber's compact value scale here regardless of this metric's own
          // value length ("48%" is short, so BigNumber.tsx would otherwise give it the 64-140px
          // hero scale) -- targets the value span itself (which carries no inline font-size of
          // its own; only its parent <p> does), so the inherited hero size loses to this explicit
          // rule without needing !important. Scene-scoped CSS per the fix brief, not a
          // components/ui change.
          className="[&_[data-part=value]]:text-[clamp(28px,3.4vw,52px)]"
          style={{ transformOrigin: '0% 50%' }}
        >
          <Blocks blocks={[metricsBlock]} />
        </div>
      ) : null}
    </div>
  );
}
