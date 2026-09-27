'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { SceneProps } from '@/lib/types';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { useSceneProgress } from '@/components/presentation/SceneProgress';
import { titleStyle, eyebrowStyle, revealHead, headArrival, revealStagger, useProgressRef } from './ContentScene';

const bodyTextStyle: CSSProperties = {
  fontSize: 'clamp(20px, 1.6vw, 28px)',
  lineHeight: 1.35,
};

const monoStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  color: 'var(--label)',
  fontSize: 'clamp(12px, 1vw, 16px)',
  letterSpacing: '0.08em',
};

const metaMutedStyle: CSSProperties = { ...monoStyle, color: 'var(--muted)' };

// Plot geometry (SVG user-space units, MASTER_PROMPT §19 scene 34 "governance debt curve rises
// across growth phases"): phases sit evenly spaced on the x-axis inside a small margin; ratio 0
// sits on the baseline, ratio 1 at the plot top.
const VIEW_W = 400;
const VIEW_H = 220;
const MARGIN_X = 24;
const Y_BASELINE = 190;
const Y_TOP = 24;

function xForPhase(i: number, count: number) {
  const span = VIEW_W - MARGIN_X * 2;
  const steps = Math.max(count - 1, 1);
  return MARGIN_X + (span * i) / steps;
}

function yForRatio(ratio: number) {
  return Y_BASELINE - ratio * (Y_BASELINE - Y_TOP);
}

// Smooth curve, one cubic segment at a time: the control points sit at the horizontal midpoint
// between the two endpoints, giving each point a flat (horizontal) tangent -- a simple, fully
// deterministic way to draw a rising curve through a handful of (x, y) points without a charting
// dependency (design §12: prefer SVG lines over chart libraries).
function segmentPath(p0: { x: number; y: number }, p1: { x: number; y: number }) {
  const mx = (p0.x + p1.x) / 2;
  return `M ${p0.x} ${p0.y} C ${mx} ${p0.y} ${mx} ${p1.y} ${p1.x} ${p1.y}`;
}

export function GovernanceCurveScene({ scene }: SceneProps) {
  const progress = useSceneProgress();
  const containerRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const progressRef = useProgressRef(progress);

  const blocks = 'blocks' in scene.content ? scene.content.blocks : [];
  const flowBlock = blocks.find((b) => b.type === 'flow');
  const barsBlock = blocks.find((b) => b.type === 'bars');

  const phases = flowBlock?.items ?? [];
  const series = barsBlock?.series ?? [];
  const note = barsBlock?.note;
  const ratios = barsBlock?.ratios ?? [];

  // Manager ruling (Task 32 fix round 1): `ratios` carries every measured bar in deck shape
  // order -- one (Built in, Deferred) pair per phase, not one endpoint per series -- so each
  // phase plots its OWN measured pair directly: `ratios[2*i]` is that phase's 'Built in' height,
  // `ratios[2*i + 1]` is its 'Deferred' height (both series positions are the deck's own,
  // source/slides.json slide 34, not a generic mapping). No interpolation: the deck's own shape
  // IS the curve (MASTER_PROMPT §19 scene 34 "governance debt curve rises across growth phases").
  const builtInPoints = phases.map((_, i) => ({ x: xForPhase(i, phases.length), y: yForRatio(ratios[2 * i] ?? 1) }));
  const deferredPoints = phases.map((_, i) => ({
    x: xForPhase(i, phases.length),
    y: yForRatio(ratios[2 * i + 1] ?? 1),
  }));

  const headEnd = headArrival(scene);
  const supportingSpan = Math.max(1 - headEnd, 0);
  const phasesEnd = headEnd + supportingSpan * 0.25;
  const curvesEnd = phasesEnd + supportingSpan * 0.55;

  useGSAP(
    () => {
      tlRef.current = null;
      if (typeof window.matchMedia !== 'function') return;
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ paused: true });
        tlRef.current = tl;

        revealHead(tl, eyebrowRef.current, titleRef.current, scene);

        const phaseEls = containerRef.current
          ? Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-part="phase"]'))
          : [];
        revealStagger(tl, phaseEls, headEnd, phasesEnd, { opacity: 0, y: 12 }, { opacity: 1, y: 0 });

        const builtInSegs = containerRef.current
          ? Array.from(containerRef.current.querySelectorAll<SVGPathElement>('[data-series="built-in"] [data-part="segment"]'))
          : [];
        const deferredSegs = containerRef.current
          ? Array.from(containerRef.current.querySelectorAll<SVGPathElement>('[data-series="deferred"] [data-part="segment"]'))
          : [];
        // Same [start, end] window and item count for both series -> they rise in lockstep,
        // phase gap by phase gap, exactly as the manager brief describes.
        revealStagger(tl, builtInSegs, phasesEnd, curvesEnd, { opacity: 0 }, { opacity: 1 });
        revealStagger(tl, deferredSegs, phasesEnd, curvesEnd, { opacity: 0 }, { opacity: 1 });

        const trailingEls = containerRef.current
          ? Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-part="legend-item"], [data-part="note"]'))
          : [];
        revealStagger(tl, trailingEls, curvesEnd, 1, { opacity: 0, y: 8 }, { opacity: 1, y: 0 });

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

      <div data-part="plot" className="relative" style={{ height: 'clamp(220px, 26vw, 320px)' }}>
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          <line
            x1={MARGIN_X}
            y1={Y_BASELINE}
            x2={VIEW_W - MARGIN_X}
            y2={Y_BASELINE}
            stroke="var(--rule)"
            strokeWidth={1}
          />
          <g data-series="built-in">
            {builtInPoints.slice(0, -1).map((p, i) => (
              <path
                key={i}
                data-part="segment"
                d={segmentPath(p, builtInPoints[i + 1])}
                fill="none"
                stroke="var(--green)"
                strokeWidth={3}
                strokeLinecap="round"
              />
            ))}
          </g>
          <g data-series="deferred">
            {deferredPoints.slice(0, -1).map((p, i) => (
              <path
                key={i}
                data-part="segment"
                d={segmentPath(p, deferredPoints[i + 1])}
                fill="none"
                stroke="var(--orange)"
                strokeWidth={3}
                strokeDasharray="9 7"
                strokeLinecap="round"
              />
            ))}
          </g>
        </svg>
      </div>

      <ol data-part="phases" className="flex items-start justify-between gap-2">
        {phases.map((phase, i) => (
          <li key={i} data-part="phase" className="flex-1 text-center" style={metaMutedStyle}>
            {phase}
          </li>
        ))}
      </ol>

      <div data-part="legend" className="flex flex-wrap gap-8">
        {series.map((label, i) => (
          <span key={i} data-part="legend-item" className="flex items-center gap-2" style={bodyTextStyle}>
            <span
              aria-hidden="true"
              className="inline-block w-6"
              style={
                i === 0
                  ? { height: 3, background: 'var(--green)' }
                  : { height: 0, borderTop: '3px dashed var(--orange)' }
              }
            />
            {label}
          </span>
        ))}
      </div>

      {note ? (
        <p data-part="note" style={metaMutedStyle}>
          {note}
        </p>
      ) : null}
    </div>
  );
}
