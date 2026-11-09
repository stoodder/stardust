// M4's content seams (T400a): the stubs carry the docs' numbers (design/enemies.md § 5.2, § 5.4,
// § 6; towers.md § 7; core-loop.md § 3.2; progression.md § 4.1) under their final sprite ids, and
// the new map and condition rules hold (D101): `clustered`, the intel-only `boss`, Skittish from
// the `fleeing` tag, Protect's asset, clickable markers, and the wreckage and objective atoms.
// createSim refuses each mechanic until its task (sim/m4seams.test.ts).
import { describe, expect, it } from 'vitest';
import { FIXTURE, fxMap } from './__fixtures__/content.ts';
import { compileContent } from './compile.ts';
import { mapDefinersFor } from './define.ts';
import { RAW_CONTENT } from './registry.ts';
import { THREAT_INTEL_TELL, TRAIT_COUNTER, TRAIT_TELL } from './rules.ts';
import { SPRITES } from './sprites/index.ts';
import type { ConditionDef, IdSpace, MapDef, ObjectiveDef, RawContent } from './types.ts';
import { TOWER_ACCESS, ABILITY_ACCESS } from './upgrades/access.ts';
import { validate } from './validate.ts';

const content = compileContent(RAW_CONTENT);
const SPRITE_IDS = new Set<string>(SPRITES.map((s) => s.id));
const loose = mapDefinersFor<IdSpace>();

function withMap(patch: Partial<MapDef<IdSpace>>): RawContent<IdSpace> {
  return { ...FIXTURE, maps: { fx_map: loose.defineMap({ ...fxMap, ...patch }) } };
}
/** A one-condition optional objective on fx_map. */
function objective(id: string, condition: ConditionDef<IdSpace>): ObjectiveDef<IdSpace> {
  return {
    id,
    name: 'Crew Logs',
    description: 'Recover the crew log.',
    condition,
    intel: 1,
  };
}

/** validate()'s errors for a rule tag. */
function errors(raw: RawContent<IdSpace>, rule: string): string[] {
  return validate(raw).filter((e) => e.startsWith(`[${rule}]`));
}

describe('M4 enemies', () => {
  it('the roster rows, with their final sprite ids', () => {
    const e = content.enemies;
    expect(e.mote).toMatchObject({ faction: 'hollow', body: 'void', hp: 25, leak: 1, bounty: 2 });
    expect(e.mote.traits).toEqual(['clustered']);
    expect([e.mote.hushes, e.glimmer.hushes, e.glass_witch.hushes]).toEqual([true, false, false]);
    expect(e.glimmer).toMatchObject({ hp: 60, armor: 0, bounty: 6, layer: 'ground' });
    expect(e.glimmer.shield?.hp).toBe(40);
    expect(e.weft_warden).toMatchObject({ hp: 250, armor: 3, leak: 3, bounty: 18 });
    expect(e.weft_warden.shield?.hp).toBe(200);
    expect(e.lightwing).toMatchObject({ hp: 60, layer: 'air', bounty: 8 });
    expect(e.lightwing.shield?.hp).toBe(60);
    for (const id of ['mote', 'glimmer', 'weft_warden', 'lightwing', 'glass_witch'] as const) {
      expect(e[id].sprites, id).toEqual({ body: `enemy.${id}`, icon: `icon.enemy.${id}` });
      expect(SPRITE_IDS.has(`enemy.${id}`), id).toBe(true);
    }
  });

  it('the Glass Witch: pulse (D101), blink from 70%, retreat at 40%', () => {
    const w = content.enemies.glass_witch;
    expect(w).toMatchObject({ hp: 1800, bounty: 0, pulse: null, blink: null });
    expect(w.shield?.hp).toBe(1200);
    const boss = w.boss!;
    expect(boss).toMatchObject({ ending: 'retreat', endAtPct: 0.4 });
    expect(boss.phases.map((p) => p.fromPct)).toEqual([1, 0.7]);
    expect(boss.phases[0]?.pulse).toMatchObject({ everyTicks: 480, tellTicks: 90, shield: 120 });
    expect(boss.phases[0]?.pulse?.radiusTiles).toBe(2);
    expect(boss.phases[1]?.blink).toMatchObject({ everyTicks: 420, tellTicks: 90, tiles: 2.5 });
  });
});

describe('M4 towers, ability, links, and catalog rows', () => {
  it('Lookout, Harpoon, and Crane (Vrell), with specs and final sprite ids', () => {
    const t = content.towers;
    expect(t.lookout.tiers.map((x) => [x.cost, x.detect?.radiusTiles])).toEqual([
      [100, 2.5],
      [80, 3],
      [150, 3.5],
    ]);
    expect(t.lookout.tiers[2].detect?.lingerTicks).toBe(120);
    expect(t.lookout.specs?.a).toMatchObject({ name: "Crow's Nest", cost: 300 });
    expect(t.lookout.specs?.a.detect?.revealedDamagePct).toBe(0.1);
    expect(t.lookout.specs?.b.auras[0]).toMatchObject({ kind: 'lookout', stat: 'rate', pct: 0.2 });
    expect(t.harpoon.tiers.map((x) => [x.cost, x.attack?.damage, x.attack?.armorPierce])).toEqual([
      [150, 40, 4],
      [120, 55, 4],
      [225, 55, 8],
    ]);
    expect(t.harpoon.specs?.a.attack).toMatchObject({ kind: 'line', lengthTiles: 5, damage: 70 });
    expect(t.crane.tiers.map((x) => x.economy?.perWave)).toEqual([10, 18, 28]);
    expect(t.crane.specs?.b.attack?.targetFilter).toEqual({
      bodies: ['mechanical'],
      armored: true,
    });
    for (const id of ['lookout', 'harpoon', 'crane'] as const) {
      expect(t[id].faction, id).toBe('vrell');
      expect(t[id].sprites, id).toEqual({
        base: `tower.${id}`,
        head: `tower.${id}_head`,
        icon: `icon.tower.${id}`,
      });
    }
  });

  it('Scanner Sweep: radius 4, 10 s, 30 s cooldown; links; shop and R&D rows', () => {
    expect(content.abilities.scanner_sweep).toMatchObject({ cooldownTicks: 1800 });
    expect(content.abilities.scanner_sweep.effect).toMatchObject({
      kind: 'reveal',
      radiusTiles: 4,
      durationTicks: 600,
    });
    expect(content.links.map((l) => l.id)).toEqual([
      'crossfire',
      'sitting_ducks',
      'conductive',
      'overwatch',
      'skywatch',
      'reel_it_in',
    ]);
    expect(TOWER_ACCESS.lookout).toMatchObject({ price: 150, availableAfter: 'a1_m05' });
    expect(TOWER_ACCESS.harpoon).toMatchObject({ price: 250, availableAfter: 'a2_m01' });
    expect(TOWER_ACCESS.crane).toMatchObject({ price: 200, availableAfter: 'a2_m01' });
    expect(ABILITY_ACCESS.scanner_sweep).toMatchObject({
      how: 'rnd',
      currency: 'intel',
      price: 2,
      availableAfter: 'a2_m01',
    });
  });
});

describe('M4 map and condition rules', () => {
  it('`clustered` is a splash trait with the hollow tell; `boss` is intel-only', () => {
    expect([TRAIT_COUNTER.clustered, TRAIT_TELL.clustered]).toEqual(['splash', 'hollow']);
    expect(THREAT_INTEL_TELL.boss).toBe('boss');
    expect(content.maps.a1_m05.threatIntel).toContain('boss');
  });

  it('[threat-intel] wants skittish for fleeing Skitterkin and boss for a boss', () => {
    expect(errors(withMap({ threatIntel: ['fast', 'shielded'] }), 'threat-intel')).toEqual([
      '[threat-intel] maps.fx_map.threatIntel: missing skittish (in the waves)',
    ]);
    expect(
      errors(withMap({ threatIntel: [...fxMap.threatIntel, 'boss'] }), 'threat-intel'),
    ).toEqual(['[threat-intel] maps.fx_map.threatIntel: lists boss, which no wave has']);
  });

  it('[asset] goes with a protect objective, and only with it', () => {
    const asset = { integrity: 10, marker: 'rig', routes: ['a'] };
    const markers = { ...fxMap.markers, rig: [5, 0] as const };
    expect(errors(withMap({ objective: 'protect' }), 'asset')).toHaveLength(1);
    expect(errors(withMap({ asset, markers }), 'asset')).toHaveLength(1);
    expect(validate(withMap({ objective: 'protect', asset, markers }))).toEqual([]);
    expect(
      errors(
        withMap({ objective: 'protect', asset: { ...asset, integrity: 0 }, markers }),
        'asset',
      ),
    ).toHaveLength(1);
    expect(errors(withMap({ objective: 'escort' }), 'feature')).toHaveLength(1);
  });

  it('[clickable] setClickable and interacted name a declared clickable marker', () => {
    const { clickables: _c, ...noClickables } = fxMap;
    const raw: RawContent<IdSpace> = { ...FIXTURE, maps: { fx_map: noClickables } };
    expect(errors(raw, 'clickable')).toEqual([
      "[clickable] maps.fx_map.events[1].actions[1]: marker 'rock' is not in clickables",
    ]);
    expect(
      errors(withMap({ clickables: { nowhere: { name: 'X' } } }), 'clickable').length,
    ).toBeGreaterThan(0);
  });

  it('[script] wreckageCleared sits on wreckage; objectiveDone names another objective', () => {
    const markers = { ...fxMap.markers, log: [4, 3] as const };
    const on = (wreckageCleared: string): RawContent<IdSpace> =>
      withMap({
        markers,
        events: [{ id: 'log', on: { wreckageCleared }, actions: [{ cue: 'fx_map_w02' }] }],
      });
    expect(validate(on('log'))).toEqual([]);
    expect(errors(on('rock'), 'script')).toEqual([
      "[script] maps.fx_map.events[0].on: marker 'rock' is not on a wreckage tile ('x')",
    ]);
    expect(
      errors(withMap({ objectives: [objective('a', { objectiveDone: 'a' })] }), 'script'),
    ).toContain('[script] maps.fx_map.objectives[0].condition: an objective reads itself');
    expect(
      errors(withMap({ objectives: [objective('a', { objectiveDone: 'b' })] }), 'script'),
    ).toContain("[script] maps.fx_map.objectives[0].condition: unknown objective 'b'");
  });
});
