import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { memes } from '@/lib/memes';
import { MemeInterstitial } from './MemeInterstitial';

afterEach(cleanup);

const realMeme = memes.find((m) => m.id === 1)!; // has src
const nullSrcMeme = memes.find((m) => m.id === 17)!; // src === '' (A10, A29)

describe('MemeInterstitial', () => {
  it('renders the image with alt, src, loading=lazy, decoding=async when meme.src is non-empty', () => {
    const { container } = render(
      <MemeInterstitial meme={realMeme} eyebrow="Break it" lines={['First line', 'Second line']} />
    );
    const img = container.querySelector('img');

    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe(realMeme.src);
    expect(img?.getAttribute('alt')).toBe(realMeme.alt);
    expect(img?.getAttribute('loading')).toBe('lazy');
    expect(img?.getAttribute('decoding')).toBe('async');

    // Height-driven sizing (overflow fix round 4): the box fixes height and shrink-wraps its width
    // to the image's own rendered width (inline-flex), so it never stretches wider than the image.
    const box = img?.parentElement as HTMLElement;
    expect(box.style.height).toBe('min(46vh, 420px)');
    expect(box.style.display).toBe('inline-flex');
    expect(box.style.maxWidth).toBe('100%');
    expect(box.style.alignSelf).toBe('flex-start');
    expect(img?.style.height).toBe('100%');
    expect(img?.style.width).toBe('auto');
    expect(img?.style.objectFit).toBe('contain');
  });

  it('swaps to the fallback (title + captions) and drops the img on error', () => {
    const { container } = render(<MemeInterstitial meme={realMeme} lines={['First line']} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();

    fireEvent.error(img!);

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain(realMeme.title);
    realMeme.caption.forEach((line) => {
      expect(container.textContent).toContain(line);
    });

    // Fallback has no image to derive a natural width from, so it keeps its own floor.
    const fallback = container.querySelector('p[data-tone]')?.parentElement as HTMLElement;
    expect(fallback.style.minWidth).toBe('320px');
  });

  it('renders the fallback box with no img when meme is undefined, but keeps eyebrow and lines', () => {
    const { container } = render(
      <MemeInterstitial meme={undefined} eyebrow="Break it" lines={['First line', 'Second line']} />
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain('Break it');
    expect(container.textContent).toContain('First line');
    expect(container.textContent).toContain('Second line');
  });

  it('renders the fallback immediately with no img when meme.src is the empty string', () => {
    expect(nullSrcMeme.src).toBe('');
    const { container } = render(<MemeInterstitial meme={nullSrcMeme} lines={['First line']} />);

    expect(container.querySelector('img')).toBeNull();
    expect(container.textContent).toContain(nullSrcMeme.title);
    nullSrcMeme.caption.forEach((line) => {
      expect(container.textContent).toContain(line);
    });
  });

  it('renders lines[0] as the h2 and remaining lines as paragraphs', () => {
    const { container } = render(
      <MemeInterstitial meme={realMeme} lines={['Heading line', 'Body line one', 'Body line two']} />
    );
    const h2 = container.querySelector('h2');

    expect(h2?.textContent).toBe('Heading line');
    expect(container.textContent).toContain('Body line one');
    expect(container.textContent).toContain('Body line two');
  });

  it('re-tries a different meme passed later (error state keyed to src)', () => {
    const { container, rerender } = render(<MemeInterstitial meme={realMeme} lines={['L1']} />);
    const img = container.querySelector('img');
    fireEvent.error(img!);
    expect(container.querySelector('img')).toBeNull();

    const otherMeme = memes.find((m) => m.id === 5)!;
    rerender(<MemeInterstitial meme={otherMeme} lines={['L1']} />);

    const newImg = container.querySelector('img');
    expect(newImg).not.toBeNull();
    expect(newImg?.getAttribute('src')).toBe(otherMeme.src);
  });

  it('does not warn or error to the console', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<MemeInterstitial meme={realMeme} eyebrow="Break it" lines={['A', 'B']} />);
    expect(errSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    errSpy.mockRestore();
    warnSpy.mockRestore();
  });
});
