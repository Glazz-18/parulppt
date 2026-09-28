'use client';

import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { MemeAsset } from '@/lib/memes';
import { MonoLabel } from './MonoLabel';

export type MemeInterstitialProps = {
  meme: MemeAsset | undefined;
  eyebrow?: string;
  lines: string[];
};

// Overflow fix (design §10 "hard cut, single screen"): several meme scenes measured taller than
// one 740px viewport (e.g. slide 33: 1265px). Fixing the box's height (not a fixed aspect ratio)
// keeps it from growing past its share of the viewport; width follows the image's own aspect
// ratio instead of a fixed 4:3, so small-caption templates (e.g. slide 12, Distracted Boyfriend)
// aren't force-cropped into an unreadable width. Round 2 (Fable measurement at 1440x757, slides
// 22/30, still over the 720px floor at the round-1 cap): min(52vh, 480px) -> min(46vh, 420px).
// Round 3 (Fable: a fixed max-width of 340px, layered on this box from MemeScene.tsx, made
// small-caption templates unreadable) -- height-driven sizing replaces both that cap and the
// aspect-ratio box below: a 3:2 image renders ~630px wide at 420px tall instead of being cropped
// to a 340px-wide slice.
// Round 4: `width: auto` on a block element still stretched to the container's full width
// (max-width: 100% had nothing to constrain against). inline-flex shrink-wraps the border to the
// image's own rendered width instead.
const boxStyle: CSSProperties = {
  height: 'min(46vh, 420px)',
  maxWidth: '100%',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  border: '1px solid var(--rule)',
};

const imgStyle: CSSProperties = {
  height: '100%',
  width: 'auto',
  objectFit: 'contain',
};

// Fallback (no image) has no natural width to drive the box's own auto width, so it needs its own
// floor -- same height as the image box (inherited from boxStyle), never narrower than 320px.
const fallbackStyle: CSSProperties = {
  minWidth: '320px',
};

const captionStyle: CSSProperties = {
  color: 'var(--muted)',
};

export function MemeInterstitial({ meme, eyebrow, lines }: MemeInterstitialProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = meme !== undefined && meme.src !== '' && failedSrc !== meme.src;

  return (
    <div>
      {eyebrow ? <MonoLabel as="p">{eyebrow}</MonoLabel> : null}
      <h2>{lines[0]}</h2>
      {lines.slice(1).map((line, index) => (
        <p key={index}>{line}</p>
      ))}
      <div style={boxStyle}>
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element -- CONTRACTS §10 mandates native <img> for meme assets
          <img
            src={meme.src}
            alt={meme.alt}
            loading="lazy"
            decoding="async"
            style={imgStyle}
            onError={() => setFailedSrc(meme.src)}
          />
        ) : meme ? (
          <div style={fallbackStyle}>
            <MonoLabel as="p">{meme.title}</MonoLabel>
            {meme.caption.map((line, index) => (
              <p key={index} style={captionStyle}>
                {line}
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
