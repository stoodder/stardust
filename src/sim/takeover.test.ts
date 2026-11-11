// "Shareholder Value"'s phases (T707; design/enemies.md § 6, D146): the hangar (enemyAbilities/
// hangar.ts), Hostile Takeover (takeover.ts, in the jams slot), and the jettison (jettison.ts) with
// its plates through `openTile` (sim/openTile.ts; the script action and its refusal), on fx_map's
// 6×5 grid with the live boss, Hum Choir, and Rivet (towers placed directly: Hostile Takeover has
// no reach). The whole fight (dev_takeover), determinism, replays, and the cues:
// render/__fixtures__/devTakeover.test.ts.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { BOSS_MIN_TELL_SEC, JAM_MAX_TOWER_SHARE } from '../content/rules.ts';
import type { IdSpace } from '../content/types.ts';
import { secToTicks } from '../shared/time.ts';
import { MAP, placeTower, spawn } from './__fixtures__/combat.ts';
import { fixtureConfig } from './__fixtures__/sim.ts';
import { castReboot } from './abilities/reboot.ts';
import type { Modifier, SimConfig } from './config.ts';
import { enemyAbilities } from './enemyAbilities/index.ts';
import { bossDamage, enterBossPhase } from './enemyAbilities/bossPhases.ts';
import { hangarTelling } from './enemyAbilities/hangar.ts';
import { plateless } from './enemyAbilities/jettison.ts';
import { takeoverCount, takeoverPicks, takeoverTelling } from './enemyAbilities/takeover.ts';
import type { Enemy } from './entities.ts';
import type { SimEvent } from './events.ts';
import { FEATURE_GATES } from './gates.ts';
import { jams } from './jam.ts';
import { openedTile, openTile } from './openTile.ts';
import { createState, type SimState } from './state.ts';
import { links } from './systems/links.ts';
import { SCRIPT_GATES, runScriptAction, unsupportedScript } from './systems/triggers.ts';
import { waveModifiers } from './systems/waves.ts';
import { createScratch, type TickContext } from './tick.ts';

const LIVE: CompiledContent<IdSpace> = compileContent(RAW_CONTENT);
const SV = LIVE.enemies.shareholder_value!;
const [P1, P2, P3] = SV.boss!.phases;
const HANGAR = P1!.hangar!;
const TAKEOVER = P2!.takeover!;
const JETTISON = P3!.jettison!;
const CHOIR = LIVE.towers.choir!;
const RIVET = LIVE.towers.rivet!;
const PURGE = {
  kind: 'enemyStat',
  stat: 'armor',
  faction: 'everglow',
  flat: -2,
  source: 'c4:purge',
} as const satisfies Modifier;

function world(modifiers: readonly Modifier[] = []): { state: SimState; ctx: TickContext } {
  const config: SimConfig<IdSpace> = {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- fx_map's config, live content
    ...(fixtureConfig() as unknown as SimConfig<IdSpace>),
    content: LIVE,
    modifiers,
  };
  return {
    state: createState(MAP, config.seed),
    ctx: { content: LIVE, map: MAP, config, scratch: createScratch() },
  };
}

/** Runs `system` `n` times, a tick each; returns the events. */
function run(
  state: SimState,
  ctx: TickContext,
  n: number,
  system: (s: SimState, c: TickContext) => void = jams,
): SimEvent<IdSpace>[] {
  const out: SimEvent<IdSpace>[] = [];
  for (let i = 0; i < n; i++) {
    system(state, ctx);
    state.tick++;
    out.push(...state.events);
    state.events.length = 0;
  }
  return out;
}

/** The boss at dist 1 in `phase` (no invulnerability), its events drained. */
function bossIn(state: SimState, phase: number): Enemy {
  const boss = spawn(state, SV, { dist: 1 });
  enterBossPhase(state, boss, SV.boss!, phase, false);
  state.events.length = 0;
  return boss;
}

const TILES = [
  [0, 1],
  [1, 1],
  [3, 1],
  [4, 2],
  [1, 3],
  [5, 0],
  [0, 3],
  [4, 0],
  [5, 2],
] as const;

/** A compiled map event opening marker `rock` to `to` at tick 10. */
function openEvent(to: 'x' | 'o') {
  return {
    id: 'open',
    on: { tick: 10 },
    when: null,
    once: true,
    actions: [{ openTile: 'rock', to }],
  } as const;
}

/** fx_map with that one event. */
function openMap(to: 'x' | 'o'): CompiledMapDef<IdSpace> {
  return { ...MAP, events: [openEvent(to)] };
}

describe('the phases’ data and gates (D146)', () => {
  it('2 drones every 8 s; a 3 s laser, a 4 s jam, every 15 s; armor 0, Haste 40%, four plates', () => {
    expect(HANGAR).toEqual({ enemy: 'compliance', count: 2, everyTicks: 480 });
    expect(TAKEOVER).toEqual({ tellTicks: 180, durationTicks: 240, everyTicks: 900 });
    expect(JETTISON).toEqual({
      hastePct: 0.4,
      plates: ['crash_1', 'crash_2', 'crash_3', 'crash_4'],
    });
    expect([SV.hp, SV.armor, SV.boss!.ending]).toEqual([4500, 15, 'driveOff']);
    // Every boss ability tells for at least BOSS_MIN_TELL_SEC: the laser, and the hangar's door.
    expect(TAKEOVER.tellTicks).toBeGreaterThanOrEqual(secToTicks(BOSS_MIN_TELL_SEC));
    for (const key of ['hangar', 'takeover', 'jettison'] as const) {
      expect(FEATURE_GATES[`enemy.boss.${key}`]).toBeNull();
    }
    expect(Object.hasOwn(SCRIPT_GATES, 'openTile')).toBe(false);
  });
});

describe('Hostile Takeover (takeover.ts)', () => {
  it('jams min(2, floor(25% of towers placed)): never past the jam limit', () => {
    expect([0, 3, 4, 7, 8, 12, 40].map(takeoverCount)).toEqual([0, 0, 1, 1, 2, 2, 2]);
    for (let n = 0; n <= 40; n++)
      expect(takeoverCount(n)).toBeLessThanOrEqual(JAM_MAX_TOWER_SHARE * n);
  });

  it('picks the highest tiers it may jam, ties to the lowest uid, anywhere on the map', () => {
    const { state } = world();
    const t = TILES.map(([c, r], i) => placeTower(state, RIVET, c, r, i === 2 || i === 5 ? 3 : 1));
    // Eight towers placed (the ninth comes below): two picks, the two tier 3s.
    t.pop()!.alive = false;
    expect(takeoverPicks(state)).toEqual([t[2]!.uid, t[5]!.uid]);
    t[5]!.tier = 4; // a spec counts 4
    expect(takeoverPicks(state)).toEqual([t[5]!.uid, t[2]!.uid]);
    // Jammed and immune towers are skipped (a Rally Chorus's jamMul 0 is immunity too).
    t[5]!.jamTicks = 10;
    t[2]!.jamImmuneTicks = 10;
    expect(takeoverPicks(state)).toEqual([t[0]!.uid, t[1]!.uid]);
    t[0]!.jamMul = 0;
    expect(takeoverPicks(state)).toEqual([t[1]!.uid, t[3]!.uid]);
    // Fewer than four towers placed: no pick.
    for (const x of t.slice(3)) x.alive = false;
    expect(takeoverPicks(state)).toEqual([]);
  });

  it('lasers 3 s as the phase begins (after its invulnerability), jams 4 s, again every 15 s', () => {
    const { state, ctx } = world();
    const ts = TILES.slice(0, 4).map(([c, r]) => placeTower(state, RIVET, c, r));
    ts[3]!.tier = 2;
    const boss = spawn(state, SV, { dist: 1 });
    enterBossPhase(state, boss, SV.boss!, 2, true); // a phase change: 1.5 s invulnerable
    state.events.length = 0;
    // The invulnerability counts down in the abilities slot; the laser waits through it.
    for (let i = 0; i < 89; i++) {
      boss.invulnerableTicks--;
      expect(run(state, ctx, 1)).toEqual([]);
    }
    boss.invulnerableTicks--;
    expect(boss.invulnerableTicks).toBe(0);
    expect(run(state, ctx, 1)).toEqual([
      { type: 'TakeoverTell', uid: boss.uid, towers: [ts[3]!.uid] },
    ]);
    expect(takeoverTelling(boss)).toBe(true);
    expect(run(state, ctx, TAKEOVER.tellTicks - 1)).toEqual([]);
    expect(run(state, ctx, 1)).toEqual([
      { type: 'TowerJammed', uid: ts[3]!.uid, ticks: 240, source: boss.uid },
    ]);
    expect(takeoverTelling(boss)).toBe(false);
    expect(ts[3]!.jammedBy).toBe(boss.uid);
    // The next laser starts 15 s after the first began (the jam and its immunity long over, so
    // the same tower is taken again).
    const next = run(state, ctx, TAKEOVER.everyTicks - TAKEOVER.tellTicks - 1);
    expect(next.map((e) => e.type)).toEqual(['TowerUnjammed']);
    expect(run(state, ctx, 1)[0]).toMatchObject({ type: 'TakeoverTell', towers: [ts[3]!.uid] });
    expect(state.stats.takeoverJamTicks).toBe(240); // Declined missed: 4 s
  });

  it('Declined: a Choir at T3 holds a jam to 1 s (60 ticks); so does a Reboot on the laser', () => {
    // Eight towers: the tier-3 Choir and the tier-3 Rivet beside it are both taken. No Choir aura
    // covers a Choir, so its own jam is 4 s; the Rivet's is 1 s.
    const { state, ctx } = world();
    const choir = placeTower(state, CHOIR, 3, 1, 3);
    const guarded = placeTower(state, RIVET, 1, 1, 3); // within the Choir's 2 tiles
    for (const [c, r] of TILES.slice(3, 9)) placeTower(state, RIVET, c, r);
    state.linksDirty = true;
    links(state, ctx);
    state.events.length = 0;
    const boss = bossIn(state, 2);
    expect(run(state, ctx, 1)).toEqual([
      { type: 'TakeoverTell', uid: boss.uid, towers: [choir.uid, guarded.uid] },
    ]);
    const landed = run(state, ctx, TAKEOVER.tellTicks);
    expect(landed.filter((e) => e.type === 'TowerJammed')).toEqual([
      { type: 'TowerJammed', uid: choir.uid, ticks: 240, source: boss.uid },
      { type: 'TowerJammed', uid: guarded.uid, ticks: 60, source: boss.uid },
    ]);
    run(state, ctx, 400);
    expect(state.stats.takeoverJamTicks).toBe(240); // the Choir's own: Declined missed

    // With the Choir out of reach of a jam (its immunity), only the guarded Rivet: Declined.
    const solo = world();
    const c = placeTower(solo.state, CHOIR, 3, 1, 3);
    placeTower(solo.state, RIVET, 1, 1, 3);
    for (const [col, row] of TILES.slice(3, 5)) placeTower(solo.state, RIVET, col, row);
    solo.state.linksDirty = true;
    links(solo.state, solo.ctx);
    c.jamImmuneTicks = 5000;
    bossIn(solo.state, 2);
    run(solo.state, solo.ctx, 1 + TAKEOVER.tellTicks + 300);
    expect(solo.state.stats.takeoverJamTicks).toBe(60);

    // A Reboot during the laser: nothing lands (Declined); one 30 ticks after it lands: 31 ticks.
    for (const [castAt, held] of [
      [100, 0],
      [1 + TAKEOVER.tellTicks + 30, 31],
    ] as const) {
      const w = world();
      for (const [col, row] of TILES.slice(0, 4)) placeTower(w.state, RIVET, col, row);
      bossIn(w.state, 2);
      run(w.state, w.ctx, castAt);
      castReboot(w.state, { kind: 'reboot', immuneTicks: 360 });
      run(w.state, w.ctx, 400);
      expect(w.state.stats.takeoverJamTicks, `cast at ${castAt}`).toBe(held);
    }
  });

  it('Unnerved interrupts the laser: the period restarts; a Stasis doesn’t (a boss’s is a chill)', () => {
    const { state, ctx } = world();
    for (const [c, r] of TILES.slice(0, 4)) placeTower(state, RIVET, c, r);
    const boss = bossIn(state, 2);
    run(state, ctx, 50);
    boss.stasisTicks = 20;
    expect(run(state, ctx, 1)).toEqual([]);
    expect(takeoverTelling(boss)).toBe(true);
    boss.stasisTicks = 0;
    boss.unnervedTicks = 5;
    expect(run(state, ctx, 1)).toEqual([{ type: 'JamInterrupted', uid: boss.uid }]);
    expect([boss.jamTellTicks, boss.jamTicks, boss.takeoverTowers]).toEqual([0, 900, []]);
    boss.unnervedTicks = 0;
    const after = run(state, ctx, TAKEOVER.everyTicks - TAKEOVER.tellTicks);
    expect(after).toEqual([{ type: 'TakeoverTell', uid: boss.uid, towers: expect.any(Array) }]);
  });

  it('drops a laser when the phase ends (the jettison); its landed jams hold', () => {
    const { state, ctx } = world();
    for (const [c, r] of TILES.slice(0, 4)) placeTower(state, RIVET, c, r);
    const boss = bossIn(state, 2);
    run(state, ctx, 10);
    expect(takeoverTelling(boss)).toBe(true);
    enterBossPhase(state, boss, SV.boss!, 3, true);
    state.events.length = 0;
    expect(run(state, ctx, TAKEOVER.tellTicks)).toEqual([]);
    expect(takeoverTelling(boss)).toBe(false);
  });
});

describe('the hangar (hangar.ts)', () => {
  it('launches 2 drones every 8 s through broodDef (Purge reaches them); Unnerved cancels one', () => {
    const { state, ctx } = world([PURGE]);
    const scaled = waveModifiers([PURGE], Object.values(LIVE.enemies)).enemies;
    const boss = spawn(state, scaled.get('shareholder_value')!, { dist: 1 });
    const out = run(state, ctx, HANGAR.everyTicks - 1, enemyAbilities);
    expect(out.map((e) => e.type)).toEqual(['BossPhase']);
    expect(hangarTelling(boss, HANGAR)).toBe(true); // the door: the last 1.5 s
    const launch = run(state, ctx, 1, enemyAbilities);
    expect(launch.map((e) => e.type)).toEqual(['EnemySpawned', 'EnemySpawned']);
    const drones = state.enemies.items.filter((e) => e.alive && e.def?.id === 'compliance');
    expect(drones).toHaveLength(2);
    expect(drones.map((d) => [d.def!.armor, d.def!.openPanel, d.wave])).toEqual([
      [LIVE.enemies.compliance!.armor - 2, true, boss.wave],
      [LIVE.enemies.compliance!.armor - 2, true, boss.wave],
    ]);
    // The next door opens 8 s on; Unnerved in its tell cancels it and the full 8 s restarts.
    run(state, ctx, HANGAR.everyTicks - 30, enemyAbilities);
    expect(hangarTelling(boss, HANGAR)).toBe(true);
    boss.unnervedTicks = 3;
    run(state, ctx, 1, enemyAbilities);
    expect(boss.abilityTicks).toBe(HANGAR.everyTicks);
    boss.unnervedTicks = 0;
    const later = run(state, ctx, HANGAR.everyTicks, enemyAbilities);
    expect(later.filter((e) => e.type === 'EnemySpawned')).toHaveLength(2);
  });
});

describe('the jettison (jettison.ts) and its plates (openTile.ts)', () => {
  it('at 33% the plating goes once: armor 0 over Purge, Haste 40%, four plates as wreckage', () => {
    const { state, ctx } = world([PURGE]);
    const scaled = waveModifiers([PURGE], Object.values(LIVE.enemies)).enemies;
    const def = scaled.get('shareholder_value')!;
    expect(def.armor).toBe(13);
    const boss = spawn(state, def, { dist: 1 });
    enterBossPhase(state, boss, SV.boss!, 2, false);
    boss.hp = 0.66 * def.hp;
    bossDamage(state, boss, 4000); // to 33%: phase 3 begins
    expect(boss.bossPhase).toBe(3);
    state.events.length = 0;
    const out = run(state, ctx, 1, enemyAbilities);
    expect(out).toEqual([
      { type: 'Jettisoned', uid: boss.uid },
      ...JETTISON.plates.map((m) => ({ type: 'TileOpened', marker: m, to: 'x' })),
    ]);
    expect([boss.jettisoned, boss.def!.armor, boss.def!.openPanel, boss.def!.hp]).toEqual([
      true,
      0,
      true,
      def.hp,
    ]);
    expect(boss.paceMul).toBeCloseTo(1.4);
    expect(state.tilesOpened).toEqual(['crash_1', 'crash_2', 'crash_3', 'crash_4']);
    expect(openedTile(state, 'crash_2')).toBe('x');
    // Once: the next ticks only haste it.
    expect(run(state, ctx, 30, enemyAbilities)).toEqual([]);
    expect(boss.paceMul).toBeCloseTo(1.4);
    expect(plateless(boss.def!)).toBe(boss.def);
  });

  it('openTile: once per marker; the script action runs; to a buildable tile waits for M8', () => {
    const { state } = world();
    expect(openTile(state, 'rock', 'x')).toBe(true);
    expect(openTile(state, 'rock', '.')).toBe(false);
    expect(openedTile(state, 'rock')).toBe('x');
    expect(openedTile(state, 'nowhere')).toBeNull();
    state.events.length = 0;
    runScriptAction(state, { openTile: 'crash', to: 'x' }, MAP);
    expect(state.events).toEqual([{ type: 'TileOpened', marker: 'crash', to: 'x' }]);
    expect(unsupportedScript(openMap('x'))).toEqual([]);
    expect(unsupportedScript(openMap('o'))).toEqual([
      "event 'open': action openTile to buildable 'o' is not simulated until M8",
    ]);
  });
});
