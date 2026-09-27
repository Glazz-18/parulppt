// @vitest-environment node
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { memes } from './memes';

const repoRoot = path.join(__dirname, '..');

// Helper to read source memes.json
function readSourceMemes(): Array<{
  id: number;
  slug: string;
  title: string;
  template: string;
  captionLines: string[];
  sourceUrl: string;
  file: string | null;
  suggestedScenes: number[];
  missing?: string;
}> {
  const sourcePath = path.join(repoRoot, 'source', 'memes.json');
  const content = fs.readFileSync(sourcePath, 'utf-8');
  return JSON.parse(content);
}

describe('memes', () => {
  const sourceData = readSourceMemes();

  it('should have exactly 28 entries', () => {
    expect(memes).toHaveLength(28);
  });

  it('should have ids sorted ascending from 1 to 28', () => {
    const ids = memes.map((m) => m.id);
    expect(ids).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
  });

  it('should have src empty for ids 4 and 17', () => {
    const id4 = memes.find((m) => m.id === 4);
    const id17 = memes.find((m) => m.id === 17);
    expect(id4?.src).toBe('');
    expect(id17?.src).toBe('');
  });

  it('should have exactly 26 non-empty src values', () => {
    const nonEmptySrcs = memes.filter((m) => m.src !== '');
    expect(nonEmptySrcs).toHaveLength(26);
  });

  it('should have every src either empty or start with /memes/', () => {
    for (const meme of memes) {
      if (meme.src !== '') {
        expect(meme.src).toMatch(/^\/memes\//);
      }
    }
  });

  it('should have every non-empty src file exist in public/memes/', () => {
    for (const meme of memes) {
      if (meme.src !== '') {
        const filePath = path.join(repoRoot, 'public', meme.src);
        if (!fs.existsSync(filePath)) {
          throw new Error(`File does not exist: ${filePath}`);
        }
        expect(fs.existsSync(filePath)).toBe(true);
      }
    }
  });

  it('should have alt text equal to "${title}: ${caption.join(\' / \')}"', () => {
    for (const meme of memes) {
      const expectedAlt = `${meme.title}: ${meme.caption.join(' / ')}`;
      expect(meme.alt).toBe(expectedAlt);
    }
  });

  it('should have caption equal to captionLines from source', () => {
    for (const meme of memes) {
      const sourceMeme = sourceData.find((m) => m.id === meme.id);
      expect(sourceMeme).toBeDefined();
      expect(meme.caption).toEqual(sourceMeme!.captionLines);
    }
  });

  it('should have title equal to source title', () => {
    for (const meme of memes) {
      const sourceMeme = sourceData.find((m) => m.id === meme.id);
      expect(sourceMeme).toBeDefined();
      expect(meme.title).toBe(sourceMeme!.title);
    }
  });

  it('should have sourceUrl equal to source sourceUrl', () => {
    for (const meme of memes) {
      const sourceMeme = sourceData.find((m) => m.id === meme.id);
      expect(sourceMeme).toBeDefined();
      expect(meme.sourceUrl).toBe(sourceMeme!.sourceUrl);
    }
  });

  it('should have non-empty suggestedScenes for every entry', () => {
    for (const meme of memes) {
      expect(Array.isArray(meme.suggestedScenes)).toBe(true);
      expect(meme.suggestedScenes.length).toBeGreaterThan(0);
    }
  });

  describe('remote asset isolation', () => {
    it('should have api.memegen.link only in sourceUrl values of memes.ts', () => {
      // Verify it doesn't appear in meme data fields
      for (const meme of memes) {
        expect(String(meme.id)).not.toContain('api.memegen.link');
        expect(meme.slug).not.toContain('api.memegen.link');
        expect(meme.title).not.toContain('api.memegen.link');
        expect(meme.template).not.toContain('api.memegen.link');
        expect(meme.src).not.toContain('api.memegen.link');
        expect(meme.alt).not.toContain('api.memegen.link');
        expect(meme.caption.join('|')).not.toContain('api.memegen.link');
      }

      // Read the generated lib/memes.ts file to check for api.memegen.link context
      const memesFilePath = path.join(__dirname, 'memes.ts');
      const content = fs.readFileSync(memesFilePath, 'utf-8');
      const lines = content.split('\n');

      // Every line with api.memegen.link should be inside a sourceUrl value
      for (const line of lines) {
        if (line.includes('api.memegen.link')) {
          // This line should contain sourceUrl: somewhere with the URL value
          expect(line).toContain('sourceUrl:');
        }
      }
    });

    it('should not have api.memegen.link in non-memes code files', () => {
      const dirs = ['lib', 'components', 'app'];
      const badFiles: string[] = [];

      for (const dir of dirs) {
        const dirPath = path.join(repoRoot, dir);
        if (!fs.existsSync(dirPath)) {
          continue;
        }

        const files = walkDir(dirPath);
        for (const file of files) {
          // Skip test files
          if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) {
            continue;
          }
          // Skip lib/memes.ts itself
          if (file === path.join(repoRoot, 'lib', 'memes.ts')) {
            continue;
          }

          const content = fs.readFileSync(file, 'utf-8');
          if (content.includes('api.memegen.link')) {
            badFiles.push(file);
          }
        }
      }

      if (badFiles.length > 0) {
        throw new Error(
          `Found api.memegen.link in non-test files: ${badFiles.join(', ')}`
        );
      }
      expect(badFiles).toHaveLength(0);
    });
  });
});

function walkDir(
  dir: string,
  ext: string[] = ['.ts', '.tsx']
): string[] {
  const files: string[] = [];

  function walk(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && ext.some((e) => entry.name.endsWith(e))) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}
