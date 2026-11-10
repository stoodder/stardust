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
import { bestT3Reach, routePrefix, type TargetedTower } from './validateWaves.ts';

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
/** The entity rules' errors only (a fixture enemy's new trait also moves the map's threat rules). */
function entityErrors(raw: RawContent<IdSpace>): string[] {
  return validate(raw).filter((e) => /^\[(enemy|ability)-/.test(e));
}
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
    expect(validate(withEnemy('fx_walker', { carrier: { young: 3 }, tells: ['carrier'] }))).toEqual(
      [],
    );
    rejects(withEnemy('fx_walker', { carrier: { young: 3 } }), 'enemy-traits');
    rejects(withEnemy('fx_walker', { tells: ['carrier'] }), 'enemy-traits');
    rejects(withEnemy('fx_walker', { carrier: { young: 0 }, tells: ['carrier'] }), 'enemy-range');
  });

  it('[jammer-source] a jammer not on the exhaustive list', () => {
    rejects(withEnemy('fx_walker', { traits: ['jammer'], tells: ['disabler'] }), 'jammer-source');
  });

  it('[enemy-traits] M3 abilities and their traits go together (T300a)', () => {
    const burrow = { everySec: 6, durationSec: 2, speedMul: 1.5, tellSec: 0.8 };
    expect(
      entityErrors(withEnemy('fx_walker', { burrow, traits: ['burrowing'], tells: ['burrower'] })),
    ).toEqual([]);
    rejects(withEnemy('fx_walker', { burrow }), 'enemy-traits');
    rejects(withEnemy('fx_walker', { traits: ['splitting'], tells: ['splitter'] }), 'enemy-traits');
    rejects(
      withEnemy('fx_walker', { huddle: { radiusTiles: 1.5, regenPerSec: 4 } }),
      'enemy-traits',
    );
    rejects(withEnemy('fx_walker', { tells: ['boss'] }), 'enemy-traits'); // a boss tell, no `boss`
  });

  it('[enemy-ability] enemy abilities, bosses, and neutral units (T300a)', () => {
    const split = (enemy: string, count = 3): RawContent<IdSpace> =>
      withEnemy('fx_walker', {
        split: { enemy, count },
        traits: ['splitting'],
        tells: ['splitter'],
      });
    expect(entityErrors(split('fx_runner'))).toEqual([]);
    rejects(split('fx_nobody'), 'enemy-ability');
    rejects(split('fx_walker'), 'enemy-ability'); // itself
    rejects(split('fx_runner', 0), 'enemy-ability');
    const boss = (b: NonNullable<EnemyDef['boss']>, bounty = 0): RawContent<IdSpace> =>
      withEnemy('fx_walker', { boss: b, bounty, tells: ['boss'] });
    const phases = [
      { fromPct: 1, spawn: { enemy: 'fx_runner', count: 2, everySec: 5 } },
      { fromPct: 0.5, hastePct: 0.5 },
    ];
    expect(entityErrors(boss({ phases, ending: 'driveOff', endAtPct: 0 }))).toEqual([]);
    rejects(boss({ phases, ending: 'driveOff', endAtPct: 0 }, 3), 'enemy-ability'); // a bounty
    rejects(boss({ phases: [], ending: 'driveOff', endAtPct: 0 }), 'enemy-ability');
    const late = [phases[0]!, { fromPct: 1, hastePct: 0.5 }]; // phases must fall
    rejects(boss({ phases: late, ending: 'driveOff', endAtPct: 0 }), 'enemy-ability');
    rejects(boss({ phases, ending: 'retreat', endAtPct: 0.6 }), 'enemy-ability'); // above phase 2
    const neutral = { neutral: true, leak: 0, bounty: 0 } as const;
    expect(entityErrors(withEnemy('fx_walker', neutral))).toEqual([]);
    rejects(withEnemy('fx_walker', { ...neutral, leak: 1 }), 'enemy-ability');
    rejects(
      withEnemy('fx_runner', { ...neutral }), // fast and shielded: a threat, not neutral
      'enemy-ability',
    );
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
    // M3's untargeted effects and the wave-count cooldown (T300a).
    const withAbility = (over: Record<string, unknown>): RawContent<IdSpace> => ({
      ...BASE,
      abilities: { ...BASE.abilities, fx_strike: { ...strike, ...over } },
    });
    const slow = { kind: 'slowAll', slowPct: 0.4, bossSlowPct: 0.2, durationSec: 6 } as const;
    const sale = { kind: 'discount', pct: 0.4, charges: 3 } as const;
    expect(validate(withAbility({ effect: slow }))).toEqual([]);
    expect(
      validate(withAbility({ effect: sale, cooldownSec: undefined, cooldownWaves: 4 })),
    ).toEqual([]);
    rejects(withAbility({ effect: { ...slow, slowPct: 1 } }), 'ability-range');
    rejects(withAbility({ effect: { ...slow, durationSec: 0 } }), 'ability-range');
    rejects(withAbility({ effect: { ...sale, charges: 0 } }), 'ability-range');
    rejects(withAbility({ effect: { ...sale, pct: 0 } }), 'ability-range');
    rejects(withAbility({ cooldownSec: undefined, cooldownWaves: 1.5 }), 'ability-range');
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
  it('[feature] Holdout and Choir objectives (Escort is content since T500a)', () => {
    rejects(withMap({ objective: 'holdout' }), 'feature');
    rejects(withMap({ objective: 'choir' }), 'feature');
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

  it('[terraces] render-only terrace levels are shaped like the tiles, digits 0–3', () => {
    const ok = ['222222', '111111', '111000', '000000', '000000'];
    expect(validate(withMap({ terraces: ok }))).toEqual([]);
    rejects(withMap({ terraces: ok.slice(1) }), 'terraces'); // a row short
    rejects(withMap({ terraces: [...ok.slice(1), '00000'] }), 'terraces'); // a column short
    rejects(withMap({ terraces: [...ok.slice(1), '000004'] }), 'terraces'); // above 3
    rejects(withMap({ terraces: [...ok.slice(1), '0000a0'] }), 'terraces'); // not a digit
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
        events: [
          { id: 'open', on: { wave: 1, phase: 'start' }, actions: [{ openTile: 'rock', to: 'o' }] },
        ],
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

  it("[wave-tag] a flag rule's `except` tag needs its `tag` on that map's groups (D098)", () => {
    const rule = {
      onMapEnd: 'fx_map',
      value: { all: [{ tagRatio: { tag: 'fleeing', except: 'youngling', of: 'leaked', gte: 1 } }] },
    } as const;
    const rules: ValidationRules = { ...DEFAULT_VALIDATION_RULES, flagRules: [rule] };
    const tagErrors = (tags: readonly WaveTag[], r = rules): string[] =>
      validate(withTags(tags), r).filter((e) => e.startsWith('[wave-tag]'));
    rejects(withTags(['youngling']), 'wave-tag', rules);
    expect(tagErrors(['youngling']).join('\n')).toMatch(/'youngling' needs 'fleeing' too/);
    expect(tagErrors(['youngling', 'fleeing'])).toEqual([]);
    // Only the rule's own map is judged, and the live rules (A1M5's) leave fx_map alone.
    expect(
      tagErrors(['youngling'], { ...rules, flagRules: [{ ...rule, onMapEnd: 'a1_m05' }] }),
    ).toEqual([]);
    expect(tagErrors(['youngling'], DEFAULT_VALIDATION_RULES)).toEqual([]);
  });

  it('[fleeing-lead] a fleeing group spawns 2–4 s before a Hollow group on its route', () => {
    // fx_runner as a hushing Hollow unit; fx_walker flees ahead of it.
    const hollow = withEnemy('fx_runner', { faction: 'hollow', body: 'void' });
    const lead = (fleeAt: number, hollowAt: number, base = hollow): string[] =>
      validate({
        ...base,
        maps: {
          fx_map: loose.defineMap({
            ...fxMap,
            waves: [
              {
                groups: [
                  { enemy: 'fx_walker', count: 2, route: 'a', delaySec: fleeAt, tags: ['fleeing'] },
                  { enemy: 'fx_runner', count: 2, route: 'a', delaySec: hollowAt },
                ],
              },
              fxMap.waves[1]!,
            ],
          }),
        },
      }).filter((e) => e.startsWith('[fleeing-lead]'));
    expect(lead(0, 2)).toEqual([]);
    expect(lead(1, 5)).toEqual([]);
    expect(lead(0.5, 2.4)).toHaveLength(1);
    expect(lead(0, 4.5)).toHaveLength(1);
    expect(lead(3, 0).join('\n')).toMatch(/route 'a' \(it leads by -3 s\)/);
    // fx_map itself: no Hollow group behind its fleeing W2 group (a group never leads itself).
    expect(validate(hollow).filter((e) => e.startsWith('[fleeing-lead]'))).toEqual([]);
    // A gatherer (a Maw's one hush is a gather) sets no lead.
    const maw = withEnemy('fx_runner', { faction: 'hollow', body: 'void', traits: ['gathering'] });
    expect(lead(3, 0, maw)).toEqual([]);
  });

  it('[quiet-wave-reach] no pad reaches the first 4 tiles of a quiet_wave route (D097)', () => {
    // fx_map's pad (1,1) is 1 tile from the road's first tiles; fx_mortar's T3 reaches 3.5.
    rejects(withTags(['quiet_wave']), 'quiet-wave-reach');
    expect(validate(withTags(['quiet_wave'])).join('\n')).toMatch(/\(1,1\) is 1\.00 tiles/);
    // Only the tagged route's head is judged: the same group untagged is fine.
    expect(validate(withTags([])).filter((e) => e.includes('quiet-wave-reach'))).toEqual([]);
  });

  it('[quiet-wave-reach] reads the best T3 range per layer, and the route head by length', () => {
    const reach = bestT3Reach(Object.values<TargetedTower>(FIXTURE.towers));
    expect(reach.ground).toBeGreaterThan(0);
    expect(reach.air).toBeGreaterThan(0);
    expect(
      bestT3Reach([
        { tiers: [{ targets: { ground: false, air: true }, attack: { rangeTiles: 9 } }] },
      ]),
    ).toEqual({ ground: 0, air: 9 });
    expect(
      routePrefix(
        [
          [0, 0],
          [0, 1],
          [0, 2],
          [0, 3],
          [0, 9],
        ],
        3,
      ),
    ).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ]);
    expect(
      routePrefix(
        [
          [0, 0],
          [0, 10],
        ],
        3,
      ),
    ).toEqual([
      [0, 0],
      [0, 3],
    ]);
  });

  it("[wave] countdownAfter: 'bossEnded' needs a boss in an earlier wave", () => {
    rejects(
      withMap({ waves: [fxMap.waves[0]!, { ...fxMap.waves[1]!, countdownAfter: 'bossEnded' }] }),
      'wave',
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
    // A capstone boss built only from what's already taught is exempt (maps.md § 6.3, rule 2):
    // its traits are known and its phases bring no new unit. One with a new trait counts.
    const capstone: EnemyDef = {
      ...FIXTURE.enemies.fx_walker,
      id: 'fx_crawler',
      bounty: 0,
      tells: ['boss'],
      boss: { phases: [{ fromPct: 1, hastePct: 0.5 }], ending: 'driveOff', endAtPct: 0 },
    };
    // A boss in the waves brings the intel-only `boss` entry (D101).
    const bossRaw = withMap({
      waves: raw.maps.fx_map!.waves,
      threatIntel: [...fxMap.threatIntel, 'boss'],
    });
    expect(validate({ ...bossRaw, enemies: { ...raw.enemies, fx_crawler: capstone } })).toEqual([]);
    const preview: EnemyDef = {
      ...capstone,
      armor: 2,
      traits: ['armored'],
      tells: ['boss', 'armored'],
    };
    rejects({ ...raw, enemies: { ...raw.enemies, fx_crawler: preview } }, 'new-threats');
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

  it("[lighting] keys name the map's waves in rising order and leave its env or darken (T410a, T522)", () => {
    expect(validate(withMap({ lighting: [{ wave: 2, env: 'act2.dusk' }] }))).toEqual([]);
    rejects(withMap({ lighting: [] }), 'lighting');
    rejects(withMap({ lighting: [{ wave: 3, env: 'act2.dusk' }] }), 'lighting');
    rejects(withMap({ lighting: [{ wave: 0, env: 'act2.dusk' }] }), 'lighting');
    rejects(
      withMap({
        lighting: [
          { wave: 2, env: 'act2.gold' },
          { wave: 1, env: 'act2.dusk' },
        ],
      }),
      'lighting',
    );
    rejects(withMap({ lighting: [{ wave: 2, env: 'act1' }] }), 'lighting');
    // A Sundown schedule may stay on the map's env and only darken (A2M6; T522).
    expect(validate(withMap({ lighting: [{ wave: 2, env: 'act1', dark: 1 }] }))).toEqual([]);
    rejects(withMap({ lighting: [{ wave: 2, env: 'act1', dark: 0 }] }), 'lighting');
  });

  it("[dressing] a revisit's areas need a revisit; an area lies on the map; no layer twice (T410a)", () => {
    const all = { kind: 'greySoil', area: 'all' } as const;
    expect(validate(withMap({ dressing: [all] }))).toEqual([]);
    rejects(withMap({ dressing: [{ kind: 'greySoil', area: 'band' }] }), 'dressing');
    rejects(withMap({ dressing: [all, all] }), 'dressing');
    const area = (from: readonly [number, number], to: readonly [number, number]) =>
      withMap({ dressing: [{ kind: 'mineScar', area: { from, to } }] });
    expect(validate(area([4, 0], [5, 4]))).toEqual([]);
    rejects(area([4, 0], [6, 4]), 'dressing');
    rejects(area([5, 0], [4, 4]), 'dressing');
  });
});

/** Four campaign maps, each fx_map patched: the fourth is held to the A1M4+ alt-build rules. */
function campaignOf(patch: Partial<MapDef<IdSpace>>): RawContent<IdSpace> {
  const maps: Record<string, MapDef<IdSpace>> = {};
  for (const id of ['fx_m1', 'fx_m2', 'fx_m3', 'fx_m4']) {
    maps[id] = { ...fxMap, id, events: [], ...patch };
  }
  return { ...BASE, maps, campaign: Object.keys(maps) };
}
/** fx_map as the only campaign map, named `id`, with `runEndFlags`. */
function asMap(
  id: string,
  runs?: NonNullable<MapDef<IdSpace>['runEndFlags']>,
): RawContent<IdSpace> {
  const map = { ...fxMap, id, events: [], ...(runs === undefined ? {} : { runEndFlags: runs }) };
  return { ...BASE, maps: { [id]: map }, campaign: [id] };
}
/** The [run-end-flags] errors only (a renamed fixture map breaks other rules too). */
function runEndErrors(raw: RawContent<IdSpace>): string[] {
  return validate(raw).filter((e) => e.startsWith('[run-end-flags]'));
}

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

  it('[alt-builds] under-built alts (an outcome) do not count toward the 2 from A1M4 (T334)', () => {
    const gunOnly = fxBuilds.altBuilds!.gun_only!; // the fixture has it
    const twoAlts = { gun_only: gunOnly, gun_too: gunOnly };
    expect(validate(campaignOf({ altBuilds: twoAlts }))).toEqual([]);
    // One of the two is under-built: only one sensible alt is left.
    rejects(
      campaignOf({ altBuilds: twoAlts, altExpectations: { gun_too: { outcome: 'either' } } }),
      'alt-builds',
    );
    // An under-built alt beside two sensible ones is fine, even playing par's own towers.
    const noSpec = { ...fxBuilds.parBuild, steps: fxBuilds.parBuild.steps.slice(0, 3) };
    expect(
      validate(
        campaignOf({
          altBuilds: { ...twoAlts, par_short: noSpec },
          altExpectations: { par_short: { outcome: 'lose' } },
        }),
      ),
    ).toEqual([]);
  });

  it('[run-end-flags] names runs that exist, for a rule that ends on this map, and lists it', () => {
    // fx_map's W2 sends fleeing runners; it is no map a run-end rule ends on.
    rejects(
      withMap({
        runEndFlags: { held_fire_second_look: { setBy: ['holdFireWhile:fleeing'], notSetBy: [] } },
      }),
      'run-end-flags',
    );
    const ok = { setBy: ['holdFireWhile:fleeing'], notSetBy: ['par', 'spareFleeing'] } as const;
    expect(runEndErrors(asMap('a2_m03', { held_fire_second_look: ok }))).toEqual([]);
    // A campaign map lists every run-end rule that ends on it.
    rejects(asMap('a2_m03'), 'run-end-flags');
    for (const bad of [
      { setBy: [], notSetBy: ['par'] },
      { setBy: ['holdFireWhile:quiet_wave'], notSetBy: [] }, // no group carries it
      { setBy: ['alt:nope'], notSetBy: [] },
      { setBy: ['par'], notSetBy: ['par'] },
    ] as const) {
      rejects(asMap('a2_m03', { held_fire_second_look: bad }), 'run-end-flags');
    }
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
    // The no-counter lose-by override: only with no-counter builds, a whole wave before the final one.
    rejects(withMap({ noCounterLoseByWave: 1 }), 'builds-range'); // no no-counter builds
    for (const w of [0, 1.5, 99]) {
      expect(validate(withMap({ noCounterLoseByWave: w })).join('\n')).toMatch(
        /\[builds-range\] maps\.fx_map\.noCounterLoseByWave: must be a whole wave/,
      );
    }
  });
});
