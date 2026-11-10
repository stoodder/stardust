// The star map's copy is canon (core-loop.md § 1.1): each node's tagline is the italic line under
// its map's heading in its act file, verbatim, and its place is campaign.md § 2's biome column
// (without the `env`). Reads the docs from disk, so it lives with the other node-side checks.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CAMPAIGN_PLAN } from '../src/content/campaign.ts';
import { STAR_MAP_NODES } from '../src/content/starMap.ts';

const ROOT = join(import.meta.dirname, '..');
const read = (path: string): string => readFileSync(join(ROOT, path), 'utf8');

/** `a2_m01` → "A2M1", `fin_m01` → "FIN". */
function code(id: string): string {
  if (id.startsWith('fin_')) return 'FIN';
  const m = /^a(\d)_m(\d\d)$/.exec(id);
  if (m === null) throw new Error(`${id}: not a campaign map id`);
  return `A${m[1]}M${Number(m[2])}`;
}

/** The italic line right under `## <code> · <name>` in its act file. */
function tagline(id: string): string | null {
  const file = id.startsWith('fin_') ? 'finale' : `act${id[1]}`;
  const doc = read(`docs/story/campaign/${file}.md`);
  const heading = new RegExp(`^## ${code(id)} · .*\\n+\\*(.+)\\*$`, 'm');
  return heading.exec(doc)?.[1] ?? null;
}

/** campaign.md § 2's biome column for the map, without its `(env)`. */
function place(id: string): string | null {
  const row = read('docs/story/campaign.md')
    .split('\n')
    .find((l) => l.startsWith(`| ${code(id)} |`));
  const cell = row?.split('|')[5]?.trim();
  return cell === undefined ? null : cell.replace(/\s*\(`.*$/, '');
}

describe('star map copy is canon', () => {
  for (const { id } of CAMPAIGN_PLAN) {
    it(`${id}: its tagline and place`, () => {
      expect(STAR_MAP_NODES[id].tagline).toBe(tagline(id));
      expect(STAR_MAP_NODES[id].place).toBe(place(id));
    });
  }
});
