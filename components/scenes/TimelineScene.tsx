'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { Block, Mark, SceneProps } from '@/lib/types';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Timeline } from '@/components/ui/Timeline';
import { useSceneProgress } from '@/components/presentation/SceneProgress';
import { eyebrowStyle, revealHead, revealStagger, titleStyle, useProgressRef } from './ContentScene';
import { Blocks } from './Blocks';

// design §4: the figure (`mark.at`) is the numeric emphasis, the description (`mark.text`) is
// body tier. `Timeline` (W1, not edited) sets only fontFamily/color inline on the `at` span and
// nothing on the `text` span, so font-size lands here via descendant selectors without fighting
// inline styles.
const HORIZONTAL_MARKS =
  '[&_ol]:flex [&_ol]:flex-row [&_ol]:flex-wrap [&_ol]:justify-between [&_ol]:gap-x-8 [&_ol]:gap-y-8 ' +
  '[&_li[data-part=mark]]:flex [&_li[data-part=mark]]:basis-[17%] [&_li[data-part=mark]]:min-w-[150px] ' +
  '[&_li[data-part=mark]]:max-w-[240px] [&_li[data-part=mark]]:flex-col [&_li[data-part=mark]]:items-start [&_li[data-part=mark]]:gap-2 ' +
  '[&_li[data-part=mark]>span:first-child]:text-[clamp(36px,4.6vw,80px)] [&_li[data-part=mark]>span:first-child]:font-bold [&_li[data-part=mark]>span:first-child]:leading-none ' +
  '[&_li[data-part=mark]>span:last-child]:text-[clamp(15px,1.3vw,20px)] [&_li[data-part=mark]>span:last-child]:leading-snug [&_li[data-part=mark]>span:last-child]:text-[color:var(--muted)]';

function TimelineMarks({ items }: { items: Mark[] }) {
  return (
    <div data-block="marks" className={HORIZONTAL_MARKS}>
      <Timeline items={items} />
    </div>
  );
}

// Week/day segments for kind 'challenge' (MASTER_PROMPT §21, slide 44's copy lands in Task 25):
// a fill bar per segment rather than <Timeline>'s bare spans, since each segment needs its own
// `data-part="fill"` to scale in as the visitor scrolls through.
function ChallengeSegments({ items }: { items: Mark[] }) {
  return (
    <ol data-block="marks" className="flex flex-col gap-6 sm:flex-row sm:items-stretch sm:gap-4">
      {items.map((mark, i) => (
        <li
          key={`${mark.at}-${i}`}
          data-part="mark"
          className="flex flex-1 min-w-[120px] flex-col gap-3"
        >
          <div className="h-2 w-full origin-left overflow-hidden" style={{ background: 'var(--rule)' }}>
            <div data-part="fill" className="h-full w-full origin-left" style={{ background: 'var(--label)' }} />
          </div>
          <span
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--label)', fontSize: 'clamp(14px, 1.2vw, 18px)', letterSpacing: '0.06em' }}
          >
            {mark.at}
          </span>
          <span style={{ fontSize: 'clamp(15px, 1.2vw, 19px)', lineHeight: 1.35 }}>{mark.text}</span>
        </li>
      ))}
    </ol>
  );
}

export function TimelineScene({ scene }: SceneProps) {
  const progress = useSceneProgress();
  const containerRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const axisRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const progressRef = useProgressRef(progress);

  const blocks: Block[] = 'blocks' in scene.content ? scene.content.blocks : [];
  const marksBlock = blocks.find((b) => b.type === 'marks');
  const restBlocks = blocks.filter((b) => b.type !== 'marks');
  const marks = marksBlock?.items ?? [];
  const isChallenge = scene.kind === 'challenge';

  useGSAP(
    () => {
      tlRef.current = null;
      if (typeof window.matchMedia !== 'function') return;
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ paused: true });
        tlRef.current = tl;

        // Arrival pose (CONTRACTS §6/§11, A9): pinned metadata+title complete by 1/scrollLength;
        // pinned beats (axis, marks, closing lines) live in [that, 1].
        const { headEnd, supportingSpan } = revealHead(tl, eyebrowRef.current, titleRef.current, scene);
        const linesBlock = restBlocks.find((b) => b.type === 'lines');
        // design §9 "attacker timeline": axis/marks draw across most of the pinned range; a
        // trailing closing-lines block (slide 20's "The human doesn't get faster...") gets the
        // last slice, same shape as ContentScene's trailing-reveal split.
        const marksSpan = linesBlock ? supportingSpan * 0.82 : supportingSpan;
        const marksEnd = headEnd + marksSpan;

        const markEls = containerRef.current
          ? Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-part="mark"]'))
          : [];

        if (markEls.length) {
          const step = (marksEnd - headEnd) / markEls.length;

          if (!isChallenge && axisRef.current) {
            // design §9 "attacker timeline": the axis draws left -> right across the full mark span.
            tl.fromTo(axisRef.current, { scaleX: 0 }, { scaleX: 1, duration: marksEnd - headEnd, ease: 'none' }, headEnd);
          }

          markEls.forEach((el, i) => {
            const start = headEnd + i * step;
            const end = i === markEls.length - 1 ? marksEnd : headEnd + (i + 1) * step;

            if (isChallenge) {
              const fill = el.querySelector<HTMLElement>('[data-part="fill"]');
              if (fill) {
                tl.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: end - start, ease: 'power1.out' }, start);
              }
              revealStagger(tl, [el], start, end, { opacity: 0, y: 12 }, { opacity: 1, y: 0 });
              return;
            }

            // Each value "locks in" (a short y/scale settle) before its description follows
            // (design §9: "values lock into their positions").
            const value = el.children[0] as HTMLElement | undefined;
            const text = el.children[1] as HTMLElement | undefined;
            const valueDur = (end - start) * 0.4;
            if (value) {
              tl.fromTo(
                value,
                { opacity: 0, y: 16, scale: 0.85 },
                { opacity: 1, y: 0, scale: 1, duration: valueDur, ease: 'back.out(1.7)' },
                start,
              );
            }
            if (text) {
              tl.fromTo(
                text,
                { opacity: 0, y: 10 },
                { opacity: 1, y: 0, duration: Math.max(end - start - valueDur, 0), ease: 'power2.out' },
                start + valueDur,
              );
            }
          });
        }

        if (linesBlock) {
          const lineEls = containerRef.current
            ? Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-block="lines"] [data-part="line"]'))
            : [];
          revealStagger(tl, lineEls, marksEnd, 1, { opacity: 0, y: 12 }, { opacity: 1, y: 0 });
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
      {marksBlock ? (
        isChallenge ? (
          <ChallengeSegments items={marks} />
        ) : (
          <div className="flex flex-col gap-6">
            <div
              ref={axisRef}
              data-part="axis"
              aria-hidden="true"
              className="h-px w-full origin-left"
              style={{ background: 'var(--rule)' }}
            />
            <TimelineMarks items={marks} />
          </div>
        )
      ) : null}
      {restBlocks.length ? <Blocks blocks={restBlocks} /> : null}
    </div>
  );
}
