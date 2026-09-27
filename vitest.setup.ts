// jsdom has no real canvas backend ("Not implemented: HTMLCanvasElement's getContext() method:
// without installing the canvas npm package"), which otherwise logs noise on every test that
// mounts PresenterPen's canvas without its own mock. This installs a minimal no-op 2D context
// globally so the whole suite stays quiet; a test that needs to assert on draw calls installs its
// own vi.fn()-based mock via vi.spyOn (restored after each test, falling back to this stub).
function createStubContext2D() {
  return {
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    clearRect: () => {},
    setTransform: () => {},
    scale: () => {},
    closePath: () => {},
  };
}

// Some test files opt into the plain `node` environment (e.g. lib/memes.test.ts), which has no DOM
// globals at all; only patch the prototype where it exists (jsdom).
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = ((): unknown =>
    createStubContext2D()) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}
