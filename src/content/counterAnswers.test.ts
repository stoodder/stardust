// The counter-answer model (counterAnswers.ts) on the live answer table, and the validator's
// [no-counter-build] / [alt-builds] rules judged by the tiers, specs, and casts a build reaches.
import { describe, expect, it } from 'vitest';
import { FIXTURE, fxBuilds, fxMap } from './__fixtures__/content.ts';
import { compileContent } from './compile.ts';
import {
  REACH_SLACK_TILES,
  answerScope,
  answersCarried,
  distanceToRoute,
  rangeReached,
  towersReached,
  type AnswerScope,
  type ReachStep,
  type RangedTower,
  type ReachedTower,
  type ReachTile,
  type ScopeEnemy,
} from './counterAnswers.ts';
import { mapDefinersFor } from './define.ts';
import { COUNTER_ANSWERS, COUNTER_CATEGORIES, type TowerAnswer } from './rules.ts';
import { TOWERS } from './towers/index.ts';
import type { Act, Body, CounterId, IdSpace, MapDef, RawContent, ScriptedBuild } from './types.ts';
import { validate, type ValidationRules } from './validate.ts';

const scope = (act: Act, bodies: Body[] = ['organic'], air = false): AnswerScope => ({
  act,
  bodies: new Set(bodies),
  air,
  routes: null,
});
const build = (tower: string, tile: string): ReachStep => ({ op: 'build', tower, tile });
const up = (tile: string): ReachStep => ({ op: 'upgrade', tile });
/** Labels of the live answers to `c` carried by these steps. */
const live = (
  c: CounterId,
  steps: ReachStep[],
  s: AnswerScope = scope(1),
  loadout: string[] = [],
  cast: string[] = [],
): string[] => answersCarried(COUNTER_ANSWERS[c], s, towersReached(loadout, steps), cast);

describe('towersReached', () => {
  it('records each placed tower at its highest tier and spec, even after a sale', () => {
    const steps: ReachStep[] = [
      build('rivet', 'a'),
      up('a'),
      up('a'),
      { op: 'specialize', tile: 'a', spec: 'b' },
      { op: 'sell', tile: 'a' },
      build('rivet', 'a'),
      build('thumper', 'b'),
      up('b'),
      up('nowhere'),
    ];
    expect(towersReached(['rivet', 'thumper', 'sprinkler'], steps)).toEqual([
      { tower: 'rivet', tier: 4, spec: 'b', at: null },
      { tower: 'rivet', tier: 1, spec: null, at: null },
      { tower: 'thumper', tier: 2, spec: null, at: null },
      // In the loadout but never built: it still counts, at tier 1, with no placement.
      { tower: 'sprinkler', tier: 1, spec: null, at: null },
    ]);
  });
});

describe('the live answer table (enemies.md § 3.1, towers.md § 2.1)', () => {
  it('armor: Rivet only from T3; Thumper only in Acts I–II or as Bunker Buster', () => {
    const rivetT2 = [build('rivet', 'a'), up('a')];
    expect(live('armor', rivetT2)).toEqual([]);
    expect(live('armor', [...rivetT2, up('a')])).toEqual(['rivet T3']);
    // Rivet Storm passes T3 on the way, so it counts (a no-armor build must stop at T2).
    expect(
      live('armor', [...rivetT2, up('a'), { op: 'specialize', tile: 'a', spec: 'a' }]),
    ).toEqual(['rivet T3']);
    expect(live('armor', [build('thumper', 'b')], scope(2))).toEqual(['thumper']);
    expect(live('armor', [build('thumper', 'b')], scope(3))).toEqual([]);
    const buster = [build('thumper', 'b'), up('b'), up('b')];
    expect(
      live('armor', [...buster, { op: 'specialize', tile: 'b', spec: 'b' }], scope(3)),
    ).toEqual(['thumper [Bunker Buster]']);
    expect(
      live('armor', [...buster, { op: 'specialize', tile: 'b', spec: 'a' }], scope(3)),
    ).toEqual([]);
  });

  it('armor: Mindspike only against Hollow or Aelari armor; Skyhook only as Seeker Swarm, vs flyers', () => {
    const spike = [build('mindspike', 'a')];
    expect(live('armor', spike, scope(3, ['mechanical']))).toEqual([]);
    expect(live('armor', spike, scope(3, ['mechanical', 'void']))).toEqual(['mindspike']);
    const sky = [build('skyhook', 's'), up('s'), up('s')];
    const seeker = [...sky, { op: 'specialize', tile: 's', spec: 'b' } as const];
    expect(live('armor', sky, scope(3, ['organic'], true))).toEqual([]);
    expect(live('armor', seeker, scope(3, ['organic'], true))).toEqual(['skyhook [Seeker Swarm]']);
    // The Skyhook hits air only, so Seeker Swarm doesn't answer armor that walks (T407b).
    expect(live('armor', seeker, scope(3))).toEqual([]);
  });

  it('splash: spec-only answers, and Skyhook only against air clusters', () => {
    const t3 = (t: string): ReachStep[] => [build(t, t), up(t), up(t)];
    const spec = (t: string, s: 'a' | 'b'): ReachStep[] => [
      ...t3(t),
      { op: 'specialize', tile: t, spec: s },
    ];
    expect(live('splash', t3('rivet'))).toEqual([]);
    expect(live('splash', spec('rivet', 'a'))).toEqual(['rivet [Rivet Storm]']);
    expect(live('splash', spec('mindspike', 'b'))).toEqual([]);
    expect(live('splash', spec('mindspike', 'a'))).toEqual(['mindspike [Echo Spike]']);
    expect(live('splash', spec('sproing', 'a'))).toEqual([]);
    expect(live('splash', spec('sproing', 'b'))).toEqual(['sproing [Big Bonk]']);
    expect(live('splash', [build('skyhook', 's')], scope(1))).toEqual([]);
    expect(live('splash', [build('skyhook', 's')], scope(1, ['organic'], true))).toEqual([
      'skyhook',
    ]);
  });

  it('the Sprinkler (T407a): shield from T3 (its Soak), air as Cloudburst, jam as Flash Freeze', () => {
    const t3: ReachStep[] = [build('sprinkler', 's'), up('s'), up('s')];
    const spec = (s: 'a' | 'b'): ReachStep[] => [...t3, { op: 'specialize', tile: 's', spec: s }];
    expect(live('shield', [build('sprinkler', 's'), up('s')], scope(2))).toEqual([]);
    expect(live('shield', t3, scope(2))).toEqual(['sprinkler T3']);
    expect(live('air', t3, scope(2, ['organic'], true))).toEqual([]);
    expect(live('air', spec('a'), scope(2, ['organic'], true))).toEqual([]);
    expect(live('air', spec('b'), scope(2, ['organic'], true))).toEqual(['sprinkler [Cloudburst]']);
    expect(live('jam', spec('b'), scope(3))).toEqual([]);
    expect(live('jam', spec('a'), scope(3))).toEqual(['sprinkler [Flash Freeze]']);
    // A Cloudburst reaches 2.8 tiles (the counter model's range for its placement).
    expect(
      rangeReached(TOWERS.sprinkler, { tower: 'sprinkler', tier: 4, spec: 'b', at: null }),
    ).toBe(2.8);
  });

  it('abilities answer only when cast, and only through what § 3.1 lists them for', () => {
    expect(live('jam', [], scope(3), [], ['stillness'])).toEqual(['stillness']);
    expect(live('burrowed', [], scope(3), [], ['underfoot'])).toEqual(['underfoot']);
    // Cooldown damage answers nothing: Orbital Strike vs armor, Underfoot vs splash (D035 for
    // Suppressing Fire).
    expect(live('armor', [], scope(1), [], ['orbital_strike', 'suppressing_fire'])).toEqual([]);
    expect(live('splash', [], scope(3), [], ['underfoot', 'orbital_strike'])).toEqual([]);
  });

  it('every spec entry names its spec, matching the tower data once that has specs', () => {
    for (const c of COUNTER_CATEGORIES) {
      for (const e of COUNTER_ANSWERS[c].towers) {
        if (e.spec === undefined) continue;
        expect(e.specName, `${c}: ${e.tower} [${e.spec}]`).toBeDefined();
        const def = (TOWERS as Record<string, { specs?: Record<'a' | 'b', { name: string }> }>)[
          e.tower
        ];
        if (def?.specs !== undefined) expect(def.specs[e.spec].name).toBe(e.specName);
      }
    }
  });

  it('scopes a category to its own enemies on the map', () => {
    const armored = {
      traits: ['armored' as const],
      body: 'mechanical' as const,
      layer: 'ground' as const,
    };
    const flyer = { traits: ['flying' as const], body: 'void' as const, layer: 'air' as const };
    const s = answerScope('armor', 3, [armored, flyer]);
    expect([...s.bodies]).toEqual(['mechanical']);
    expect(s.air).toBe(false);
    expect(answerScope('air', 3, [armored, flyer]).air).toBe(true);
  });
});

// ── Placement (T313): a placed tower answers only from where it can reach the enemies' routes ──

const LIVE_RANGES: Readonly<Partial<Record<string, RangedTower>>> = TOWERS;
/** A build step placing `tower` on `tile`. */
const at = (tower: string, tile: ReachTile, highGround = false): ReachStep => ({
  op: 'build',
  tower,
  tile: `${tile[0]},${tile[1]}`,
  at: { tile, highGround },
});
/** A live tower's range as placed (null for a tower the live data doesn't have yet). */
const rangeOf = (t: ReachedTower): number | null => {
  const def = LIVE_RANGES[t.tower];
  return def === undefined ? null : rangeReached(def, t);
};
/** A rivet reached at `tier` (and `spec`), placed nowhere. */
const rivetAt = (tier: number, spec: 'a' | 'b' | null = null): ReachedTower => ({
  tower: 'rivet',
  tier,
  spec,
  at: null,
});

describe('placement-aware answers (T313)', () => {
  /** An air lane along row 0, from (0,0) to (10,0). */
  const LANE: ReachTile[] = [
    [0, 0],
    [10, 0],
  ];
  const ROAD: ReachTile[] = [
    [0, 9],
    [10, 9],
  ];
  const puffwing: ScopeEnemy = { traits: ['flying'], body: 'organic', layer: 'air', route: LANE };
  /** Gerald: neutral, flying, on the ground road (D072). */
  const gerald: ScopeEnemy = { ...puffwing, body: 'mechanical', neutral: true, route: ROAD };
  const air = (steps: ReachStep[], loadout: string[] = [], enemies: ScopeEnemy[] = [puffwing]) =>
    answersCarried(
      COUNTER_ANSWERS.air,
      answerScope('air', 1, enemies),
      towersReached(loadout, steps),
      [],
      rangeOf,
    );

  it('measures distance to a route polyline, ends and corners included', () => {
    expect(distanceToRoute([5, 3], LANE)).toBe(3);
    expect(distanceToRoute([13, 4], LANE)).toBe(5);
    expect(
      distanceToRoute(
        [2, 2],
        [
          [0, 0],
          [4, 0],
          [4, 4],
        ],
      ),
    ).toBe(2);
    expect(distanceToRoute([1, 1], [[1, 1]])).toBe(0);
  });

  it('reads the range a tower reaches: tiers inherit, a spec may outrange', () => {
    const rivet = LIVE_RANGES.rivet!;
    const t1 = rangeReached(rivet, rivetAt(1))!;
    expect(t1).toBeGreaterThan(0);
    expect(rangeReached(rivet, rivetAt(3))!).toBeGreaterThanOrEqual(t1);
    // Railspike (spec b) is the long-range sniper (range 6).
    expect(rangeReached(rivet, rivetAt(4, 'b'))).toBe(6);
    expect(rangeReached({ tiers: [{}, {}, {}] }, rivetAt(3))).toBeNull();
  });

  it('a Rivet answers air only where it can reach the lane', () => {
    const range = rangeOf({ tower: 'rivet', tier: 1, spec: null, at: null })!;
    const edge = Math.floor(range + REACH_SLACK_TILES);
    expect(air([at('rivet', [5, edge])])).toEqual(['rivet']);
    expect(air([at('rivet', [5, edge + 1])])).toEqual([]);
    // High ground's range bonus brings it back in.
    const far = Math.floor(range * 1.25 + REACH_SLACK_TILES);
    expect(air([at('rivet', [5, far], true)])).toEqual(['rivet']);
    // Any one placement in reach is enough (reach once).
    expect(air([at('rivet', [5, 9]), at('rivet', [5, 1])])).toEqual(['rivet']);
  });

  it('counts a loadout tower the build never places, and a tower with no known range', () => {
    expect(air([], ['skyhook'])).toEqual(['skyhook']);
    expect(air([at('lantern', [5, 9])])).toEqual(['lantern']); // no range data: not judged
    // A step with no placement isn't judged either.
    expect(air([{ op: 'build', tower: 'rivet', tile: 'r' }])).toEqual(['rivet']);
  });

  it('neutral units are in no category: Gerald on the road makes no road Rivet an air answer', () => {
    expect(air([at('rivet', [5, 9])], [], [puffwing, gerald])).toEqual([]);
    expect(answerScope('air', 1, [gerald]).routes).toBeNull();
    expect(answerScope('air', 1, [gerald]).air).toBe(false);
  });

  it('routes are unknown (placement unjudged) when an enemy comes without one', () => {
    const { route: _route, ...noRoute } = puffwing;
    expect(answerScope('air', 1, [puffwing, noRoute]).routes).toBeNull();
    expect(air([at('rivet', [5, 9])], [], [noRoute])).toEqual(['rivet']);
  });
});

// ── The validator on a fixture map whose required counter is armor ─────────────────────────

const loose = mapDefinersFor<IdSpace>();
/** fx_gun answers armor from T3 (like Rivet), fx_mortar as spec b (like Bunker Buster). */
const ARMOR: readonly TowerAnswer[] = [
  { tower: 'fx_gun', minTier: 3 },
  { tower: 'fx_mortar', spec: 'b' },
];
const rules = (abilities: readonly string[] = []): ValidationRules => ({
  counterAnswers: { ...COUNTER_ANSWERS, armor: { towers: ARMOR, abilities } },
});
const gunT3: ScriptedBuild<IdSpace> = {
  loadout: ['fx_gun'],
  steps: [
    { wave: 1, build: 'fx_gun', tile: [1, 1] },
    { wave: 1, upgrade: [1, 1] },
    { wave: 2, upgrade: [1, 1] },
  ],
};
/** Rivets held below T3: the shape of A1M2's no-armor build. */
const gunT2: ScriptedBuild<IdSpace> = {
  loadout: ['fx_gun', 'fx_mortar'],
  steps: [
    { wave: 1, build: 'fx_gun', tile: [1, 1] },
    { wave: 1, upgrade: [1, 1] },
    { wave: 1, build: 'fx_gun', tile: [1, 3] },
    { wave: 2, build: 'fx_mortar', tile: [3, 1] },
    { wave: 2, ability: 1, target: [2, 2] },
  ],
};
function armorMap(noArmor: ScriptedBuild<IdSpace>, patch: Partial<MapDef<IdSpace>> = {}) {
  const raw: RawContent<IdSpace> = {
    ...FIXTURE,
    enemies: {
      ...FIXTURE.enemies,
      fx_walker: {
        ...FIXTURE.enemies.fx_walker,
        armor: 2,
        traits: ['armored'],
        tells: ['armored'],
      },
    },
  };
  const map = loose.defineMap({
    ...fxMap,
    threatIntel: ['armored', 'fast', 'shielded', 'skittish'],
    requiredCounters: ['armor'],
    referenceProfile: { ...fxBuilds.referenceProfile, specs: ['fx_mortar'] },
    noCounterBuilds: { armor: noArmor },
    altBuilds: { gun_t3: gunT3 },
    ...patch,
  });
  return { ...raw, maps: { fx_map: map } };
}
const errors = (raw: RawContent<IdSpace>, r = rules()): string[] => validate(raw, r);

/** The fixture grid widened east, with a pad at (11,0) far from the path (and the air lane). */
const WIDE = {
  size: { cols: 12, rows: 5 },
  tiles: fxMap.tiles.map((row, r) => `${row}${r === 0 ? '.....o' : '......'}`),
} as const;

describe('validate: answers by the tiers and specs a build reaches (T208)', () => {
  it("[build-step] holdFireWhile: 'neutral' needs a map that spawns a neutral unit (T313)", () => {
    const par = { ...fxBuilds.parBuild, steps: [{ wave: 1, holdFireWhile: 'neutral' as const }] };
    const errs = errors(armorMap(gunT2, { parBuild: par }));
    expect(errs).toEqual([
      '[build-step] maps.fx_map.parBuild.steps[0]: no wave group spawns a neutral unit',
    ]);
    const raw = armorMap(gunT2, { parBuild: par });
    const neutral = { ...raw.enemies.fx_walker!, neutral: true as const, leak: 0, bounty: 0 };
    expect(
      errors({ ...raw, enemies: { ...raw.enemies, fx_walker: neutral } }).filter((e) =>
        e.startsWith('[build-step]'),
      ),
    ).toEqual([]);
  });

  it("[no-counter-build] a T3 gun out of the path's reach is no armor answer (T313)", () => {
    const far = { ...gunT2, steps: gunT2.steps.filter((s) => !('ability' in s)) };
    const farT3: ScriptedBuild<IdSpace> = {
      ...far,
      steps: [
        ...far.steps,
        { wave: 2, build: 'fx_gun', tile: [11, 0] },
        { wave: 2, upgrade: [11, 0] },
        { wave: 2, upgrade: [11, 0] },
      ],
    };
    expect(errors(armorMap(farT3, WIDE))).toEqual([]);
    const nearT3 = { ...farT3, steps: [...farT3.steps, { wave: 2, upgrade: [1, 1] as const }] };
    expect(errors(armorMap(nearT3, WIDE))).toEqual([
      "[no-counter-build] maps.fx_map.noCounterBuilds.armor: uses fx_gun T3, which answers 'armor'",
    ]);
  });

  it('a no-armor build with its guns held at T2 validates (and compiles)', () => {
    expect(errors(armorMap(gunT2))).toEqual([]);
    expect(() => compileContent(armorMap(gunT2), rules())).not.toThrow();
  });

  it('[no-counter-build] a gun that reaches T3 is an armor answer', () => {
    const t3 = { ...gunT2, steps: [...gunT2.steps, { wave: 2, upgrade: [1, 1] as const }] };
    expect(errors(armorMap(t3))).toEqual([
      "[no-counter-build] maps.fx_map.noCounterBuilds.armor: uses fx_gun T3, which answers 'armor'",
    ]);
  });

  it('[no-counter-build] spec b answers; spec a does not', () => {
    const mortarT3 = [
      ...gunT2.steps,
      { wave: 2, upgrade: [3, 1] as const },
      { wave: 2, upgrade: [3, 1] as const },
    ];
    const spec = (s: 'a' | 'b'): ScriptedBuild<IdSpace> => ({
      ...gunT2,
      steps: [...mortarT3, { wave: 2, specialize: [3, 1], spec: s }],
    });
    expect(errors(armorMap(spec('a')))).toEqual([]);
    expect(errors(armorMap(spec('b')))).toEqual([
      "[no-counter-build] maps.fx_map.noCounterBuilds.armor: uses fx_mortar [b], which answers 'armor'",
    ]);
  });

  it('[no-counter-build] an answering ability counts only when cast', () => {
    // fx_strike is slot 1 here and cast in wave 2; a no-armor build that never casts it is fine.
    expect(errors(armorMap(gunT2), rules(['fx_strike']))).toEqual([
      "[no-counter-build] maps.fx_map.noCounterBuilds.armor: uses fx_strike, which answers 'armor'",
    ]);
    const quiet = { ...gunT2, steps: gunT2.steps.filter((s) => !('ability' in s)) };
    expect(errors(armorMap(quiet), rules(['fx_strike']))).toEqual([]);
    // Slot 2: Bricks's ability, cast or not.
    const withBricks = { companion: { id: 'bricks' as const, state: 'present' as const } };
    const slot2 = {
      ...quiet,
      steps: [...quiet.steps, { wave: 2, ability: 2 as const, target: [2, 2] as const }],
    };
    expect(errors(armorMap(quiet, withBricks), rules(['fx_suppress']))).toEqual([]);
    expect(errors(armorMap(slot2, withBricks), rules(['fx_suppress']))).toEqual([
      "[no-counter-build] maps.fx_map.noCounterBuilds.armor: uses fx_suppress, which answers 'armor'",
    ]);
  });

  it('[alt-builds] an alt build must reach an answer tier, not just carry the tower', () => {
    expect(errors(armorMap(gunT2, { altBuilds: { gun_t2: gunT2 } }))).toEqual([
      "[alt-builds] maps.fx_map.altBuilds.gun_t2: has no answer to required counter 'armor' (an alt build must not be a no-counter build)",
    ]);
  });
});
