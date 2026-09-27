'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { AnimatePresence, motion } from 'framer-motion';
import type { SceneProps, Step } from '@/lib/types';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { useSceneProgress } from '@/components/presentation/SceneProgress';
import { titleStyle, eyebrowStyle, revealHead, revealStagger, useProgressRef } from './ContentScene';

const bodyTextStyle = {
  fontSize: 'clamp(20px, 1.6vw, 28px)',
  lineHeight: 1.35,
};

const formLineStyle = {
  ...bodyTextStyle,
  fontFamily: 'var(--font-mono)',
};

const REVEAL_FROM = { opacity: 0, y: 12 };
const REVEAL_TO = { opacity: 1, y: 0 };

function CheckGlyph({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      data-part="glyph"
      className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border-2"
      style={{ borderColor: checked ? 'var(--green)' : 'var(--rule)' }}
    >
      <AnimatePresence initial={false}>
        {checked ? (
          <motion.svg
            key="check"
            viewBox="0 0 16 16"
            width="14"
            height="14"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.15 }}
          >
            <path
              d="M3 8.5 6.5 12 13 4"
              fill="none"
              stroke="var(--green)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </motion.svg>
        ) : null}
      </AnimatePresence>
    </span>
  );
}

// KEEP IT SIMPLE · 2 OF 3 (MASTER_PROMPT §19 scene 38): a one-page checklist. Each question is a
// real button so it can be ticked as an audience takeaway; the check itself is a Framer Motion
// micro-interaction (CONTRACTS §11: 38/43 interactions never use GSAP) layered on top of the
// GSAP scroll-in reveal, which only ever drives the button's own opacity/y (different element/
// properties from the glyph's Framer Motion opacity/scale, so no double-driven property, §11).
export function ProgrammeScene({ scene }: SceneProps) {
  const progress = useSceneProgress();
  const containerRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const progressRef = useProgressRef(progress);

  const blocks = 'blocks' in scene.content ? scene.content.blocks : [];
  const leadLines = blocks.find((b) => b.type === 'lines')?.lines ?? [];
  const formLines = blocks.filter((b) => b.type === 'lines')[1]?.lines ?? [];
  const questions: Step[] = blocks.find((b) => b.type === 'steps')?.items ?? [];

  const [checked, setChecked] = useState<boolean[]>(() => questions.map(() => false));
  const toggle = (index: number) => {
    setChecked((prev) => prev.map((value, i) => (i === index ? !value : value)));
  };

  useGSAP(
    () => {
      tlRef.current = null;
      if (typeof window.matchMedia !== 'function') return;
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ paused: true });
        tlRef.current = tl;

        const { headEnd, supportingSpan } = revealHead(tl, eyebrowRef.current, titleRef.current, scene);

        // Unpinned scene (scrollLength 1): the lead line, the Owner/Reviewed lines and the five
        // checklist items build in sequence across the remaining span (design §9).
        const groups = containerRef.current
          ? [
              Array.from(containerRef.current.querySelectorAll('[data-block="lead"] [data-part="line"]')),
              Array.from(containerRef.current.querySelectorAll('[data-block="form"] [data-part="line"]')),
              Array.from(containerRef.current.querySelectorAll('[data-part="step"]')),
            ]
          : [];
        const perGroup = groups.length ? supportingSpan / groups.length : 0;
        groups.forEach((group, i) => {
          const start = headEnd + i * perGroup;
          const end = i === groups.length - 1 ? 1 : headEnd + (i + 1) * perGroup;
          revealStagger(tl, group, start, end, REVEAL_FROM, REVEAL_TO);
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

      <div data-block="lead" className="flex flex-col gap-3">
        {leadLines.map((line, i) => (
          <p key={i} data-part="line" style={bodyTextStyle}>
            {line}
          </p>
        ))}
      </div>

      <div
        data-block="form"
        className="flex flex-col gap-2 border-y py-4"
        style={{ borderColor: 'var(--rule)' }}
      >
        {formLines.map((line, i) => (
          <p key={i} data-part="line" style={formLineStyle}>
            {line}
          </p>
        ))}
      </div>

      <div data-block="checklist" className="flex flex-col gap-3" role="group" aria-label={scene.title}>
        {questions.map((question, i) => (
          <button
            key={`${question.n}-${i}`}
            type="button"
            role="checkbox"
            aria-checked={checked[i]}
            data-part="step"
            onClick={() => toggle(i)}
            className="flex items-center gap-4 text-left"
          >
            <CheckGlyph checked={!!checked[i]} />
            <span aria-hidden="true" style={{ fontFamily: 'var(--font-mono)', color: 'var(--label)' }}>
              {question.n}
            </span>
            <span
              style={{
                ...bodyTextStyle,
                fontWeight: checked[i] ? 400 : 600,
                textDecoration: checked[i] ? 'line-through' : 'none',
              }}
            >
              {question.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
