'use client';

import { useEffect, useRef } from 'react';
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

const codeLineStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'clamp(15px, 1.2vw, 20px)',
  lineHeight: 1.5,
};

const bodyTextStyle: CSSProperties = {
  fontSize: 'clamp(20px, 1.6vw, 28px)',
  lineHeight: 1.35,
};

export function AiWritesBugScene({ scene }: SceneProps) {
  const progress = useSceneProgress();
  const containerRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const progressRef = useProgressRef(progress);

  const blocks = 'blocks' in scene.content ? scene.content.blocks : [];
  const metricsBlock = blocks.find((b) => b.type === 'metrics');
  const termsBlock = blocks.find((b) => b.type === 'terms');
  const linesBlock = blocks.find((b) => b.type === 'lines');
  const codeTerm = termsBlock?.items[0];
  const lines = linesBlock?.lines ?? [];

  // Arrival pose (CONTRACTS §6/§11, A9): pinned, scrollLength 2 -> headEnd = 1/2; the remaining
  // [headEnd, 1] window carries, in order (manager brief): the 2.74x metric value-first, then the
  // Codex CLI code-story card revealing line by line, then the two closing lines, last as punchline.
  const headEnd = headArrival(scene);
  const supportingSpan = Math.max(1 - headEnd, 0);
  const metricEnd = headEnd + supportingSpan * 0.25;
  const codeCardEnd = metricEnd + supportingSpan * 0.45;

  useGSAP(
    () => {
      tlRef.current = null;
      if (typeof window.matchMedia !== 'function') return;
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ paused: true });
        tlRef.current = tl;

        revealHead(tl, eyebrowRef.current, titleRef.current, scene);

        // Data grammar (CONTRACTS §11): metric lands value-first, then its label.
        const metricEl = containerRef.current?.querySelector('[data-part="metric"]');
        if (metricEl) {
          revealMetrics(tl, [metricEl], headEnd, metricEnd);
        }

        // Code-story card: the term, then its text, revealed line by line (manager brief).
        const codeLines = containerRef.current
          ? Array.from(containerRef.current.querySelectorAll('[data-part="code-line"]'))
          : [];
        revealStagger(tl, codeLines, metricEnd, codeCardEnd, { opacity: 0, y: 10 }, { opacity: 1, y: 0 });

        // Closing lines, same fade/rise ContentScene gives every `lines` block; the punchline gets
        // an extra transform pop (scale) layered on top — still transform+opacity only (§11).
        const lineEls = containerRef.current
          ? Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-part="line"]'))
          : [];
        revealStagger(tl, lineEls, codeCardEnd, 1, { opacity: 0, y: 12 }, { opacity: 1, y: 0 });
        const punchlineEl = lineEls[lineEls.length - 1];
        if (punchlineEl) {
          const punchStart = codeCardEnd + (1 - codeCardEnd) * 0.4;
          tl.fromTo(
            punchlineEl,
            { scale: 0.94 },
            { scale: 1, duration: Math.max(1 - punchStart, 0), ease: 'power2.out' },
            punchStart,
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
      {metricsBlock ? <Blocks blocks={[metricsBlock]} /> : null}
      {codeTerm ? (
        // Code-like card (manager brief: "a terminal/diff frame drawn with CSS borders"); only
        // deck strings render as text — the header bar is decorative chrome with no text nodes.
        <div data-part="code-card" className="border" style={{ borderColor: 'var(--rule)', background: 'var(--bg)' }}>
          <div
            aria-hidden="true"
            className="flex gap-1.5 border-b px-4 py-2.5"
            style={{ borderColor: 'var(--rule)' }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--muted)' }} />
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--muted)' }} />
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--muted)' }} />
          </div>
          <div className="flex flex-col gap-2 px-5 py-5">
            <p data-part="code-line" style={{ ...codeLineStyle, fontWeight: 700, color: 'var(--fg)' }}>
              {codeTerm.term}
            </p>
            <p data-part="code-line" style={{ ...codeLineStyle, color: 'var(--muted)' }}>
              {codeTerm.text}
            </p>
          </div>
        </div>
      ) : null}
      {lines.length ? (
        <div className="flex flex-col gap-3">
          {lines.map((line, i) => {
            const isPunchline = i === lines.length - 1;
            return (
              <p
                key={i}
                data-part="line"
                data-emphasis={isPunchline ? 'punchline' : undefined}
                style={isPunchline ? { ...bodyTextStyle, fontWeight: 700, color: 'var(--fg)' } : bodyTextStyle}
              >
                {line}
              </p>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
