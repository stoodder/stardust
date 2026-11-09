// The UI's color tokens mirror the master palette (src/content/palettes/master.ts, the home of every
// hex value): every `--sd-<ramp>-<step>: #hex` in a src/ui stylesheet must match `<ramp>.<step>`.
// Lives in tools/ because it reads files (Node types); src/ui is typed for the browser.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isColorName, MASTER } from '../src/content/palettes/master.ts';

const UI_DIR = new URL('../src/ui/', import.meta.url).pathname;

function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.isDirectory()) return cssFiles(join(dir, e.name));
    return e.name.endsWith('.css') ? [join(dir, e.name)] : [];
  });
}

describe('UI color tokens', () => {
  it('match the master palette', () => {
    let checked = 0;
    for (const file of cssFiles(UI_DIR)) {
      const css = readFileSync(file, 'utf8');
      for (const m of css.matchAll(/--sd-([a-z]+)-(\d):\s*(#[0-9a-fA-F]{6})\b/g)) {
        const name = `${m[1] ?? ''}.${m[2] ?? ''}`;
        expect(isColorName(name), `${file}: ${name} is not a master color`).toBe(true);
        if (isColorName(name)) {
          expect(m[3]?.toLowerCase(), `${file}: --sd-${m[1]}-${m[2]}`).toBe(MASTER[name]);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(40);
  });
});
