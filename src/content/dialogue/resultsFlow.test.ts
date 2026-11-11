// The results flow table (T316): its scenes are each map's own full-screen slots, and its stamps
// are short ASCII capitals whose conditions read a run of that map.
import { describe, expect, it } from 'vitest';
import { FLAG_RULES } from './flags.ts';
import { SCENES } from './index.ts';
import { RESULTS_FLOW, resultsFlow } from './resultsFlow.ts';
import { parseSceneId } from './rules.ts';
import type { Condition } from './types.ts';
import { MEMOS, PLANNED_MEMOS } from '../memos/index.ts';

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

    it(`${map}: its ending's scenes are its own, its memos registered or reserved for it`, () => {
      const steps = [...(flow.ending?.first ?? []), ...(flow.ending?.replay ?? [])];
      for (const step of steps) {
        if ('scene' in step) {
          const parsed = parseSceneId(step.scene);
          expect([parsed?.map, parsed?.slot.kind], step.scene).toEqual([map, 'scene']);
        }
        if ('memo' in step) {
          const planned = PLANNED_MEMOS.find((m) => m.id === step.memo);
          expect(MEMOS[step.memo]?.afterMap ?? planned?.afterMap, step.memo).toBe(map);
        }
      }
      // The close ends on the post-game star map, on a first win and a replay alike.
      if (flow.ending !== undefined) {
        expect(flow.ending.first.at(-1)).toEqual({ screen: 'post_game' });
        expect(flow.ending.replay.at(-1)).toEqual({ screen: 'post_game' });
      }
    });

    it(`${map}: each jingle plays on a spoken line of one of its own flow scenes`, () => {
      const scenes = [...(flow.beforeResults ?? []), ...(flow.afterResults ?? [])];
      for (const j of flow.jingles ?? []) {
        expect(scenes, j.scene).toContain(j.scene);
        const lines = (SCENES[j.scene]?.nodes ?? []).filter((n) => n.kind === 'line');
        const line = lines[j.line];
        expect(line?.kind, `${j.scene} line ${j.line}`).toBe('line');
        expect(line?.kind === 'line' && line.text !== '', `${j.scene} line ${j.line}`).toBe(true);
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

  it("plays A3M2's confession (the Asset Yield Log) after its card, nothing before (T621)", () => {
    const a3m02 = resultsFlow('a3_m02');
    expect(a3m02).toEqual({ afterResults: ['a3_m02_scene_confession'] });
  });

  it("closes Act II after A2M6's card: the stinger, the PA's jingle in minor on its caption", () => {
    const a2m06 = resultsFlow('a2_m06');
    expect(a2m06.beforeResults).toBeUndefined();
    expect(a2m06.afterResults).toEqual(['a2_m06_scene_stinger']);
    expect(a2m06.jingles).toEqual([{ scene: 'a2_m06_scene_stinger', line: 2, jingle: 'minor' }]);
    const lines = SCENES.a2_m06_scene_stinger?.nodes.filter((n) => n.kind === 'line') ?? [];
    expect(lines.map((l) => (l.kind === 'line' ? l.speaker : null))).toEqual([
      'narrator',
      'pa',
      'narrator',
      'narrator',
    ]);
    // A silence over the dark first, and the jingle left to ring out before the base.
    expect(lines[0]).toMatchObject({ text: '', durationSec: 2 });
    expect(lines.at(-1)).toMatchObject({ text: '' });
    expect(resultsFlow('dev_range')).toEqual({});
  });
});
