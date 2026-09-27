'use client';

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { motion } from 'framer-motion';
import { UI_COPY } from '@/lib/constants';
import { setPenEscape, useCurrentScene } from '@/lib/sceneNavigation';

// CONTRACTS §5.6: PEN / UNDO / two-step CLEAR toolbar + a full-viewport canvas overlay; strokes
// (point arrays) live only in component state, never storage.

type Point = { x: number; y: number };

const CLEAR_REVERT_MS = 4000;
const STROKE_WIDTH = 3;
const FALLBACK_ORANGE = '#F47F46'; // TRD §10 token value; used only if --orange fails to resolve

const toolbarStyle: CSSProperties = {
  position: 'fixed',
  // Stacked above SceneControls' Act label (bottom: 1rem, same insetInlineStart) so a long act
  // label (e.g. Act 5) never overlaps the toolbar, whatever its own width happens to be.
  bottom: '2.6rem',
  insetInlineStart: 'calc(var(--rail-w) + 1rem)',
  zIndex: 41,
  display: 'flex',
  gap: '0.5rem',
};

const buttonStyle: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.7rem',
  letterSpacing: '0.08em',
  background: 'transparent',
  border: '1px solid var(--rule)',
  color: 'var(--fg)',
  padding: '0.4em 0.75em',
  cursor: 'pointer',
};

function canvasStyle(penMode: boolean): CSSProperties {
  return {
    position: 'fixed',
    inset: 0,
    zIndex: 39,
    pointerEvents: penMode ? 'auto' : 'none',
    touchAction: 'none',
  };
}

export function PresenterPen() {
  const currentScene = useCurrentScene();
  const [penMode, setPenMode] = useState(false);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [confirming, setConfirming] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Point[][]>(strokes);
  const drawingRef = useRef(false);
  const orangeRef = useRef(FALLBACK_ORANGE);

  // CONTRACTS §5.6: all strokes are cleared when the current scene changes. Compared during
  // render (React's "adjusting state when a prop changes" pattern) rather than in an effect, so
  // there is no extra render-then-clear flash and no synchronous setState-in-effect.
  const [strokeScene, setStrokeScene] = useState(currentScene);
  if (currentScene !== strokeScene) {
    setStrokeScene(currentScene);
    setStrokes([]);
  }

  const draw = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    ctx.strokeStyle = orangeRef.current;
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stroke of strokesRef.current) {
      if (stroke.length < 2) continue; // a bare click with no drag leaves nothing to stroke
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length; i++) ctx.lineTo(stroke[i].x, stroke[i].y);
      ctx.stroke();
    }
  };

  const sizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS-pixel coordinates
    draw();
  };

  // Sizes once on mount and again on every resize; each resize redraws whatever strokesRef holds.
  useEffect(() => {
    // Read once (mount only): CONTRACTS §5.6 asks for the computed --orange, not a per-draw read.
    orangeRef.current =
      getComputedStyle(document.documentElement).getPropertyValue('--orange').trim() || FALLBACK_ORANGE;
    sizeCanvas();
    window.addEventListener('resize', sizeCanvas);
    return () => window.removeEventListener('resize', sizeCanvas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraws (no resize) whenever the stroke list changes.
  useEffect(() => {
    strokesRef.current = strokes;
    draw();
  }, [strokes]);

  // A21: while pen mode is on, the engine's Escape handler turns it off (between the drawer and
  // demo escape); the effect keyed on `penMode` mirrors IndexOverlay's own escape registration.
  useEffect(() => {
    if (!penMode) return undefined;
    setPenEscape(() => setPenMode(false));
    return () => setPenEscape(null);
  }, [penMode]);

  // CONTRACTS §5.6: CLEAR is two-step; the revert timer is set in an effect keyed on `confirming`
  // and cleared on cleanup (a second click or unmount), so there is never a race with a stale timer.
  useEffect(() => {
    if (!confirming) return undefined;
    const timer = setTimeout(() => setConfirming(false), CLEAR_REVERT_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  const handleClear = () => {
    if (confirming) {
      setConfirming(false);
      setStrokes([]);
    } else {
      setConfirming(true);
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!penMode) return;
    drawingRef.current = true;
    const point = { x: event.clientX, y: event.clientY };
    setStrokes((prev) => [...prev, [point]]);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    const point = { x: event.clientX, y: event.clientY };
    setStrokes((prev) => [...prev.slice(0, -1), [...prev[prev.length - 1], point]]);
  };

  const endStroke = () => {
    drawingRef.current = false;
  };

  return (
    <>
      <div style={toolbarStyle}>
        <motion.button
          type="button"
          aria-pressed={penMode}
          initial={false}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setPenMode((on) => !on)}
          style={buttonStyle}
        >
          {UI_COPY.pen}
        </motion.button>
        <motion.button
          type="button"
          initial={false}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setStrokes((prev) => prev.slice(0, -1))}
          style={buttonStyle}
        >
          {UI_COPY.undo}
        </motion.button>
        <motion.button
          type="button"
          initial={false}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleClear}
          style={buttonStyle}
        >
          {confirming ? UI_COPY.clearConfirm : UI_COPY.clear}
        </motion.button>
      </div>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        data-strokes={strokes.length}
        style={canvasStyle(penMode)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endStroke}
        onPointerLeave={endStroke}
        onPointerCancel={endStroke}
      />
    </>
  );
}
