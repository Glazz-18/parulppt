'use client';

import type { CSSProperties } from 'react';
import type { SceneProps } from '@/lib/types';
import { UI_COPY, LINKEDIN_HREF } from '@/lib/constants';
import { track } from '@/lib/analytics';
import { goToScene } from '@/lib/sceneNavigation';
import { titleStyle } from './ContentScene';

// Closing scene (CONTRACTS §5.1: no eyebrow, no title on slide 46 — its four lines are the h2
// itself). Unpinned, kind 'cta': no GSAP timeline (design §17/brief: motion here is optional,
// "or none") — markup is static from first paint, which trivially satisfies "progress 1 = static
// markup" and "reduced motion has no timeline" (CONTRACTS §11).

const closingStyle: CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: 'clamp(20px, 1.8vw, 28px)',
  color: 'var(--fg)',
  margin: 0,
};

const speakerStyle: CSSProperties = { fontFamily: 'var(--font-sans)', fontSize: 'clamp(20px, 1.6vw, 28px)', margin: 0 };
const roleStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  color: 'var(--muted)',
  fontSize: 'clamp(12px, 1vw, 16px)',
  letterSpacing: '0.04em',
  margin: 0,
};

const linkStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'clamp(12px, 1vw, 16px)',
  letterSpacing: '0.04em',
  color: 'var(--fg)',
  textDecoration: 'underline',
  textUnderlineOffset: '0.2em',
};

const buttonStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: 'clamp(12px, 1vw, 16px)',
  letterSpacing: '0.04em',
  background: 'transparent',
  border: '1px solid var(--rule)',
  color: 'var(--fg)',
  padding: '0.75em 1.25em',
  cursor: 'pointer',
};

export function FinalScene({ scene }: SceneProps) {
  // FinalScene only ever renders for kind 'cta' (KIND_COMPONENT); this keeps the destructure
  // type-safe for the Scene union without a conditional hook (there are no hooks here, but the
  // same guard pattern as TitleScene/other one-offs keeps the fallback shape identical).
  const content =
    scene.kind === 'cta' ? scene.content : { lines: [], closing: '', speaker: '', role: '', linkedin: '' };

  return (
    <div className="flex flex-1 flex-col justify-between gap-10">
      <h2 style={titleStyle}>
        {content.lines.map((line, i) => (
          <span key={i} data-line={i} style={{ display: 'block' }}>
            {line}
          </span>
        ))}
      </h2>
      <div className="flex flex-col gap-6">
        <p style={closingStyle}>{content.closing}</p>
        <div className="flex flex-col gap-1">
          <p style={speakerStyle}>{content.speaker}</p>
          <p style={roleStyle}>{content.role}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <a
          href={LINKEDIN_HREF}
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
          onClick={() => track('cta_click', { target: 'linkedin' })}
        >
          {content.linkedin}
        </a>
        <button
          type="button"
          style={buttonStyle}
          onClick={() => {
            track('cta_click', { target: 'scene-44' });
            goToScene(44);
          }}
        >
          {UI_COPY.challengeCta}
        </button>
      </div>
    </div>
  );
}
