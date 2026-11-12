// Endless's generator (sim/endless.ts; T861): the same seed gives the same run, and every seed's
// run keeps the rules (content/maps/end_m01/endless.ts): the budget rises every wave, each wave
// lands on it, blocks require ≤ 3 counters that rotate and some loadout answers, a block's units
// carry nothing outside it, spice stays under the soft cap and tells the next block, bosses come
// on their waves along the road, and every group walks a route it may.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { ENDLESS, type EndlessDef } from '../content/maps/end_m01/endless.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import {
  MAX_REQUIRED_COUNTERS,
  SOFT_THREAT_MAX_SHARE,
  COUNTER_CATEGORIES,
} from '../content/rules.ts';
import type { CompiledEnemyDef, CompiledRoute } from '../content/compiled.ts';
import type { CounterId } from '../content/types.ts';
import { threatOf } from '../content/validateThreats.ts';
import { ENEMIES } from '../content/enemies/index.ts';
import {
  BUDGET_BAND,
  BOSS_ESCORT_MIN_SHARE,
  answeringLoadout,
  bossCategories,
  categoriesOf,
  endlessBlockAt,
  endlessBudgets,
  endlessContent,
  endlessDefErrors,
  endlessPlan,
  endlessWavesHeld,
  threatWithBrood,
  unitThreat,
  type EndlessPlan,
} from './endless.ts';
import { createSim } from './sim.ts';

const content = compileContent(RAW_CONTENT);
const map = content.maps.end_m01;
/** The seeds the invariants run over. */
const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1).concat([0, 4_294_967_295, 123_456_789]);
const plans = new Map<number, EndlessPlan>(SEEDS.map((s) => [s, endlessPlan(ENDLESS, content, s)]));
/** Every compiled enemy and route by id (a plan names them as strings). */
const ENEMY = new Map<string, CompiledEnemyDef>(
  Object.values(content.enemies).map((e) => [e.id, e]),
);
const ROUTE = new Map<string, CompiledRoute>(map.routeList.map((r) => [r.id, r]));
const enemy = (id: string): CompiledEnemyDef => ENEMY.get(id)!;
const route = (id: string): CompiledRoute => ROUTE.get(id)!;
const cats = (id: string): Set<CounterId> => categoriesOf(enemy(id));
const within = (a: ReadonlySet<CounterId>, b: readonly CounterId[]): boolean =>
  [...a].every((c) => b.includes(c));

describe('the rules', () => {
  it('are valid against the content', () => {
    expect(endlessDefErrors(ENDLESS, content)).toEqual([]);
  });

  it('refuse what the generator cannot run', () => {
    const bad: EndlessDef = {
      ...ENDLESS,
      blockWaves: 4,
      growth: 1,
      roster: ['nibbler', 'chitterbloom'],
      bosses: ['nibbler'],
      countersPerBlock: [1, 4],
    };
    const errors = endlessDefErrors(bad, content).join('\n');
    expect(errors).toContain('warm-up is 5 waves');
    expect(errors).toContain('growth');
    expect(errors).toContain("'chitterbloom' is a boss");
    expect(errors).toContain("'nibbler' is not a boss");
    expect(errors).toContain('countersPerBlock starts with the warm-up');
    expect(errors).toContain('4 is not 0–3');
    expect(() => endlessPlan(bad, content, 1)).toThrow(RangeError);
  });

  it("draws from every enemy met in the campaign's waves but the neutral, bosses, and broods", () => {
    const met = new Set<string>();
    for (const id of content.campaign) {
      const m = content.maps[id];
      for (const w of m.waves) for (const g of w.groups) met.add(g.enemy.id);
      for (const g of Object.values(m.scriptGroups)) met.add(g.enemy.id);
    }
    const expected = [...met].filter((id) => {
      const e = enemy(id);
      return e.boss === null && !e.neutral;
    });
    expect([...ENDLESS.roster].toSorted()).toEqual(expected.toSorted());
  });

  it("measures a unit's threat as the content validator does", () => {
    for (const e of Object.values(ENEMIES)) {
      expect(unitThreat(content.enemies[e.id])).toBeCloseTo(threatOf(e), 9);
    }
  });
});

/** A short run's final hash on `seed`'s Endless content (a Zapcoil at the gate, W1 called). */
function hash(seed: number): string {
  const run = endlessContent(ENDLESS, content, seed).content;
  const sim = createSim({
    content: run,
    mapId: 'end_m01',
    seed,
    loadout: ['zapcoil'],
    companion: 'vesthara',
    modifiers: [],
    difficulty: 'standard',
    abilities: { slot1: null, slot2: 'stillness', slot2State: 'present' },
    scriptFlags: {},
    specsUnlocked: [],
  });
  sim.enqueue({ type: 'build', tile: [10, 9], tower: 'zapcoil' });
  sim.enqueue({ type: 'callWave' });
  for (let i = 0; i < 3000; i++) sim.step();
  return sim.hash();
}

describe('determinism', () => {
  it('gives the same run for the same seed, and another for another seed', () => {
    for (const seed of [1, 77, 4_294_967_295]) {
      expect(endlessPlan(ENDLESS, content, seed)).toEqual(
        plans.get(seed) ?? endlessPlan(ENDLESS, content, seed),
      );
    }
    const a = JSON.stringify(plans.get(1)!.waves);
    const b = JSON.stringify(plans.get(2)!.waves);
    expect(a).not.toBe(b);
  });

  it('runs the same sim for the same seed', () => {
    expect(hash(5)).toBe(hash(5));
  });
});

describe('the warm-up', () => {
  it('is the map as authored, on the threat curve within 5%', () => {
    const plan = plans.get(1)!;
    const budgets = endlessBudgets(ENDLESS, 5);
    for (let w = 0; w < 5; w++) {
      const wave = plan.waves[w]!;
      expect(wave.groups.every((g) => g.role === 'authored')).toBe(true);
      expect(wave.threat / budgets[w]!).toBeGreaterThan(0.95);
      expect(wave.threat / budgets[w]!).toBeLessThan(1.05);
    }
    expect(endlessPlan(ENDLESS, content, 1).compiled.slice(0, 5)).toEqual(map.waves);
  });
});

describe.each(SEEDS)('seed %i', (seed) => {
  const plan = plans.get(seed)!;
  const generated = plan.waves.slice(ENDLESS.blockWaves);

  it('raises the budget every wave, and the threat every wave without a boss', () => {
    expect(plan.waves).toHaveLength(ENDLESS.waves);
    let lastBudget = 0;
    let lastThreat = 0;
    for (const w of plan.waves) {
      expect(w.budget).toBeGreaterThan(lastBudget);
      lastBudget = w.budget;
      if (w.boss !== null) continue;
      expect(w.threat).toBeGreaterThan(lastThreat);
      lastThreat = w.threat;
    }
  });

  it('lands each generated wave on its budget (a boss wave above it)', () => {
    for (const w of generated) {
      expect(w.threat).toBeGreaterThanOrEqual(w.budget * BUDGET_BAND.below);
      if (w.boss === null)
        expect(w.threat).toBeLessThanOrEqual(w.budget * BUDGET_BAND.above * 1.05);
      else {
        const escort = w.groups
          .filter((g) => g.role !== 'boss')
          .reduce((a, g) => a + g.count * threatWithBrood(enemy(g.enemy), content.enemies), 0);
        expect(escort).toBeGreaterThanOrEqual(w.budget * BOSS_ESCORT_MIN_SHARE);
      }
    }
  });

  it('requires ≤ 3 counters a block, rotating, at most one new a block, each answerable', () => {
    const seen = new Set<CounterId>();
    const towers = Object.keys(content.towers);
    for (const b of plan.blocks.slice(1)) {
      expect(b.relaxed).toBe(false);
      expect(b.counters.length).toBeGreaterThan(0);
      expect(b.counters.length).toBeLessThanOrEqual(MAX_REQUIRED_COUNTERS);
      const boss =
        b.boss === null
          ? new Set<CounterId>()
          : bossCategories(content.enemies[b.boss], content.enemies);
      expect(within(boss, b.counters)).toBe(true);
      const fresh = b.counters.filter((c) => !seen.has(c));
      expect(fresh).toEqual(b.fresh);
      expect(fresh.length).toBeLessThanOrEqual(
        Math.max(1, [...boss].filter((c) => !seen.has(c)).length),
      );
      for (const c of b.counters) {
        if (!boss.has(c)) expect(ENDLESS.categoryFrom[c]).toBeLessThanOrEqual(b.index);
      }
      if (b.index >= 2) expect(b.counters).not.toEqual(plan.blocks[b.index - 1]!.counters);
      // Some four towers of the catalog answer the block, its boss's brood included.
      expect(answeringLoadout(b.counters, towers)).not.toBeNull();
      for (const c of b.counters) seen.add(c);
    }
    // Over a 60-wave run every category comes round.
    const by60 = new Set(plan.blocks.slice(0, 12).flatMap((b) => b.counters));
    expect(by60.size).toBeGreaterThanOrEqual(COUNTER_CATEGORIES.length - 1);
  });

  it("fills a block's waves with its counters only, each counter in every wave", () => {
    for (const w of generated) {
      const block = plan.blocks[w.block]!;
      const next = plan.blocks[w.block + 1];
      for (const g of w.groups) {
        const c = cats(g.enemy);
        if (g.role === 'spice') {
          expect(next).toBeDefined();
          expect(within(c, [...block.counters, ...next!.counters])).toBe(true);
          expect([...c].some((x) => !block.counters.includes(x))).toBe(true);
          expect(w.number).toBeGreaterThanOrEqual(block.lastWave - 1);
        } else if (g.role !== 'boss') {
          expect(within(c, block.counters)).toBe(true);
        }
      }
      for (const c of block.counters) {
        const demands = w.groups.some((g) => g.role !== 'spice' && cats(g.enemy).has(c));
        const bossBrings =
          w.boss !== null && bossCategories(enemy(w.boss), content.enemies).has(c);
        expect(demands || bossBrings).toBe(true);
      }
      expect(w.spiceThreat).toBeLessThanOrEqual(SOFT_THREAT_MAX_SHARE * w.threat + 1e-9);
    }
  });

  it('sends a boss on each boss wave, by the road, and holds the next wave for the fight', () => {
    const { compiled } = endlessPlan(ENDLESS, content, seed);
    const bossWaves = plan.waves.filter((w) => w.boss !== null).map((w) => w.number);
    const expected: number[] = [];
    for (let n = ENDLESS.firstBossWave; n <= ENDLESS.waves; n += ENDLESS.bossEvery)
      expected.push(n);
    expect(bossWaves).toEqual(expected);
    expect(plan.waves[ENDLESS.firstBossWave - 1]!.boss).toBe(ENDLESS.bosses[0]);
    for (const n of bossWaves) {
      const w = plan.waves[n - 1]!;
      const boss = w.groups.filter((g) => g.role === 'boss');
      expect(boss).toHaveLength(1);
      expect(route(boss[0]!.route).kind).toBe('path');
      expect(plan.blocks[w.block]!.boss).toBe(w.boss);
      if (n < ENDLESS.waves) expect(compiled[n]!.countdownAfter).toBe('bossEnded');
    }
    // No boss twice in a row.
    const order = bossWaves.map((n) => plan.waves[n - 1]!.boss);
    for (let i = 1; i < order.length; i++) expect(order[i]).not.toBe(order[i - 1]);
  });

  it('walks every group on a route it may take, spawning within the window', () => {
    for (const w of generated) {
      for (const g of w.groups) {
        const e = enemy(g.enemy);
        const r = route(g.route);
        expect(r).toBeDefined();
        if (e.layer === 'air') expect(r.kind).toBe('air');
        else expect(r.kind).not.toBe('air');
        if (r.kind === 'rift') {
          expect(e.faction).toBe('hollow');
          expect(w.number).toBeGreaterThanOrEqual(r.opensAtWave!);
        }
        expect(g.count).toBeGreaterThanOrEqual(1);
        expect(g.intervalTicks).toBeGreaterThanOrEqual(Math.round(ENDLESS.minIntervalSec * 60));
        expect((g.count - 1) * g.intervalTicks).toBeLessThanOrEqual(
          Math.max(
            ENDLESS.spawnWindowSec * 60,
            (g.count - 1) * Math.round(ENDLESS.minIntervalSec * 60),
          ),
        );
      }
    }
  });
});

describe('the run', () => {
  const { content: run, plan } = endlessContent(ENDLESS, content, 9);

  it("swaps in the seed's waves and intel, and nothing else", () => {
    const m = run.maps.end_m01;
    expect(m.waves).toHaveLength(ENDLESS.waves);
    expect(m.waves.map((w) => w.number)).toEqual(plan.waves.map((w) => w.number));
    expect(m.threatIntel).toContain('boss');
    expect(m.routes).toBe(map.routes);
    expect(run.maps.a1_m01).toBe(content.maps.a1_m01);
    expect(run.enemies).toBe(content.enemies);
    expect(content.maps.end_m01).toBe(map); // the content passed in is untouched
  });

  it('names the block each wave is in', () => {
    expect(endlessBlockAt(plan, 1)?.index).toBe(0);
    expect(endlessBlockAt(plan, 6)?.index).toBe(1);
    expect(endlessBlockAt(plan, 20)?.boss).toBe(ENDLESS.bosses[0]);
    expect(endlessBlockAt(plan, ENDLESS.waves + 1)).toBeNull();
  });

  it('scores the waves held: every wave resolved', () => {
    expect(endlessWavesHeld({ schedule: { resolved: [true, true, false, true] } })).toBe(3);
  });
});
