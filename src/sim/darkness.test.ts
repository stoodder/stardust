// Sundown's darkness (T505; sim/darkness.ts's header; design/maps.md § 5.1; D137): the level eases
// in sim ticks from the lighting keys, deterministically, and replays from a log identically; a
// tower outside every light loses DARK_RANGE_PENALTY × dark of its range (targeting, towerStats);
// lamps and a beaming Prism light the towers within their radius, a dark or sold Prism doesn't; a
// map without darkness is untouched.
import { describe, expect, it } from 'vitest';
import type { CompiledContent } from '../content/compiled.ts';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { DARK_RANGE_PENALTY, LAMP_RADIUS_TILES } from '../content/rules.ts';
import type { LightingKeyDef, LightDef } from '../content/types.ts';
import { GUN, placeTower, setup } from './__fixtures__/combat.ts';
import {
  FIXTURE_CONTENT,
  SIM_FIXTURE,
  fixtureConfig,
  type FixtureIds,
} from './__fixtures__/sim.ts';
import { bonusRangeTiles } from './bonuses.ts';
import type { CommandLogEntry } from './commands.ts';
import {
  DARK_EASE_TICKS,
  darkAt,
  darkDims,
  darkRangeMul,
  darkTarget,
  darkness,
  hasDarkness,
  isLitAt,
} from './darkness.ts';
import type { SimEvent } from './events.ts';
import { poolKill } from './pool.ts';
import { createSim, type Sim } from './sim.ts';
import { createState } from './state.ts';
import { rangeOf } from './systems/towers.ts';
import { lineLengthTiles, type LineAttack } from './attacks/line.ts';
import { towerStats } from './towerStats.ts';

const LIVE = compileContent(RAW_CONTENT);
const PRISM = LIVE.towers.prism;
const LANTERN = LIVE.towers.lantern;
const LOOKOUT = LIVE.towers.lookout;
const HARPOON = LIVE.towers.harpoon;
const SKEWER = HARPOON.specs!.a;

/** fx_map at Sundown: half dark at W1, full at W2; a lamp on the rock (0,2) at the rule radius. */
function darkContent(
  lighting: readonly LightingKeyDef[] = [
    { wave: 1, env: 'act2.dusk', dark: 0.5 },
    { wave: 2, env: 'act2.dusk', dark: 1 },
  ],
  lights: readonly LightDef[] = [{ marker: 'rock' }],
): CompiledContent<FixtureIds> {
  const fx = SIM_FIXTURE.maps.fx_map;
  return compileContent({ ...SIM_FIXTURE, maps: { fx_map: { ...fx, lighting, lights } } });
}

const DARK = darkContent();
const DARK_MAP = DARK.maps.fx_map;

/** A bare state and tick context on the Sundown fx_map (combat.ts's setup, with its map). */
function darkSetup(): ReturnType<typeof setup> {
  const { ctx } = setup();
  return { state: createState(DARK_MAP, 1), ctx: { ...ctx, content: DARK, map: DARK_MAP } };
}

const keys = (pairs: readonly (readonly [number, number])[]) =>
  pairs.map(([wave, dark]) => ({ wave, env: 'act2.dusk' as const, dark }));

describe('the darkness level', () => {
  it('is 0 before wave 1, each key at its wave, equal steps per wave between, the last after', () => {
    const k = keys([
      [3, 0.6],
      [5, 1],
    ]);
    const want = [0, 0.2, 0.4, 0.6, 0.8, 1, 1];
    for (const [i, w] of [0, 1, 2, 3, 4, 5, 9].entries()) {
      expect(darkTarget(k, w), `wave ${w}`).toBeCloseTo(want[i]!, 12);
    }
    expect(darkTarget([], 4)).toBe(0);
  });

  it('eases linearly over 4 s of sim time as a wave starts (the tint fade’s length)', () => {
    expect(DARK_EASE_TICKS).toBe(240); // render/vfx/lighting.ts LIGHT_FADE_TICKS (its test)
    const k = keys([[1, 0.5]]);
    expect(darkAt(k, [100], 0, 500)).toBe(0);
    expect(darkAt(k, [100], 1, 100)).toBe(0);
    expect(darkAt(k, [100], 1, 160)).toBe(0.125);
    expect(darkAt(k, [100], 1, 340)).toBe(0.5);
    expect(darkAt(k, [100], 1, 9000)).toBe(0.5);
  });

  it('eases on from where it stood when a wave starts mid-ease, never jumping', () => {
    const k = keys([
      [1, 0.5],
      [2, 1],
    ]);
    // W1 starts at 0 and W2 120 ticks later, halfway through W1's ease (0.25).
    expect(darkAt(k, [0, 120], 1, 120)).toBe(0.25);
    expect(darkAt(k, [0, 120], 2, 120)).toBe(0.25);
    expect(darkAt(k, [0, 120], 2, 240)).toBe(0.625);
    expect(darkAt(k, [0, 120], 2, 360)).toBe(1);
  });
});

describe('light and range', () => {
  it('lamps take LAMP_RADIUS_TILES by default; a map with neither dark nor lamps has none', () => {
    expect(LAMP_RADIUS_TILES).toBe(1.5);
    expect(DARK_MAP.lights).toEqual([
      { marker: 'rock', x: 0.5, y: 2.5, radiusTiles: 1.5, radiusSq: 2.25 },
    ]);
    expect(hasDarkness(DARK_MAP)).toBe(true);
    expect(hasDarkness(FIXTURE_CONTENT.maps.fx_map)).toBe(false);
  });

  it('an unlit tower loses 15% × dark of its range; a lamp-lit one keeps it all', () => {
    const { state, ctx } = darkSetup();
    const lit = placeTower(state, GUN, 1, 1); // (1.5, 1.5): √2 from the rock's lamp
    const unlit = placeTower(state, GUN, 3, 1); // (3.5, 1.5): 3.2 away
    state.wave = 2;
    state.schedule.startTick[0] = -500;
    state.schedule.startTick[1] = -300; // both eased in: full dark
    darkness(state, ctx);
    expect(state.dark).toBe(1);
    expect([lit.lit, lit.darkRangePct]).toEqual([true, 0]);
    expect([unlit.lit, unlit.darkRangePct]).toEqual([false, DARK_RANGE_PENALTY]);
    const attack = GUN.tiers[0].attack!;
    expect(rangeOf(ctx, lit, attack)).toBe(attack); // untouched: the attack's own fields
    expect(rangeOf(ctx, unlit, attack).rangeSq).toBeCloseTo((3 * 0.85) ** 2, 12);
    expect(bonusRangeTiles(attack, unlit)).toBeCloseTo(2.55, 12);
    // The HUD reads the same range (towerStats under the tower's own fields).
    expect(towerStats(GUN, 1, lit).rangeTiles).toBe(3);
    expect(towerStats(GUN, 1, unlit).rangeTiles).toBe(2.55);
    expect(darkRangeMul(0.5, false)).toBe(1 - 0.075);
    expect(darkRangeMul(1, true)).toBe(1);
  });

  it('the penalty multiplies after the stacking formula (outside the range cap)', () => {
    const { state, ctx } = darkSetup();
    const t = placeTower(state, GUN, 3, 1);
    t.pctRange = 0.25; // high ground
    state.wave = 1;
    state.schedule.startTick[0] = -1000;
    darkness(state, ctx);
    expect(state.dark).toBe(0.5);
    expect(bonusRangeTiles(GUN.tiers[0].attack!, t)).toBeCloseTo(3 * 1.25 * (1 - 0.075), 12);
  });

  it('a beaming Prism lights towers within 2.0; dark, or sold, it lights nothing', () => {
    const { state, ctx } = darkSetup();
    state.wave = 2;
    state.schedule.startTick[0] = -500;
    state.schedule.startTick[1] = -300;
    const prism = placeTower(state, PRISM, 4, 2); // (4.5, 2.5)
    const near = placeTower(state, GUN, 3, 1); // (3.5, 1.5): √2 from the Prism
    darkness(state, ctx);
    expect([prism.lit, near.lit]).toEqual([false, false]);
    expect(towerStats(PRISM, 1, prism).rangeTiles).toBe(2.55);
    prism.beamActive = true;
    darkness(state, ctx);
    expect([prism.lit, near.lit]).toEqual([true, true]); // a beaming Prism lights itself too
    expect([prism.darkRangePct, near.darkRangePct]).toEqual([0, 0]);
    expect(isLitAt(DARK_MAP.lights, state.towers, 4.5 + 2, 2.5)).toBe(true); // the edge is lit
    expect(isLitAt(DARK_MAP.lights, state.towers, 4.5 + 2.01, 2.5)).toBe(false);
    poolKill(state.towers, prism); // sold: no BeamChanged off, but no longer alive
    darkness(state, ctx);
    expect(near.lit).toBe(false);
  });
});

/** Full dark, every tower placed far from the rock's lamp. */
function fullDark(): ReturnType<typeof darkSetup> {
  const set = darkSetup();
  set.state.wave = 2;
  set.state.schedule.startTick[0] = -500;
  set.state.schedule.startTick[1] = -300;
  return set;
}

describe('what the dark dims (D138)', () => {
  it('a tower with no attack keeps its numbers (no penalty, so no dark line)', () => {
    const { state, ctx } = fullDark();
    const look = placeTower(state, LOOKOUT, 4, 3);
    darkness(state, ctx);
    expect([look.lit, look.darkRangePct]).toEqual([false, 0]);
    expect(darkDims(LOOKOUT.tiers[0])).toBe(false);
    expect(darkDims(null)).toBe(false);
  });

  it("the Seer's Lantern's beam keeps its reach: it marks as far as it reveals", () => {
    const { state, ctx } = fullDark();
    const lantern = placeTower(state, LANTERN, 4, 3);
    darkness(state, ctx);
    expect([lantern.lit, lantern.darkRangePct]).toEqual([false, 0]);
    const attack = lantern.tierDef!.attack!;
    expect(bonusRangeTiles(attack, lantern)).toBe(lantern.tierDef!.detect!.radiusTiles);
    expect(darkDims(LANTERN.tiers[0])).toBe(false);
    expect(darkDims(GUN.tiers[0])).toBe(true);
  });

  it("a Skewer's line shrinks with its reach in the dark, with no other range bonus", () => {
    const { state, ctx } = fullDark();
    const t = placeTower(state, HARPOON, 4, 3, SKEWER);
    darkness(state, ctx);
    expect(t.darkRangePct).toBe(DARK_RANGE_PENALTY);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the Skewer's attack is a line
    const line = SKEWER.attack as LineAttack;
    expect(line.kind).toBe('line');
    expect(lineLengthTiles(line, t)).toBeCloseTo(line.lengthTiles * (1 - DARK_RANGE_PENALTY), 12);
    t.darkRangePct = 0;
    expect(lineLengthTiles(line, t)).toBe(line.lengthTiles);
  });

  it("a pulse's radius shrinks in the dark too (the Sprinkler's ring)", () => {
    const { state, ctx } = fullDark();
    const sprinkler = LIVE.towers.sprinkler;
    const t = placeTower(state, sprinkler, 4, 3);
    darkness(state, ctx);
    const attack = sprinkler.tiers[0].attack!;
    expect(attack.kind).toBe('pulse');
    expect(rangeOf(ctx, t, attack).rangeSq).toBeCloseTo(
      (attack.rangeTiles * (1 - DARK_RANGE_PENALTY)) ** 2,
      12,
    );
  });
});

/** Steps `sim` to tick `ticks`, enqueuing each logged command just before its tick runs. */
function replay(
  sim: Sim<FixtureIds>,
  log: readonly CommandLogEntry<FixtureIds>[],
  ticks: number,
): Sim<FixtureIds> {
  while (sim.state.tick < ticks && sim.state.outcome === 'playing') {
    for (const e of log) if (e.tick === sim.state.tick) sim.enqueue(e.cmd);
    sim.step();
  }
  return sim;
}

const config = () => fixtureConfig({ content: DARK, loadout: ['fx_gun'] });

/** Builds a gun by the lamp, calls W1, then W2 as soon as W1 has spawned. */
function play(
  ticks: number,
  darks: number[] = [],
): { sim: Sim<FixtureIds>; events: SimEvent<FixtureIds>[] } {
  const sim = createSim(config());
  const events: SimEvent<FixtureIds>[] = [];
  sim.enqueue({ type: 'build', tile: [1, 1], tower: 'fx_gun' });
  sim.enqueue({ type: 'callWave' });
  while (sim.state.tick < ticks && sim.state.outcome === 'playing') {
    if (sim.state.wave === 1 && sim.state.schedule.phase !== 'spawning') {
      sim.enqueue({ type: 'callWave' });
    }
    sim.step();
    sim.drainEvents(events);
    darks.push(sim.state.dark);
  }
  return { sim, events };
}

describe('the darkness system in a run', () => {
  it('eases in ticks, shifts on each wave start, and lights the lamp-side tower', () => {
    const { sim, events } = play(1200);
    const s = sim.state;
    expect(s.wave).toBe(2);
    const shifts = events.filter((e) => e.type === 'DarknessShift');
    expect(shifts).toEqual([
      { type: 'DarknessShift', wave: 1, dark: 0.5 },
      { type: 'DarknessShift', wave: 2, dark: 1 },
    ]);
    // W2 was called mid-ease (W1 spawns its three in 1.6 s), and the dark kept going up.
    const [w1, w2] = s.schedule.startTick;
    expect(w2! - w1!).toBeLessThan(DARK_EASE_TICKS);
    expect(s.dark).toBe(1);
    const tower = s.towers.items[0]!;
    expect([tower.lit, tower.darkRangePct]).toEqual([true, 0]);
  });

  it('is the same at every tick in two runs, and replays from the log identically', () => {
    const darks: number[] = [];
    const a = play(900, darks).sim;
    expect(play(900).sim.hash()).toBe(a.hash());
    // A replay of the log (a checkpoint's resume) passes through every tick of the ease alike.
    const r = createSim(config());
    for (let t = 1; t <= a.state.tick; t++) {
      replay(r, a.state.commandLog, t);
      expect(r.state.dark, `tick ${t}`).toBe(darks[t - 1]);
    }
    expect(r.hash()).toBe(a.hash());
    // Monotonic here (its keys only darken), and never faster than the whole range in one ease.
    expect(darks.at(-1)).toBe(1);
    for (let i = 1; i < darks.length; i++) {
      expect(darks[i]!).toBeGreaterThanOrEqual(darks[i - 1]!);
      expect(darks[i]! - darks[i - 1]!).toBeLessThanOrEqual(1 / DARK_EASE_TICKS + 1e-12);
    }
  });

  it('does nothing on a map without darkness (every earlier map’s numbers hold)', () => {
    const { state, ctx } = setup();
    const t = placeTower(state, GUN, 3, 1);
    state.wave = 2;
    state.schedule.startTick[0] = 0;
    state.schedule.startTick[1] = 10;
    darkness(state, ctx);
    expect([state.dark, t.lit, t.darkRangePct, state.events.length]).toEqual([0, true, 0, 0]);
    // Every live map but Sundown itself (A2M6, once T522 registers it) is without darkness.
    const sundown: string = 'a2_m06';
    for (const map of Object.values(LIVE.maps)) {
      const id: string = map.id;
      if (id === sundown) continue;
      expect(hasDarkness(map), id).toBe(false);
    }
  });
});
