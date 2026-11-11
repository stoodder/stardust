// The finale's reserved Field Journal ids (T800b, `PLANNED_CODEX`): well formed and unique; a new
// entry's id is free or registered with its original, and a correction names an entry already
// registered (it lands as that entry's `corrected` version).
import { describe, expect, it } from 'vitest';
import { CODEX, CODEX_ID, PLANNED_CODEX } from './index.ts';

describe('PLANNED_CODEX (the finale)', () => {
  it("reserves finale.md's codex row: the Unsung, the Deep Halls, the Deep Bore, the Long Walk, the last page", () => {
    expect(PLANNED_CODEX.map((c) => c.id)).toEqual([
      'codex_unsung',
      'codex_deep_halls',
      'codex_deep_bore',
      'codex_long_walk',
      'codex_last_page',
    ]);
    expect(new Set(PLANNED_CODEX.map((c) => c.map))).toEqual(new Set(['fin_m01']));
  });

  it.each(PLANNED_CODEX)('$id is well formed and fits what is registered', (c) => {
    expect(c.id).toMatch(CODEX_ID);
    expect(c.task).toMatch(/^T\d{3}/);
    const entry = CODEX[c.id];
    if (c.version === 'corrected') {
      expect(entry, `${c.id}: a correction needs its entry`).toBeDefined();
    } else if (entry !== undefined) {
      expect(entry.versions.original, c.id).toBeDefined();
    }
  });
});
