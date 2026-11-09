// The M1 content data (T105c) matches its design homes: towers (design/towers.md § 7), enemies
// (design/enemies.md § 5.1), and A1M1's waves, unlock, and builds (story/campaign/act1.md § A1M1).
import { describe, expect, it } from 'vitest';
import type { CompiledBuild, CompiledTier } from './compiled.ts';
import { compileContent } from './compile.ts';
import { RAW_CONTENT } from './registry.ts';
import { waveClearBonus } from './rules.ts';
import type { RawContent } from './types.ts';
import { validate } from './validate.ts';

const content = compileContent(RAW_CONTENT);
const { rivet, thumper, sprinkler } = content.towers;
const { nibbler, zoomer, chonk } = content.enemies;
const a1m1 = content.maps.a1_m01;

/** The parts of a tier the design tables list. */
function summary(t: CompiledTier): Record<string, unknown> {
  const a = t.attack;
  return {
    cost: t.cost,
    targets: t.targets,
    priority: t.defaultPriority,
    kind: a?.kind,
    type: a?.type,
    damage: a?.damage,
    cooldownTicks: a?.cooldownTicks,
    rangeTiles: a?.rangeTiles,
    minRangeTiles: a?.minRangeTiles,
    armorPierce: a?.armorPierce,
    splashTiles: a?.kind === 'lobbed' ? a.splashTiles : undefined,
    effects: t.effects,
  };
}

const chill = (pct: number): unknown[] => [{ status: 'chilled', pct, durationTicks: 90 }];

/** `enemy×count@intervalTicks+delayTicks` per group of a wave (0-based). */
const groupsOf = (w: number): string[] =>
  a1m1.waves[w]!.groups.map((g) => `${g.enemy.id}×${g.count}@${g.intervalTicks}+${g.delayTicks}`);
/** Clumps of `count` Nibblers `every` ticks apart, one per start delay (ticks). */
const clumps = (count: number, every: number, ...delays: number[]): string[] =>
  delays.map((d) => `nibbler×${count}@${every}+${d}`);

/** A build step as `W<wave> <kind> [tower] <tile>`. */
const stepOf = (s: CompiledBuild['steps'][number]): string =>
  [
    `W${s.wave}`,
    s.kind,
    'tower' in s ? s.tower : '',
    'tile' in s ? s.tile.join(',') : '',
    'target' in s && s.target !== null && s.target !== 'all' ? s.target.join(',') : '',
  ]
    .filter((x) => x !== '')
    .join(' ');

/** Credits wave `w` (0-based) pays if every enemy in it dies: bounties plus the clear bonus. */
const payout = (w: number): number =>
  a1m1.waves[w]!.groups.reduce((n, g) => n + g.count * g.enemy.bounty, 0) + waveClearBonus(w + 1);

/**
 * The bank at the start of each wave's build phase if every enemy dies and the build spends in
 * that phase. Throws if a phase's steps aren't affordable there.
 */
function banks(b: CompiledBuild): number[] {
  const tiers = new Map<string, number>();
  const towerAt = new Map<string, keyof typeof content.towers>();
  let bank = a1m1.startCredits;
  const out: number[] = [];
  for (let w = 1; w <= a1m1.waves.length; w++) {
    out.push(bank);
    for (const s of b.steps.filter((x) => x.wave === w)) {
      if (s.kind === 'build') {
        bank -= content.towers[s.tower].tiers[0].cost;
        towerAt.set(s.tile.join(','), s.tower);
        tiers.set(s.tile.join(','), 1);
      } else if (s.kind === 'upgrade') {
        const key = s.tile.join(',');
        const tier = tiers.get(key)!;
        bank -= content.towers[towerAt.get(key)!].tiers[tier]!.cost;
        tiers.set(key, tier + 1);
      }
      if (bank < 0) throw new Error(`wave ${w}: ${stepOf(s)} isn't affordable`);
    }
    bank += payout(w - 1);
  }
  return out;
}

/** Par's step list, with `splash` in the Thumper's place. */
const parList = (splash: string): string[] => [
  'W1 build rivet 7,2', // the greenhouse roof (high ground)
  'W1 build rivet 10,4',
  'W2 upgrade 7,2', // T2
  `W3 build ${splash} 10,5`, // the Crossfire pair
  'W5 upgrade 7,2', // T3
  'W5 ability 4,3',
  ...(splash === 'rivet' ? ['W6 upgrade 10,5'] : []), // par keeps the Thumper at T1 (T202a)
  'W6 upgrade 10,4',
  'W7 build rivet 3,4',
  'W7 ability 4,3',
];

describe('towers', () => {
  it('registers the three M1 Everglow towers', () => {
    expect(Object.keys(content.towers)).toEqual(['rivet', 'thumper', 'sprinkler']);
    for (const t of [rivet, thumper, sprinkler]) {
      expect(t.faction).toBe('everglow');
      expect(t.sprites).toEqual({
        base: `tower.${t.id}`,
        head: `tower.${t.id}_head`,
        icon: `icon.tower.${t.id}`,
      });
    }
    expect(sprinkler.specs).toBeNull(); // Flash Freeze and Cloudburst need Stasis (M3, D031)
  });

  it('Rivet: 8 → 11 kinetic hitscan at 2/s, then 2.5/s with armor pierce 3', () => {
    const ga = { ground: true, air: true };
    const base = { targets: ga, priority: 'first', kind: 'hitscan', type: 'kinetic' };
    const common = { ...base, rangeTiles: 3, minRangeTiles: 0, splashTiles: undefined };
    expect(rivet.tiers.map(summary)).toEqual([
      { ...common, cost: 100, damage: 8, cooldownTicks: 30, armorPierce: 0, effects: [] },
      { ...common, cost: 80, damage: 11, cooldownTicks: 30, armorPierce: 0, effects: [] },
      { ...common, cost: 150, damage: 11, cooldownTicks: 24, armorPierce: 3, effects: [] },
    ]);
  });

  it('Rivet specs: Rivet Storm (7.5/s after a 1 s spin-up) and Railspike (ignores armor)', () => {
    const storm = rivet.specs!.a; // rivet has specs (asserted by the names below)
    const rail = rivet.specs!.b;
    expect([storm.name, rail.name]).toEqual(['Rivet Storm', 'Railspike']);
    expect([storm.tier, rail.tier]).toEqual([4, 4]);
    const ga = { ground: true, air: true };
    const base = { targets: ga, kind: 'hitscan', type: 'kinetic', minRangeTiles: 0, effects: [] };
    expect(summary(storm)).toEqual({
      ...base,
      cost: 300,
      priority: 'first',
      damage: 9,
      cooldownTicks: 8,
      rangeTiles: 3,
      armorPierce: 0,
      splashTiles: undefined,
    });
    expect(storm.attack).toMatchObject({ spinUpTicks: 60, ignoresArmor: false });
    expect(summary(rail)).toEqual({
      ...base,
      cost: 300,
      priority: 'strong',
      damage: 120,
      cooldownTicks: 120,
      rangeTiles: 6,
      armorPierce: 3,
      splashTiles: undefined,
    });
    expect(rail.attack).toMatchObject({ ignoresArmor: true, spinUpTicks: 0 });
  });

  it('Thumper specs: Cluster Thumper (4 bomblets) and Bunker Buster (3 Corroded stacks)', () => {
    const cluster = thumper.specs!.a; // thumper has specs (asserted by the names below)
    const buster = thumper.specs!.b;
    expect([cluster.name, buster.name]).toEqual(['Cluster Thumper', 'Bunker Buster']);
    const base = {
      targets: { ground: true, air: false },
      priority: 'first',
      kind: 'lobbed',
      type: 'explosive',
      rangeTiles: 3.5,
      minRangeTiles: 1,
      armorPierce: 0,
    };
    expect(summary(cluster)).toEqual({
      ...base,
      cost: 375,
      damage: 30,
      cooldownTicks: 100,
      splashTiles: 1.2,
      effects: [],
    });
    expect(cluster.attack).toMatchObject({
      flightTicks: 48,
      lead: true,
      bomblets: {
        count: 4,
        damage: 12,
        splashTiles: 0.6,
        scatterTiles: 1.2,
        flightTicks: 18,
        projectile: 'projectile.thumper_bomblet',
      },
    });
    expect(summary(buster)).toEqual({
      ...base,
      cost: 375,
      damage: 140,
      cooldownTicks: 150,
      splashTiles: 0.6,
      effects: [{ status: 'corroded', stacks: 3, maxStacks: 3 }],
    });
    expect(buster.attack).toMatchObject({ bomblets: null, flightTicks: 48, lead: true });
  });

  it('Thumper: lobbed, lead-targeted explosive splash, ground only', () => {
    const common = {
      targets: { ground: true, air: false },
      priority: 'first',
      kind: 'lobbed',
      type: 'explosive',
      rangeTiles: 3.5,
      minRangeTiles: 1,
      armorPierce: 0,
      effects: [],
    };
    expect(thumper.tiers.map(summary)).toEqual([
      { ...common, cost: 125, damage: 20, cooldownTicks: 120, splashTiles: 0.9 },
      { ...common, cost: 100, damage: 30, cooldownTicks: 120, splashTiles: 0.9 },
      { ...common, cost: 190, damage: 30, cooldownTicks: 100, splashTiles: 1.2 },
    ]);
    for (const t of thumper.tiers) {
      expect(t.attack).toMatchObject({
        flightTicks: 48,
        lead: true,
        projectile: 'projectile.thumper_shell',
      });
    }
  });

  it('Sprinkler: a 1 s pulse that chills 25% → 30% → 35% (Chilled only in M1)', () => {
    const common = {
      targets: { ground: true, air: false },
      priority: null,
      kind: 'pulse',
      type: 'kinetic',
      damage: 2,
      cooldownTicks: 60,
      minRangeTiles: 0,
      armorPierce: 0,
      splashTiles: undefined,
    };
    expect(sprinkler.tiers.map(summary)).toEqual([
      { ...common, cost: 90, rangeTiles: 2, effects: chill(0.25) },
      { ...common, cost: 70, rangeTiles: 2.3, effects: chill(0.3) },
      { ...common, cost: 135, rangeTiles: 2.3, effects: chill(0.35) },
    ]);
  });
});

describe('enemies', () => {
  it('registers the three M1 Skitterkin', () => {
    expect(Object.keys(content.enemies)).toEqual(['nibbler', 'zoomer', 'chonk']);
    for (const e of [nibbler, zoomer, chonk]) {
      expect(e).toMatchObject({ faction: 'skitterkin', body: 'organic', layer: 'ground' });
      expect(e.shield).toBeNull();
      expect(e.sprites).toEqual({ body: `enemy.${e.id}`, icon: `icon.enemy.${e.id}` });
    }
  });

  it('has the roster numbers (enemies.md § 5.1), at 60 ticks per second', () => {
    const row = (e: typeof nibbler): unknown => ({
      hp: e.hp,
      armor: e.armor,
      speed: e.speedTilesPerTick * 60,
      leak: e.leak,
      bounty: e.bounty,
      spawnIntervalTicks: e.spawnIntervalTicks,
      traits: e.traits,
      tells: e.tells,
    });
    expect(row(nibbler)).toEqual({
      hp: 30,
      armor: 0,
      speed: 1,
      leak: 1,
      bounty: 3,
      spawnIntervalTicks: 48,
      traits: [],
      tells: [],
    });
    expect(row(zoomer)).toEqual({
      hp: 20,
      armor: 0,
      speed: 2,
      leak: 1,
      bounty: 4,
      spawnIntervalTicks: 30,
      traits: ['fast'],
      tells: ['fast'],
    });
    expect(row(chonk)).toMatchObject({
      hp: 180,
      armor: 2,
      leak: 2,
      bounty: 12,
      spawnIntervalTicks: 90,
      traits: ['armored'],
      tells: ['armored'],
    });
    expect(chonk.speedTilesPerTick * 60).toBeCloseTo(0.6, 9);
  });
});

describe('A1M1 waves', () => {
  it('has seven waves with the documented totals, all on the road', () => {
    expect(a1m1.waves.map((w) => w.groups.reduce((n, g) => n + g.count, 0))).toEqual([
      8, 10, 12, 18, 30, 36, 60,
    ]);
    for (const w of a1m1.waves) {
      expect(w.teach).toBe(false);
      for (const g of w.groups) expect(g.route.id).toBe('road');
    }
  });

  it('spaces groups as the wave table says (clumps of 4, 6, and 8; Zoomer groups)', () => {
    expect(groupsOf(0)).toEqual(['nibbler×8@39+0']);
    expect(groupsOf(1)).toEqual(['nibbler×10@48+0']);
    expect(groupsOf(2)).toEqual(clumps(4, 15, 0, 225, 450));
    expect(groupsOf(3)).toEqual(['zoomer×12@30+0', ...clumps(6, 12, 180)]);
    expect(groupsOf(4)).toEqual([...clumps(4, 12, 0, 300, 600, 900), 'zoomer×14@12+60']);
    expect(groupsOf(5)).toEqual(['zoomer×24@30+0', ...clumps(6, 15, 120, 345)]);
    expect(groupsOf(6)).toEqual([
      ...clumps(8, 12, 0, 120, 240, 360),
      'zoomer×14@18+0',
      'zoomer×14@18+390',
    ]);
  });

  it('uses the Act I 25 s countdown between waves', () => {
    for (const w of a1m1.waves.slice(1)) expect(w.countdownTicks).toBe(25 * 60);
  });

  it('lists exactly the traits in its waves as threat intel, and requires no counters', () => {
    const traits = new Set(a1m1.waves.flatMap((w) => w.groups.flatMap((g) => g.enemy.traits)));
    expect([...traits]).toEqual(a1m1.threatIntel);
    expect(a1m1.requiredCounters).toEqual([]);
    expect(a1m1.builds.noCounterBuilds).toEqual({});
  });

  it('places neither the Sprinkler nor the Chonk (sim-tested content only, D004)', () => {
    const enemies = new Set(a1m1.waves.flatMap((w) => w.groups.map((g) => g.enemy.id)));
    expect([...enemies].toSorted()).toEqual(['nibbler', 'zoomer']);
    expect(a1m1.builds.referenceProfile.towers).not.toContain('sprinkler');
  });
});

describe('A1M1 Thumper unlock', () => {
  it("holds the Thumper back until W3's countdown starts", () => {
    expect(a1m1.lockedTowersAtStart).toEqual(['thumper']);
    expect(a1m1.events[0]).toMatchObject({
      on: { wave: 3, phase: 'countdown' },
      actions: [{ unlockTowerClass: 'thumper' }],
      once: true,
    });
  });
});

describe('A1M1 builds', () => {
  it('owns the issued kit and nothing else (campaign.md § 4.9)', () => {
    expect(a1m1.builds.referenceProfile).toEqual({
      towers: ['rivet', 'thumper'],
      specs: [],
      shop: {},
      protocols: [],
      technicianAbility: 'orbital_strike',
    });
  });

  it('par: the documented step list, affordable in every build phase', () => {
    const par = a1m1.builds.parBuild;
    expect(par.loadout).toEqual(['rivet', 'thumper']);
    expect(par.callEarly).toBe(false);
    expect(par.steps.map(stepOf)).toEqual(parList('thumper'));
    for (const s of par.steps.filter((x) => x.kind === 'ability')) {
      expect(s).toMatchObject({ slot: 1, target: [4, 3], when: { afterTicks: 144 } });
    }
    // The economy builds.ts describes (par leaks nothing until T125 re-tunes A1M1 for links):
    // W4's phase buys nothing, saving for the roof's tier 3.
    expect(banks(par)).toEqual([350, 198, 176, 119, 221, 215, 311]);
  });

  it('rivet_only: par with the Thumper swapped for a Rivet, affordable too', () => {
    const alt = a1m1.builds.altBuilds.rivet_only!;
    expect(alt.loadout).toEqual(['rivet']);
    expect(alt.steps.map(stepOf)).toEqual(parList('rivet'));
    expect(() => banks(alt)).not.toThrow();
  });

  it('par_minus_last: par without its last purchase (the W7 Rivet)', () => {
    const alt = a1m1.builds.altBuilds.par_minus_last!;
    expect(alt.loadout).toEqual(['rivet', 'thumper']);
    expect(alt.steps.map(stepOf)).toEqual(
      parList('thumper').filter((s) => s !== 'W7 build rivet 3,4'),
    );
  });

  it('no_upgrades and two_rivets: the under-built players (D028)', () => {
    const noUpgrades = a1m1.builds.altBuilds.no_upgrades!;
    expect(noUpgrades.loadout).toEqual(['rivet', 'thumper']);
    expect(noUpgrades.steps.map(stepOf)).toEqual(
      parList('thumper').filter((s) => !s.includes('upgrade')),
    );
    const two = a1m1.builds.altBuilds.two_rivets!;
    expect(two.loadout).toEqual(['rivet']);
    expect(two.steps.map(stepOf)).toEqual(parList('thumper').slice(0, 2));
  });

  it('expects rivet_only below par, both sensible alts at ≥ 40%, and the under-built alts (D026, D028)', () => {
    expect(a1m1.builds.altExpectations).toEqual({
      rivet_only: { belowPar: true, minMarginPct: 40 },
      par_minus_last: { minMarginPct: 40 },
      no_upgrades: { outcome: 'either' },
      two_rivets: { outcome: 'lose' },
    });
  });
});

describe('the validator on A1M1', () => {
  it('checks threat intel against the waves (no stub-map exemption)', () => {
    const noWaves: RawContent = {
      ...RAW_CONTENT,
      maps: { a1_m01: { ...RAW_CONTENT.maps.a1_m01, waves: [] } },
    };
    expect(validate(noWaves)).toContainEqual(
      expect.stringMatching(/^\[threat-intel\] maps\.a1_m01\.threatIntel: lists fast/),
    );
  });
});
