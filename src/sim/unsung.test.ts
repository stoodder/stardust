// The Unsung (T808; design/enemies.md § 6, *How the Unsung runs*; enemyAbilities/unsung.ts, the
// split with no merge in bossSplit.ts/bossMerge.ts, the floor in bossPhases.ts). Driven through
// the abilities system and cleanup on the fixture road (9 tiles) with the live boss, a choir laid
// over it (its leader 3 tiles in, its ten singers behind her 0.4 apart) and dev_phases's song.
// The whole fight in a whole sim (cues, determinism, a replay inside phase 3, Dawn):
// tools/devUnsung.test.ts.
import { describe, expect, it } from 'vitest';
import type { CompiledChoir, CompiledMapDef, CompiledSong } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import {
  BOSS_ABILITY_TELL_SEC,
  BOSS_BURROW_GAP_SEC,
  BOSS_MIN_TELL_SEC,
  BOSS_SURFACE_HUSH_TILES,
} from '../content/rules.ts';
import type { IdSpace } from '../content/types.ts';
import { secToTicks } from '../shared/time.ts';
import { choir, initChoir, isChoirSinger, isHushedSinger } from './choir.ts';
import { applyDamage } from './combat/damage.ts';
import type { SimConfig } from './config.ts';
import { BOSS_PHASE_INVULNERABLE_TICKS, bossDamage } from './enemyAbilities/bossPhases.ts';
import { isSplitBorn, splitHp } from './enemyAbilities/bossSplit.ts';
import { enemyAbilities } from './enemyAbilities/index.ts';
import { immune, untargetable } from './enemyAbilities/layers.ts';
import {
  addsCalling,
  bossRestProgress,
  choirDist,
  digTarget,
  surfaceTelling,
} from './enemyAbilities/unsung.ts';
import { ENEMY_BLANK, type Ally, type Enemy } from './entities.ts';
import type { SimEvent } from './events.ts';
import { FEATURE_GATES } from './gates.ts';
import { placeOnRoute, pointAt, type Point } from './path.ts';
import { poolAlloc } from './pool.ts';
import { SONG_PHASE } from './song.ts';
import { createState, takeUid, type SimState } from './state.ts';
import { cleanup } from './systems/cleanup.ts';
import { movement } from './systems/movement.ts';
import { applyUnnerved } from './systems/status.ts';
import { createScratch, runTick, type TickContext } from './tick.ts';
import { setPhase } from './phases.ts';
import { FIXTURE_CONTENT, fixtureConfig } from './__fixtures__/sim.ts';

const LIVE = compileContent(RAW_CONTENT);
const UNSUNG = LIVE.enemies.unsung;
const PART = LIVE.enemies.unsung_part;
const PHASES = UNSUNG.boss!.phases;
const [P1, P2, P3, P4] = PHASES;
const TELL = secToTicks(BOSS_ABILITY_TELL_SEC);
const GAP = secToTicks(BOSS_BURROW_GAP_SEC);
const FX_MAP = FIXTURE_CONTENT.maps.fx_map;
const ROAD = FX_MAP.routes.a!; // (0,0) → (2,0) → (2,3) → (3,3) → (3,4) → (5,4): 9 tiles
const SONG: CompiledSong = {
  baseRadius: 2.5,
  silentPct: 0.6,
  restTarget: 40,
  restPerTick: 0.2 / 60,
  restPerBossHp: 0.001,
  multipliers: [{ flag: 'quill_choice', value: 'keep', mul: 1.25 }],
  scatter: { reformTicks: 240, hpPct: 0.5 },
};
/** The choir stops beside (2,1): its leader 3 tiles along the road from the spawn. */
const CHOIR: CompiledChoir = {
  leader: 'pebble',
  route: ROAD,
  stopAt: 'halls',
  stopTile: [2, 1],
  singers: 10,
  paceTilesPerTick: 0.35 / 60,
  haltTiles: 1.5,
  groups: [],
  thrum: null,
  returned: null,
};
const MAP: CompiledMapDef<IdSpace> = { ...FX_MAP, choir: CHOIR, song: SONG };
const LEAD = 3;
const SRC = { kind: 'ability', slot: 1 } as const;

function world(): { state: SimState; ctx: TickContext } {
  const config: SimConfig<IdSpace> = {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- fx_map's config, live content
    ...(fixtureConfig() as unknown as SimConfig<IdSpace>),
    content: LIVE,
    scriptFlags: { quill_choice: 'keep' },
  };
  const state = createState(MAP, 1);
  const ctx: TickContext = { content: LIVE, map: MAP, config, scratch: createScratch() };
  initChoir(state, MAP, config.scriptFlags);
  choir(state, ctx); // tick 0: the column spawns at the road's core end
  state.tick = 1; // spawned once
  // Arrived: the leader 3 tiles in, each singer 0.4 behind the one before.
  state.choir.dist = ROAD.lengthTiles - LEAD;
  state.choir.arrived = true;
  let k = 0;
  for (const a of allies(state)) {
    a.dist = LEAD + 0.4 * k++;
    a.seg = pointAt(ROAD, a.dist, a, 0);
  }
  pointAt(ROAD, LEAD, state.choir, 0);
  state.phase = SONG_PHASE;
  // Ten minutes into the song: the forms' time floors (D156) have passed (their own test sets it).
  state.phaseTick = state.tick - secToTicks(600);
  state.restTarget = SONG.restTarget;
  return { state, ctx };
}

function allies(state: SimState): Ally[] {
  return state.allies.items.slice(0, state.allies.used).filter((a) => a.alive);
}
function singers(state: SimState): Ally[] {
  return allies(state).filter((a) => isChoirSinger(a) && !isHushedSinger(a));
}
function live(state: SimState): Enemy[] {
  return state.enemies.items.slice(0, state.enemies.used).filter((e) => e.alive);
}

/** `n` ticks of the abilities (and movement), the choir, then cleanup; returns the events. */
function run(state: SimState, ctx: TickContext, n: number, move = true): SimEvent<IdSpace>[] {
  const out: SimEvent<IdSpace>[] = [];
  for (let i = 0; i < n; i++) {
    enemyAbilities(state, ctx);
    if (move) movement(state, ctx);
    choir(state, ctx);
    cleanup(state, ctx);
    state.tick++;
    out.push(...state.events);
    state.events.length = 0;
  }
  return out;
}

function of<T extends SimEvent<IdSpace>['type']>(events: SimEvent<IdSpace>[], type: T) {
  return events.filter((e): e is Extract<SimEvent<IdSpace>, { type: T }> => e.type === type);
}

/** The Unsung at `dist` in wave 1 (the schedule counting it), phase 1 begun, events drained. */
function boss(state: SimState, ctx: TickContext, dist = 0.2): Enemy {
  const e = poolAlloc(state.enemies, ENEMY_BLANK, takeUid(state));
  e.def = UNSUNG;
  e.hp = UNSUNG.hp;
  e.wave = 1;
  state.schedule.remaining[0] = 1;
  state.schedule.startTick[0] = 0;
  placeOnRoute(e, ROAD, dist);
  run(state, ctx, 1, false);
  return e;
}

/** Takes `b` to the next phase's threshold and runs its invulnerability out. */
function toPhase(state: SimState, ctx: TickContext, b: Enemy, pct: number): SimEvent<IdSpace>[] {
  bossDamage(state, b, b.hp - pct * UNSUNG.hp);
  return run(state, ctx, BOSS_PHASE_INVULNERABLE_TICKS + 1, false);
}

/** The whole fight to phase 3: the split, every part killed, the rise; returns the risen boss. */
function risen(state: SimState, ctx: TickContext): Enemy {
  const b = boss(state, ctx);
  toPhase(state, ctx, b, 0.75);
  for (const p of live(state).filter((e) => e.def === PART)) {
    applyDamage(state, p, 1e6, 'kinetic', SRC);
  }
  run(state, ctx, 1, false);
  return live(state).find((e) => e.def === UNSUNG)!;
}

describe('the Unsung’s data (enemies.md § 6; D154)', () => {
  it('18000 HP (T821), four forms; the part a third of the 75–50% band and worth 5; tells ≥ 1.5 s', () => {
    expect([UNSUNG.hp, UNSUNG.armor, UNSUNG.speedTilesPerTick * 60, UNSUNG.bounty]).toEqual([
      18000, 0, 0.1, 0,
    ]);
    expect(PART.restValue).toBe(5); // a part laid to rest is a beat in the countdown
    expect(UNSUNG.boss!.ending).toBe('layToRest');
    expect(PHASES.map((p) => p.fromPct)).toEqual([1, 0.75, 0.5, 0.25]);
    expect(P1!.gather!.tellTicks).toBeGreaterThanOrEqual(secToTicks(BOSS_MIN_TELL_SEC));
    expect(P2!.split).toEqual({
      part: 'unsung_part',
      count: 3,
      hpPct: 0.25 / 3,
      mergeAfterTicks: 0, // no merge
      mergeHastePct: 0,
    });
    expect(PART.hp).toBeCloseTo((0.25 / 3) * UNSUNG.hp, 9);
    expect(P3).toMatchObject({ burrowTo: 'choir', burrow: { times: 2, durationTicks: 240 } });
    expect(P3!.phase).toEqual({ everyTicks: 480, durationTicks: 120, tellTicks: 90 });
    expect(P3!.phase!.tellTicks).toBeGreaterThanOrEqual(secToTicks(BOSS_MIN_TELL_SEC));
    expect(P4).toMatchObject({ floorPct: 0.01, adds: { enemy: 'silencer', count: 1 } });
    expect(P4!.adds!.everyTicks).toBe(1800);
    // Forms 3 and 4 wait for their time (D156): never sooner than 60 s and 120 s into Phase 2.
    expect(PHASES.map((p) => p.notBeforeTicks)).toEqual([0, 0, secToTicks(60), secToTicks(120)]);
    for (const g of [
      'enemy.boss.layToRest',
      'enemy.boss.floor',
      'enemy.boss.burrowTo',
      'enemy.boss.adds',
    ] as const) {
      expect(FEATURE_GATES[g], g).toBeNull();
    }
  });
});

describe('phase 2: the split, no merge, the rise', () => {
  it('three parts carry the band; they never merge, not even the last alone', () => {
    const { state, ctx } = world();
    const b = boss(state, ctx);
    const owner = b.uid;
    const events = toPhase(state, ctx, b, 0.75);
    expect(of(events, 'BossSplit')).toHaveLength(1);
    const parts = live(state).filter((e) => e.def === PART);
    expect(parts).toHaveLength(3);
    expect(parts.every((p) => isSplitBorn(p) && p.mergeTicks === 0)).toBe(true);
    expect(splitHp(state.enemies, owner)).toBeCloseTo(0.25 * UNSUNG.hp, 6);
    applyDamage(state, parts[0]!, 1e6, 'kinetic', SRC);
    applyDamage(state, parts[1]!, 1e6, 'kinetic', SRC);
    const later = run(state, ctx, 60 * 30, false); // 30 s: a merge's clock would long have run
    expect(of(later, 'BossMerged')).toEqual([]);
    expect(of(later, 'BossRisen')).toEqual([]);
    expect(live(state).filter((e) => e.def?.boss !== null)).toEqual([parts[2]]);
  });

  it('the last part’s fall raises it where it fell: phase 3, 50% HP, invulnerable, once', () => {
    const { state, ctx } = world();
    const b = boss(state, ctx);
    toPhase(state, ctx, b, 0.75);
    const parts = live(state).filter((e) => e.def === PART);
    applyDamage(state, parts[0]!, 1e6, 'kinetic', SRC);
    run(state, ctx, 1, false);
    // The last two on one tick: one rise.
    const last = parts[2]!;
    const at = last.dist;
    applyDamage(state, parts[1]!, 1e6, 'kinetic', SRC);
    applyDamage(state, last, 1e6, 'kinetic', SRC);
    const events = run(state, ctx, 1, false);
    expect(of(events, 'BossRisen')).toHaveLength(1);
    const r = live(state).filter((e) => e.def === UNSUNG);
    expect(r).toHaveLength(1);
    const u = r[0]!;
    expect(of(events, 'BossPhase')).toEqual([
      { type: 'BossPhase', uid: u.uid, enemy: 'unsung', phase: 3 },
    ]);
    expect(u.uid).not.toBe(b.uid);
    expect(isSplitBorn(u)).toBe(false); // its own phases, floor, and ending run
    expect(u.hp).toBe(0.5 * UNSUNG.hp);
    expect(u.dist).toBeCloseTo(at, 12);
    expect(u.invulnerableTicks).toBeGreaterThan(0);
    expect(state.schedule.remaining[0]).toBe(1); // it walks in the boss's wave
  });
});

describe('phase 3: the dig toward the choir (D154 Fork 2)', () => {
  it('tells, digs, travels under the middle singer, tells again, surfaces and hushes one', () => {
    const { state, ctx } = world();
    const u = risen(state, ctx);
    const voices = state.choir.voices;
    const mid = singers(state)[5]!; // 10 singing: the 5th behind the first (⌊10/2⌋)
    // Run the invulnerability out, then the gap up to its tell.
    run(state, ctx, BOSS_PHASE_INVULNERABLE_TICKS, false);
    run(state, ctx, GAP - TELL, false);
    expect(u.burrowed).toBe(false);
    run(state, ctx, TELL - 1, false);
    expect(u.burrowed).toBe(false);
    const dugInAt = u.dist;
    run(state, ctx, 1, false);
    expect(u.burrowed).toBe(true);
    expect(untargetable(u)).toBe(true);
    expect(u.digFromDist).toBe(dugInAt);
    expect(u.digToDist).toBeCloseTo(choirDist(state, MAP, u), 12);
    expect(u.digToDist).toBeCloseTo(mid.dist, 9); // the choir walks the boss's own road here
    const out: Point = { x: 0, y: 0 };
    expect(digTarget(u, out)).toBe(true);
    // The travel, then the surfacing tell under the singers.
    run(state, ctx, P3!.burrow!.durationTicks - TELL);
    expect(u.dist).toBeCloseTo(u.digToDist, 9);
    expect(surfaceTelling(u)).toBe(true);
    const events = run(state, ctx, TELL);
    expect(u.burrowed).toBe(false);
    const up = of(events, 'BossSurfaced');
    expect(up).toHaveLength(1);
    expect(up[0]).toMatchObject({ dugOut: false });
    expect(up[0]!.hushed).not.toBe(0);
    expect(of(events, 'SingerHushed')).toEqual([{ type: 'SingerHushed', uid: up[0]!.hushed }]);
    expect(state.choir.voices).toBe(voices - 1);
    const hushed = allies(state).find((a) => a.uid === up[0]!.hushed)!;
    const [ux, uy] = up[0]!.at; // where it came up
    expect(Math.hypot(hushed.x - ux, hushed.y - uy)).toBeLessThanOrEqual(
      BOSS_SURFACE_HUSH_TILES + 0.41, // the column drifted it back since
    );
    // The song drove it back to where it dug in, its edge (D156).
    expect(u.dist).toBeCloseTo(dugInAt, 9);
    expect(u.digFromDist).toBe(-1);
    expect(u.abilityCount).toBe(1);
    expect(u.abilityTicks).toBe(GAP);
  });

  it('a burrow answer’s hit underground digs it out: no one hushed, driven back to its edge', () => {
    const { state, ctx } = world();
    const u = risen(state, ctx);
    run(state, ctx, BOSS_PHASE_INVULNERABLE_TICKS + GAP - 1, false);
    const dugInAt = u.dist;
    run(state, ctx, 1, false);
    expect(u.burrowed).toBe(true);
    run(state, ctx, 10);
    expect(u.dist).not.toBeCloseTo(dugInAt, 3); // on its way under the singers
    const plain = applyDamage(state, u, 50, 'kinetic', SRC); // an ordinary shot: nothing lands
    expect(plain).toBe(0);
    const hit = applyDamage(state, u, 50, 'kinetic', SRC, {
      armorPierce: 0,
      ignoresArmor: false,
      reachesBurrowed: true,
    });
    expect(hit).toBeGreaterThan(0);
    const events = run(state, ctx, 1);
    expect(u.burrowed).toBe(false);
    expect(of(events, 'BossSurfaced')[0]).toMatchObject({ dugOut: true, hushed: 0 });
    expect(of(events, 'SingerHushed')).toEqual([]);
    // Up short of the singers (BossSurfaced's `at`), then the song drives it back to where it dug
    // in, as after a surfacing among them (D157): it never parks on the choir's road.
    expect(u.dist).toBeCloseTo(dugInAt, 9);
    expect(u.digFromDist).toBe(-1);
    expect(u.abilityCount).toBe(1); // the dig is spent
  });

  it('Unnerved in the dig’s tell cancels it; the gap restarts', () => {
    const { state, ctx } = world();
    const u = risen(state, ctx);
    run(state, ctx, BOSS_PHASE_INVULNERABLE_TICKS + GAP - TELL + 5, false);
    applyUnnerved(u, 1);
    run(state, ctx, 1, false);
    expect(u.burrowed).toBe(false);
    expect(u.abilityTicks).toBe(GAP);
    expect(u.abilityCount).toBe(2);
  });

  it('phases on its cycle, never while dug in or telling a dig, and a dig waits while Phased', () => {
    const { state, ctx } = world();
    const u = risen(state, ctx);
    let both = 0;
    let phasedTicks = 0;
    for (let t = 0; t < 60 * 40; t++) {
      run(state, ctx, 1, false);
      if (u.phased) phasedTicks++;
      if (u.phased && u.burrowed) both++;
    }
    expect(phasedTicks).toBeGreaterThan(0);
    expect(both).toBe(0);
    expect(u.abilityCount).toBe(0); // both digs done
  });
});

/** The risen Unsung taken on into phase 4 (the Song). */
function song(): { state: SimState; ctx: TickContext; u: Enemy } {
  const { state, ctx } = world();
  const u = risen(state, ctx);
  run(state, ctx, BOSS_PHASE_INVULNERABLE_TICKS, false);
  bossDamage(state, u, u.hp - 0.25 * UNSUNG.hp);
  expect(u.bossPhase).toBe(4);
  return { state, ctx, u };
}

describe('phase 4: the Song (the floor, the adds)', () => {
  it('its HP never falls below 1%, and the damage past it still feeds the song', () => {
    const { state, ctx, u } = song();
    run(state, ctx, BOSS_PHASE_INVULNERABLE_TICKS + 1, false);
    u.songDamage = 0;
    applyDamage(state, u, 1e7, 'kinetic', SRC);
    expect(u.hp).toBe(0.01 * UNSUNG.hp);
    expect(u.songDamage).toBeGreaterThan(0.24 * UNSUNG.hp); // as dealt (song.ts)
    applyDamage(state, u, 1e7, 'kinetic', SRC);
    expect(u.hp).toBe(0.01 * UNSUNG.hp);
    expect(u.alive).toBe(true);
    expect(u.leaving).toBe(false);
  });

  it('a Silencer walks in at the road’s spawn every 30 s, after a 1.5 s call', () => {
    const { state, ctx, u } = song();
    const every = P4!.adds!.everyTicks;
    run(state, ctx, BOSS_PHASE_INVULNERABLE_TICKS + every - TELL - 1, false);
    expect(addsCalling(u)).toBe(false);
    run(state, ctx, 1, false);
    expect(addsCalling(u)).toBe(true);
    expect(of(run(state, ctx, TELL - 1, false), 'BossAdds')).toEqual([]);
    const events = run(state, ctx, 1, false);
    expect(of(events, 'BossAdds')).toEqual([
      { type: 'BossAdds', uid: u.uid, enemy: 'silencer', count: 1 },
    ]);
    const adds = live(state).filter((e) => e.def?.id === 'silencer');
    expect(adds).toHaveLength(1);
    expect(adds[0]).toMatchObject({ wave: u.wave, dist: 0 });
    expect(of(run(state, ctx, every - 1, false), 'BossAdds')).toEqual([]);
    expect(of(run(state, ctx, 1, false), 'BossAdds')).toHaveLength(1);
  });

  it('Unnerved in the call cancels it; the wait restarts', () => {
    const { state, ctx, u } = song();
    const every = P4!.adds!.everyTicks;
    run(state, ctx, BOSS_PHASE_INVULNERABLE_TICKS + every - 10, false);
    applyUnnerved(u, 1);
    const events = run(state, ctx, 20, false);
    expect(of(events, 'BossAdds')).toEqual([]);
    expect(u.abilityTicks).toBe(every - 19);
  });
});

describe('held by the song, and laid to rest', () => {
  it('holds still inside the song (Phase 2 only), walks on outside it', () => {
    const { state, ctx } = world();
    const b = boss(state, ctx, 0.2); // 2.2 tiles from the leader: inside the 2.5 circle
    run(state, ctx, 60);
    expect(b.dist).toBe(0.2);
    state.phase = 1;
    run(state, ctx, 60);
    expect(b.dist).toBeGreaterThan(0.2);
    state.phase = SONG_PHASE;
    // Every voice hushed: the circle shrinks to 1.5 tiles and the Unsung creeps on.
    for (const a of singers(state)) a.vulnerability = 'never';
    state.choir.voices = 0;
    const was = b.dist;
    run(state, ctx, 60 * 10);
    expect(b.dist).toBeGreaterThan(was);
    expect(Math.hypot(b.x - state.choir.x, b.y - state.choir.y)).toBeLessThanOrEqual(1.5 + 0.01);
  });

  it('is laid to rest the tick after the countdown completes, whatever its phase', () => {
    const { state, ctx } = world();
    const b = boss(state, ctx);
    const uid = b.uid;
    expect(bossRestProgress(state, b)).toBe(0);
    state.restPoints = SONG.restTarget;
    expect(bossRestProgress(state, b)).toBe(1);
    const events = run(state, ctx, 1);
    expect(events.map((e) => e.type).slice(0, 2)).toEqual(['BossEnded', 'LaidToRest']);
    expect(of(events, 'WaveCleared')).toHaveLength(1);
    expect(of(events, 'BossEnded')[0]).toMatchObject({ uid, how: 'layToRest' });
    expect(of(events, 'LaidToRest')[0]).toMatchObject({ uid, points: 0 });
    expect(live(state)).toEqual([]);
    expect(state.schedule.remaining[0]).toBe(0); // booked to its wave, no kill or leak
    expect(state.stats.restedKills).toBe(0);
  });

  it('a part carries the rest progress on its bar; other units read −1', () => {
    const { state, ctx } = world();
    const b = boss(state, ctx);
    toPhase(state, ctx, b, 0.75);
    state.restPoints = 10;
    const part = live(state).find((e) => e.def === PART)!;
    expect(bossRestProgress(state, part)).toBe(0.25);
    expect(bossRestProgress(state, { def: LIVE.enemies.mote, splitFrom: null })).toBe(-1);
  });

  it('is immune while invulnerable after its rise, and targetable once it ends', () => {
    const { state, ctx } = world();
    const u = risen(state, ctx);
    expect(immune(u)).toBe(true);
    run(state, ctx, BOSS_PHASE_INVULNERABLE_TICKS, false);
    expect(immune(u)).toBe(false);
  });
});

describe('the hot loop', () => {
  it('allocates no entities and emits nothing while it holds, phases, and waits', () => {
    const { state, ctx } = world();
    const u = risen(state, ctx);
    run(state, ctx, BOSS_PHASE_INVULNERABLE_TICKS + 1, false);
    const uids = state.nextUid;
    const used = state.enemies.used;
    // Between abilities: the gap's first stretch, no tell, nothing due.
    for (let t = 0; t < GAP - TELL - 10; t++) {
      enemyAbilities(state, ctx);
      movement(state, ctx);
    }
    expect(state.nextUid).toBe(uids);
    expect(state.enemies.used).toBe(used);
    expect(state.events).toEqual([]);
    expect(u.alive).toBe(true);
  });
});

describe("the forms' time floors (D156): damage never brings a form on sooner", () => {
  it('reached by HP early, the HP holds at the threshold (the hits still feed the song)', () => {
    const { state, ctx } = world();
    state.phaseTick = state.tick; // Phase 2 just began
    const b = boss(state, ctx);
    b.bossPhase = 3;
    b.hp = 0.3 * UNSUNG.hp;
    // 30 s in: form 4 (120 s) can't begin yet, so the HP stops at its threshold.
    state.tick += secToTicks(30);
    expect(bossDamage(state, b, 0.2 * UNSUNG.hp)).toBeCloseTo(0.05 * UNSUNG.hp, 6);
    expect(b.hp).toBeCloseTo(0.25 * UNSUNG.hp, 6);
    expect(b.bossPhase).toBe(3);
    applyDamage(state, b, 500, 'kinetic', SRC);
    expect(b.hp).toBeCloseTo(0.25 * UNSUNG.hp, 6); // held
    expect(b.songDamage).toBeGreaterThan(0); // the song still hears every hit
    // Once its time comes, the next hit begins form 4.
    state.tick = state.phaseTick + P4!.notBeforeTicks;
    bossDamage(state, b, 1);
    expect(b.bossPhase).toBe(4);
  });

  it('counts only unfrozen ticks: a forced input left unanswered never brings a form on (D157)', () => {
    const { state, ctx } = world();
    state.phase = 1;
    setPhase(state, 2); // Phase 2 begins now; its frozen count starts at 0
    expect(state.phaseFrozenTicks).toBe(0);
    // "Who's there?" waits 200 s: the whole sim holds but the tick runs on.
    state.pendingInput = 'whos_there';
    for (let t = 0; t < secToTicks(200); t++) runTick(state, ctx);
    expect(state.phaseFrozenTicks).toBe(secToTicks(200));
    state.pendingInput = null;
    runTick(state, ctx); // a tick of play
    expect(state.phaseFrozenTicks).toBe(secToTicks(200));
    const b = boss(state, ctx);
    b.bossPhase = 3;
    b.hp = 0.3 * UNSUNG.hp;
    // 201 s of the phase's clock, 1 tick of it played: form 4 (120 s) still waits.
    bossDamage(state, b, 0.2 * UNSUNG.hp);
    expect(b.bossPhase).toBe(3);
    expect(b.hp).toBeCloseTo(0.25 * UNSUNG.hp, 6);
    state.tick += P4!.notBeforeTicks - 1; // the floor's unfrozen time, all played
    bossDamage(state, b, 1);
    expect(b.bossPhase).toBe(4);
    // The next phase starts its count afresh.
    setPhase(state, 3);
    expect(state.phaseFrozenTicks).toBe(0);
  });

  it('risen after the split early, it holds in its rise until form 3 may begin', () => {
    const { state, ctx } = world();
    state.phaseTick = state.tick; // Phase 2 just began: form 3 waits 60 s
    const u = risen(state, ctx);
    expect(u.bossPhase).toBe(3);
    const left = state.phaseTick + P3!.notBeforeTicks - state.tick;
    expect(left).toBeGreaterThan(BOSS_PHASE_INVULNERABLE_TICKS);
    expect(u.invulnerableTicks).toBeGreaterThanOrEqual(left - 1);
    expect(immune(u)).toBe(true);
  });

  it('no other boss has one: their phases begin as soon as their HP share comes', () => {
    for (const [id, e] of Object.entries(LIVE.enemies)) {
      if (e.boss === null || id === 'unsung') continue;
      expect(
        e.boss.phases.map((p) => p.notBeforeTicks),
        id,
      ).toEqual(e.boss.phases.map(() => 0));
    }
  });
});
