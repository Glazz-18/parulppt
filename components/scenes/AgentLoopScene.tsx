'use client';

import { useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { SceneProps } from '@/lib/types';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { useSceneProgress } from '@/components/presentation/SceneProgress';
import { titleStyle, eyebrowStyle, revealHead, headArrival, revealStagger, useProgressRef } from './ContentScene';
import { Blocks } from './Blocks';

const monoStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  color: 'var(--label)',
  fontSize: 'clamp(12px, 1vw, 16px)',
  letterSpacing: '0.08em',
};

const nodeStyle: CSSProperties = {
  fontSize: 'clamp(15px, 1.1vw, 20px)',
  lineHeight: 1.3,
  borderColor: 'var(--rule)',
  background: 'var(--bg)',
};

// CONTRACTS §3.1: the deck's own connector glyphs render as distinct elements, never aria-hidden
// (they are deck copy, same rule Blocks.tsx follows for the shared flow block).
const CONNECTORS = new Set(['→', '↺']);

// Ring geometry (MASTER_PROMPT §19 scene 11 "agent loop physically cycles"; manager brief): the
// 5 agent nodes (Goal, Reason, Use a tool, Act, Observe) sit equally spaced (72° apart) on a
// circle starting at the top (Goal) going clockwise; each connector — including the closing ↺ —
// sits at the midpoint angle between the two nodes it joins, on the same circle, so the deck's
// own item order (kept intact, brief) reads as a physical loop.
const NODE_COUNT = 5;
const RADIUS_PCT = 38;
const STEP_DEG = 360 / NODE_COUNT;

function pointOnRing(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    left: `${50 + RADIUS_PCT * Math.cos(rad)}%`,
    top: `${50 + RADIUS_PCT * Math.sin(rad)}%`,
  };
}

export function AgentLoopScene({ scene }: SceneProps) {
  const progress = useSceneProgress();
  const containerRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const progressRef = useProgressRef(progress);

  const blocks = 'blocks' in scene.content ? scene.content.blocks : [];
  const flowBlocks = blocks.filter((b) => b.type === 'flow');
  const chatbotBlock = flowBlocks[0];
  const agentBlock = flowBlocks[1];
  const metricsBlock = blocks.find((b) => b.type === 'metrics');
  const agentItems = agentBlock?.items ?? [];

  // Arrival pose (CONTRACTS §6/§11, A9): pinned, scrollLength 3 -> headEnd = 1/3; the remaining
  // [headEnd, 1] window carries, in order, the Chatbot line, the Agent ring build + indicator
  // cycle, then the metric (manager brief order).
  const headEnd = headArrival(scene);
  const supportingSpan = Math.max(1 - headEnd, 0);
  const chatbotEnd = headEnd + supportingSpan * 0.2;
  const ringEnd = headEnd + supportingSpan * 0.6;
  const metricValueEnd = ringEnd + (1 - ringEnd) * 0.5;

  useGSAP(
    () => {
      tlRef.current = null;
      if (typeof window.matchMedia !== 'function') return;
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ paused: true });
        tlRef.current = tl;

        revealHead(tl, eyebrowRef.current, titleRef.current, scene);

        const container = containerRef.current;
        const flowSelector = '[data-part="flow-label"], [data-part="node"], [data-part="connector"]';

        const chatbotFlow = container?.querySelector('[data-block="flow"]');
        if (chatbotFlow) {
          revealStagger(
            tl,
            chatbotFlow.querySelectorAll(flowSelector),
            headEnd,
            chatbotEnd,
            { opacity: 0, scale: 0.92 },
            { opacity: 1, scale: 1 },
          );
        }

        if (ringRef.current) {
          revealStagger(
            tl,
            ringRef.current.querySelectorAll(flowSelector),
            chatbotEnd,
            ringEnd,
            { opacity: 0, scale: 0.92 },
            { opacity: 1, scale: 1 },
          );
        }

        if (indicatorRef.current) {
          // Two full cycles (720°): "completing at least one full cycle" (brief) while landing on
          // a multiple of 360°, so the rotated end state at progress 1 reads identically to the
          // untransformed natural markup (progress-1 = static markup, CONTRACTS §11).
          tl.fromTo(
            indicatorRef.current,
            { rotation: 0 },
            { rotation: 720, duration: Math.max(1 - chatbotEnd, 0), ease: 'none' },
            chatbotEnd,
          );
        }

        const metricEl = container?.querySelector('[data-part="metric"]');
        if (metricEl) {
          // Data grammar (CONTRACTS §11): metric lands value-first, then its label (brief).
          const value = metricEl.querySelector('[data-part="value"]');
          const label = metricEl.querySelector('[data-part="label"]');
          if (value) {
            tl.fromTo(
              value,
              { opacity: 0, scale: 0.85 },
              { opacity: 1, scale: 1, duration: Math.max(metricValueEnd - ringEnd, 0), ease: 'power2.out' },
              ringEnd,
            );
          }
          if (label) {
            tl.fromTo(
              label,
              { opacity: 0, y: 8 },
              { opacity: 1, y: 0, duration: Math.max(1 - metricValueEnd, 0), ease: 'power2.out' },
              metricValueEnd,
            );
          }
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
      <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
        {chatbotBlock ? (
          <div className="flex flex-col gap-3">
            <Blocks blocks={[chatbotBlock]} />
          </div>
        ) : null}
        <div ref={ringRef} data-part="ring" className="relative mx-auto mt-10 aspect-square w-full max-w-[380px]">
          {agentBlock?.label ? (
            <p data-part="flow-label" className="absolute -top-8 left-0 right-0 text-center" style={monoStyle}>
              {agentBlock.label}
            </p>
          ) : null}
          {/* Decorative ring outline (CONTRACTS: decorative shapes aria-hidden); the real content
              is the node/connector text below. */}
          <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
            <circle cx="50" cy="50" r={RADIUS_PCT} fill="none" stroke="var(--rule)" strokeWidth="1" />
          </svg>
          {agentItems.map((item, i) => {
            const isConnector = CONNECTORS.has(item);
            const nodeIndex = Math.floor(i / 2);
            const angle = -90 + nodeIndex * STEP_DEG + (isConnector ? STEP_DEG / 2 : 0);
            const { left, top } = pointOnRing(angle);
            return (
              <span
                key={i}
                data-part={isConnector ? 'connector' : 'node'}
                className={
                  isConnector
                    ? 'absolute -translate-x-1/2 -translate-y-1/2'
                    : 'absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-3 py-1.5'
                }
                style={isConnector ? { ...monoStyle, left, top, color: 'var(--fg)' } : { ...nodeStyle, left, top }}
              >
                {item}
              </span>
            );
          })}
          {/* Decorative loop indicator (brief: "rotating an indicator wrapper is a transform");
              its natural, untransformed position is Goal's own position on the ring. */}
          <div
            ref={indicatorRef}
            data-part="indicator-wrap"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
          >
            <span
              data-part="indicator"
              className="absolute left-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ top: `${50 - RADIUS_PCT}%`, background: 'var(--orange)' }}
            />
          </div>
        </div>
      </div>
      {metricsBlock ? <Blocks blocks={[metricsBlock]} /> : null}
    </div>
  );
}
