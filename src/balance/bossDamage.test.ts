// The boss-damage check's plumbing (D157; balance/bossDamage.ts): its labels, the content variant
// that emulates more damage on a song boss, and which maps plan it. The finale's verdicts are the
// harness's (`npm run sim`) and the slow lane's 24-cell sweeps (finM01Combos*.test.ts).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import {
  BOSS_DAMAGE_MULS,
  bossDamageChecks,
  bossDamageOf,
  songBosses,
  withBossDamage,
} from './bossDamage.ts';
import { buildFor } from './harness.ts';

const LIVE = compileContent(RAW_CONTENT);
const FIN = LIVE.maps.fin_m01;

describe('the boss-damage check (D157)', () => {
  it('reads its labels: the multiplier and the build it plays', () => {
    expect(bossDamageOf('bossDamage1.5:alt:cluster')).toEqual({ mul: 1.5, build: 'alt:cluster' });
    expect(bossDamageOf('bossDamage2:alt:no_mindspike')).toEqual({
      mul: 2,
      build: 'alt:no_mindspike',
    });
    expect(bossDamageOf('alt:cluster')).toBeNull();
    expect(bossDamageOf('bossDamage0:alt:cluster')).toBeNull();
    expect(buildFor('bossDamage2:alt:cluster', FIN, LIVE)).toBe(FIN.builds.altBuilds.cluster);
    expect(buildFor('bossDamage2:par', FIN, LIVE)).toBeNull(); // alts only
  });

  it('the variant: the Unsung and its parts at HP ÷ k everywhere, the song’s boss rest × k', () => {
    expect(songBosses(FIN, LIVE).map((d) => d.id).toSorted()).toEqual(['unsung', 'unsung_part']);
    const hard = withBossDamage(LIVE, 'fin_m01', 2);
    expect(hard.enemies.unsung.hp).toBe(LIVE.enemies.unsung.hp / 2);
    expect(hard.enemies.unsung_part.hp).toBe(LIVE.enemies.unsung_part.hp / 2);
    const map = hard.maps.fin_m01;
    const sent = map.waves.flatMap((w) => w.groups).filter((g) => g.enemy.id === 'unsung');
    expect(sent.length).toBeGreaterThan(0);
    for (const g of sent) expect(g.enemy).toBe(hard.enemies.unsung);
    expect(map.song!.restPerBossHp).toBe(FIN.song!.restPerBossHp * 2);
    // Everything else is the live content, shared.
    expect(hard.enemies.silencer).toBe(LIVE.enemies.silencer);
    expect(hard.maps.a1_m01).toBe(LIVE.maps.a1_m01);
    expect(map.routes).toBe(FIN.routes);
    expect(LIVE.enemies.unsung.hp).toBe(18000); // untouched
  });

  it('runs only on a map with a song boss: each alt it expects to win, at each multiplier', () => {
    const specs = bossDamageChecks(FIN, LIVE);
    const alts = Object.keys(FIN.builds.altBuilds);
    expect(specs).toHaveLength(alts.length * BOSS_DAMAGE_MULS.length);
    expect(specs.map((s) => s.needs[0]!.build).toSorted()).toEqual(
      alts.flatMap((a) => BOSS_DAMAGE_MULS.map((k) => `bossDamage${k}:alt:${a}`)).toSorted(),
    );
    expect(new Set(specs.map((s) => s.subject))).toEqual(new Set(alts.map((a) => `alt:${a}`)));
    expect(bossDamageChecks(LIVE.maps.a1_m05, LIVE)).toEqual([]); // the Matriarch drives off
    expect(withBossDamage(LIVE, 'a1_m01', 2)).toBe(LIVE); // no song: nothing to emulate
  });
});
