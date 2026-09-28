'use client';

import type { CSSProperties } from 'react';
import type { Block } from '@/lib/types';
import { StepList } from '@/components/ui/StepList';
import { Timeline } from '@/components/ui/Timeline';
import { BigNumber } from '@/components/ui/BigNumber';

export type BlocksProps = { blocks: Block[] };

// The deck's own connector glyphs (§3.1): rendered as distinct, visible connector elements,
// never aria-hidden — they are deck copy, not decoration. Exported for reuse by one-off scene
// components (e.g. AgentLoopScene) that lay out flow items themselves instead of via <Blocks>.
export const CONNECTORS = new Set(['→', '+', '=', '↺']);

const monoStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  color: 'var(--label)',
  fontSize: 'clamp(12px, 1vw, 16px)',
  letterSpacing: '0.08em',
};

const ruleStyle: CSSProperties = {
  borderColor: 'var(--rule)',
};

// Bars group heading (CONTRACTS A27): MonoLabel-style (see components/ui/MonoLabel) rendered
// inline here rather than imported, matching this file's existing pattern of hand-rolled mono
// styles (monoStyle, metaMutedStyle) for the other block-local mono bits (letter, marker, etc).
const groupLabelStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  color: 'var(--label)',
  letterSpacing: '0.12em',
};

const bodyTextStyle: CSSProperties = {
  fontSize: 'clamp(20px, 1.6vw, 28px)',
  lineHeight: 1.35,
};

// Secondary/annotation fields (design §4): explicitly the body tier (muted) or the mono
// metadata tier (muted), never the browser's unstyled 16px default.
const mutedBodyStyle: CSSProperties = { ...bodyTextStyle, color: 'var(--muted)' };
const metaMutedStyle: CSSProperties = { ...monoStyle, color: 'var(--muted)' };

export function Blocks({ blocks }: BlocksProps) {
  return (
    <div className="flex flex-col gap-10">
      {blocks.map((block, index) => (
        <BlockView key={`${block.type}-${index}`} block={block} />
      ))}
    </div>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'lines':
      return (
        <div data-block="lines" className="flex flex-col gap-3">
          {block.lines.map((line, i) => (
            <p key={i} data-part="line" style={bodyTextStyle}>
              {line}
            </p>
          ))}
        </div>
      );

    case 'steps':
      return (
        <div
          data-block="steps"
          className="[&_ol]:flex [&_ol]:flex-col [&_ol]:gap-5 [&_li[data-part=step]]:flex [&_li[data-part=step]]:items-baseline [&_li[data-part=step]]:gap-4"
          style={bodyTextStyle}
        >
          <StepList items={block.items} />
        </div>
      );

    case 'terms':
      return (
        <div data-block="terms" className="flex flex-col gap-5">
          {block.items.map((item, i) => (
            <div key={i} data-part="term" className="flex flex-wrap items-baseline gap-3">
              {item.letter ? (
                <span data-part="letter" style={monoStyle}>
                  {item.letter}
                </span>
              ) : null}
              <strong data-part="term-label" style={bodyTextStyle}>
                {item.term}
              </strong>
              <span style={bodyTextStyle}>{item.text}</span>
              {item.note ? (
                <span data-part="note" style={metaMutedStyle}>
                  {item.note}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      );

    case 'layers': {
      // Slide 27 (CONTRACTS §3.1, measured overflow 1284px in a 796px viewport) stacks 4 layer
      // rows of sentence-length text; tightening row padding/line-height for 4+ items buys back
      // vertical space without touching copy or the item/reveal shape (scene-scoped per the
      // overflow-fix brief, not a components/ui change -- other layers rows with <4 items, e.g.
      // scene 13/41, are unaffected either way since padding-only tightening never causes overflow).
      const tight = block.items.length >= 4;
      const rowStyle: CSSProperties = tight ? { ...bodyTextStyle, lineHeight: 1.15 } : bodyTextStyle;
      return (
        <div data-block="layers" className="flex flex-col gap-4">
          {block.marker ? (
            <span data-part="marker" style={monoStyle}>
              {block.marker}
            </span>
          ) : null}
          <div className={tight ? 'flex flex-col gap-2' : 'flex flex-col gap-3'}>
            {block.items.map((item, i) => (
              <div
                key={i}
                data-part="layer"
                className={tight ? 'border-t pt-2' : 'border-t pt-3'}
                style={{ ...ruleStyle, ...rowStyle }}
              >
                {item.term ? <strong className="mr-3">{item.term}</strong> : null}
                <span>{item.text}</span>
                {item.aside ? (
                  <span data-part="aside" className="ml-3" style={metaMutedStyle}>
                    {item.aside}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
          {block.footer ? (
            <p data-part="footer" style={monoStyle}>
              {block.footer}
            </p>
          ) : null}
        </div>
      );
    }

    case 'marks':
      return (
        <div
          data-block="marks"
          className="[&_ol]:flex [&_ol]:flex-col [&_ol]:gap-4 [&_li[data-part=mark]]:flex [&_li[data-part=mark]]:items-baseline [&_li[data-part=mark]]:gap-4"
          style={bodyTextStyle}
        >
          <Timeline items={block.items} />
        </div>
      );

    case 'metrics': {
      // ≥3 metrics stack too tall as a vertical/wrap flow (measured, slide 27: 4 sentence-shaped
      // metrics at 118px each overflowed the pinned viewport). A responsive grid puts them
      // side-by-side instead; ≤2 items keep the original flow (unchanged reveal order/targets
      // either way -- this only changes the wrapping div's layout, not which elements exist).
      const isGrid = block.items.length >= 3;
      return (
        <div
          data-block="metrics"
          className={isGrid ? 'grid gap-8' : 'flex flex-wrap gap-10'}
          style={isGrid ? { gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' } : undefined}
        >
          {block.items.map((item, i) => (
            <div key={i} data-part="metric">
              <BigNumber {...item} />
            </div>
          ))}
        </div>
      );
    }

    case 'flow': {
      return (
        <div data-block="flow" className="flex flex-col gap-3">
          {block.label ? (
            <p data-part="flow-label" style={monoStyle}>
              {block.label}
            </p>
          ) : null}
          {block.marker ? (
            <span data-part="marker" style={monoStyle}>
              {block.marker}
            </span>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            {block.items.map((item, i) =>
              CONNECTORS.has(item) ? (
                <span key={i} data-part="connector" style={{ ...monoStyle, color: 'var(--fg)' }}>
                  {item}
                </span>
              ) : (
                <span
                  key={i}
                  data-part="node"
                  className="border px-4 py-2"
                  style={{ ...ruleStyle, ...bodyTextStyle }}
                >
                  {item}
                </span>
              ),
            )}
          </div>
        </div>
      );
    }

    case 'columns':
      return (
        <div data-block="columns" className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {block.items.map((item, i) => (
            <div key={i} data-part="column" className="flex flex-col gap-2">
              <h3 style={{ ...bodyTextStyle, fontWeight: 700 }}>{item.heading}</h3>
              {item.lines.map((line, j) => (
                <p key={j} style={mutedBodyStyle}>
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>
      );

    case 'bars': {
      // Manager ruling (Task 32 fix round 1, CONTRACTS §3.1): `ratios` carries every measured bar
      // in deck shape order, not one per series -- so a longer `ratios` array groups into rows of
      // `series.length` (one row per measured group, e.g. MTTD/MTTR or one per phase), each row
      // repeating the series labels. With no `ratios` (or exactly one row's worth), this is the
      // original single-row behaviour: a full-width neutral placeholder per series.
      const seriesLen = block.series.length;
      const ratios = block.ratios;
      const rowCount = ratios && seriesLen > 0 ? ratios.length / seriesLen : 1;
      return (
        <div data-block="bars" className="flex flex-col gap-6">
          {Array.from({ length: rowCount }).map((_, row) => (
            <div key={row} data-part="bar-row" className="flex flex-col gap-4">
              {block.groups?.[row] ? (
                <p data-part="label" className="uppercase" style={groupLabelStyle}>
                  {block.groups[row]}
                </p>
              ) : null}
              {block.series.map((label, i) => {
                const ratio = ratios?.[row * seriesLen + i];
                const widthPct = `${Math.round((ratio ?? 1) * 100)}%`;
                return (
                  <div key={i} data-part="bar" className="flex flex-col gap-1">
                    <span style={monoStyle}>{label}</span>
                    <div className="h-3 w-full border" style={ruleStyle}>
                      <div
                        data-part="fill"
                        className="h-full"
                        style={{ width: widthPct, background: 'var(--label)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
          {block.note ? (
            <p data-part="note" style={metaMutedStyle}>
              {block.note}
            </p>
          ) : null}
        </div>
      );
    }

    default:
      return null;
  }
}
