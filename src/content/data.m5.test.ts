// M5's content seams (T500a): the stubs carry the docs' numbers (design/enemies.md § 5.2, § 5.4,
// § 6; towers.md § 6.2, § 7; core-loop.md § 3.2; progression.md § 2.1, § 7.2) under their final
// sprite ids, the new shapes compile to monomorphic forms, and the new map and enemy rules hold
// (D137): phasing, the shield aura, a boss's shield-broken phase and its Ward, split chains, the
// Escort's refugees and safe exit, Sundown's darkness and lamps, and the `leaks.waves` atom.
// createSim refuses each mechanic until its task (sim/m5seams.test.ts).
import { describe, expect, it } from 'vitest';
import { FIXTURE, fxMap } from './__fixtures__/content.ts';
import { compileContent } from './compile.ts';
import { mapDefinersFor } from './define.ts';
import { RAW_CONTENT } from './registry.ts';
import { REFUGEE_GROUP_SIZE, SPLIT_MAX_DEPTH } from './rules.ts';
import { SPRITES } from './sprites/index.ts';
import { STUB_TOWER_TASKS, TOWERS_AHEAD_OF_TASK } from './towers/index.ts';
import type { ConditionDef, EnemyDef, IdSpace, MapDef, RawContent } from './types.ts';
import { TOWER_ACCESS } from './upgrades/access.ts';
import { UPGRADES } from './upgrades/index.ts';
import { validate } from './validate.ts';

const content = compileContent(RAW_CONTENT);
const SPRITE_IDS = new Set<string>(SPRITES.map((s) => s.id));
const loose = mapDefinersFor<IdSpace>();

function withMap(patch: Partial<MapDef<IdSpace>>): RawContent<IdSpace> {
  return { ...FIXTURE, maps: { fx_map: loose.defineMap({ ...fxMap, ...patch }) } };
}
function withEnemy(def: EnemyDef): RawContent<IdSpace> {
  return { ...FIXTURE, enemies: { ...FIXTURE.enemies, [def.id]: def } };
}
/** validate()'s errors for a rule tag. */
function errors(raw: RawContent<IdSpace>, rule: string): string[] {
  return validate(raw).filter((e) => e.startsWith(`[${rule}]`));
}
const walker: EnemyDef = FIXTURE.enemies.fx_walker;
/** The fixture plus the live Glimmer-shard and `def` (a boss whose shards are Glimmer-shards). */
function withShards(def: EnemyDef): RawContent<IdSpace> {
  return {
    ...FIXTURE,
    enemies: {
      ...FIXTURE.enemies,
      glimmer_shard: RAW_CONTENT.enemies.glimmer_shard,
      [def.id]: def,
    },
  };
}
/** fx_map with a Before the Dark–style Challenge over `leaks`. */
function leaksChallenge(leaks: Extract<ConditionDef<IdSpace>, { leaks: unknown }>['leaks']) {
  return {
    medals: {
      challenge: {
        id: 'before_the_dark',
        name: 'Before the Dark',
        description: 'No leaks in the last waves.',
        condition: { leaks, lte: 0 },
      },
    },
  };
}
/** fx_map with a `refugeesRemaining` trigger. */
function remaining(n: number): Partial<MapDef<IdSpace>> {
  return { events: [{ id: 'r', on: { refugeesRemaining: n }, actions: [{ cue: 'fx_map_r' }] }] };
}

describe('M5 enemies (stubs under their final ids)', () => {
  it('the roster rows (enemies.md § 5.2, § 5.4)', () => {
    const e = content.enemies;
    expect(e.veilwalker).toMatchObject({ hp: 90, armor: 0, leak: 2, bounty: 10, cloaked: true });
    expect(e.veilwalker.shield?.hp).toBe(30);
    expect(e.blinkstrider).toMatchObject({ hp: 110, bounty: 10 });
    expect(e.blinkstrider.blink).toMatchObject({ everyTicks: 360, tellTicks: 48, tiles: 2.5 });
    expect(e.cantor).toMatchObject({ hp: 150, leak: 2, bounty: 14 });
    expect(e.cantor.shieldAura).toEqual({ radiusTiles: 2, radiusSq: 4, shieldPerTick: 15 / 60 });
    expect(e.fracture).toMatchObject({ hp: 200, faction: 'hollow', bounty: 8, hushes: true });
    expect(e.fracture.split).toEqual({ enemy: 'fracture_shard', count: 2 });
    expect(e.fracture_shard).toMatchObject({ hp: 80 });
    expect(e.fracture_shard.split).toEqual({ enemy: 'mote', count: 2 });
    expect(e.fracture_shard.traits).toContain('clustered');
    expect(e.riftmoth).toMatchObject({ hp: 120, layer: 'air', bounty: 10 });
    expect(e.riftmoth.phase).toEqual({ everyTicks: 300, durationTicks: 90, tellTicks: 30 });
    expect(e.glimmer_shard).toMatchObject({ cloaked: true, faction: 'aelari' });
    const ids = [
      'veilwalker',
      'blinkstrider',
      'cantor',
      'sunderglass_penitent',
      'glimmer_shard',
      'fracture',
      'fracture_shard',
      'riftmoth',
    ] as const;
    for (const id of ids) {
      expect(e[id].sprites, id).toEqual({ body: `enemy.${id}`, icon: `icon.enemy.${id}` });
      expect(SPRITE_IDS.has(`enemy.${id}`) && SPRITE_IDS.has(`icon.enemy.${id}`), id).toBe(true);
    }
  });

  it('the Sunderglass Penitent: a shield-broken phase with 3 shards, a pivot at 50% to the Ward', () => {
    const p = content.enemies.sunderglass_penitent;
    expect(p).toMatchObject({ hp: 1400, bounty: 0, speedTilesPerTick: 0.2 / 60 });
    expect(p.shield?.hp).toBe(600);
    const boss = p.boss!;
    expect(boss).toMatchObject({ ending: 'pivot', endAtPct: 0.5 });
    expect(boss.ward).toEqual({ radiusTiles: 2.5, radiusSq: 6.25, chillPct: 0.4 });
    expect(boss.phases.map((ph) => [ph.fromPct, ph.onShieldBroken])).toEqual([
      [1, false],
      [0, true],
    ]);
    expect(boss.phases[1]?.shards).toEqual({ enemy: 'glimmer_shard', count: 3, reformTicks: 240 });
    expect(boss.phases[0]?.shards).toBeNull();
  });

  it('every other enemy compiles with no phase or aura (monomorphic shapes)', () => {
    expect(content.enemies.nibbler).toMatchObject({ phase: null, shieldAura: null });
    expect(content.enemies.glass_witch.boss?.ward).toBeNull();
    expect(content.enemies.glass_witch.boss?.phases[0]).toMatchObject({
      onShieldBroken: false,
      shards: null,
    });
  });
});

describe('M5 towers, ability, links, and catalog rows', () => {
  it('the Prism Spire (towers.md § 7): a ramping beam and a light source', () => {
    const p = content.towers.prism;
    expect(p).toMatchObject({ faction: 'aelari', lightRadiusTiles: 2, lightRadiusSq: 4 });
    expect(p.tiers[0].attack).toMatchObject({
      kind: 'beam',
      type: 'energy',
      damage: 12,
      rangeTiles: 3,
      rampPctPerTick: 0.5 / 60,
      rampCap: 4,
      beams: 1,
    });
    expect(p.tiers[1].attack).toMatchObject({ damage: 16 });
    expect(p.tiers[2].attack).toMatchObject({ rampCap: 5, rangeTiles: 3.5 });
    expect(p.specs?.a.attack).toMatchObject({ beams: 3, rampCap: 3 });
    expect(p.specs?.b.attack).toMatchObject({ rampPctPerTick: 1 / 60, rampCap: 10 });
  });

  it('the Mindspike (Echo Spike, Dread) and the Lantern (All-Seeing, Truthlight)', () => {
    const m = content.towers.mindspike;
    expect(m.tiers.map((t) => t.attack?.damage)).toEqual([18, 26, 34]);
    expect(m.tiers[0].attack).toMatchObject({ kind: 'hitscan', type: 'psionic', echo: null });
    expect(m.specs?.a.attack).toMatchObject({ echo: { pct: 0.5, radiusTiles: 1.2 } });
    expect(m.specs?.b.effects).toEqual([{ status: 'unnerved', durationTicks: 90 }]);
    const l = content.towers.lantern;
    expect(l.tiers[0].detect?.radiusTiles).toBe(3);
    expect(l.tiers[1].detect?.radiusTiles).toBe(3.5);
    expect(l.tiers[0].effects).toEqual([
      { status: 'marked', pct: 0.15, durationTicks: 60, noEvade: false },
    ]);
    expect(l.tiers[2].attack).toMatchObject({ kind: 'beam', type: 'psionic', beams: 2 });
    expect(l.specs?.a.markArea).toEqual({ radiusTiles: 3.5, radiusSq: 12.25, pct: 0.15 });
    expect(l.specs?.a.attack).toMatchObject({ beams: 2 }); // All-Seeing keeps T3's two beams
    expect(l.specs?.b.attack).toMatchObject({ beams: 1 }); // Truthlight: one target
    expect(l.specs?.b.effects).toEqual([
      { status: 'marked', pct: 0.35, durationTicks: 60, noEvade: true },
    ]);
    expect(l.tiers[0].markArea).toBeNull();
  });

  it('none waits for its task (STUB_TOWER_TASKS; T504, T507, T508 lifted theirs), with access rows', () => {
    expect(STUB_TOWER_TASKS).toEqual({});
    expect(TOWERS_AHEAD_OF_TASK).toEqual([]);
    expect(TOWER_ACCESS.prism).toEqual({ how: 'gift', availableAfter: 'a2_m05' });
    for (const id of ['mindspike', 'lantern'] as const) {
      expect(TOWER_ACCESS[id], id).toEqual({
        how: 'attune',
        currency: 'intel',
        price: 3,
        availableAfter: 'a2_m05',
        requires: 'prism', // Xenotech sells them once the Prism is owned (T509)
      });
    }
    for (const id of ['prism', 'mindspike', 'lantern'] as const) {
      expect(content.towers[id].sprites, id).toEqual({
        base: `tower.${id}`,
        head: `tower.${id}_head`,
        icon: `icon.tower.${id}`,
      });
    }
  });

  it('Stillness (core-loop.md § 3.2), Resonance and Lightsong (towers.md § 6.2)', () => {
    expect(content.abilities.stillness).toMatchObject({
      companion: 'vesthara',
      cooldownTicks: 2700,
      effect: { kind: 'stasisArea', radiusTiles: 2.5, radiusSq: 6.25, durationTicks: 180 },
    });
    const byId = new Map(content.links.map((l) => [l.id, l]));
    const [zap, prism] = byId.get('resonance')!.partners;
    expect([zap.tower, zap.vsShieldPct, prism.tower, prism.vsShieldPct]).toEqual([
      'zapcoil',
      0.2,
      'prism',
      0.2,
    ]);
    expect(zap.pctDamage).toBe(0);
    const [p, l] = byId.get('lightsong')!.partners;
    expect([p.tower, p.rampPct, l.tower, l.markPct]).toEqual(['prism', 0.3, 'lantern', 0.05]);
  });

  it('the Zibzab Tune-up is a granted item (never sold)', () => {
    expect(UPGRADES.tune_zibzab).toMatchObject({ kind: 'grant', availableAfter: 'a2_m04' });
  });
});

describe('M5 enemy rules', () => {
  it('[enemy-traits] phasing ⇔ `phase`, shield_aura ⇔ `shieldAura`', () => {
    const phase = { everySec: 5, durationSec: 1.5, tellSec: 0.5 };
    expect(errors(withEnemy({ ...walker, phase }), 'enemy-traits')).toHaveLength(1);
    const aura = { radiusTiles: 2, shieldPerSec: 15 };
    expect(errors(withEnemy({ ...walker, shieldAura: aura }), 'enemy-traits')).toHaveLength(1);
  });

  it('[enemy-ability] a phase fits its period; an aura needs a shield', () => {
    const moth: EnemyDef = {
      ...walker,
      id: 'fx_moth',
      traits: ['phasing'],
      tells: ['phasing'],
      phase: { everySec: 2, durationSec: 1.5, tellSec: 0.5 },
    };
    expect(errors(withEnemy(moth), 'enemy-ability')).toEqual([
      '[enemy-ability] enemies.fx_moth.phase.durationSec: the tell and the Phased stretch must fit in everySec',
    ]);
    const cantor: EnemyDef = {
      ...walker,
      id: 'fx_cantor',
      traits: ['shield_aura'],
      tells: ['shield_aura'],
      shieldAura: { radiusTiles: 2, shieldPerSec: 15 },
    };
    expect(errors(withEnemy(cantor), 'enemy-ability')).toEqual([
      '[enemy-ability] enemies.fx_cantor.shieldAura: a shield aura needs a shield on the unit',
    ]);
  });

  it('[enemy-ability] a shield-broken phase, its shards, and the Ward', () => {
    const p: EnemyDef = RAW_CONTENT.enemies.sunderglass_penitent;
    const boss = p.boss!;
    const raw = withShards;
    expect(errors(raw(p), 'enemy-ability')).toEqual([]);
    const { ward: _ward, ...unwarded } = boss;
    const noWard = { ...p, boss: unwarded };
    expect(errors(raw(noWard), 'enemy-ability')).toHaveLength(1);
    const ward = { radiusTiles: 2.5, chillPct: 0.4 };
    const retreat = { ...p, boss: { ...boss, ending: 'retreat' as const, ward } };
    expect(errors(raw(retreat), 'enemy-ability')).toHaveLength(1);
    const first = { ...p, boss: { ...boss, phases: [boss.phases[1]!, boss.phases[0]!] } };
    expect(errors(raw(first), 'enemy-ability').length).toBeGreaterThan(0);
    const shardsOnHp = {
      ...p,
      boss: { ...boss, phases: [{ ...boss.phases[0]!, shards: boss.phases[1]!.shards! }] },
    };
    expect(errors(raw(shardsOnHp), 'enemy-ability')).toEqual([
      '[enemy-ability] enemies.sunderglass_penitent.boss.phases[0].shards: only a shield-broken phase releases shards',
    ]);
  });

  it(`[enemy-ability] a split chain never loops and is at most ${SPLIT_MAX_DEPTH} deep`, () => {
    const a: EnemyDef = { ...walker, id: 'fx_a', traits: ['splitting'], tells: ['splitter'] };
    const loop = {
      ...FIXTURE,
      enemies: {
        ...FIXTURE.enemies,
        fx_a: { ...a, split: { enemy: 'fx_b', count: 2 } },
        fx_b: { ...a, id: 'fx_b', split: { enemy: 'fx_a', count: 2 } },
      },
    };
    expect(errors(loop, 'enemy-ability').some((e) => e.includes('loops back'))).toBe(true);
    const deep = {
      ...FIXTURE,
      enemies: {
        ...FIXTURE.enemies,
        fx_a: { ...a, split: { enemy: 'fx_b', count: 2 } },
        fx_b: { ...a, id: 'fx_b', split: { enemy: 'fx_c', count: 2 } },
        fx_c: { ...a, id: 'fx_c', split: { enemy: 'fx_walker', count: 2 } },
      },
    };
    expect(errors(deep, 'enemy-ability').some((e) => e.includes('3 levels deep'))).toBe(true);
    // The live chain (Fracture → Shard → Mote) is two deep, and the live content compiled above.
  });
});

describe('M5 map rules', () => {
  // fx_map's road ends on its core at (5, 4).
  const escort: Partial<MapDef<IdSpace>> = {
    markers: { rock: [0, 2], gate: [5, 4] },
    safeExit: 'gate',
    refugees: { g1: { route: 'a', withPebble: true } },
  };

  it('[escort] the safe exit sits on the core, each group walks a path ending there', () => {
    expect(errors(withMap(escort), 'escort')).toEqual([]);
    expect(errors(withMap({ ...escort, objective: 'escort' }), 'escort')).toEqual([]);
    expect(errors(withMap({ ...escort, objective: 'escort' }), 'feature')).toEqual([]);
    // The exit's marker is the one marker allowed on a path tile.
    expect(errors(withMap(escort), 'marker')).toEqual([]);
    const off = { ...escort, markers: { rock: [0, 2], gate: [0, 2] } } as const;
    expect(errors(withMap(off), 'escort')).toContain(
      "[escort] maps.fx_map.safeExit: marker 'gate' (0,2) is not on the core 'C'",
    );
    const air = { ...escort, refugees: { g1: { route: 'sky' } } };
    expect(errors(withMap(air), 'escort')).toHaveLength(1);
    const { safeExit: _exit, ...noExit } = escort;
    expect(errors(withMap(noExit), 'escort')).toHaveLength(1);
    expect(errors(withMap({ objective: 'escort' }), 'escort')).toHaveLength(1);
    const bad = { ...escort, refugees: { g1: { route: 'a', count: 0 } } };
    expect(errors(withMap(bad), 'escort')).toHaveLength(1);
  });

  it('[escort] spawnAllies names a refugee group; setObjective escort needs refugees', () => {
    const spawn = (group: string): Partial<MapDef<IdSpace>> => ({
      ...escort,
      events: [{ id: 'go', on: { wave: 1, phase: 'start' }, actions: [{ spawnAllies: group }] }],
    });
    expect(errors(withMap(spawn('g1')), 'escort')).toEqual([]);
    expect(errors(withMap(spawn('nope')), 'escort')).toHaveLength(1);
    const pivot = {
      events: [
        { id: 'pivot', on: { wave: 2, phase: 'start' }, actions: [{ setObjective: 'escort' }] },
      ],
    } as const;
    expect(errors(withMap(pivot), 'escort')).toHaveLength(1);
    expect(errors(withMap({ ...escort, ...pivot }), 'escort')).toEqual([]);
  });

  it('compiles the escort: the exit tile, the groups by rule, the total (Pebble not counted)', () => {
    const raw = withMap({
      ...escort,
      refugees: { g1: { route: 'a', withPebble: true }, g2: { route: 'a', count: 4 } },
    });
    const map = compileContent(raw).maps.fx_map!;
    expect(map.escort).toMatchObject({ safeExit: 'gate', exitTile: [5, 4], total: 6 + 4 });
    expect(map.escort?.groups.map((g) => [g.id, g.count, g.withPebble])).toEqual([
      ['g1', REFUGEE_GROUP_SIZE, true],
      ['g2', 4, false],
    ]);
    expect(map.escort?.groups[0]).toMatchObject({ spacingTiles: 0.6, speedTilesPerTick: 0.7 / 60 });
    expect(content.maps.a1_m01.escort).toBeNull();
  });

  it('[darkness] dark keys are 0–1; lamps name markers and need a darkening schedule', () => {
    const lit = {
      lighting: [{ wave: 1, env: 'act2.dusk', dark: 1 }],
      lights: [{ marker: 'rock', radiusTiles: 1.5 }],
    } as const;
    expect(errors(withMap(lit), 'darkness')).toEqual([]);
    const map = compileContent(withMap(lit)).maps.fx_map!;
    expect(map.lights).toEqual([
      { marker: 'rock', x: 0.5, y: 2.5, radiusTiles: 1.5, radiusSq: 2.25 },
    ]);
    expect(map.lighting).toEqual([{ wave: 1, env: 'act2.dusk', dark: 1 }]);
    const tooDark = { ...lit, lighting: [{ wave: 1, env: 'act2.dusk', dark: 2 }] } as const;
    expect(errors(withMap(tooDark), 'darkness')).toHaveLength(1);
    const noDark = { ...lit, lighting: [{ wave: 1, env: 'act2.dusk' }] } as const;
    expect(errors(withMap(noDark), 'darkness')).toHaveLength(1);
    const unknown = { ...lit, lights: [{ marker: 'nope', radiusTiles: 1 }] } as const;
    expect(errors(withMap(unknown), 'darkness')).toHaveLength(1);
  });

  it('[condition] leaks.waves names waves of the map, alone', () => {
    const challenge = leaksChallenge;
    expect(errors(withMap(challenge({ waves: [1, 2] })), 'condition')).toEqual([]);
    expect(errors(withMap(challenge({ waves: [2, 9] })), 'condition')).toHaveLength(1);
    expect(
      errors(withMap(challenge({ waves: [1, 1], faction: 'hollow' })), 'condition'),
    ).toHaveLength(1);
  });

  it('[script] refugeesRemaining is a whole number ≥ 0', () => {
    const on = remaining;
    expect(errors(withMap(on(3)), 'script')).toEqual([]);
    expect(errors(withMap(on(-1)), 'script')).toHaveLength(1);
  });
});
