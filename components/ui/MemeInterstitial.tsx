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
// one 740px viewport (e.g. slide 33: 1265px). Capping the box's height keeps it (and the fallback
// branch below, which shares this same outer box -- CONTRACTS §3.2 MemeInterstitialProps unchanged)
// from growing past its share of the viewport regardless of the 4:3 aspect ratio's own math.
// Round 2 (Fable measurement at 1440x757, slides 22/30, still over the 720px floor at the round-1
// cap): min(52vh, 480px) -> min(46vh, 420px).
const boxStyle: CSSProperties = {
  aspectRatio: '4 / 3',
  maxHeight: 'min(46vh, 420px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  border: '1px solid var(--rule)',
};

const imgStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'contain',
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
          <div>
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
