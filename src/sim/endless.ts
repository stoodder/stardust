// Endless mode's wave generator (design/maps.md § 8; T861). Pure and seeded: the same seed gives
// the same run, so a run can be shared by its seed. It runs once, before the run, and hands the
// sim an ordinary compiled map whose waves are the plan's (`endlessContent`), so the tick loop is
// the campaign's, untouched: nothing here runs per tick and nothing allocates there.
//
// The rules are content (`ENDLESS`, src/content/maps/end_m01/endless.ts, whose header says them in
// short); this file applies them:
// - **Budget.** Wave w's threat budget is `firstWaveThreat × growth^(w−1)` (maps.md § 6.2's threat,
//   counting what a splitter's death releases: `threatWithBrood`), multiplied up wave by wave (no
//   Math.pow in sim code). Each generated wave lands within `BUDGET_BAND` of its budget (topped up
//   with the block's plain units when its own are coarse), and each wave without a boss carries
//   more threat than the one before without a boss: escalation is strictly monotone. A boss wave
//   is a spike: its boss, on the road, plus an escort of at least half the budget.
// - **Blocks.** Block 0 is the map's authored warm-up. Each later block draws its required counters
//   (`EndlessBlock.counters`, ≤ 3) from every set the rules allow, weighted toward the categories
//   the run hasn't met for longest, so blocks rotate through all seven and a loadout that skips
//   one meets it sooner or later. A block's core units carry no category outside the block, and
//   every category in it has a unit that demands it (`witnessed`); a block never repeats the one
//   before, and brings at most one category the run hasn't met yet (a boss may bring its own).
//   `answeringLoadout` finds four towers that answer a block.
// - **Waves.** One featured group per required counter (a unit demanding it), sometimes a filler
//   group from the block's core, the boss on a boss wave, and in a block's last two waves a spice
//   group (≤ SOFT_THREAT_MAX_SHARE of the wave) from the next block's new category: the shift is
//   telegraphed on the field as well as in the HUD's preview (`endlessBlockAt`). A group's unit is
//   drawn among those a group of 3–`maxGroupCount` fits, the heavier likelier, so waves grow in
//   weight more than in numbers. Ground Hollow take the road or an open rift lane; flyers an air
//   lane; everything else the road. Each wave draws from its own RNG stream (`wave:<n>`).
// - **Score.** A run's score is the waves it held (`endlessWavesHeld`): waves fully resolved
//   before the core fell. The save keeps one best record per seed (meta/endless.ts).
import type {
  CompiledContent,
  CompiledEnemyDef,
  CompiledMapDef,
  CompiledRoute,
  CompiledWave,
  CompiledWaveGroup,
} from '../content/compiled.ts';
import type { EndlessDef } from '../content/maps/end_m01/endless.ts';
import {
  COUNTER_ANSWERS,
  COUNTER_CATEGORIES,
  DEFAULT_COUNTDOWN_SEC,
  MAX_LOADOUT,
  MAX_REQUIRED_COUNTERS,
  SOFT_THREAT_MAX_SHARE,
  THREAT_ARMOR_DIVISOR,
  THREAT_AURA_FACTOR,
  THREAT_AURA_TRAITS,
  THREAT_SHIELD_WEIGHT,
  THREAT_TRAIT_FACTOR,
  TRAIT_COUNTER,
} from '../content/rules.ts';
import type { CounterId, EnemyId, ThreatIntelId } from '../content/types.ts';
import { createRng, forkRng, nextInt, type Rng } from '../shared/rng.ts';
import { TICK_HZ, secToTicks } from '../shared/time.ts';
import type { SimState } from './state.ts';

/** A generated wave lands within this share of its budget (below, above). */
export const BUDGET_BAND = { below: 0.95, above: 1.15 } as const;
/** A boss wave's escort is at least this share of its budget. */
export const BOSS_ESCORT_MIN_SHARE = 0.5;
/** A spice group aims at this share of its wave's budget (the cap is SOFT_THREAT_MAX_SHARE). */
const SPICE_SHARE = 0.12;
/** A featured group's share of the wave against a filler group's. */
const FILLER_WEIGHT = 0.6;
/** The most blocks a category's staleness counts for (unmet categories count this much). */
const MAX_AGE = 4;
/** A top-up whose unit is over this share of the budget fills with plain units instead. */
const TOP_UP_GRAIN = 0.04;
/** A group aims at no fewer units than this when a unit fits (fewer reads as a stray). */
const MIN_GROUP_COUNT = 3;

/** One counter block of a run. */
export interface EndlessBlock {
  /** 0 is the warm-up. */
  readonly index: number;
  readonly firstWave: number;
  readonly lastWave: number;
  /** Its required counters, in COUNTER_CATEGORIES order (none for the warm-up). */
  readonly counters: readonly CounterId[];
  /** The boss on its boss wave, or null. */
  readonly boss: EnemyId | null;
  /** Categories it brings that the run hadn't required before. */
  readonly fresh: readonly CounterId[];
  /** Whether the draw had to drop a rule to find a set (never, with ENDLESS; the tests hold it). */
  readonly relaxed: boolean;
}

/** One group of a planned wave. */
export interface EndlessGroup {
  readonly enemy: string;
  readonly count: number;
  readonly route: string;
  readonly intervalTicks: number;
  readonly delayTicks: number;
  /** What it is for: a block counter's (featured), the block's core (filler), the boss, or spice. */
  readonly role: 'authored' | 'featured' | 'filler' | 'boss' | 'spice';
}

/** One planned wave. */
export interface EndlessWave {
  readonly number: number;
  readonly block: number;
  /** Its threat budget (maps.md § 6.2). */
  readonly budget: number;
  /** The threat it carries (`unitThreat` × count, every group). */
  readonly threat: number;
  /** The share of `threat` that is spice. */
  readonly spiceThreat: number;
  readonly boss: string | null;
  readonly groups: readonly EndlessGroup[];
}

/** A seed's whole run. */
export interface EndlessPlan {
  readonly seed: number;
  readonly blocks: readonly EndlessBlock[];
  readonly waves: readonly EndlessWave[];
}

/** The counter categories `traits` demand (intel-only traits demand none). */
export function categoriesOf(def: Pick<CompiledEnemyDef, 'traits'>): Set<CounterId> {
  const out = new Set<CounterId>();
  for (const t of def.traits) {
    const c = TRAIT_COUNTER[t];
    if (c !== null) out.add(c);
  }
  return out;
}

/**
 * A unit's planning threat (maps.md § 6.2), from its compiled def: the content validator's
 * `threatOf` (validateThreats.ts) on the same numbers, so the budget and the soft-trait cap agree.
 */
export function unitThreat(def: CompiledEnemyDef): number {
  let factor = 1;
  for (const t of def.traits) factor *= THREAT_TRAIT_FACTOR[t] ?? 1;
  if (def.traits.some((t) => THREAT_AURA_TRAITS.includes(t))) factor *= THREAT_AURA_FACTOR;
  return (
    (def.hp + THREAT_SHIELD_WEIGHT * (def.shield?.hp ?? 0)) *
    (1 + def.armor / THREAT_ARMOR_DIVISOR) *
    Math.sqrt(def.speedTilesPerTick * TICK_HZ) *
    factor
  );
}

/**
 * A unit's threat with what its death releases (maps.md § 6.2: "splitting: add the children's
 * threat"), the generator's budget unit: a Fracture is its 190 and its two Shards' and their four
 * Motes'. (The content validator's soft-trait share counts the parent alone: `unitThreat`.)
 */
export function threatWithBrood(
  def: CompiledEnemyDef,
  enemies: Readonly<Record<string, CompiledEnemyDef>>,
): number {
  let out = unitThreat(def);
  const child = def.split === null ? undefined : enemies[def.split.enemy];
  if (def.split !== null && child !== undefined && child !== def) {
    out += def.split.count * threatWithBrood(child, enemies);
  }
  return out;
}

/** What a boss and its brood demand: its traits', and those of every unit its phases bring. */
export function bossCategories(
  def: CompiledEnemyDef,
  enemies: Readonly<Record<string, CompiledEnemyDef>>,
): Set<CounterId> {
  const out = categoriesOf(def);
  const add = (id: string | undefined): void => {
    const e = id === undefined ? undefined : enemies[id];
    if (e !== undefined) for (const c of categoriesOf(e)) out.add(c);
  };
  for (const p of def.boss?.phases ?? []) {
    add(p.spawn?.enemy);
    add(p.burrow?.surfaceSpawn?.enemy);
    add(p.shards?.enemy);
    add(p.hangar?.enemy);
    add(p.adds?.enemy);
    add(p.split?.part);
  }
  return out;
}

/** Wave w's budget for every wave 1..n (index w − 1), multiplied up wave by wave. */
export function endlessBudgets(def: EndlessDef, n: number): number[] {
  const out: number[] = [];
  let b = def.firstWaveThreat;
  for (let w = 1; w <= n; w++) {
    out.push(b);
    b *= def.growth;
  }
  return out;
}

/** What `endlessPlan` reads of the content. */
interface Ctx {
  readonly def: EndlessDef;
  readonly enemies: CompiledContent['enemies'];
  readonly map: CompiledMapDef;
  readonly roster: readonly CompiledEnemyDef<EnemyId>[];
  readonly threat: ReadonlyMap<string, number>;
  readonly cats: ReadonlyMap<string, ReadonlySet<CounterId>>;
}

/** The problems with `def` against `content` (empty: none). `endlessPlan` throws on any. */
export function endlessDefErrors(
  def: EndlessDef,
  content: Pick<CompiledContent, 'enemies' | 'maps'>,
): string[] {
  const out: string[] = [];
  const map = Object.hasOwn(content.maps, def.map) ? content.maps[def.map] : undefined;
  if (map === undefined) return [`unknown map '${def.map}'`];
  if (!Number.isInteger(def.blockWaves) || def.blockWaves < 1) {
    out.push(`blockWaves must be a whole number ≥ 1 (got ${def.blockWaves})`);
  }
  if (map.waves.length !== def.blockWaves) {
    out.push(
      `the map's authored warm-up is ${map.waves.length} waves; a block is ${def.blockWaves}`,
    );
  }
  if (!Number.isInteger(def.waves) || def.waves <= map.waves.length) {
    out.push(`waves must be a whole number above the warm-up's ${map.waves.length}`);
  }
  if (!(def.growth > 1)) out.push(`growth must be above 1 (got ${def.growth})`);
  if (!(def.firstWaveThreat > 0)) out.push('firstWaveThreat must be above 0');
  if (def.bossEvery % def.blockWaves !== 0 || def.firstBossWave % def.blockWaves !== 0) {
    out.push(`bossEvery and firstBossWave must be whole numbers of blocks (${def.blockWaves})`);
  }
  if (!(def.firstBossWave > def.blockWaves)) out.push('firstBossWave must be after the warm-up');
  if (def.countersPerBlock.length === 0 || def.countersPerBlock[0] !== 0) {
    out.push('countersPerBlock starts with the warm-up, which requires none (0)');
  }
  for (const n of def.countersPerBlock) {
    if (!Number.isInteger(n) || n < 0 || n > MAX_REQUIRED_COUNTERS) {
      out.push(`countersPerBlock: ${n} is not 0–${MAX_REQUIRED_COUNTERS}`);
    }
  }
  for (const id of def.roster) {
    const e = Object.hasOwn(content.enemies, id) ? content.enemies[id] : undefined;
    if (e === undefined) out.push(`roster: unknown enemy '${id}'`);
    else if (e.boss !== null) out.push(`roster: '${id}' is a boss`);
  }
  if (def.bosses.length === 0) out.push('bosses: none');
  for (const id of def.bosses) {
    const e = Object.hasOwn(content.enemies, id) ? content.enemies[id] : undefined;
    if (e === undefined) out.push(`bosses: unknown enemy '${id}'`);
    else if (e.boss === null) out.push(`bosses: '${id}' is not a boss`);
    else if (e.layer !== 'ground') out.push(`bosses: '${id}' doesn't walk the road`);
    else if (bossCategories(e, content.enemies).size > MAX_REQUIRED_COUNTERS) {
      out.push(`bosses: '${id}' demands more than ${MAX_REQUIRED_COUNTERS} counters`);
    }
  }
  if (!(def.maxGroupCount >= MIN_GROUP_COUNT)) {
    out.push(`maxGroupCount must be at least ${MIN_GROUP_COUNT}`);
  }
  if (!(def.minIntervalSec > 0) || !(def.spawnWindowSec > 0) || !(def.groupStaggerSec >= 0)) {
    out.push('spawn timing must be positive');
  }
  return out;
}

/** The routes a unit can walk on wave `w`: flyers the air lanes, ground Hollow also open rifts. */
function routesFor(map: CompiledMapDef, e: CompiledEnemyDef, w: number): CompiledRoute[] {
  const out: CompiledRoute[] = [];
  for (const r of map.routeList) {
    if (e.layer === 'air' ? r.kind !== 'air' : r.kind === 'air') continue;
    if (r.kind === 'rift' && (e.faction !== 'hollow' || (r.opensAtWave ?? 1) > w)) continue;
    out.push(r);
  }
  return out;
}

/** Whether every one of `cats` is in `set`. */
function within(cats: ReadonlySet<CounterId>, set: ReadonlySet<CounterId>): boolean {
  for (const c of cats) if (!set.has(c)) return false;
  return true;
}

/** Whether every category of `set` has a roster unit demanding it and nothing outside `set`. */
function witnessed(ctx: Ctx, set: ReadonlySet<CounterId>): boolean {
  for (const c of set) {
    if (!ctx.roster.some((e) => ctx.cats.get(e.id)!.has(c) && within(ctx.cats.get(e.id)!, set))) {
      return false;
    }
  }
  return true;
}

/** Every k-subset of COUNTER_CATEGORIES containing `must`, in a fixed order. */
function subsets(k: number, must: ReadonlySet<CounterId>): CounterId[][] {
  const out: CounterId[][] = [];
  const pick = (from: number, acc: CounterId[]): void => {
    if (acc.length === k) {
      if ([...must].every((c) => acc.includes(c))) out.push([...acc]);
      return;
    }
    for (let i = from; i < COUNTER_CATEGORIES.length; i++) {
      acc.push(COUNTER_CATEGORIES[i]!); // i < length
      pick(i + 1, acc);
      acc.pop();
    }
  };
  pick(0, []);
  return out;
}

/** The run's bosses in order, one per boss block: the first listed, then seeded rotations. */
function bossOrder(def: EndlessDef, rng: Rng, n: number): EnemyId[] {
  const out: EnemyId[] = [];
  if (n > 0) out.push(def.bosses[0]!); // validated non-empty
  while (out.length < n) {
    const cycle = [...def.bosses];
    for (let i = cycle.length - 1; i > 0; i--) {
      const j = nextInt(rng, i + 1);
      [cycle[i], cycle[j]] = [cycle[j]!, cycle[i]!];
    }
    // No boss twice in a row across a cycle's seam.
    if (cycle.length > 1 && cycle[0] === out[out.length - 1]) {
      [cycle[0], cycle[1]] = [cycle[1]!, cycle[0]!];
    }
    out.push(...cycle);
  }
  return out.slice(0, n);
}

/** Draws every block's counters and boss. */
function planBlocks(ctx: Ctx, rng: Rng): EndlessBlock[] {
  const { def } = ctx;
  const count = Math.ceil(def.waves / def.blockWaves);
  const isBossBlock = (b: number): boolean => {
    const last = (b + 1) * def.blockWaves;
    return last >= def.firstBossWave && (last - def.firstBossWave) % def.bossEvery === 0;
  };
  let bossBlocks = 0;
  for (let b = 1; b < count; b++) if (isBossBlock(b)) bossBlocks++;
  const bosses = bossOrder(def, forkRng(rng, 'bosses'), bossBlocks);
  const draw = forkRng(rng, 'counters');
  const last = new Map<CounterId, number>();
  const blocks: EndlessBlock[] = [
    {
      index: 0,
      firstWave: 1,
      lastWave: def.blockWaves,
      counters: [...ctx.map.requiredCounters],
      boss: null,
      fresh: [...ctx.map.requiredCounters],
      relaxed: false,
    },
  ];
  for (const c of ctx.map.requiredCounters) last.set(c, 0);
  let bossAt = 0;
  for (let b = 1; b < count; b++) {
    const boss = isBossBlock(b) ? bosses[bossAt++]! : null; // bossAt < bossBlocks
    const must =
      boss === null ? new Set<CounterId>() : bossCategories(ctx.enemies[boss], ctx.enemies);
    const per = def.countersPerBlock;
    const k = Math.max(per[Math.min(b, per.length - 1)]!, must.size); // per is non-empty
    const before = blocks[b - 1]!.counters;
    const newOf = (s: readonly CounterId[]): number => s.filter((c) => !last.has(c)).length;
    const mustNew = newOf([...must]);
    const all = subsets(k, must).filter((s) => witnessed(ctx, new Set(s)));
    const open = (s: readonly CounterId[]): boolean =>
      s.every((c) => must.has(c) || def.categoryFrom[c] <= b);
    const novel = (s: readonly CounterId[]): boolean => newOf(s) <= Math.max(1, mustNew);
    const rotates = (s: readonly CounterId[]): boolean =>
      b < 2 || s.length !== before.length || s.some((c) => !before.includes(c));
    let pool = all.filter((s) => open(s) && novel(s) && rotates(s));
    let relaxed = false;
    for (const tries of [
      (s: CounterId[]): boolean => open(s) && novel(s),
      (s: CounterId[]): boolean => open(s),
      (): boolean => true,
    ]) {
      if (pool.length > 0) break;
      relaxed = true;
      pool = all.filter(tries);
    }
    const weights = pool.map((s) =>
      s.reduce((w, c) => w + 1 + Math.min(MAX_AGE, last.has(c) ? b - last.get(c)! : MAX_AGE), 0),
    );
    let roll = nextInt(
      draw,
      weights.reduce((a, w) => a + w, 0),
    );
    let chosen = pool[0]!; // `all` always holds one: witnessed sets of size ≤ 3 exist
    for (let i = 0; i < pool.length; i++) {
      roll -= weights[i]!;
      if (roll < 0) {
        chosen = pool[i]!;
        break;
      }
    }
    const fresh = chosen.filter((c) => !last.has(c));
    for (const c of chosen) last.set(c, b);
    blocks.push({
      index: b,
      firstWave: b * def.blockWaves + 1,
      lastWave: Math.min(def.waves, (b + 1) * def.blockWaves),
      counters: chosen,
      boss,
      fresh,
      relaxed,
    });
  }
  return blocks;
}

/** A unit for `share` from `pool`: one a group of 3–maxGroupCount fits, else the nearest. */
function pickUnit(
  ctx: Ctx,
  rng: Rng,
  pool: readonly CompiledEnemyDef<EnemyId>[],
  share: number,
): CompiledEnemyDef<EnemyId> {
  const fits = pool.filter((e) => {
    const n = share / ctx.threat.get(e.id)!;
    return n >= MIN_GROUP_COUNT && n <= ctx.def.maxGroupCount;
  });
  if (fits.length > 0) {
    // Weighted by threat: heavier units are likelier, so a wave grows in weight more than in
    // numbers (fewer units on the field: readable, and cheaper to simulate).
    let roll = nextInt(
      rng,
      fits.reduce((a, e) => a + Math.ceil(ctx.threat.get(e.id)!), 0),
    );
    for (const e of fits) {
      roll -= Math.ceil(ctx.threat.get(e.id)!);
      if (roll < 0) return e;
    }
  }
  // Every unit is too heavy (take the lightest) or too light (the heaviest).
  let lightest = pool[0]!;
  let heaviest = pool[0]!;
  for (const e of pool) {
    if (ctx.threat.get(e.id)! < ctx.threat.get(lightest.id)!) lightest = e;
    if (ctx.threat.get(e.id)! > ctx.threat.get(heaviest.id)!) heaviest = e;
  }
  return share / ctx.threat.get(heaviest.id)! > ctx.def.maxGroupCount ? heaviest : lightest;
}

/** A group in the making. */
interface Draft {
  readonly enemy: CompiledEnemyDef<EnemyId>;
  count: number;
  readonly route: CompiledRoute;
  readonly role: EndlessGroup['role'];
}

/** One generated wave (w > the warm-up). */
function planWave(
  ctx: Ctx,
  rng: Rng,
  w: number,
  budget: number,
  block: EndlessBlock,
  next: EndlessBlock | undefined,
  floor: number,
): Draft[] {
  const set = new Set(block.counters);
  const core = ctx.roster.filter(
    (e) => within(ctx.cats.get(e.id)!, set) && routesFor(ctx.map, e, w).length > 0,
  );
  const route = (e: CompiledEnemyDef): CompiledRoute => {
    const rs = routesFor(ctx.map, e, w);
    return rs[nextInt(rng, rs.length)]!; // core and spice units have a route
  };
  const drafts: Draft[] = [];
  const bossId = w === block.lastWave ? block.boss : null;
  const isBossWave = bossId !== null;
  let coreBudget = budget;
  if (bossId !== null) {
    const boss = ctx.enemies[bossId];
    // A boss walks the road, the way it walked in the campaign (never a rift or the sky).
    const road = routesFor(ctx.map, boss, w).filter((r) => r.kind === 'path');
    drafts.push({ enemy: boss, count: 1, route: road[nextInt(rng, road.length)]!, role: 'boss' });
    coreBudget = Math.max(BOSS_ESCORT_MIN_SHARE * budget, budget - ctx.threat.get(boss.id)!);
  }
  // Spice: the next block's new category, in this block's last two waves.
  let spice: Draft | null = null;
  if (next !== undefined && w >= block.lastWave - 1) {
    const fresh = next.counters.filter((c) => !set.has(c));
    const both = new Set([...block.counters, ...next.counters]);
    const pool = ctx.roster.filter((e) => {
      const cats = ctx.cats.get(e.id)!;
      return (
        fresh.some((c) => cats.has(c)) && within(cats, both) && routesFor(ctx.map, e, w).length > 0
      );
    });
    if (pool.length > 0) {
      const e = pickUnit(ctx, rng, pool, SPICE_SHARE * budget);
      const count = Math.min(
        ctx.def.maxGroupCount,
        Math.floor((SPICE_SHARE * budget) / ctx.threat.get(e.id)!),
      );
      if (count > 0) {
        spice = { enemy: e, count, route: route(e), role: 'spice' };
        coreBudget -= count * ctx.threat.get(e.id)!;
      }
    }
  }
  // One featured group per counter, in a seeded order; a filler group from the core one wave in two.
  const order = [...block.counters];
  for (let i = order.length - 1; i > 0; i--) {
    const j = nextInt(rng, i + 1);
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  const slots: {
    readonly pool: CompiledEnemyDef<EnemyId>[];
    readonly role: Draft['role'];
    readonly weight: number;
  }[] = order.map((c) => ({
    pool: core.filter((e) => ctx.cats.get(e.id)!.has(c)),
    role: 'featured',
    weight: 1,
  }));
  if (slots.length === 0 || nextInt(rng, 2) === 0) {
    slots.push({ pool: core, role: 'filler', weight: slots.length === 0 ? 1 : FILLER_WEIGHT });
  }
  const jitter = slots.map((s) => s.weight * (0.8 + nextInt(rng, 41) / 100));
  const total = jitter.reduce((a, j) => a + j, 0);
  slots.forEach((s, i) => {
    const share = (coreBudget * jitter[i]!) / total; // i < length
    const e = pickUnit(ctx, rng, s.pool, share);
    const count = Math.max(1, Math.round(share / ctx.threat.get(e.id)!));
    drafts.push({ enemy: e, count, route: route(e), role: s.role });
  });
  if (spice !== null) drafts.push(spice);

  // Land the wave in its band: trim the heaviest groups over the top, top up the lightest below it
  // (and above the last wave without a boss, `floor`), then hold the spice under the soft cap.
  const t = (d: Draft): number => ctx.threat.get(d.enemy.id)!;
  const sum = (): number => drafts.reduce((a, d) => a + d.count * t(d), 0);
  const adjustable = drafts.filter((d) => d.role === 'featured' || d.role === 'filler');
  // A boss wave: at least its budget's floor, and an escort of at least BOSS_ESCORT_MIN_SHARE.
  const bossThreat = bossId === null ? 0 : ctx.threat.get(bossId)!;
  const lo = isBossWave
    ? Math.max(budget * BUDGET_BAND.below, bossThreat + BOSS_ESCORT_MIN_SHARE * budget)
    : Math.max(budget * BUDGET_BAND.below, floor);
  const hi = isBossWave ? Infinity : budget * BUDGET_BAND.above;
  for (;;) {
    const now = sum();
    if (now <= hi) break;
    // The heaviest unit that can go without dropping under the band (the first such, on a tie).
    let cut: Draft | null = null;
    for (const d of adjustable) {
      if (d.count > 1 && now - t(d) >= lo && (cut === null || t(d) > t(cut))) cut = d;
    }
    if (cut === null) break;
    cut.count--;
  }
  let lightest = adjustable[0]!; // a wave has a core slot
  for (const d of adjustable) if (t(d) < t(lightest)) lightest = d;
  // Coarse units overshoot a top-up: the block's plain units (no category) fill finer.
  if (t(lightest) > TOP_UP_GRAIN * budget) {
    let plain: CompiledEnemyDef<EnemyId> | null = null;
    for (const e of core) {
      if (ctx.cats.get(e.id)!.size > 0) continue;
      if (plain === null || ctx.threat.get(e.id)! < ctx.threat.get(plain.id)!) plain = e;
    }
    if (plain !== null && ctx.threat.get(plain.id)! < t(lightest)) {
      lightest = { enemy: plain, count: 0, route: route(plain), role: 'filler' };
      drafts.push(lightest);
    }
  }
  // Strictly above the last wave without a boss (a boss wave is a spike, so it needn't be).
  const above = isBossWave ? -Infinity : floor;
  for (let now = sum(); now < lo || now <= above; now += t(lightest)) lightest.count++;
  if (lightest.count === 0) drafts.splice(drafts.indexOf(lightest), 1);
  if (spice !== null) {
    while (spice.count > 0 && spice.count * t(spice) > SOFT_THREAT_MAX_SHARE * sum()) spice.count--;
    if (spice.count === 0) drafts.splice(drafts.indexOf(spice), 1);
  }
  return drafts;
}

/** The compiled groups of a planned wave: spawn intervals fitted to the window, starts staggered. */
function compileDrafts(ctx: Ctx, drafts: readonly Draft[]): CompiledWaveGroup[] {
  const window = secToTicks(ctx.def.spawnWindowSec);
  const minInterval = secToTicks(ctx.def.minIntervalSec);
  const stagger = secToTicks(ctx.def.groupStaggerSec);
  return drafts.map((d, i) => ({
    enemy: d.enemy,
    count: d.count,
    intervalTicks:
      d.count <= 1
        ? d.enemy.spawnIntervalTicks
        : Math.max(
            minInterval,
            Math.min(d.enemy.spawnIntervalTicks, Math.floor(window / (d.count - 1))),
          ),
    delayTicks: i * stagger,
    route: d.route,
    tags: [],
    teach: false,
  }));
}

/** A seed's whole run on `def.map`: its blocks and every wave (the warm-up as authored). */
export function endlessPlan(
  def: EndlessDef,
  content: CompiledContent,
  seed: number,
): EndlessPlan & { readonly compiled: readonly CompiledWave[] } {
  const errors = endlessDefErrors(def, content);
  if (errors.length > 0) throw new RangeError(`invalid EndlessDef:\n- ${errors.join('\n- ')}`);
  const enemies = content.enemies;
  const map = content.maps[def.map];
  const threat = new Map<string, number>();
  const cats = new Map<string, ReadonlySet<CounterId>>();
  for (const e of Object.values(enemies)) {
    threat.set(e.id, threatWithBrood(e, enemies));
    cats.set(e.id, categoriesOf(e));
  }
  const ctx: Ctx = {
    def,
    enemies,
    map,
    roster: def.roster.map((id) => content.enemies[id]),
    threat,
    cats,
  };
  const rng = createRng(seed);
  const blocks = planBlocks(ctx, rng);
  const budgets = endlessBudgets(def, def.waves);
  const countdownTicks = secToTicks(DEFAULT_COUNTDOWN_SEC[map.act]);
  const waves: EndlessWave[] = [];
  const compiled: CompiledWave[] = [];
  let floor = 0;
  for (let w = 1; w <= def.waves; w++) {
    const b = Math.floor((w - 1) / def.blockWaves);
    const block = blocks[b]!; // b < blocks.length
    const budget = budgets[w - 1]!;
    if (b === 0) {
      const authored = map.waves[w - 1]!; // the warm-up is one block (validated)
      const groups = authored.groups.map((g): EndlessGroup => ({
        enemy: g.enemy.id,
        count: g.count,
        route: g.route.id,
        intervalTicks: g.intervalTicks,
        delayTicks: g.delayTicks,
        role: 'authored',
      }));
      const t = groups.reduce((a, g) => a + g.count * threat.get(g.enemy)!, 0);
      waves.push({ number: w, block: 0, budget, threat: t, spiceThreat: 0, boss: null, groups });
      compiled.push(authored);
      floor = Math.max(floor, t);
      continue;
    }
    const drafts = planWave(ctx, forkRng(rng, `wave:${w}`), w, budget, block, blocks[b + 1], floor);
    const groups = compileDrafts(ctx, drafts);
    const t = drafts.reduce((a, d) => a + d.count * threat.get(d.enemy.id)!, 0);
    const spice = drafts
      .filter((d) => d.role === 'spice')
      .reduce((a, d) => a + d.count * threat.get(d.enemy.id)!, 0);
    const boss = drafts.find((d) => d.role === 'boss')?.enemy.id ?? null;
    if (boss === null) floor = t;
    const lastSpawnTicks = groups.reduce(
      (a, g) => Math.max(a, g.delayTicks + Math.max(0, g.count - 1) * g.intervalTicks),
      0,
    );
    const afterBoss = (waves[w - 2]?.boss ?? null) !== null; // the wave after a boss waits for its fight
    compiled.push({
      number: w,
      countdownTicks,
      countdownAfter: afterBoss ? 'bossEnded' : null,
      teach: false,
      noCall: false,
      inPhase: 0,
      groups,
      lastSpawnTicks,
    });
    waves.push({
      number: w,
      block: b,
      budget,
      threat: t,
      spiceThreat: spice,
      boss,
      groups: drafts.map((d, i) => ({
        enemy: d.enemy.id,
        count: d.count,
        route: d.route.id,
        intervalTicks: groups[i]!.intervalTicks, // same order
        delayTicks: groups[i]!.delayTicks,
        role: d.role,
      })),
    });
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- built from content's own defs and routes
  return { seed, blocks, waves, compiled };
}

/** Every trait in a plan's waves, plus `boss` (the briefing's threat intel for the seed). */
export function endlessIntel(
  plan: EndlessPlan,
  enemies: Readonly<Record<string, CompiledEnemyDef>>,
): ThreatIntelId[] {
  const out = new Set<ThreatIntelId>();
  for (const w of plan.waves) {
    for (const g of w.groups) for (const t of enemies[g.enemy]?.traits ?? []) out.add(t);
    if (w.boss !== null) out.add('boss');
  }
  return [...out].toSorted();
}

/**
 * `content` with `def.map`'s waves swapped for `seed`'s plan (and its threat intel for the plan's),
 * ready for a SimConfig on that map with the same seed. Everything else is `content`'s own.
 */
export function endlessContent(
  def: EndlessDef,
  content: CompiledContent,
  seed: number,
): { readonly content: CompiledContent; readonly plan: EndlessPlan } {
  const { compiled, ...plan } = endlessPlan(def, content, seed);
  const id = def.map;
  const map = content.maps[id];
  const run: CompiledMapDef = {
    ...map,
    waves: compiled,
    threatIntel: endlessIntel(plan, content.enemies),
  };
  return { content: { ...content, maps: { ...content.maps, [id]: run } }, plan };
}

/** The block wave `wave` belongs to (the HUD's "Next" names the next one's counters). */
export function endlessBlockAt(plan: EndlessPlan, wave: number): EndlessBlock | null {
  return plan.blocks.find((b) => wave >= b.firstWave && wave <= b.lastWave) ?? null;
}

/** A run's score: the waves it held (every wave resolved, its last unit killed or leaked). */
export function endlessWavesHeld(state: {
  readonly schedule: Pick<SimState['schedule'], 'resolved'>;
}): number {
  let n = 0;
  for (const r of state.schedule.resolved) if (r) n++;
  return n;
}

/** The categories tower `t` answers unconditionally (no act, body, or air condition). */
function towerAnswers(t: string): Set<CounterId> {
  const out = new Set<CounterId>();
  for (const c of COUNTER_CATEGORIES) {
    const ok = COUNTER_ANSWERS[c].towers.some(
      (a) =>
        a.tower === t && a.acts === undefined && a.vsBodies === undefined && a.vsAir === undefined,
    );
    if (ok) out.add(c);
  }
  return out;
}

/**
 * Up to MAX_LOADOUT towers of `towers` that answer every one of `counters` (enemies.md § 3.1),
 * counting only unconditional answers (no act, body, or air condition; no ability), or null. The
 * generator's guarantee that every block is answerable, and the loadout screen's hint.
 */
export function answeringLoadout(
  counters: readonly CounterId[],
  towers: readonly string[],
): string[] | null {
  const useful = towers.filter((t) => counters.some((c) => towerAnswers(t).has(c)));
  const best = (from: number, left: readonly CounterId[], acc: string[]): string[] | null => {
    if (left.length === 0) return acc;
    if (acc.length === MAX_LOADOUT) return null;
    for (let i = from; i < useful.length; i++) {
      const t = useful[i]!; // i < length
      const a = towerAnswers(t);
      if (!left.some((c) => a.has(c))) continue;
      const got = best(
        i + 1,
        left.filter((c) => !a.has(c)),
        [...acc, t],
      );
      if (got !== null) return got;
    }
    return null;
  };
  return best(0, counters, []);
}
