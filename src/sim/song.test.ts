// The Leaving Song (T805; design/maps.md § 5.5; sim/song.ts): rest points inside the song, scatter
// and re-form outside it (Phase 2 only, D154), the trickle that keeps the countdown from stalling,
// C4's multipliers, a boss's damage feeding it, `restAll`, the Laid to Rest atom, and the
// allocation-free hot loop. Driven on the dev range's `dev_song` map (render/__fixtures__/devM8.ts)
// with its state set by hand: the choir's leader stands where each test puts it.
import { describe, expect, it } from 'vitest';
import type { CompiledEnemyDef, CompiledMapDef } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import { SCATTER_DRIFT_TILES } from '../content/rules.ts';
import type { IdSpace } from '../content/types.ts';
import { DEV_CONTENT } from '../render/__fixtures__/devBattle.ts';
import { applyDamage } from './combat/damage.ts';
import { evaluateCondition, settledCondition } from './conditions.ts';
import type { ScriptFlags } from './config.ts';
import { immune, outOfReach, untargetable } from './enemyAbilities/layers.ts';
import { ENEMY_BLANK, type Enemy } from './entities.ts';
import { placeOnRoute } from './path.ts';
import { poolAlloc } from './pool.ts';
import { restAll, restMultiplier, restProgress, song, SONG_PHASE } from './song.ts';
import { createState, takeUid, type SimState } from './state.ts';
import { enemySpeedPerTick } from './systems/movement.ts';
import { createScratch, type TickContext } from './tick.ts';
import { fixtureConfig } from './__fixtures__/sim.ts';

const DEV = compileContent(DEV_CONTENT);
const MAP: CompiledMapDef<IdSpace> = DEV.maps.dev_song!;
const SONG = MAP.song!;
const ROAD = MAP.routes.a!;
const MOTE = DEV.enemies.mote!; // Hollow, 25 HP, restValue 1, bounty 2
const KILL = { kind: 'tower', uid: 1 } as const;

function setup(flags: ScriptFlags = { quill_choice: 'keep' }): {
  state: SimState;
  ctx: TickContext;
} {
  const config = { ...fixtureConfig(), content: DEV, mapId: 'dev_song', scriptFlags: flags };
  const state = createState(MAP, 1);
  // The whole choir singing, its leader at the road's (6.5, 2.5): radius 2.5 (no Thrum).
  state.choir.singers = 10;
  state.choir.voices = 10;
  state.choir.x = 6.5;
  state.choir.y = 2.5;
  state.phase = SONG_PHASE;
  return { state, ctx: { content: DEV, map: MAP, config, scratch: createScratch() } };
}

/** A unit of `def` on the road at (6.5, `y`) (the road runs south from (6.5, 0.5)). */
function spawn(state: SimState, def: CompiledEnemyDef, y: number): Enemy {
  const e = poolAlloc(state.enemies, ENEMY_BLANK, takeUid(state));
  e.def = def;
  e.hp = def.hp;
  e.wave = 1;
  placeOnRoute(e, ROAD, y - 0.5);
  return e;
}

/** Kills `e` through the damage pipeline (as a tower would). */
function kill(state: SimState, e: Enemy): void {
  applyDamage(state, e, 10_000, 'kinetic', KILL);
}

const types = (state: SimState): string[] => state.events.map((e) => e.type);

describe('laid to rest inside the song (Phase 2)', () => {
  it('adds restValue × the multiplier, counts it, and leaves the unit dead', () => {
    const { state, ctx } = setup();
    const e = spawn(state, MOTE, 2.5); // at (6.5, 2.5): on the leader
    kill(state, e);
    state.events.length = 0;
    song(state, ctx);
    const trickle = SONG.restPerTick * 1.25;
    expect(state.restPoints).toBeCloseTo(1 * 1.25 + trickle, 12);
    expect(state.stats).toMatchObject({ restedKills: 1, scatteredKills: 0 });
    expect(state.events).toEqual([
      { type: 'LaidToRest', uid: e.uid, at: [e.x, e.y], points: 1.25 },
    ]);
    expect(e.alive).toBe(false);
    expect(e.scatterTicks).toBe(0);
  });

  it('counts the edge of the circle as inside (inclusive)', () => {
    const { state, ctx } = setup();
    const e = spawn(state, MOTE, 2.5 + 2.5); // 2.5 tiles south of the leader: on the rim
    kill(state, e);
    song(state, ctx);
    expect(state.stats.restedKills).toBe(1);
  });

  it('reads the song shrunk by hushed singers (the floor at silentPct)', () => {
    const { state, ctx } = setup();
    state.choir.voices = 0; // radius 2.5 × 0.6 = 1.5
    const near = spawn(state, MOTE, 2.5 + 1.4);
    const far = spawn(state, MOTE, 2.5 + 1.6);
    kill(state, near);
    kill(state, far);
    song(state, ctx);
    expect(state.stats).toMatchObject({ restedKills: 1, scatteredKills: 1 });
  });
});

describe('scattered outside the song (Phase 2 only)', () => {
  it('drifts back, lies out of play, and re-forms once at hpPct, paying no bounty again', () => {
    const { state, ctx } = setup();
    const e = spawn(state, MOTE, 6.5); // at (6.5, 6.5): 4 tiles from the leader
    const credits = state.credits;
    kill(state, e);
    expect(state.credits).toBe(credits + 2); // the first kill pays its bounty
    state.events.length = 0;
    song(state, ctx);
    expect(types(state)).toEqual(['Scattered']);
    expect(state.events[0]).toEqual({ type: 'Scattered', uid: e.uid, at: [6.5, 6.5] });
    expect(state.stats).toMatchObject({ restedKills: 0, scatteredKills: 1 });
    // Live again, at 0 HP, drifted back along its route, and out of play.
    expect(e.alive).toBe(true);
    expect(e.hp).toBe(0);
    expect(e.scatteredOnce).toBe(true);
    expect(e.scatterTicks).toBe(SONG.scatter.reformTicks);
    expect(e.dist).toBeCloseTo(6 - SCATTER_DRIFT_TILES, 12);
    expect([e.x, e.y]).toEqual([6.5, 4.5]);
    expect(untargetable(e) && outOfReach(e) && immune(e)).toBe(true);
    expect(enemySpeedPerTick(e)).toBe(0);
    expect(applyDamage(state, e, 100, 'kinetic', KILL)).toBe(0);

    // 4 s later (240 ticks) it re-forms at 50% HP, once.
    for (let t = 1; t < SONG.scatter.reformTicks; t++) song(state, ctx);
    expect(e.scatterTicks).toBe(1);
    state.events.length = 0;
    song(state, ctx);
    expect(types(state)).toEqual(['Reformed']);
    expect(e.hp).toBe(SONG.scatter.hpPct * MOTE.hp);
    expect(untargetable(e)).toBe(false);
    expect(enemySpeedPerTick(e)).toBeGreaterThan(0);

    // Broken outside again (the leader is far up the road): no bounty, and it falls for good.
    state.choir.y = 0;
    const before = state.credits;
    state.events.length = 0;
    kill(state, e);
    song(state, ctx);
    expect(state.credits).toBe(before);
    expect(state.events.find((v) => v.type === 'EnemyDied')).toMatchObject({ bounty: 0 });
    expect(types(state)).not.toContain('Scattered');
    expect(e.alive).toBe(false);
    expect(state.stats.scatteredKills).toBe(2);
  });

  it('a re-formed unit broken inside the song is laid to rest', () => {
    const { state, ctx } = setup();
    const e = spawn(state, MOTE, 6.5);
    kill(state, e);
    song(state, ctx);
    for (let t = 0; t < SONG.scatter.reformTicks; t++) song(state, ctx);
    state.choir.y = e.y; // the leader walks up to it
    kill(state, e);
    song(state, ctx);
    expect(state.stats).toMatchObject({ restedKills: 1, scatteredKills: 1 });
    expect(e.alive).toBe(false);
  });

  it('keeps the unit in its wave: live all through the scatter', () => {
    const { state, ctx } = setup();
    const e = spawn(state, MOTE, 6.5);
    const live = state.enemies.live;
    kill(state, e);
    expect(state.enemies.live).toBe(live - 1);
    song(state, ctx);
    expect(state.enemies.live).toBe(live);
  });

  it("re-forms a Maw at hpPct of its grown max HP (its absorbs')", () => {
    const { state, ctx } = setup();
    const e = spawn(state, MOTE, 6.5);
    e.bonusMaxHp = 15;
    kill(state, e);
    for (let t = 0; t <= SONG.scatter.reformTicks; t++) song(state, ctx);
    expect(e.hp).toBe(SONG.scatter.hpPct * (MOTE.hp + 15));
  });

  it('never touches a non-Hollow unit, a leak, or a hushed victim', () => {
    const { state, ctx } = setup();
    const skitter = spawn(state, DEV.enemies.nibbler!, 6.5);
    kill(state, skitter);
    const gone = spawn(state, MOTE, 6.5);
    gone.leaving = true; // a hush or a gather took it
    gone.alive = false;
    state.enemies.live--;
    song(state, ctx);
    expect(state.stats).toMatchObject({ restedKills: 0, scatteredKills: 0 });
    expect(skitter.alive).toBe(false);
    expect(gone.alive).toBe(false);
  });
});

describe('Phase 1 and Dawn: the song is silent', () => {
  it('rests nothing and scatters nothing outside Phase 2, and the trickle waits', () => {
    for (const phase of [1, 3]) {
      const { state, ctx } = setup();
      state.phase = phase;
      const inside = spawn(state, MOTE, 2.5);
      const outside = spawn(state, MOTE, 6.5);
      kill(state, inside);
      kill(state, outside);
      state.events.length = 0;
      song(state, ctx);
      expect(state.events).toEqual([]);
      expect(state.restPoints).toBe(0);
      expect(state.stats).toMatchObject({ restedKills: 0, scatteredKills: 0 });
      expect(outside.alive).toBe(false);
    }
  });

  it('does nothing on a map without a song', () => {
    const { state, ctx } = setup();
    const noSong = { ...ctx, map: { ...MAP, song: null } };
    const e = spawn(state, MOTE, 6.5);
    kill(state, e);
    song(state, noSong);
    expect(state.restPoints).toBe(0);
    expect(e.alive).toBe(false);
  });
});

describe('the trickle and the multipliers (C4)', () => {
  it('picks the first multiplier whose flag holds, else ×1', () => {
    expect(restMultiplier(SONG, { quill_choice: 'rewrite' })).toBe(1.5);
    expect(restMultiplier(SONG, { quill_choice: 'keep' })).toBe(1.25);
    expect(restMultiplier(SONG, { quill_choice: 'purge' })).toBe(1);
    expect(restMultiplier(SONG, {})).toBe(1);
  });

  it('a no-kill Phase 2 still ends: the trickle alone reaches p = 1, scaled by C4', () => {
    const ticksToDawn = (flags: ScriptFlags): number => {
      const { state, ctx } = setup(flags);
      let t = 0;
      while (restProgress(state) < 1 && t < 100_000) {
        song(state, ctx);
        t++;
      }
      expect(state.restPoints).toBe(state.restTarget); // capped at the target
      return t;
    };
    const keep = ticksToDawn({ quill_choice: 'keep' });
    const purge = ticksToDawn({ quill_choice: 'purge' });
    const rewrite = ticksToDawn({ quill_choice: 'rewrite' });
    // 40 points at 0.2/s: 200 s at ×1; Keep ×1.25 160 s; Rewrite ×1.5 ~133 s.
    const exact = SONG.restTarget / SONG.restPerTick; // 12000 (a float sum may take one more)
    expect(purge).toBeGreaterThanOrEqual(exact);
    expect(purge).toBeLessThanOrEqual(exact + 1);
    expect(keep / purge).toBeCloseTo(1 / 1.25, 3);
    expect(rewrite / purge).toBeCloseTo(1 / 1.5, 3);
    // The proportions maps.md § 5.5 states against Keep: Purge +25%, Rewrite −17%.
    expect(purge / keep).toBeCloseTo(1.25, 2);
    expect(rewrite / keep).toBeCloseTo(0.833, 2);
  });
});

describe("a boss's damage feeds the song", () => {
  const BOSS: CompiledEnemyDef = Object.freeze({
    ...MOTE,
    id: 'song_boss',
    hp: 1000,
    boss: Object.freeze({
      ...DEV.enemies.unsung!.boss!,
    }),
  });

  it('sums the hits on a song map and adds restPerBossHp × the multiplier inside the song', () => {
    const { state, ctx } = setup({ quill_choice: 'rewrite' });
    const boss = spawn(state, BOSS, 2.5);
    boss.bossPhase = 1;
    applyDamage(state, boss, 100, 'kinetic', KILL);
    applyDamage(state, boss, 50, 'kinetic', KILL);
    expect(boss.songDamage).toBe(150);
    song(state, ctx);
    const trickle = SONG.restPerTick * 1.5;
    expect(state.restPoints).toBeCloseTo(150 * SONG.restPerBossHp * 1.5 + trickle, 12);
    expect(boss.songDamage).toBe(0);
  });

  it('adds nothing for a boss outside the song, or outside Phase 2', () => {
    const { state, ctx } = setup();
    const boss = spawn(state, BOSS, 6.5);
    boss.bossPhase = 1;
    boss.songDamage = 500;
    song(state, ctx);
    expect(state.restPoints).toBeCloseTo(SONG.restPerTick * 1.25, 12);
    expect(boss.songDamage).toBe(0);
    state.phase = 1;
    boss.x = 6.5;
    boss.y = 2.5;
    boss.songDamage = 500;
    song(state, ctx);
    expect(state.restPoints).toBeCloseTo(SONG.restPerTick * 1.25, 12);
  });

  it('sums nothing on a map without a song (other maps keep their state)', () => {
    const state = createState({ ...MAP, song: null }, 1);
    const boss = spawn(state, BOSS, 2.5);
    boss.bossPhase = 1;
    applyDamage(state, boss, 100, 'kinetic', KILL);
    expect(boss.songDamage).toBe(0);
  });
});

describe('restAll (Dawn)', () => {
  it('lays every live Hollow unit to rest, a scattered one too, for no points or kills', () => {
    const { state, ctx } = setup();
    const walking = spawn(state, MOTE, 6.5);
    const scattered = spawn(state, MOTE, 7);
    kill(state, scattered);
    song(state, ctx); // it scatters
    const skitter = spawn(state, DEV.enemies.nibbler!, 1);
    const before = state.restPoints;
    state.events.length = 0;
    restAll(state, ctx);
    expect(state.events).toEqual([
      { type: 'LaidToRest', uid: walking.uid, at: [walking.x, walking.y], points: 0 },
      { type: 'LaidToRest', uid: scattered.uid, at: [scattered.x, scattered.y], points: 0 },
    ]);
    expect(walking.alive || scattered.alive).toBe(false);
    expect(walking.leaving && scattered.leaving).toBe(true); // cleanup books them to the wave alone
    expect(skitter.alive).toBe(true);
    expect(state.restPoints).toBe(before);
    expect(state.stats).toMatchObject({ restedKills: 0, scatteredKills: 1 });
  });
});

describe('the Laid to Rest atom ({ restedPct })', () => {
  it('reads rested ÷ all of Phase 2’s Hollow kills, false with none, judged when evaluated', () => {
    const { state, ctx } = setup();
    const c = { restedPct: 0.9 } as const;
    expect(evaluateCondition(c, state, ctx)).toBe(false);
    state.stats.restedKills = 9;
    state.stats.scatteredKills = 1;
    expect(evaluateCondition(c, state, ctx)).toBe(true);
    expect(settledCondition(c, state, ctx)).toBeNull();
    state.stats.scatteredKills = 2;
    expect(evaluateCondition(c, state, ctx)).toBe(false);
  });
});

describe('the hot loop', () => {
  it('allocates no entities and emits nothing while units wait to re-form', () => {
    const { state, ctx } = setup();
    for (let k = 0; k < 20; k++) kill(state, spawn(state, MOTE, 6 + k * 0.05));
    song(state, ctx); // all scatter
    const slots = state.enemies.items.length;
    state.events.length = 0;
    for (let t = 1; t < SONG.scatter.reformTicks; t++) song(state, ctx);
    expect(state.events).toEqual([]);
    expect(state.enemies.items.length).toBe(slots);
  });

  it('is deterministic: the same kills give the same state', () => {
    const run = (): string => {
      const { state, ctx } = setup();
      for (let k = 0; k < 10; k++) kill(state, spawn(state, MOTE, 1 + k * 0.6));
      for (let t = 0; t < 300; t++) song(state, ctx);
      return JSON.stringify({ p: state.restPoints, s: state.stats, ev: state.events });
    };
    expect(run()).toBe(run());
  });
});
