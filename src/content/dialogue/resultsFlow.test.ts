// The results flow table (T316): its scenes are each map's own full-screen slots, and its stamps
// are short ASCII capitals whose conditions read a run of that map.
import { describe, expect, it } from 'vitest';
import { FLAG_RULES } from './flags.ts';
import { RESULTS_FLOW, resultsFlow } from './resultsFlow.ts';
import { parseSceneId } from './rules.ts';
import type { Condition } from './types.ts';

/** Every `thisRun` flag a condition reads. */
function thisRunFlags(c: Condition): string[] {
  if ('all' in c) return c.all.flatMap(thisRunFlags);
  if ('any' in c) return c.any.flatMap(thisRunFlags);
  if ('not' in c) return thisRunFlags(c.not);
  return 'thisRun' in c ? [c.thisRun] : [];
}

describe('RESULTS_FLOW', () => {
  for (const [map, flow] of Object.entries(RESULTS_FLOW)) {
    it(`${map}: its scenes are its own full-screen scenes`, () => {
      for (const id of [...(flow.beforeResults ?? []), ...(flow.afterResults ?? [])]) {
        const parsed = parseSceneId(id);
        expect(parsed?.map, id).toBe(map);
        expect(parsed?.slot.kind, id).toBe('scene');
      }
    });

    it(`${map}: its stamps are unique, short ASCII capitals, read over a run of the map`, () => {
      const stamps = flow.stamps ?? [];
      expect(new Set(stamps.map((s) => s.id)).size).toBe(stamps.length);
      for (const s of stamps) {
        expect(s.text, s.id).toMatch(/^[A-Z0-9 !.'-]{1,20}$/);
        for (const flag of thisRunFlags(s.when)) {
          expect(
            FLAG_RULES.some((r) => r.flag === flag && r.onMapEnd === map),
            `${s.id}: ${flag}`,
          ).toBe(true);
        }
      }
    });
  }

  it("wires A1M5: the party, the card with C1's stamp, then the stinger", () => {
    const a1m05 = resultsFlow('a1_m05');
    expect(a1m05.beforeResults).toEqual(['a1_m05_scene_party']);
    expect(a1m05.afterResults).toEqual(['a1_m05_scene_stinger']);
    expect(a1m05.stamps?.map((s) => s.text)).toEqual(['CONTAINMENT LAPSE']);
    expect(resultsFlow('a1_m01')).toEqual({});
    expect(resultsFlow('dev_range')).toEqual({});
  });
});
