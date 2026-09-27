'use client';

import type { CSSProperties } from 'react';
import type { Block } from '@/lib/types';
import { StepList } from '@/components/ui/StepList';
import { Timeline } from '@/components/ui/Timeline';
import { BigNumber } from '@/components/ui/BigNumber';

export type BlocksProps = { blocks: Block[] };

// The deck's own connector glyphs (§3.1): rendered as distinct, visible connector elements,
// never aria-hidden — they are deck copy, not decoration.
const CONNECTORS = new Set(['→', '+', '=', '↺']);

const monoStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  color: 'var(--label)',
  fontSize: 'clamp(12px, 1vw, 16px)',
  letterSpacing: '0.08em',
};

const mutedStyle: CSSProperties = {
  color: 'var(--muted)',
};

const ruleStyle: CSSProperties = {
  borderColor: 'var(--rule)',
};

const bodyTextStyle: CSSProperties = {
  fontSize: 'clamp(20px, 1.6vw, 28px)',
  lineHeight: 1.35,
};

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
                <span data-part="note" style={mutedStyle}>
                  {item.note}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      );

    case 'layers':
      return (
        <div data-block="layers" className="flex flex-col gap-4">
          {block.marker ? (
            <span data-part="marker" style={monoStyle}>
              {block.marker}
            </span>
          ) : null}
          <div className="flex flex-col gap-3">
            {block.items.map((item, i) => (
              <div
                key={i}
                data-part="layer"
                className="border-t pt-3"
                style={{ ...ruleStyle, ...bodyTextStyle }}
              >
                {item.term ? <strong className="mr-3">{item.term}</strong> : null}
                <span>{item.text}</span>
                {item.aside ? (
                  <span data-part="aside" className="ml-3" style={mutedStyle}>
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

    case 'metrics':
      return (
        <div data-block="metrics" className="flex flex-wrap gap-10">
          {block.items.map((item, i) => (
            <div key={i} data-part="metric">
              <BigNumber {...item} />
            </div>
          ))}
        </div>
      );

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
                <p key={j} style={mutedStyle}>
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>
      );

    case 'bars':
      return (
        <div data-block="bars" className="flex flex-col gap-4">
          {block.series.map((label, i) => {
            // ponytail: ratio not yet measured (later task fills it from PPTX shape widths) ->
            // full-width neutral placeholder so the bar renders sensibly instead of NaN/empty.
            const ratio = block.ratios?.[i];
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
          {block.note ? (
            <p data-part="note" style={mutedStyle}>
              {block.note}
            </p>
          ) : null}
        </div>
      );

    default:
      return null;
  }
}
