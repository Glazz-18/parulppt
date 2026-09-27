#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Read HTML and parse memes
function parseHtml() {
  const htmlPath = path.join(rootDir, 'AI_Cyber_Startup_28_Memes.html');
  const html = fs.readFileSync(htmlPath, 'utf-8');

  const memes = [];
  const cardRegex = new RegExp(/<div class="card">[\s\S]*?<h2>(\d+)\s*—\s*(.+?)<\/h2>[\s\S]*?<img\s+src="(.+?)"[\s\S]*?Template:\s*(\S+?)\s*·/g);

  let match;
  while ((match = cardRegex.exec(html)) !== null) {
    const id = parseInt(match[1], 10);
    const title = match[2].trim();
    let sourceUrl = match[3];
    const template = match[4];

    // Decode &amp; in URL
    sourceUrl = sourceUrl.replace(/&amp;/g, '&');

    // Generate slug from title
    const slug = title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Generate filename
    const file = `source/memes/${String(id).padStart(2, '0')}-${slug}.png`;

    // Parse caption lines from URL path
    const captionLines = parseCaption(sourceUrl);

    memes.push({
      id,
      title,
      template,
      sourceUrl,
      slug,
      file,
      captionLines,
      suggestedScenes: []
    });
  }

  return memes;
}

// Parse caption lines from memegen URL
function parseCaption(url) {
  // Extract path after /images/
  const match = url.match(/\/images\/[^/]+\/(.+?)(?:\.png)?$/);
  if (!match) return [];

  const pathStr = match[1];
  // Split on / and process each segment
  let parts = pathStr.split('/').map(part => {
    // URL decode
    return decodeURIComponent(part.replace(/\.png$/, ''));
  });

  // Apply memegen escapes
  parts = parts.map(part => {
    // First swap __ with marker
    let result = part.replace(/__/g, '\x00UNDER\x00');
    // Replace remaining _ with space
    result = result.replace(/_/g, ' ');
    // Restore __ marker
    result = result.replace(/\x00UNDER\x00/g, '_');

    // Handle -- similarly
    result = result.replace(/--/g, '\x00DASH\x00');
    // - stays -
    result = result.replace(/\x00DASH\x00/g, '-');

    // Other escapes
    result = result.replace(/~q/g, '?');
    result = result.replace(/~a/g, '&');
    result = result.replace(/~p/g, '%');
    result = result.replace(/~h/g, '#');
    result = result.replace(/~s/g, '/');
    result = result.replace(/~b/g, '\\');
    result = result.replace(/~n/g, '\n');
    result = result.replace(/''/g, '"');

    return result;
  });

  return parts;
}

// Parse content-map.md for meme to scene mapping
function parseMemeScenes() {
  const mdPath = path.join(rootDir, 'docs', 'content-map.md');
  const md = fs.readFileSync(mdPath, 'utf-8');

  const mapping = {};

  // Find "## Meme library mapping" line
  const lines = md.split('\n');
  let inTable = false;
  let tableStartIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('## Meme library mapping')) {
      tableStartIdx = i;
      break;
    }
  }

  if (tableStartIdx === -1) return mapping;

  // Process lines after the heading, skipping header and separator rows
  for (let i = tableStartIdx + 1; i < lines.length; i++) {
    const line = lines[i];

    // Stop at next heading
    if (line.startsWith('## ') && i > tableStartIdx + 1) {
      break;
    }

    // Match table data rows: | digits | ... | ... |
    const match = line.match(/^\|\s*(\d+)\s*\|[^|]*\|\s*([^|]*)\|/);
    if (!match) continue;

    const memeNum = parseInt(match[1], 10);
    const scenesStr = match[2];
    const scenes = scenesStr.split(',').map(s => {
      const num = parseInt(s.trim(), 10);
      return isNaN(num) ? null : num;
    }).filter(x => x !== null);

    mapping[memeNum] = scenes;
  }

  return mapping;
}

// Download file with retry
async function downloadFile(url, filePath, retries = 1) {
  const dir = path.dirname(filePath);

  // Check if file already exists and is large enough
  if (fs.existsSync(filePath)) {
    const stat = fs.statSync(filePath);
    if (stat.size > 1000) {
      return 'skipped';
    }
  }

  // Ensure directory exists
  fs.mkdirSync(dir, { recursive: true });

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const buffer = await response.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(buffer));
      return 'downloaded';
    } catch (error) {
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 2000));
      } else {
        return 'failed';
      }
    }
  }

  return 'failed';
}

// Limit concurrent downloads
class ConcurrentDownloader {
  constructor(maxConcurrent = 4) {
    this.maxConcurrent = maxConcurrent;
    this.active = 0;
    this.queue = [];
  }

  async add(task) {
    while (this.active >= this.maxConcurrent) {
      await new Promise(r => this.queue.push(r));
    }

    this.active++;
    try {
      return await task();
    } finally {
      this.active--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

// Main
async function main() {
  const memes = parseHtml();
  const memeScenes = parseMemeScenes();

  // Add suggested scenes
  for (const meme of memes) {
    meme.suggestedScenes = memeScenes[meme.id] || [];
  }

  // Download images
  const downloader = new ConcurrentDownloader(4);
  const stats = { downloaded: 0, skipped: 0, failed: 0 };
  const failed = [];

  const downloadPromises = memes.map(meme =>
    downloader.add(async () => {
      const filePath = path.join(rootDir, meme.file);
      const result = await downloadFile(meme.sourceUrl, filePath);
      stats[result]++;
      if (result === 'failed') {
        failed.push(meme.id);
      }
    })
  );

  await Promise.all(downloadPromises);

  // Retry failed downloads sequentially
  if (failed.length > 0) {
    for (const id of failed) {
      const meme = memes.find(m => m.id === id);
      if (meme) {
        const filePath = path.join(rootDir, meme.file);
        await new Promise(r => setTimeout(r, 1000));
        const result = await downloadFile(meme.sourceUrl, filePath, 1);
        if (result !== 'failed') {
          stats.failed--;
          stats[result]++;
        } else {
          // Mark as permanently failed
          meme.file = null;
          meme.missing = `HTTP 404 — template '${meme.template}' no longer exists on memegen (checked 2026-09-27)`;
        }
      }
    }
  }

  // Write memes.json
  const output = JSON.stringify(
    memes.sort((a, b) => a.id - b.id),
    null,
    2
  );

  const outPath = path.join(rootDir, 'source', 'memes.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, output);

  // Print stats
  console.log(`Downloaded: ${stats.downloaded}, Skipped: ${stats.skipped}, Failed: ${stats.failed}`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
