// The M1 radio plays act-file lines verbatim (D026): every line in a radio table must appear word
// for word in its act file. Reads the docs from disk, so it lives with the other node-side checks.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { A1_M01_RADIO } from '../src/content/radio/a1_m01.ts';

const ROOT = join(import.meta.dirname, '..');

/** Lines the orchestrator ruled on that aren't in the act file yet (D026). */
const RULED = new Set(['New hardware! Thumper Mortar, ready to deploy!']);

describe('radio lines are verbatim from the act files', () => {
  it('A1M1: story/campaign/act1.md', () => {
    const act1 = readFileSync(join(ROOT, 'docs/story/campaign/act1.md'), 'utf8');
    for (const l of A1_M01_RADIO) {
      if (RULED.has(l.text)) continue;
      expect(act1, l.text).toContain(l.text);
    }
  });
});
