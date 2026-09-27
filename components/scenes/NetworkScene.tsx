'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { SceneProps, Step } from '@/lib/types';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { BigNumber } from '@/components/ui/BigNumber';
import { useSceneProgress } from '@/components/presentation/SceneProgress';
import { UI_COPY } from '@/lib/constants';
import { titleStyle, eyebrowStyle, revealHead, revealStagger, useProgressRef } from './ContentScene';

const bodyTextStyle: CSSProperties = {
  fontSize: 'clamp(20px, 1.6vw, 28px)',
  lineHeight: 1.35,
};

const numberStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  color: 'var(--label)',
};

type Status = 'idle' | 'running' | 'paused';

const EMPTY_CONTENT = { lead: '', timer: '', seconds: 0, prompts: [] as Step[] };

// Scene 43 (MASTER_PROMPT §20, CONTRACTS A1/§11): a 60-second local countdown with five
// swap prompts. The GSAP scroll timeline below only plays the entrance (eyebrow/title/lead/
// countdown block/prompts fading in as the visitor arrives, same skeleton as ContentScene and
// ProgrammeScene); the countdown itself and its prompt-emphasis staging are plain React state
// driven by a single setInterval that exists only while running (CONTRACTS §11, requirement K) —
// never GSAP, never Date.
export function NetworkScene({ scene }: SceneProps) {
  const content = scene.kind === 'network' ? scene.content : EMPTY_CONTENT;
  const { seconds, prompts } = content;

  const progress = useSceneProgress();
  const containerRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const countdownRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const progressRef = useProgressRef(progress);

  const [status, setStatus] = useState<Status>('idle');
  const [remaining, setRemainingState] = useState(seconds);
  // Source of truth read by the interval tick, updated synchronously alongside every
  // setRemainingState call (not via a separate effect) so two ticks flushed in the same
  // fake-timer advance still see each other's decrement instead of both reading a stale value.
  const remainingRef = useRef(seconds);
  const setRemaining = (value: number) => {
    remainingRef.current = value;
    setRemainingState(value);
  };

  // Ticks only while running; cleared on pause, restart, reaching 0, and unmount. The zero check
  // lives in the tick callback itself (not a separate effect keyed on `remaining`) so reaching 0
  // is handled as part of the same external-timer event that produced it.
  useEffect(() => {
    if (status !== 'running') return;
    const id = setInterval(() => {
      const next = Math.max(remainingRef.current - 1, 0);
      setRemaining(next);
      if (next === 0) setStatus('idle');
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  const start = () => {
    if (remaining <= 0) return;
    setStatus('running');
  };
  const pause = () => setStatus('paused');
  const restart = () => {
    setStatus('idle');
    setRemaining(seconds);
  };

  // The deck string shows before the first start and again after Restart (remaining back at
  // `seconds`); once ticking has happened (including running down to 0) the display is computed.
  const display = status === 'idle' && remaining === seconds ? content.timer : `${remaining}s`;

  // Visual staging only (CONTRACTS §3.1: interaction state in memory, every prompt already in the
  // markup): idle (never started) shows every prompt fully; once running/paused, the prompt whose
  // 12s window is current is emphasised and later ones are subdued but readable.
  const windowSize = prompts.length ? seconds / prompts.length : 0;
  const elapsed = seconds - remaining;
  const activeIndex =
    status === 'idle' || !prompts.length ? -1 : Math.min(prompts.length - 1, Math.floor(elapsed / windowSize));

  useGSAP(
    () => {
      tlRef.current = null;
      if (typeof window.matchMedia !== 'function') return;
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ paused: true });
        tlRef.current = tl;

        const { headEnd, supportingSpan } = revealHead(tl, eyebrowRef.current, titleRef.current, scene);

        const groups = containerRef.current
          ? [
              Array.from(containerRef.current.querySelectorAll('[data-block="lead"] [data-part="line"]')),
              countdownRef.current ? [countdownRef.current] : [],
              Array.from(containerRef.current.querySelectorAll('[data-part="step"]')),
            ]
          : [];
        const perGroup = groups.length ? supportingSpan / groups.length : 0;
        groups.forEach((group, i) => {
          const groupStart = headEnd + i * perGroup;
          const groupEnd = i === groups.length - 1 ? 1 : headEnd + (i + 1) * perGroup;
          revealStagger(tl, group, groupStart, groupEnd, { opacity: 0, y: 12 }, { opacity: 1, y: 0 });
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

      <div data-block="lead">
        <p data-part="line" style={bodyTextStyle}>
          {content.lead}
        </p>
      </div>

      <div ref={countdownRef} data-block="countdown" className="flex flex-col gap-6">
        <div role="timer">
          <BigNumber value={display} />
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            className="demo-btn"
            // Task 34: Start at remaining 0 was a silent no-op (start() itself already guards
            // against it) — now shown as disabled instead of inviting a dead click.
            disabled={status !== 'running' && remaining <= 0}
            onClick={status === 'running' ? pause : start}
          >
            {status === 'running' ? UI_COPY.pause : UI_COPY.start}
          </button>
          <button type="button" className="demo-btn" onClick={restart}>
            {UI_COPY.restart}
          </button>
        </div>
      </div>

      <ol data-block="prompts" className="flex flex-col gap-3">
        {prompts.map((prompt, i) => (
          <li
            key={`${prompt.n}-${i}`}
            data-part="step"
            className="flex gap-4 transition-opacity duration-300 motion-reduce:transition-none"
            style={{
              ...bodyTextStyle,
              opacity: activeIndex === -1 || i <= activeIndex ? 1 : 0.45,
              fontWeight: activeIndex === i ? 600 : 400,
            }}
          >
            <span style={numberStyle}>{prompt.n}</span>
            <span>{prompt.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
