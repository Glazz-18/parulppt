import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = dirname(__dirname);

// Keys to skip during traversal
const skipKeys = new Set(['id', 'act', 'theme', 'accent', 'kind', 'component', 'type']);

// Helper to collapse whitespace
function collapseWhitespace(str) {
  return str.replace(/\s+/g, ' ').trim();
}

// Load slides.json
const slidesJsonPath = join(repoRoot, 'source', 'slides.json');
const slidesJson = JSON.parse(readFileSync(slidesJsonPath, 'utf-8'));

// Create a map of slides by slide number for quick lookup
const slideMap = new Map();
for (const slide of slidesJson) {
  slideMap.set(slide.slide, slide);
}

// Load scenes.ts using dynamic import
const scenesModule = await import(new URL('../lib/scenes.ts', import.meta.url).href);
const scenes = scenesModule.scenes;

const misses = [];

// Recursively walk through scene values
function walkValue(value, slideNumber) {
  if (typeof value === 'string') {
    if (value.length === 0) {
      // Ignore empty strings
      return;
    }

    // Check if this string exists in the corresponding slide's texts
    const slide = slideMap.get(slideNumber);
    if (!slide) {
      misses.push({ slide: slideNumber, string: value });
      return;
    }

    const collapsedSearchStr = collapseWhitespace(value);
    const found = slide.texts.some((text) => {
      const collapsedText = collapseWhitespace(text);
      return collapsedText.includes(collapsedSearchStr);
    });

    if (!found) {
      misses.push({ slide: slideNumber, string: value });
    }
  } else if (Array.isArray(value)) {
    for (const item of value) {
      walkValue(item, slideNumber);
    }
  } else if (value !== null && typeof value === 'object') {
    for (const [key, val] of Object.entries(value)) {
      if (!skipKeys.has(key)) {
        walkValue(val, slideNumber);
      }
    }
  }
}

// Check each scene
for (const scene of scenes) {
  walkValue(scene, scene.slide);
}

// Output results
if (misses.length === 0) {
  console.log('All strings verified OK');
  process.exit(0);
} else {
  for (const miss of misses) {
    console.log(`slide ${String(miss.slide).padStart(2, '0')}: "${miss.string}"`);
  }
  process.exit(1);
}
