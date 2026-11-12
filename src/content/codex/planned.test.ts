// The finale's reserved Field Journal ids (T800b, `PLANNED_CODEX`): well formed and unique; a new
// entry's id is free or registered with its original, and a correction names an entry already
// registered (it lands as that entry's `corrected` version).
import { describe, expect, it } from 'vitest';
import { CODEX, CODEX_ID, PLANNED_CODEX } from './index.ts';

describe('PLANNED_CODEX (the finale)', () => {
  it("holds no rows once finale.md's codex row has landed (T811: codex/finale.ts)", () => {
    expect(PLANNED_CODEX).toEqual([]);
    for (const id of [
      'codex_unsung',
      'codex_deep_halls',
      'codex_deep_bore',
      'codex_long_walk',
      'codex_last_page',
    ]) {
      expect(CODEX[id]?.versions.original, id).toBeDefined();
    }
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
