// Act III part two's reserved Field Journal ids (T700b, `PLANNED_CODEX`): well-formed and unique; a
// new entry's id is free or registered with its original, and a correction names an entry already
// registered (it lands as that entry's `corrected` version).
import { describe, expect, it } from 'vitest';
import { CODEX, CODEX_ID, PLANNED_CODEX } from './index.ts';

describe('PLANNED_CODEX (Act III part two)', () => {
  it('lists each id once, in map order', () => {
    const ids = PLANNED_CODEX.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const maps = PLANNED_CODEX.map((c) => c.map);
    expect(maps).toEqual(maps.toSorted());
    expect(new Set(maps)).toEqual(new Set(['a3_m04', 'a3_m05', 'a3_m06']));
  });

  it.each(PLANNED_CODEX)('$id is well formed and fits what is registered', (c) => {
    expect(c.id).toMatch(CODEX_ID);
    const entry = CODEX[c.id];
    if (c.version === 'corrected') {
      expect(entry, `${c.id}: a correction needs its entry`).toBeDefined();
    } else if (entry !== undefined) {
      expect(entry.versions.original, c.id).toBeDefined();
    }
  });
});
