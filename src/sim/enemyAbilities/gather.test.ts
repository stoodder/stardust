// T602: gathering (design/enemies.md § 3, § 5.4; gather.ts). Unit tests drive the systems directly
// on fx_map's road (9 tiles: (0,0) → (2,0) → (2,3) → (3,3) → (3,4) → (5,4)) with the live Maw,
// Mote, Fracture, Rift Moth, and a boss; refugees on the escort variant of fx_map.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import type { CompiledContent, CompiledEnemyDef } from '../../content/compiled.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import type { IdSpace, MapDef, WaveTag } from '../../content/types.ts';
import { secToTicks } from '../../shared/time.ts';
import { ROAD, WALKER, setup, spawn } from '../__fixtures__/combat.ts';
import { SIM_FIXTURE, fixtureConfig, type FixtureIds } from '../__fixtures__/sim.ts';
import { applyDamage } from '../combat/damage.ts';
import type { Ally, Enemy } from '../entities.ts';
import { spawnRefugees } from '../escort.ts';
import { pointAt } from '../path.ts';
import type { SimEvent } from '../events.ts';
import { createState, type SimState } from '../state.ts';
import { allies } from '../systems/allies.ts';
import { cleanup } from '../systems/cleanup.ts';
import { movement } from '../systems/movement.ts';
import { applyMarked, applyStasis, applyUnnerved, isInterrupted } from '../systems/status.ts';
import { createScratch, type TickContext } from '../tick.ts';
import {
  gatherBounty,
  gatherLeak,
  gatherMatches,
  gatherMaxHp,
  gatherScale,
  gatherTelling,
} from './gather.ts';
import { isHushable, isHushableAlly } from './hush.ts';
import { outOfReach } from './layers.ts';
import { enemyAbilities } from './index.ts';

const E = compileContent(RAW_CONTENT).enemies;
const MAW = E.maw;
const MOTE = E.mote;
const SRC = { kind: 'ability', slot: 1 } as const;
const FLEE: readonly WaveTag[] = ['fleeing'];
const TELL = secToTicks(1);
const EVERY = secToTicks(4);

function put(state: SimState, def: CompiledEnemyDef, dist: number, tags?: readonly WaveTag[]) {
  return spawn(state, def, tags === undefined ? { dist } : { dist, tags });
}

/** One tick: the abilities, then (when `move`) movement and refugees, then cleanup. */
function tick(state: SimState, ctx: TickContext, n = 1, move = false): void {
  for (let i = 0; i < n; i++) {
    enemyAbilities(state, ctx);
    if (move) {
      movement(state, ctx);
      allies(state, ctx);
    }
    cleanup(state, ctx);
    state.tick++;
  }
}

function events<T extends SimEvent<IdSpace>['type']>(
  state: SimState,
  type: T,
): Extract<SimEvent<IdSpace>, { type: T }>[] {
  return state.events.filter((e): e is Extract<SimEvent<IdSpace>, { type: T }> => e.type === type);
}

/** Ticks until `m`'s tendril tell starts (at most `max`); how many ticks that took. */
function untilTell(state: SimState, ctx: TickContext, m: Enemy, max = EVERY * 2): number {
  for (let t = 1; t <= max; t++) {
    tick(state, ctx);
    if (m.gatherUid !== 0) return t;
  }
  return -1;
}

describe('the Maw (content)', () => {
  it('is the roster row: 400 HP, armor 2, 0.7 tiles/s, leak 2, bounty 20; gathers every 4 s', () => {
    expect([MAW.hp, MAW.armor, MAW.speedTilesPerTick * 60, MAW.leak, MAW.bounty]).toEqual([
      400, 2, 0.7, 2, 20,
    ]);
    expect(MAW.gather).toMatchObject({
      everyTicks: EVERY,
      tellTicks: TELL,
      radiusTiles: 1,
      maxAbsorbs: 5,
      growPct: 0.1,
      leakPerAbsorb: 1,
      bountyPerHollowAbsorb: 3,
    });
    expect(MAW.hushes).toBe(false); // its one hush is a gather
    expect(MAW.faction).toBe('hollow');
  });
});

describe('gathering', () => {
  it('tells 3 s after it spawns, holds both still for 1 s, then takes the unit whole', () => {
    const { state, ctx } = setup();
    const m = put(state, MAW, 3);
    const v = put(state, MOTE, 3.5);
    v.hp = 17;
    const vUid = v.uid;
    expect(untilTell(state, ctx, m)).toBe(EVERY - TELL + 1); // the spawn tick sets the period
    expect(events(state, 'GatherTell')).toEqual([
      { type: 'GatherTell', uid: m.uid, targetUid: vUid, ally: false },
    ]);
    expect(gatherTelling(m)).toBe(true);
    for (let t = 1; t < TELL; t++) {
      expect([m.paceMul, v.paceMul, v.alive]).toEqual([0, 0, true]);
      tick(state, ctx);
    }
    expect(v.alive).toBe(true);
    tick(state, ctx);
    expect(v.alive).toBe(false);
    expect(events(state, 'Gathered')).toEqual([
      { type: 'Gathered', uid: m.uid, victimUid: vUid, victim: 'mote', hp: 17, absorbs: 1 },
    ]);
    expect([m.hp, m.bonusMaxHp, m.absorbs, m.hollowAbsorbs, m.gatherUid]).toEqual([
      417, 17, 1, 1, 0,
    ]);
    expect(gatherMaxHp(m)).toBe(417);
    expect(gatherScale(m)).toBeCloseTo(1.1, 12);
    expect(m.heavy).toBe(false);
    // No kill, no leak, no bounty for the gathered unit.
    expect(events(state, 'EnemyDied')).toEqual([]);
    expect(events(state, 'EnemyLeaked')).toEqual([]);
    // The next one is a whole period later.
    const again = put(state, MOTE, 2.6);
    expect(untilTell(state, ctx, m)).toBe(EVERY - TELL);
    expect(m.gatherUid).toBe(again.uid);
  });

  it('waits, ready, until a unit is within 1 tile (inclusive), the nearest first', () => {
    const { state, ctx } = setup();
    const m = put(state, MAW, 3);
    const far = put(state, MOTE, 4.01);
    tick(state, ctx, EVERY);
    expect(m.gatherUid).toBe(0);
    expect(m.gatherTicks).toBe(TELL); // ready
    const edge = put(state, MOTE, 2); // exactly 1 tile behind
    const near = put(state, MOTE, 3.9);
    tick(state, ctx);
    expect(m.gatherUid).toBe(near.uid);
    expect([far.paceMul, edge.paceMul]).toEqual([1, 1]);
  });

  it('never takes a boss, another Maw, a flyer, a non-fleeing Skitterkin, or another faction', () => {
    const { state, ctx } = setup();
    const m = put(state, MAW, 3);
    put(state, MAW, 3.2);
    put(state, E.glass_witch, 3.3);
    put(state, E.riftmoth, 3.4);
    put(state, E.nibbler, 3.5); // not fleeing
    put(state, E.compliance, 2.6);
    put(state, E.veilwalker, 2.7);
    tick(state, ctx, EVERY * 2);
    expect(events(state, 'GatherTell')).toEqual([]);
    expect(m.absorbs).toBe(0);
  });

  it('takes at most one Skitterkin (its one hush, held as the hush rule pair); never Heavy', () => {
    const { state, ctx } = setup();
    const m = put(state, MAW, 3);
    const a = put(state, WALKER, 3.3, FLEE);
    const b = put(state, WALKER, 3.6, FLEE);
    expect(untilTell(state, ctx, m)).toBeGreaterThan(0);
    expect([m.gatherUid, m.hushUid, a.hushUid]).toEqual([a.uid, a.uid, m.uid]);
    // A Mote meeting the held runner can't hush it: it takes the free one instead.
    const mote = put(state, MOTE, 3.4);
    tick(state, ctx);
    expect([mote.hushUid, a.hushUid]).toEqual([b.uid, m.uid]);
    tick(state, ctx, TELL - 1);
    expect(a.alive).toBe(false);
    expect([m.absorbs, m.hollowAbsorbs, m.gatheredSkitterkin, m.heavy]).toEqual([
      1,
      0,
      true,
      false,
    ]);
    expect(state.stats.skitterkinKilled).toBe(0); // not Pests Processed
    // A second runner is never its: Hollow only from now on.
    applyDamage(state, mote, 1000, 'kinetic', SRC);
    const c = put(state, WALKER, 3.2, FLEE);
    tick(state, ctx, EVERY * 2);
    expect([m.gatherUid, m.absorbs, c.alive]).toEqual([0, 1, true]);
  });

  it('stops at 5 absorbs: a full Maw never tells again', () => {
    const { state, ctx } = setup();
    const m = put(state, MAW, 4);
    for (let i = 0; i < 8; i++) put(state, MOTE, 3.2 + i * 0.2);
    tick(state, ctx, EVERY * 8);
    expect(m.absorbs).toBe(5);
    expect(events(state, 'Gathered')).toHaveLength(5);
    expect(events(state, 'GatherTell')).toHaveLength(5);
    expect(gatherScale(m)).toBeCloseTo(1.5, 12);
  });

  it('never balloons among Fractures and their Shards: 400 + five units, none split', () => {
    const { state, ctx } = setup();
    const m = put(state, MAW, 4.5);
    const units: Enemy[] = [];
    for (let i = 0; i < 4; i++) units.push(put(state, E.fracture, 3.6 + i * 0.25));
    for (let i = 0; i < 6; i++) units.push(put(state, E.fracture_shard, 4.6 + i * 0.15));
    const most = [...units]
      .map((u) => u.hp)
      .toSorted((x, y) => y - x)
      .slice(0, 5)
      .reduce((s, x) => s + x, 0);
    tick(state, ctx, EVERY * 10);
    expect(m.absorbs).toBe(5);
    expect(m.bonusMaxHp).toBeLessThanOrEqual(most);
    expect(gatherMaxHp(m)).toBeLessThanOrEqual(400 + 5 * E.fracture.hp);
    expect(m.hp).toBe(gatherMaxHp(m));
    // A gathered Fracture is no kill: no Shards came of it.
    const shards = state.enemies.items.filter((e) => e.alive && e.def?.id === 'fracture_shard');
    expect(shards.length).toBeLessThanOrEqual(6);
  });

  it('Stasis or Unnerved cancel the tell and restart the period; a Truthlight Mark does not', () => {
    for (const how of ['stasis', 'unnerved', 'mark'] as const) {
      const { state, ctx } = setup();
      const m = put(state, MAW, 3);
      const v = put(state, MOTE, 3.5);
      untilTell(state, ctx, m);
      tick(state, ctx, 10);
      if (how === 'stasis') applyStasis(m, 30);
      else if (how === 'unnerved') applyUnnerved(m, 30);
      else applyMarked(m, 0.1, 600, true);
      tick(state, ctx);
      if (how === 'mark') {
        expect(m.gatherUid).toBe(v.uid);
        continue;
      }
      expect([m.gatherUid, m.gatherTicks, v.paceMul]).toEqual([0, EVERY, 1]);
      m.stasisTicks = 0;
      m.unnervedTicks = 0;
      expect(untilTell(state, ctx, m)).toBe(EVERY - TELL);
    }
  });

  it('killing the held unit mid-tell spends nothing and restarts the period', () => {
    const { state, ctx } = setup();
    const m = put(state, MAW, 3);
    const v = put(state, MOTE, 3.5);
    put(state, MOTE, 2.5);
    untilTell(state, ctx, m);
    applyDamage(state, v, 1000, 'kinetic', SRC);
    tick(state, ctx);
    expect([m.gatherUid, m.absorbs, m.gatherTicks]).toEqual([0, 0, EVERY]);
  });

  it('two Maws: each unit goes to its nearest, whatever the slot order', () => {
    for (const order of ['near-first', 'far-first'] as const) {
      const { state, ctx } = setup();
      const far = order === 'far-first' ? put(state, MAW, 2.2) : null;
      const near = put(state, MAW, 3.8);
      const far2 = far ?? put(state, MAW, 2.2);
      const v = put(state, MOTE, 3.4);
      tick(state, ctx, EVERY - TELL + 1);
      expect(near.gatherUid).toBe(v.uid);
      expect(far2.gatherUid).toBe(0);
    }
  });
});

describe('a gathered Maw leaks and pays more', () => {
  it('leaks +1 per absorb (enemies.md: 2, +1 per absorb)', () => {
    const { state, ctx } = setup();
    const m = put(state, MAW, ROAD.lengthTiles - 0.001);
    m.absorbs = 3;
    m.hollowAbsorbs = 2;
    expect(gatherLeak(m)).toBe(3);
    const before = state.integrity;
    movement(state, ctx);
    expect(events(state, 'EnemyLeaked')).toEqual([
      { type: 'EnemyLeaked', uid: m.uid, enemy: 'maw', leak: 5 },
    ]);
    expect(state.integrity).toBe(before - 5);
  });

  it('pays +3 per Hollow absorb only (enemies.md: 20, +3 per Hollow absorb)', () => {
    const { state } = setup();
    const m = put(state, MAW, 3);
    m.absorbs = 3;
    m.hollowAbsorbs = 2;
    m.gatheredSkitterkin = true;
    expect(gatherBounty(m)).toBe(6);
    applyDamage(state, m, 10_000, 'kinetic', SRC);
    expect(events(state, 'EnemyDied')[0]?.bounty).toBe(26);
  });

  it('adds nothing to a unit that doesn’t gather', () => {
    const w = { def: WALKER, absorbs: 4, hollowAbsorbs: 4, bonusMaxHp: 0 };
    expect([gatherLeak(w), gatherBounty(w), gatherScale(w), gatherMaxHp(w)]).toEqual([
      0,
      0,
      1,
      WALKER.hp,
    ]);
  });
});

function refugee(state: SimState): Ally {
  return state.allies.items.find((a) => a.alive && a.group >= 0)!;
}

describe('gathering a refugee (Escort)', () => {
  const ESCORT: Partial<MapDef<FixtureIds, 'fx_map'>> = {
    objective: 'escort',
    maxLost: 5,
    markers: { rock: [0, 2], gate: [5, 4] },
    safeExit: 'gate',
    refugees: { g1: { route: 'a', count: 1 }, g2: { route: 'a', count: 1 } },
  };
  const fx = SIM_FIXTURE.maps.fx_map;
  const C: CompiledContent<FixtureIds> = compileContent({
    ...SIM_FIXTURE,
    maps: { fx_map: { ...fx, ...ESCORT } },
  });
  const MAP = C.maps.fx_map;

  function escortSetup(): { state: SimState; ctx: TickContext } {
    const config = fixtureConfig({ content: C });
    return {
      state: createState(MAP, 1),
      ctx: { content: C, map: MAP, config, scratch: createScratch() },
    };
  }

  it('holds it still for the tell, then it is lost: its group’s, and Nothing Gathered’s count', () => {
    const { state, ctx } = escortSetup();
    spawnRefugees(state, MAP, 'g2');
    const a = refugee(state);
    a.dist = 3.5;
    a.seg = pointAt(a.route!, a.dist, a, 0);
    const m = spawn(state, MAW, { dist: 3, route: MAP.routes.a! });
    m.gatherTicks = TELL; // ready
    tick(state, ctx);
    expect(events(state, 'GatherTell')).toEqual([
      { type: 'GatherTell', uid: m.uid, targetUid: a.uid, ally: true },
    ]);
    // A Mote right on it can't hush it while the tendrils hold it.
    const mote = spawn(state, MOTE, { dist: 3.6, route: MAP.routes.a! });
    const at = a.dist;
    const aUid = a.uid;
    for (let t = 1; t < TELL; t++) tick(state, ctx, 1, true);
    expect([a.dist, a.alive, mote.hushUid]).toEqual([at, true, 0]);
    tick(state, ctx, 1, true);
    expect(a.alive).toBe(false);
    expect(events(state, 'Gathered')).toEqual([
      { type: 'Gathered', uid: m.uid, victimUid: aUid, victim: 'refugee', hp: 0, absorbs: 1 },
    ]);
    expect(events(state, 'RefugeeLost')).toEqual([
      { type: 'RefugeeLost', uid: aUid, cause: 'hushed', enemyUid: m.uid },
    ]);
    expect(state.stats.refugeesGathered).toBe(1);
    expect(state.stats.refugeesLost).toBe(1);
    expect(state.stats.lostByGroup).toEqual([0, 1]);
    expect([m.gatheredSkitterkin, m.absorbs, m.hollowAbsorbs, m.hp]).toEqual([true, 1, 0, 400]);
  });

  it('takes no second Skitterkin: a second refugee walks past a Maw that has had its one', () => {
    const { state, ctx } = escortSetup();
    spawnRefugees(state, MAP, 'g1');
    const a = refugee(state);
    a.dist = 3.5;
    a.seg = pointAt(a.route!, a.dist, a, 0);
    const m = spawn(state, MAW, { dist: 3, route: MAP.routes.a! });
    m.gatheredSkitterkin = true;
    tick(state, ctx, EVERY * 2);
    expect([m.gatherUid, a.alive, state.stats.refugeesGathered]).toEqual([0, true, 0]);
  });
});

// ── The matching's equivalence (R15 P1) ─────────────────────────────────────────────────────────
// gather.ts matches in O(G·N); this is the pairwise rule it replaced (O(G²·N²)), kept here as the
// reference: a ready gatherer takes its nearest unit (ties: the lower uid) among those it may take
// whose nearest ready gatherer that may take them is it. The two must agree on every field.

const NONE = Number.MIN_SAFE_INTEGER;

/** A Maw with gather radius `r` tiles, on `layer`. */
const mawDef = (r: number, layer: CompiledEnemyDef['layer'] = 'ground'): CompiledEnemyDef => ({
  ...MAW,
  layer,
  gather: { ...MAW.gather!, radiusTiles: r, radiusSq: r * r },
});
const RADII = [0.5, 1, 1.5, 2.25] as const;
const GROUND_MAWS = RADII.map((r) => mawDef(r));
const AIR_MAWS = RADII.map((r) => mawDef(r, 'air'));

/** `v` on a 0.05 grid, so equal distances (the uid tie-break) come up often. */
const grid = (v: number): number => Math.round(v * 20) / 20;

function refReady(m: Enemy): boolean {
  const g = m.def?.gather ?? null;
  const tell = g === null ? 0 : g.tellTicks > 0 ? g.tellTicks : 1;
  return (
    g !== null &&
    m.alive &&
    !m.leaving &&
    m.standDownTicks === 0 &&
    m.gatherUid === 0 &&
    m.absorbs < g.maxAbsorbs &&
    m.gatherTicks > 0 &&
    m.gatherTicks <= tell &&
    !outOfReach(m) &&
    !isInterrupted(m)
  );
}

function refD2(m: Enemy, u: Pick<Enemy, 'route' | 'dist' | 'x' | 'y'>): number {
  if (m.route !== null && m.route === u.route) return (m.dist - u.dist) ** 2;
  return (m.x - u.x) ** 2 + (m.y - u.y) ** 2;
}

function refMayTake(state: SimState, m: Enemy, v: Enemy): boolean {
  const def = v.def;
  if (v === m || !v.alive || def === null || def.boss !== null || def.neutral) return false;
  if (def.gather !== null || def.layer !== m.def!.layer || outOfReach(v) || v.standDownTicks > 0) {
    return false;
  }
  if (def.faction === 'hollow') {
    return !state.enemies.items.some(
      (o, i) => i < state.enemies.used && o !== m && o.alive && o.gatherUid === v.uid,
    );
  }
  return def.faction === 'skitterkin' && !m.gatheredSkitterkin && isHushable(v);
}

function refMayTakeAlly(m: Enemy, a: Ally): boolean {
  return !m.gatheredSkitterkin && m.def!.layer === 'ground' && isHushableAlly(a);
}

function refBetter(d2: number, uid: number, bestD2: number, bestUid: number): boolean {
  return bestD2 < 0 || d2 < bestD2 || (d2 === bestD2 && uid < bestUid);
}

function refNearest(
  state: SimState,
  u: Pick<Enemy, 'route' | 'dist' | 'x' | 'y'>,
  may: (m: Enemy) => boolean,
): Enemy | null {
  let best: Enemy | null = null;
  let bestD2 = -1;
  for (const m of state.enemies.items.slice(0, state.enemies.used)) {
    if (!refReady(m)) continue;
    const d2 = refD2(m, u);
    if (d2 > m.def!.gather!.radiusSq || !refBetter(d2, m.uid, bestD2, best?.uid ?? 0)) continue;
    if (may(m)) {
      best = m;
      bestD2 = d2;
    }
  }
  return best;
}

function refUnitFor(state: SimState, m: Enemy): number {
  const r2 = m.def!.gather!.radiusSq;
  let best = NONE;
  let bestUid = 0;
  let bestD2 = -1;
  for (const v of state.enemies.items.slice(0, state.enemies.used)) {
    if (!v.alive) continue;
    const d2 = refD2(m, v);
    if (d2 > r2 || !refBetter(d2, v.uid, bestD2, bestUid) || !refMayTake(state, m, v)) continue;
    if (refNearest(state, v, (o) => refMayTake(state, o, v)) !== m) continue;
    [best, bestUid, bestD2] = [v.slot, v.uid, d2];
  }
  for (const a of state.allies.items.slice(0, state.allies.used)) {
    if (!a.alive) continue;
    const d2 = refD2(m, a);
    if (d2 > r2 || !refBetter(d2, a.uid, bestD2, bestUid) || !refMayTakeAlly(m, a)) continue;
    if (refNearest(state, a, (o) => refMayTakeAlly(o, a)) !== m) continue;
    [best, bestUid, bestD2] = [-(a.slot + 1), a.uid, d2];
  }
  return best;
}

describe('the matching (R15 P1: O(G·N), the pairwise rule exactly)', () => {
  const ESCORT: Partial<MapDef<FixtureIds, 'fx_map'>> = {
    objective: 'escort',
    maxLost: 5,
    markers: { rock: [0, 2], gate: [5, 4] },
    safeExit: 'gate',
    refugees: { g1: { route: 'a', count: 12 } },
  };
  const C: CompiledContent<FixtureIds> = compileContent({
    ...SIM_FIXTURE,
    maps: { fx_map: { ...SIM_FIXTURE.maps.fx_map, ...ESCORT } },
  });
  const MAP = C.maps.fx_map;
  const road = MAP.routes.a!;

  /** A dense random field: Maws (some telling, some full of Skitterkin), Motes, runners, refugees. */
  function field(seed: number): SimState {
    let r = seed;
    const rnd = (): number => {
      r = (Math.imul(r, 1664525) + 1013904223) >>> 0;
      return r / 2 ** 32;
    };
    const state = createState(MAP, 1);
    spawnRefugees(state, MAP, 'g1');
    for (const a of state.allies.items.slice(0, state.allies.used)) {
      a.dist = rnd() * road.lengthTiles;
      a.seg = pointAt(road, a.dist, a, 0);
    }
    const maws: Enemy[] = [];
    for (let i = 0; i < 40; i++) {
      // Distances on a 0.05 grid, so equal distances (the uid tie-break) come up often.
      const dist = Math.round(rnd() * road.lengthTiles * 20) / 20;
      const k = rnd();
      if (k < 0.3) {
        const m = spawn(state, MAW, { dist, route: road });
        m.gatherTicks = rnd() < 0.8 ? TELL : EVERY; // most ready
        m.gatheredSkitterkin = rnd() < 0.3;
        maws.push(m);
      } else if (k < 0.75) spawn(state, MOTE, { dist, route: road });
      else spawn(state, WALKER, { dist, route: road, tags: FLEE });
    }
    // A few Maws mid-tell, holding a Mote: no other Maw may take it.
    const motes = state.enemies.items.filter((e) => e.alive && e.def === MOTE);
    for (const m of maws.slice(0, 3)) {
      const v = motes[Math.floor(rnd() * motes.length)];
      if (v !== undefined) m.gatherUid = v.uid;
    }
    return state;
  }

  it('agrees with the pairwise rule on 200 random dense fields', () => {
    const s = createScratch().gather;
    let tells = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const state = field(seed);
      gatherMatches(state, s);
      const want = state.enemies.items
        .slice(0, state.enemies.used)
        .filter(refReady)
        .map((m) => [m.slot, refUnitFor(state, m)]);
      expect(s.ready.map((slot, r) => [slot, s.code[r]])).toEqual(want);
      tells += s.code.filter((c) => c !== NONE).length;
    }
    expect(tells).toBeGreaterThan(400); // the fields really match (refugees and runners included)
  });

  /**
   * `field`'s mix widened: Maws of four radii, a quarter of them flying (they may take only the
   * Rift Moths, never a Mote or a refugee); Rift Moths; and a third of every kind off the route
   * (route null, up to 1.5 tiles to either side of the road), so a pair is measured in a straight
   * line wherever both don't walk the route, and along it where both do.
   */
  function wideField(seed: number): SimState {
    let r = seed;
    const rnd = (): number => {
      r = (Math.imul(r, 1664525) + 1013904223) >>> 0;
      return r / 2 ** 32;
    };
    const state = createState(MAP, 1);
    spawnRefugees(state, MAP, 'g1');
    for (const a of state.allies.items.slice(0, state.allies.used)) {
      a.dist = rnd() * road.lengthTiles;
      a.seg = pointAt(road, a.dist, a, 0);
    }
    const maws: Enemy[] = [];
    for (let i = 0; i < 48; i++) {
      const dist = grid(rnd() * road.lengthTiles);
      const k = rnd();
      let e: Enemy;
      if (k < 0.3) {
        const defs = rnd() < 0.25 ? AIR_MAWS : GROUND_MAWS;
        e = spawn(state, defs[Math.floor(rnd() * defs.length)]!, { dist, route: road });
        e.gatherTicks = rnd() < 0.8 ? TELL : EVERY;
        e.gatheredSkitterkin = rnd() < 0.3;
        maws.push(e);
      } else if (k < 0.6) e = spawn(state, MOTE, { dist, route: road });
      else if (k < 0.8) e = spawn(state, E.riftmoth, { dist, route: road });
      else e = spawn(state, WALKER, { dist, route: road, tags: FLEE });
      if (rnd() < 1 / 3) {
        e.route = null;
        e.x = grid(e.x + (rnd() * 2 - 1) * 1.5);
        e.y = grid(e.y + (rnd() * 2 - 1) * 1.5);
      }
    }
    const held = state.enemies.items.filter((e) => e.alive && e.def?.gather === null);
    for (const m of maws.slice(0, 3)) {
      const v = held[Math.floor(rnd() * held.length)];
      if (v !== undefined) m.gatherUid = v.uid;
    }
    return state;
  }

  it('agrees with the pairwise rule with off-route units, air Maws, and varied radii', () => {
    const s = createScratch().gather;
    const seen = { offRoute: 0, air: 0, ally: 0, straight: 0, radii: new Set<number>() };
    for (let seed = 1; seed <= 200; seed++) {
      const state = wideField(seed);
      gatherMatches(state, s);
      const ready = state.enemies.items.slice(0, state.enemies.used).filter(refReady);
      expect(s.ready.map((slot, r) => [slot, s.code[r]])).toEqual(
        ready.map((m) => [m.slot, refUnitFor(state, m)]),
      );
      ready.forEach((m, i) => {
        const code = s.code[i]!;
        if (code === NONE) return;
        const u = code < 0 ? state.allies.items[-code - 1]! : state.enemies.items[code]!;
        if (m.route === null) seen.offRoute++;
        if (m.def!.layer === 'air') seen.air++;
        if (code < 0) seen.ally++;
        if (m.route === null || m.route !== u.route) seen.straight++;
        seen.radii.add(m.def!.gather!.radiusTiles);
      });
    }
    // Every case really comes up: off-route Maws, flying Maws, refugees, straight-line pairs, and
    // a match at every radius.
    expect(seen.offRoute).toBeGreaterThan(200);
    expect(seen.air).toBeGreaterThan(150);
    expect(seen.ally).toBeGreaterThan(150);
    expect(seen.straight).toBeGreaterThan(300);
    expect([...seen.radii].toSorted((a, b) => a - b)).toEqual([...RADII]);
  });
});
