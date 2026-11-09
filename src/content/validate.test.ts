// Content validation: the fixture is valid, and each rule has a fixture that breaks it. Every
// failing case goes through compileContent(), so it also proves invalid content can't compile.
import { describe, expect, it } from 'vitest';
import { FIXTURE, fxBuilds, fxMap } from './__fixtures__/content.ts';
import { compileContent } from './compile.ts';
import { mapDefinersFor } from './define.ts';
import { COUNTER_ANSWERS, COUNTER_CATEGORIES, TRAIT_COUNTER } from './rules.ts';
import type {
  AbilityDef,
  CounterId,
  EnemyDef,
  IdSpace,
  MapDef,
  RawContent,
  TowerDef,
  WaveTag,
} from './types.ts';
import { DEFAULT_VALIDATION_RULES, validate, type ValidationRules } from './validate.ts';
import { threatOf } from './validateThreats.ts';

const loose = mapDefinersFor<IdSpace>();
const BASE: RawContent<IdSpace> = FIXTURE;

function withMap(patch: Partial<MapDef<IdSpace>>): RawContent<IdSpace> {
  return { ...BASE, maps: { fx_map: loose.defineMap({ ...fxMap, ...patch }) } };
}
function withEnemy(id: 'fx_walker' | 'fx_runner', patch: Partial<EnemyDef>): RawContent<IdSpace> {
  return { ...BASE, enemies: { ...BASE.enemies, [id]: { ...FIXTURE.enemies[id], ...patch } } };
}
function withTower(def: TowerDef): RawContent<IdSpace> {
  return { ...BASE, towers: { ...BASE.towers, [def.id]: def } };
}
/** Answer lists naming the fixture towers, so counter rules can be exercised. */
function answers(over: Partial<Record<CounterId, readonly string[]>>): ValidationRules {
  const counterAnswers = { ...COUNTER_ANSWERS };
  for (const c of COUNTER_CATEGORIES) {
    const towers = over[c];
    if (towers !== undefined) {
      counterAnswers[c] = { towers: towers.map((tower) => ({ tower })), abilities: [] };
    }
  }
  return { counterAnswers };
}
function withTags(tags: readonly WaveTag[]): RawContent<IdSpace> {
  return withMap({
    waves: [{ groups: [{ enemy: 'fx_walker', count: 1, route: 'a', tags }] }, fxMap.waves[1]!],
  });
}
function withEvent(e: NonNullable<MapDef<IdSpace>['events']>[number]): RawContent<IdSpace> {
  return withMap({ events: [e] });
}
function withSteps(steps: typeof fxBuilds.parBuild.steps): RawContent<IdSpace> {
  return withMap({ parBuild: { ...fxBuilds.parBuild, steps } });
}
/** compileContent() must throw, and the message must name the rule. */
function rejects(raw: RawContent<IdSpace>, rule: string, rules?: ValidationRules): void {
  expect(() => compileContent(raw, rules)).toThrow(new RegExp(`\\[${rule}\\] `));
}

const gun = FIXTURE.towers.fx_gun;

describe('validate: valid content', () => {
  it('passes the fixture content', () => {
    expect(validate(FIXTURE)).toEqual([]);
  });

  it('maps every trait to a counter category or to intel-only (enemies.md § 3.1)', () => {
    expect(TRAIT_COUNTER.fast).toBeNull();
    expect(TRAIT_COUNTER.huddle).toBe('splash');
    expect(DEFAULT_VALIDATION_RULES.counterAnswers).toBe(COUNTER_ANSWERS);
  });

  it('computes the planning threat (maps.md § 6.2)', () => {
    // (20 + 1.5 × 10) × (1 + 0/10) × sqrt(2) × 1
    expect(threatOf(FIXTURE.enemies.fx_runner)).toBeCloseTo(35 * Math.SQRT2);
  });
});

describe('validate: entities', () => {
  it('[sprite-ref] a sprite of the wrong category', () => {
    rejects(
      withTower({ ...gun, sprites: { ...gun.sprites, base: 'enemy.nibbler' } }),
      'sprite-ref',
    );
  });

  it('[tower-range] out-of-range numbers on any resolved tier', () => {
    const [t1, t2] = gun.tiers;
    rejects(
      withTower({ ...gun, tiers: [t1, t2, { cost: 150, attack: { rangeTiles: -1 } }] }),
      'tower-range',
    );
    rejects(withTower({ ...gun, tiers: [{ ...t1, cost: 0 }, t2, gun.tiers[2]] }), 'tower-range');
    rejects(
      withTower({ ...gun, tiers: [{ ...t1, defaultPriority: null }, t2, gun.tiers[2]] }),
      'tower-range',
    );
    const s = FIXTURE.towers.fx_sprinkler;
    const overChill = { status: 'chilled', pct: 0.9, durationSec: 1 } as const;
    rejects(
      withTower({ ...s, tiers: [s.tiers[0], s.tiers[1], { cost: 1, effects: [overChill] }] }),
      'tower-range',
    );
  });

  it('[enemy-range] out-of-range enemy numbers', () => {
    rejects(withEnemy('fx_walker', { hp: 0 }), 'enemy-range');
    rejects(withEnemy('fx_walker', { leak: 1.5 }), 'enemy-range');
  });

  it('[enemy-traits] traits that disagree with the data, or a missing tell', () => {
    rejects(withEnemy('fx_walker', { armor: 2 }), 'enemy-traits');
    rejects(withEnemy('fx_walker', { layer: 'air' }), 'enemy-traits');
    rejects(withEnemy('fx_runner', { tells: ['shielded', 'regen'] }), 'enemy-traits');
    // A carrier's sack and its tell go together (the Brood Hauler).
    expect(
      validate(withEnemy('fx_walker', { carrier: { young: 3 }, tells: ['carrier'] })),
    ).toEqual([]);
    rejects(withEnemy('fx_walker', { carrier: { young: 3 } }), 'enemy-traits');
    rejects(withEnemy('fx_walker', { tells: ['carrier'] }), 'enemy-traits');
    rejects(withEnemy('fx_walker', { carrier: { young: 0 }, tells: ['carrier'] }), 'enemy-range');
  });

  it('[jammer-source] a jammer not on the exhaustive list', () => {
    rejects(withEnemy('fx_walker', { traits: ['jammer'], tells: ['disabler'] }), 'jammer-source');
  });

  it('[feature] bosses, until M3', () => {
    rejects(withEnemy('fx_walker', { tells: ['boss'] }), 'feature');
  });

  it('[ability-range] out-of-range ability numbers', () => {
    const strike: AbilityDef = FIXTURE.abilities.fx_strike;
    const raw = {
      ...BASE,
      abilities: { fx_strike: { ...strike, effect: { ...strike.effect, radiusTiles: 0 } } },
    };
    rejects(raw, 'ability-range');
    const suppress: AbilityDef = FIXTURE.abilities.fx_suppress;
    const withSegment = (patch: Record<string, number>): RawContent<IdSpace> => ({
      ...BASE,
      abilities: {
        ...BASE.abilities,
        fx_suppress: { ...suppress, effect: { ...suppress.effect, ...patch } },
      },
    });
    rejects(withSegment({ slowPct: 0.8 }), 'ability-range'); // over the chill cap
    rejects(withSegment({ lengthTiles: 2 }), 'ability-range'); // even: no center tile
    rejects(withSegment({ durationSec: 0 }), 'ability-range');
    rejects(withSegment({ damagePerSec: -1 }), 'ability-range');
  });

  it('[companion] one ability per companion', () => {
    const strike: AbilityDef = FIXTURE.abilities.fx_strike;
    rejects(
      { ...BASE, abilities: { ...BASE.abilities, fx_strike: { ...strike, companion: 'bricks' } } },
      'companion',
    );
  });

  it('[campaign] a map listed twice', () => {
    rejects({ ...BASE, campaign: ['fx_map', 'fx_map'] }, 'campaign');
  });
});

describe('validate: maps', () => {
  it('[feature] non-Defend objectives', () => {
    rejects(withMap({ objective: 'escort' }), 'feature');
  });

  it('[companion] every companion named has an ability; pick lists are non-empty and unique', () => {
    expect(validate(withMap({ companion: { id: 'bricks', state: 'present' } }))).toEqual([]);
    expect(validate(withMap({ companion: { pick: ['bricks'] } }))).toEqual([]);
    // An absent companion's slot is dark: it needs no ability.
    expect(validate(withMap({ companion: { id: 'zibzab', state: 'absent' } }))).toEqual([]);
    rejects(withMap({ companion: { id: 'zibzab', state: 'present' } }), 'companion');
    rejects(withMap({ companion: { pick: ['bricks', 'zibzab'] } }), 'companion');
    rejects(withMap({ companion: { pick: ['bricks', 'bricks'] } }), 'companion');
    rejects(withMap({ companion: { pick: [] } }), 'companion');
  });

  it('[ally] ally posts: a decor marker, sane numbers, one ally per post', () => {
    const attack = {
      type: 'kinetic',
      damage: 8,
      ratePerSec: 2,
      rangeTiles: 3,
      targets: { ground: true, air: true },
    } as const;
    const post = { kind: 'bricks', post: 'rock', attack } as const;
    expect(validate(withMap({ allies: [post] }))).toEqual([]);
    rejects(withMap({ allies: [post, { ...post, kind: 'militia' }] }), 'ally');
    rejects(
      withMap({
        markers: { rock: [0, 2], rock2: [1, 2] },
        allies: [post, { ...post, post: 'rock2' }],
      }),
      'ally',
    ); // Bricks twice
    rejects(withMap({ allies: [{ ...post, attack: { ...attack, ratePerSec: 0 } }] }), 'ally');
    rejects(withMap({ allies: [{ ...post, attack: { ...attack, rangeTiles: 0 } }] }), 'ally');
    rejects(
      withMap({
        allies: [{ ...post, attack: { ...attack, targets: { ground: false, air: false } } }],
      }),
      'ally',
    );
    // A post on the path breaks the marker rule; an unknown marker doesn't compile.
    rejects(withMap({ markers: { rock: [2, 1] }, allies: [post] }), 'marker');
    expect(() => compileContent(withMap({ allies: [{ ...post, post: 'nope' }] }))).toThrow(
      /allies\[0\]\.post: unknown marker 'nope'/,
    );
  });

  it('[map-range] start credits, integrity, Stardust', () => {
    rejects(withMap({ startCredits: -5 }), 'map-range');
    rejects(withMap({ coreIntegrity: 0 }), 'map-range');
  });

  it('[grid-span] a campaign map wider than one screen', () => {
    // 6 × 5 grid declared with a 40-column-wide size would fail compile, so widen every row.
    const tiles = fxMap.tiles.map((r) => r + '.'.repeat(30));
    rejects(withMap({ tiles, size: { cols: 36, rows: 5 } }), 'grid-span');
  });

  it('[core] a Defend map needs exactly one core', () => {
    rejects(withMap({ tiles: ['S##..C', '.o#o..', '..#^o.', '.o##x.', '...##C'] }), 'core');
  });

  it('[marker] markers sit off the path; ally posts and tile changes on decor (D042)', () => {
    // Any non-path tile: a pad, high ground, wreckage, or decor (A1M2's pump station).
    for (const pos of [
      [1, 1],
      [3, 2],
      [4, 3],
      [0, 1],
    ] as const) {
      expect(validate(withMap({ markers: { rock: pos } }))).toEqual([]);
    }
    rejects(withMap({ markers: { rock: [2, 1] } }), 'marker'); // path
    rejects(withMap({ markers: { rock: [0, 0] } }), 'marker'); // spawn
    rejects(withMap({ markers: { rock: [5, 4] } }), 'marker'); // core
    rejects(withMap({ markers: { rock: [9, 9] } }), 'marker'); // off the map
    // A marker an ally stands on, or a script opens, must be decor.
    const attack = {
      type: 'kinetic',
      damage: 8,
      ratePerSec: 2,
      rangeTiles: 3,
      targets: { ground: true, air: true },
    } as const;
    rejects(
      withMap({ markers: { rock: [1, 1] }, allies: [{ kind: 'bricks', post: 'rock', attack }] }),
      'marker',
    );
    rejects(
      withMap({
        markers: { rock: [1, 1] },
        events: [{ id: 'open', on: { wave: 1, phase: 'start' }, actions: [{ openTile: 'rock', to: 'o' }] }],
      }),
      'marker',
    );
  });

  it('[wreckage] what lies under it, and 30–80 salvage', () => {
    rejects(withMap({ salvage: { '4,3': 200 } }), 'wreckage');
    rejects(withMap({ underWreckage: {} }), 'wreckage');
    rejects(withMap({ underWreckage: { '4,3': '#' } }), 'wreckage');
    rejects(withMap({ salvage: { '4,3': 40, '1,1': 40 } }), 'wreckage');
  });

  it('[wave] no waves, empty waves, bad counts, and a wave-1 countdown', () => {
    expect(() => compileContent(withMap({ waves: [] }))).toThrow(
      /\[wave\] maps\.fx_map\.waves: a map needs at least one wave/,
    );
    rejects(withMap({ waves: [...fxMap.waves, { groups: [] }] }), 'wave');
    rejects(
      withMap({ waves: [{ countdownSec: 5, groups: fxMap.waves[0]!.groups }, fxMap.waves[1]!] }),
      'wave',
    );
    rejects(
      withMap({
        waves: [{ groups: [{ enemy: 'fx_walker', count: 0, route: 'a' }] }, fxMap.waves[1]!],
      }),
      'wave',
    );
  });

  it('[route-walk] a ground unit on an air lane', () => {
    rejects(
      withMap({
        waves: [{ groups: [{ enemy: 'fx_walker', count: 1, route: 'sky' }] }, fxMap.waves[1]!],
      }),
      'route-walk',
    );
  });

  it('[wave-tag] duplicate tags, and Skitterkin-only tags on others', () => {
    rejects(withTags(['fleeing', 'fleeing']), 'wave-tag');
    const raw = withTags(['fleeing']);
    rejects(
      {
        ...raw,
        enemies: { ...raw.enemies, fx_walker: { ...FIXTURE.enemies.fx_walker, faction: 'aelari' } },
      },
      'wave-tag',
    );
  });

  it('[threat-intel] must equal the traits in the waves', () => {
    rejects(withMap({ threatIntel: ['fast'] }), 'threat-intel');
    rejects(withMap({ threatIntel: ['fast', 'shielded', 'flying'] }), 'threat-intel');
  });

  it('[required-counters] at most 3, each with a no-counter build', () => {
    rejects(withMap({ requiredCounters: ['air'] }), 'required-counters');
    const nb = fxBuilds.parBuild;
    rejects(
      withMap({
        requiredCounters: ['air', 'armor', 'shield', 'splash'],
        noCounterBuilds: { air: nb, armor: nb, shield: nb, splash: nb },
      }),
      'required-counters',
      answers({ air: [], armor: [], shield: [], splash: [] }),
    );
  });

  it('[soft-traits] soft enemies over 15% of a wave', () => {
    const waves = [
      {
        groups: [
          { enemy: 'fx_walker', count: 3, route: 'a' },
          { enemy: 'fx_runner', count: 1, route: 'a' }, // shielded, and shield isn't required
        ],
      },
      fxMap.waves[1]!,
    ];
    rejects(withMap({ waves }), 'soft-traits');
    // A teach group's own threat is exempt.
    const taught = [
      { groups: [waves[0]!.groups[0]!, { ...waves[0]!.groups[1]!, teach: true }] },
      fxMap.waves[1]!,
    ];
    expect(validate(withMap({ waves: taught }))).toEqual([]);
  });

  it('[teach] a teach wave must bring a new trait', () => {
    rejects(
      withMap({ waves: [{ teach: true, groups: fxMap.waves[0]!.groups }, fxMap.waves[1]!] }),
      'teach',
    );
  });

  it('[new-threats] at most two new threats per campaign map', () => {
    const crawler: EnemyDef = { ...FIXTURE.enemies.fx_walker, id: 'fx_crawler' };
    const raw = withMap({
      waves: [
        { groups: [...fxMap.waves[0]!.groups, { enemy: 'fx_crawler', count: 1, route: 'a' }] },
        fxMap.waves[1]!,
      ],
    });
    rejects({ ...raw, enemies: { ...raw.enemies, fx_crawler: crawler } }, 'new-threats');
  });

  it('[new-counter] at most one new required-counter category per map', () => {
    const nb = fxBuilds.parBuild;
    rejects(
      withMap({ requiredCounters: ['shield', 'air'], noCounterBuilds: { shield: nb, air: nb } }),
      'new-counter',
      answers({ shield: [], air: [] }),
    );
  });

  it('[script] wave triggers, markers, objectives, forced inputs, and cue ids', () => {
    rejects(withEvent({ id: 'e', on: { wave: 3, phase: 'start' }, actions: [] }), 'script');
    rejects(withEvent({ id: 'e', on: { interacted: 'nowhere' }, actions: [] }), 'script');
    rejects(withEvent({ id: 'e', on: { objectiveCompleted: 'nope' }, actions: [] }), 'script');
    rejects(withEvent({ id: 'e', on: { forcedInputResolved: 'seal' }, actions: [] }), 'script');
    rejects(
      withEvent({ id: 'e', on: { wave: 1, phase: 'start' }, actions: [{ cue: 'a1_m01_w01' }] }),
      'script',
    );
    rejects(
      withEvent({ id: 'e', on: { wave: 1, phase: 'start' }, actions: [{ cue: 'fx_map_w2' }] }),
      'script',
    );
    rejects(
      withEvent({
        id: 'e',
        on: { wave: 1, phase: 'start' },
        actions: [{ openTile: 'x', to: 'x' }],
      }),
      'script',
    );
    for (const grantCredits of [0, -5, 2.5]) {
      rejects(
        withEvent({ id: 'e', on: { wave: 1, phase: 'start' }, actions: [{ grantCredits }] }),
        'script',
      );
    }
  });

  it('[flag-variants] a flag a script reads needs a variant entry', () => {
    const e = {
      id: 'e',
      on: { wave: 1, phase: 'start' },
      when: { flag: 'door_choice', eq: 'convoy' },
      actions: [],
    } as const;
    rejects(withMap({ events: [e] }), 'flag-variants');
    expect(
      validate(withMap({ events: [e], flagVariants: { door_choice: ['convoy', 'warren'] } })),
    ).toEqual([]);
  });

  it('[revisit] revisitOf names another map', () => {
    rejects(withMap({ revisitOf: 'fx_map' }), 'revisit');
  });
});

describe('validate: builds', () => {
  const par = fxBuilds.parBuild;
  const withPar = (patch: Partial<typeof par>): RawContent<IdSpace> =>
    withMap({ parBuild: { ...par, ...patch } });

  it('[profile] spec unlocks the profile can use', () => {
    const profile = { ...fxBuilds.referenceProfile, specs: ['fx_sprinkler'] };
    rejects(withMap({ referenceProfile: profile }), 'profile');
  });

  it('[loadout] at most 4, no duplicates, all from the profile', () => {
    rejects(withPar({ loadout: ['fx_gun', 'fx_gun'] }), 'loadout');
    rejects(withPar({ loadout: ['fx_gun', 'fx_sprinkler'] }), 'loadout');
  });

  it('[loadout] a build picks a companion only from a pick list', () => {
    rejects(withPar({ companion: 'bricks' }), 'loadout'); // the map has no companion
    const pick = (companion: 'bricks' | 'zibzab'): RawContent<IdSpace> =>
      withMap({ companion: { pick: ['bricks'] }, parBuild: { ...par, companion } });
    expect(validate(pick('bricks'))).toEqual([]);
    rejects(pick('zibzab'), 'loadout');
    rejects(
      withMap({
        companion: { id: 'bricks', state: 'present' },
        parBuild: { ...par, companion: 'bricks' },
      }),
      'loadout',
    );
  });

  it('[build-step] slot 2 needs a present companion or a pick', () => {
    const cast = [{ wave: 1, ability: 2, target: [2, 1] }] as const;
    rejects(withSteps(cast), 'build-step'); // no companion
    rejects(
      withMap({
        companion: { id: 'bricks', state: 'absent' },
        parBuild: { ...par, steps: cast },
      }),
      'build-step',
    );
    expect(
      validate(
        withMap({
          companion: { id: 'bricks', state: 'present' },
          parBuild: { ...par, steps: cast },
        }),
      ),
    ).toEqual([]);
  });

  it('[build-step] what each step means', () => {
    rejects(withSteps([{ wave: 1, build: 'fx_gun', tile: [2, 1] }]), 'build-step'); // a path tile
    rejects(withSteps([{ wave: 1, build: 'fx_gun', tile: [4, 3] }]), 'build-step'); // wreckage
    rejects(withSteps([{ wave: 1, build: 'fx_mortar', tile: [3, 1] }]), 'build-step'); // locked until W2
    rejects(withSteps([{ wave: 1, upgrade: [1, 1] }]), 'build-step'); // nothing built there
    rejects(
      withSteps([
        { wave: 2, build: 'fx_gun', tile: [1, 1] },
        { wave: 1, upgrade: [1, 1] },
      ]),
      'build-step',
    );
    rejects(withSteps([{ wave: 9, callWave: true }]), 'build-step');
    rejects(
      withSteps([
        { wave: 1, build: 'fx_gun', tile: [1, 1] },
        { wave: 1, upgrade: [1, 1] },
        { wave: 1, upgrade: [1, 1] },
        { wave: 1, upgrade: [1, 1] },
      ]),
      'build-step',
    );
    rejects(
      withSteps([
        { wave: 1, build: 'fx_gun', tile: [1, 1] },
        { wave: 1, specialize: [1, 1], spec: 'a' },
      ]),
      'build-step',
    );
    rejects(withSteps([{ wave: 1, ability: 2 }]), 'build-step');
    rejects(withSteps([{ wave: 1, clear: [1, 1] }]), 'build-step');
    rejects(withSteps([{ wave: 1, interact: 'nowhere' }]), 'build-step');
    rejects(withSteps([{ wave: 1, scriptInput: 'seal' }]), 'build-step');
    rejects(withSteps([{ wave: 1, holdFireWhile: 'quiet_wave' }]), 'build-step');
    // Wreckage is buildable once cleared.
    expect(
      validate(
        withSteps([
          { wave: 1, clear: [4, 3] },
          { wave: 1, build: 'fx_gun', tile: [4, 3] },
        ]),
      ),
    ).toEqual([]);
  });

  it('[no-counter-build] uses no tower that answers its category', () => {
    rejects(
      withMap({ requiredCounters: ['shield'], noCounterBuilds: { shield: par } }),
      'no-counter-build',
      answers({ shield: ['fx_gun'] }),
    );
  });

  it('[alt-builds] answer every required counter; at least 2 from A1M4', () => {
    rejects(
      withMap({
        requiredCounters: ['shield'],
        noCounterBuilds: { shield: { ...par, loadout: ['fx_mortar'], steps: [] } },
      }),
      'alt-builds',
      answers({ shield: ['fx_mortar'] }),
    );
    // The 4th campaign map needs 2 alt builds.
    const maps: Record<string, MapDef<IdSpace>> = {};
    for (const id of ['fx_m1', 'fx_m2', 'fx_m3', 'fx_m4']) maps[id] = { ...fxMap, id, events: [] };
    rejects({ ...BASE, maps, campaign: Object.keys(maps) }, 'alt-builds');
  });

  it('[builds-range] margin bands, flag variants, and alt build expectations', () => {
    rejects(withMap({ marginBand: { minPct: 80, maxPct: 60 } }), 'builds-range');
    rejects(withMap({ flagVariants: { door_choice: [] } }), 'builds-range');
    rejects(withMap({ altExpectations: { no_such_build: { belowPar: true } } }), 'builds-range');
    // 'toString' is on every object's prototype, never an own alt build.
    rejects(
      withMap({ altExpectations: { toString: { belowPar: true as const } } }),
      'builds-range',
    );
    rejects(withMap({ altExpectations: { gun_only: {} } }), 'builds-range');
    rejects(
      withMap({ altExpectations: { gun_only: { outcome: 'lose', minMarginPct: 40 } } }),
      'builds-range',
    );
    // The no-counter lose-by override: only with no-counter builds, a whole wave ≤ ⌈¾ × waves⌉.
    rejects(withMap({ noCounterLoseByWave: 1 }), 'builds-range'); // no no-counter builds
    for (const w of [0, 1.5, 99]) {
      expect(validate(withMap({ noCounterLoseByWave: w })).join('\n')).toMatch(
        /\[builds-range\] maps\.fx_map\.noCounterLoseByWave: must be a whole wave/,
      );
    }
  });
});
