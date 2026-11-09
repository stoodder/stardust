// The radio and the static briefings play act-file lines verbatim (D026): every line in a radio
// table, and every line of a map's briefing, must appear word for word in its map's section of
// its act file (`a1_m02` → story/campaign/act1.md § A1M2). Reads the docs from disk, so it lives
// with the other node-side checks.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MAPS } from '../src/content/maps/index.ts';
import { RADIO_TABLES } from '../src/content/radio/index.ts';

const ROOT = join(import.meta.dirname, '..');

/** Map `a<act>_m<NN>`'s section of its act file: from its `## A<act>M<n>` heading to the next. */
function section(mapId: string): string {
  const m = /^a(\d)_m(\d\d)$/.exec(mapId);
  if (m === null) throw new Error(`${mapId}: not a campaign map id`);
  const [, act, num] = m;
  const doc = readFileSync(join(ROOT, `docs/story/campaign/act${act}.md`), 'utf8');
  const heading = `\n## A${act}M${Number(num)} `;
  const start = doc.indexOf(heading);
  if (start < 0) throw new Error(`${mapId}: no "${heading.trim()}" section in act${act}.md`);
  const end = doc.indexOf('\n## ', start + heading.length);
  return doc.slice(start, end < 0 ? undefined : end);
}

describe('radio lines are verbatim from their map section of the act file', () => {
  for (const [mapId, lines] of Object.entries(RADIO_TABLES)) {
    it(mapId, () => {
      const text = section(mapId);
      for (const l of lines) expect(text, l.text).toContain(l.text);
    });
  }

  it('covers A1M1 and A1M2', () => {
    expect(Object.keys(RADIO_TABLES)).toEqual(expect.arrayContaining(['a1_m01', 'a1_m02']));
  });
});

describe('static briefings are verbatim from their map section of the act file', () => {
  for (const [mapId, map] of Object.entries(MAPS)) {
    if (map.briefing === undefined) continue;
    it(mapId, () => {
      const text = section(mapId);
      for (const line of map.briefing?.split('\n') ?? []) {
        // "QUILL: Hello, ..." → the words after the speaker's name plate.
        const words = line.replace(/^[A-Za-z' ]+: /, '');
        expect(text, line).toContain(words);
      }
    });
  }
});
