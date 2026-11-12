// The finale's Field Journal entries (T811; story/campaign/finale.md § FIN, *Codex*): Everglow's
// records keep Act III's automated voice (no exclamation point), the Unsung's correction waits for
// the map's win so a lost Phase 2 isn't told the end, and the last page is the counter.
import { describe, expect, it } from 'vitest';
import { CODEX } from './index.ts';
import { FINALE_CODEX } from './finale.ts';

describe('the finale codex (T811)', () => {
  it('is registered, every version without an exclamation point', () => {
    for (const e of FINALE_CODEX) {
      expect(CODEX[e.id], e.id).toBe(e);
      for (const [v, def] of Object.entries(e.versions)) {
        expect(`${def.text}${def.smallPrint ?? ''}`, `${e.id}.${v}`).not.toContain('!');
      }
    }
  });

  it('opens the Unsung on meeting it, and corrects it only once the finale is won', () => {
    const u = CODEX.codex_unsung!;
    expect(u.subject).toEqual({ enemy: 'unsung' });
    expect(u.versions.original?.when).toBeUndefined();
    expect(u.versions.corrected?.when).toEqual({ mapAtLeast: 'fin_m01' });
  });

  it('writes the last page as the counter, REMEMBERED: {pests_processed}', () => {
    expect(CODEX.codex_last_page?.versions.original?.text).toMatch(
      /\nREMEMBERED: \{pests_processed\}$/,
    );
  });
});
