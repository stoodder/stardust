// The flag registry (src/content/dialogue/flags.ts) declares exactly the canonical flag ledger,
// story/campaign.md § 6.2: the same flags, in the same order, with the same values ("bool" is
// true/false). Reads the doc from disk, so it lives with the other node-side checks.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FLAG_IDS, FLAGS, isFlagId } from '../src/content/dialogue/flags.ts';

const ROOT = join(import.meta.dirname, '..');

/** § 6.2's table rows: flag id → its values. */
function ledger(): Map<string, unknown[]> {
  const doc = readFileSync(join(ROOT, 'docs/story/campaign.md'), 'utf8');
  const start = doc.indexOf('\n### 6.2 Flag ledger');
  if (start < 0) throw new Error('campaign.md has no "### 6.2 Flag ledger" section');
  const end = doc.indexOf('\n#', start + 1);
  const rows = new Map<string, unknown[]>();
  for (const line of doc.slice(start, end < 0 ? undefined : end).split('\n')) {
    const m = /^\| `([a-z_]+)` \| ([^|]+) \|/.exec(line);
    if (m === null) continue;
    const cell = (m[2] ?? '').trim();
    const values =
      cell === 'bool' ? [true, false] : [...cell.matchAll(/`([a-z_]+)`/g)].map((v) => v[1]);
    rows.set(m[1] ?? '', values);
  }
  return rows;
}

describe('the flag registry matches campaign.md § 6.2', () => {
  it('declares the ledger’s flags in its order, with its values', () => {
    const rows = ledger();
    expect(rows.size).toBeGreaterThan(0);
    expect(FLAG_IDS).toEqual([...rows.keys()]);
    for (const [id, values] of rows) {
      if (!isFlagId(id)) throw new Error(`${id}: not in the registry`);
      expect(FLAGS[id].values, id).toEqual(values);
    }
  });
});
