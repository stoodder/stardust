// The wave preview's spawn chips (T803b; D153's declutter): words, never cryptic initials, and once
// per spawn before its groups, not on every row.
import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import { wavePreview } from '../../app/hudViews.ts';
import { createSim } from '../../sim/index.ts';
import { bySpawn, spawnShort } from './WavePanel.tsx';

/** Every campaign map whose ground routes start at more than one spawn. */
const MULTI_SPAWN = [
  'a1_m05',
  'a2_m01',
  'a2_m02',
  'a2_m04',
  'a2_m05',
  'a2_m06',
  'a3_m01',
  'a3_m03',
  'a3_m04',
  'a3_m05',
  'fin_m01',
];

/** A preview group as `bySpawn` reads it. */
function group(enemy: string, spawn: string | null): { enemy: string; spawn: string | null } {
  return { enemy, spawn };
}

describe('spawn chips (T803b)', () => {
  it('reads as words: a generic last word dropped, compass words in capitals', () => {
    expect(spawnShort('Halls')).toBe('Halls');
    expect(spawnShort('Warren')).toBe('Warren');
    expect(spawnShort('Bore road')).toBe('Bore');
    expect(spawnShort('Rift field')).toBe('Rift');
    expect(spawnShort('Rift ne')).toBe('Rift NE');
    expect(spawnShort('Cut west')).toBe('Cut west');
    expect(spawnShort('Convoy road')).toBe('Convoy');
    expect(spawnShort('Rift East')).toBe('Rift E');
    expect(spawnShort('Something longer')).toBe('Somethin');
  });

  it("names each map's spawns apart, in at most 8 characters", () => {
    for (const id of MULTI_SPAWN) {
      const map = createSim(battleConfig(id, 1)).map;
      const names = new Set<string>();
      for (let w = 0; w < map.waves.length; w++) {
        for (const g of wavePreview(map, w)?.groups ?? []) if (g.spawn !== null) names.add(g.spawn);
      }
      const chips = [...names].map(spawnShort);
      expect(new Set(chips).size, `${id}: ${[...names].join(', ')}`).toBe(names.size);
      for (const c of chips) expect(c.length, `${id}: ${c}`).toBeLessThanOrEqual(8);
    }
  });

  it("orders the groups by spawn, its chip on the first of each spawn's", () => {
    const out = bySpawn([
      group('a', 'Halls'),
      group('b', 'Bore'),
      group('c', 'Halls'),
      group('d', 'Rift'),
    ]);
    expect(out.map((x) => [x.group.enemy, x.chip])).toEqual([
      ['a', true],
      ['c', false],
      ['b', true],
      ['d', true],
    ]);
    expect(bySpawn([group('a', null), group('b', null)]).every((x) => !x.chip)).toBe(true);
  });
});
