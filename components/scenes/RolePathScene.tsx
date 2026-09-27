'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import type { SceneProps } from '@/lib/types';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { useSceneProgress } from '@/components/presentation/SceneProgress';
import { titleStyle, eyebrowStyle, revealStagger } from './ContentScene';

const bodyTextStyle = {
  fontSize: 'clamp(20px, 1.6vw, 28px)',
  lineHeight: 1.35,
};

// PPTX measurement (source/pptx-raw/ppt/slides/slide3.xml, unzipped from Missing_design_files.pptx):
// the "You are here" shape's <a:off x="1143000"> matches the "User" label's and its staircase
// step's <a:off x="1143000"> exactly (Power user/Builder/Founder/System designer step up at
// 4381500/7620000/10858500/14097000) — the marker rests over the first (lowest) step, User.
const RESTING_ROLE_INDEX = 0;

export function RolePathScene({ scene }: SceneProps) {
  const progress = useSceneProgress();
  const containerRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const pathRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  const blocks = 'blocks' in scene.content ? scene.content.blocks : [];
  const flowBlock = blocks.find((b) => b.type === 'flow');
  const roles = flowBlock?.items ?? [];
  const marker = flowBlock?.marker ?? '';

  useGSAP(
    () => {
      tlRef.current = null;
      if (typeof window.matchMedia !== 'function') return;
      gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({ paused: true });
        tlRef.current = tl;

        // Arrival pose (CONTRACTS §6/§11): unpinned scene (scrollLength 1), same head/supporting
        // split as ContentScene's unpinned case.
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

        const supportingSpan = Math.max(1 - headEnd, 0);

        // MASTER_PROMPT §19 scene 3 beat: the path line draws left -> right first (design §8
        // "shared geometry" enter grammar), roles reveal in sequence over it, and the marker
        // travels along the path to land on its resting role right at progress 1.
        const pathEnd = headEnd + supportingSpan * 0.35;
        if (pathRef.current) {
          tl.fromTo(
            pathRef.current,
            { scaleX: 0 },
            { scaleX: 1, duration: Math.max(pathEnd - headEnd, 0), ease: 'power1.out' },
            headEnd,
          );
        }

        const roleEls = containerRef.current
          ? Array.from(containerRef.current.querySelectorAll<HTMLElement>('[data-part="role"]'))
          : [];
        revealStagger(tl, roleEls, headEnd, 1, { opacity: 0, y: 16 }, { opacity: 1, y: 0 });

        // Review round 1 (Task 22): a decorative pointer (not the "You are here" marker, which
        // stays fixed on User) travels the length of the path as it draws, landing at the path's
        // END (System designer) exactly at progress 1. Its natural/static layout position IS the
        // path end (`right-0` on the inner dot), so progress-1 equals the static markup (CONTRACTS
        // §11): the tween only ever offsets it backward (x: -100% of its own/the path's width,
        // via the "full-width wrapper" trick — same width as `path`, so a -100% translateX moves
        // it exactly one path-length to the left) toward its resting x: 0.
        if (pointerRef.current) {
          tl.fromTo(
            pointerRef.current,
            { x: '-100%' },
            { x: '0%', duration: Math.max(1 - headEnd, 0), ease: 'power1.inOut' },
            headEnd,
          );
        }

        if (markerRef.current) {
          tl.fromTo(
            markerRef.current,
            { opacity: 0, x: -48 },
            { opacity: 1, x: 0, duration: Math.max(1 - headEnd, 0), ease: 'power2.out' },
            headEnd,
          );
        }

        // Guarantees total duration 1 (CONTRACTS §6) even when float rounding left a beat short.
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
    <div ref={containerRef} className="flex flex-col gap-10">
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
      <div data-part="diagram" className="relative mt-6 pb-4">
        <div
          ref={pathRef}
          data-part="path"
          className="absolute inset-x-0 top-2 h-px origin-left"
          style={{ background: 'var(--rule)' }}
        />
        {/* Decorative path-head pointer (not the "You are here" marker): same width as `path`, so
            translating it by its own -100%/0% moves it exactly one path-length. Its natural,
            untransformed position (the inner dot at `right-0`) is the path's end. */}
        <div ref={pointerRef} data-part="pointer" aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-2 h-0">
          <span className="absolute right-0 top-1/2 block h-2 w-2 -translate-y-1/2 rounded-full" style={{ background: 'var(--label)' }} />
        </div>
        <ol data-part="roles" className="relative flex items-start justify-between gap-2">
          {roles.map((role, i) => (
            <li
              key={role}
              data-part="role"
              className="relative flex flex-1 flex-col items-center gap-4 text-center"
            >
              <span
                aria-hidden="true"
                className="relative z-10 mt-[3px] block h-3 w-3 rounded-full border-2"
                style={{ borderColor: 'var(--fg)', background: 'var(--bg)' }}
              />
              <span style={bodyTextStyle}>{role}</span>
              {i === RESTING_ROLE_INDEX && marker ? (
                <div
                  ref={markerRef}
                  data-part="marker"
                  className="absolute bottom-full mb-2 flex flex-col items-center gap-1 whitespace-nowrap"
                >
                  <MonoLabel as="span" tone="label">
                    {marker}
                  </MonoLabel>
                  <span aria-hidden="true" style={{ color: 'var(--label)', fontSize: '18px', lineHeight: 1 }}>
                    ▼
                  </span>
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
