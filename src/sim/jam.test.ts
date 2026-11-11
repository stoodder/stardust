// The jamming core (T702; design/enemies.md § 4, D146): the Jammed state (sim/jam.ts), the
// Silencer's tendril (enemyAbilities/jamTendril.ts), and System Reboot (abilities/reboot.ts), on
// fx_map's 6×5 grid with the live Silencer, Hum Choir, Rivet, and Mindspike (towers are placed
// directly; reach is centre to centre). fx_map's road runs (0.5, 0.5) → (2.5, 0.5) → (2.5, 3.5) →
// …; a Silencer at dist 2 stands at (2.5, 0.5), where (1,1), (3,1), and (3,2) are in its 2.5-tile
// reach and (4,2) and (1,3) aren't. The whole map (dev_silence), System Reboot cast through a
// command, upgrades and sells, and harness #10: tools/devJam.test.ts.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent, CompiledTier } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { JAM_IMMUNITY_SEC, JAM_MAX_SEC } from '../content/rules.ts';
import type { IdSpace } from '../content/types.ts';
import { MAP, placeTower, spawn } from './__fixtures__/combat.ts';
import { fixtureConfig } from './__fixtures__/sim.ts';
import { castReboot } from './abilities/reboot.ts';
import { pickTendrilTarget, tendrilTelling } from './enemyAbilities/jamTendril.ts';
import type { Enemy, Tower } from './entities.ts';
import type { SimEvent } from './events.ts';
import { FEATURE_GATES } from './gates.ts';
import {
  canJam,
  JAM_IMMUNITY_TICKS,
  JAM_MAX_TICKS,
  jamImmune,
  jams,
  jamTicksFor,
  jamTower,
} from './jam.ts';
import { createState, type SimState } from './state.ts';
import { links } from './systems/links.ts';
import { lullPass } from './systems/status.ts';
import { towers } from './systems/towers.ts';
import { createScratch, type TickContext } from './tick.ts';

const LIVE: CompiledContent<IdSpace> = compileContent(RAW_CONTENT);
const SILENCER = LIVE.enemies.silencer!;
const JAM = SILENCER.jam!;
const CHOIR = LIVE.towers.choir!;
const RIVET = LIVE.towers.rivet!;
const MINDSPIKE = LIVE.towers.mindspike!;
const LULLABY: CompiledTier = CHOIR.specs!.a;
const RALLY: CompiledTier = CHOIR.specs!.b;
const WAIT = JAM.periodTicks - JAM.tellTicks; // 600: the first tell starts this long after the spawn

function world(): { state: SimState; ctx: TickContext } {
  const config = fixtureConfig();
  return {
    state: createState(MAP, config.seed),
    ctx: { content: LIVE, map: MAP, config, scratch: createScratch() },
  };
}

/** Recomputes the links and auras (as a build would), then drains the events. */
function relink(state: SimState, ctx: TickContext): void {
  state.linksDirty = true;
  links(state, ctx);
  state.events.length = 0;
}

/** Runs the jams slot `n` times, a tick each; returns the events (by type). */
function run(state: SimState, ctx: TickContext, n: number): SimEvent<IdSpace>[] {
  const out: SimEvent<IdSpace>[] = [];
  for (let i = 0; i < n; i++) {
    jams(state, ctx);
    state.tick++;
    out.push(...state.events);
    state.events.length = 0;
  }
  return out;
}

/** Two Silencers among three Rivets for 3000 ticks: each event's type, in order. */
function trace(): string {
  const { state, ctx } = world();
  for (const [c, r] of [
    [1, 1],
    [3, 1],
    [3, 2],
  ] as const) {
    placeTower(state, RIVET, c, r);
  }
  spawn(state, SILENCER, { dist: 2 });
  spawn(state, SILENCER, { dist: 2.2 });
  return JSON.stringify(run(state, ctx, 3000).map((ev) => ev.type));
}

const types = (events: readonly SimEvent<IdSpace>[]): string[] => events.map((e) => e.type);

describe('the Jammed state (enemies.md § 4; sim/jam.ts)', () => {
  it('lands for its ticks counting the tick it lands, then JAM_IMMUNITY_SEC of immunity', () => {
    const { state, ctx } = world();
    const t = placeTower(state, RIVET, 3, 1);
    expect(jamTower(state, t, 240, 99)).toBe(240);
    expect([t.jamTicks, t.jammedBy, state.linksDirty]).toEqual([240, 99, true]);
    expect(state.events).toEqual([{ type: 'TowerJammed', uid: t.uid, ticks: 240, source: 99 }]);
    state.events.length = 0;
    // The tick it landed was its first: 239 more passes, then the jam ends on the 240th.
    let jammedTicks = 1;
    for (let i = 0; i < 300 && t.jamTicks > 0; i++) {
      run(state, ctx, 1);
      if (t.jamTicks > 0) jammedTicks++;
    }
    expect(jammedTicks).toBe(240);
    expect([t.jamTicks, t.jammedBy, t.jamImmuneTicks]).toEqual([0, 0, JAM_IMMUNITY_TICKS]);
    expect(JAM_IMMUNITY_TICKS).toBe(JAM_IMMUNITY_SEC * 60);
    // Immune for 6 s counting the tick it ended: no jam lands meanwhile, then one does.
    expect(jamTower(state, t, 240, 99)).toBe(0);
    run(state, ctx, JAM_IMMUNITY_TICKS - 1);
    expect(jamImmune(t)).toBe(true);
    run(state, ctx, 1);
    expect(jamImmune(t)).toBe(false);
    expect(jamTower(state, t, 240, 99)).toBe(240);
  });

  it('never stacks or extends: a jam lands only on a tower neither Jammed nor immune', () => {
    const { state } = world();
    const t = placeTower(state, RIVET, 3, 1);
    jamTower(state, t, 240, 1);
    t.jamTicks = 10;
    expect(canJam(t)).toBe(false);
    expect(jamTower(state, t, 240, 2)).toBe(0);
    expect([t.jamTicks, t.jammedBy]).toEqual([10, 1]);
  });

  it('is capped at JAM_MAX_SEC and scaled by the tower’s jamMul as it starts', () => {
    const t = { jamMul: 1 };
    expect(JAM_MAX_TICKS).toBe(JAM_MAX_SEC * 60);
    expect(jamTicksFor(t, 600)).toBe(240); // capped
    expect(jamTicksFor({ jamMul: 0.5 }, 240)).toBe(120); // Choir T1–T2
    expect(jamTicksFor({ jamMul: 0.25 }, 240)).toBe(60); // Choir T3, Lullaby
    expect(jamTicksFor({ jamMul: 0 }, 240)).toBe(0); // Rally Chorus: immune
    expect(jamImmune({ jamImmuneTicks: 0, jamMul: 0 })).toBe(true);
  });

  it('takes the Choir’s rule from the strongest Choir covering it, never a Choir’s own', () => {
    const { state, ctx } = world();
    const choir = placeTower(state, CHOIR, 1, 1, 3); // T3: ×0.25 within 2
    const near = placeTower(state, RIVET, 3, 1);
    const far = placeTower(state, RIVET, 4, 4);
    relink(state, ctx);
    expect(jamTower(state, near, 240, 1)).toBe(60);
    expect(jamTower(state, far, 240, 1)).toBe(240);
    expect(jamTower(state, choir, 240, 1)).toBe(240); // no Choir covers a Choir
    // The length is fixed as it starts: the Choir going quiet later doesn't lengthen it.
    expect(near.jamTicks).toBe(60);
  });

  it('a Rally Chorus makes the towers it covers immune; a Jammed Rally Chorus covers none', () => {
    const { state, ctx } = world();
    const rally = placeTower(state, CHOIR, 1, 1, RALLY);
    rally.spec = 'b';
    const t = placeTower(state, RIVET, 3, 1);
    relink(state, ctx);
    expect([t.jamMul, jamImmune(t), jamTower(state, t, 240, 1)]).toEqual([0, true, 0]);
    expect(jamTower(state, rally, 240, 1)).toBe(240);
    run(state, ctx, 1); // the jams slot recomputes the auras at once
    expect([t.jamMul, t.pctDamage, t.pctRate]).toEqual([1, 0, 0]);
    expect(jamTower(state, t, 240, 1)).toBe(240);
  });

  it('holds fire while Jammed: no target, no shot, its cooldown still counting', () => {
    const { state, ctx } = world();
    const t = placeTower(state, RIVET, 3, 1);
    spawn(state, SILENCER, { dist: 2 });
    t.cooldownTicks = 5;
    jamTower(state, t, 30, 1);
    state.events.length = 0;
    for (let i = 0; i < 29; i++) {
      jams(state, ctx);
      towers(state, ctx);
    }
    expect(types(state.events)).not.toContain('ProjectileFired');
    expect([t.targetUid, t.cooldownTicks, t.jamTicks]).toEqual([0, 0, 1]);
    expect(state.stats.holdFireTicks).toBe(0); // Jammed isn't holding fire
    jams(state, ctx); // the jam ends; it fires this same tick
    towers(state, ctx);
    expect(types(state.events)).toContain('TowerUnjammed');
    expect(types(state.events)).toContain('ProjectileFired');
  });

  it('switches its auras and links off, recomputed the tick it starts and the tick it ends', () => {
    const { state, ctx } = world();
    const choir = placeTower(state, CHOIR, 1, 1); // T1: +10% damage, ×0.5 within 1.5
    const spike = placeTower(state, MINDSPIKE, 2, 1); // Harmony with the Choir
    relink(state, ctx);
    expect([spike.pctDamage, spike.jamMul, spike.linkExtraTargets]).toEqual([0.1, 0.5, 1]);
    expect(state.linkPairs.length).toBe(3);
    jamTower(state, choir, 120, 1);
    const on = run(state, ctx, 1);
    expect(types(on)).toEqual(['TowerJammed', 'LinkBroken']);
    expect([spike.pctDamage, spike.jamMul, spike.linkExtraTargets]).toEqual([0, 1, 0]);
    expect(choir.linkAuraRadiusTiles).toBe(0);
    const off = run(state, ctx, 119);
    expect(types(off)).toEqual(['TowerUnjammed', 'LinkFormed']);
    expect([spike.pctDamage, spike.jamMul, spike.linkExtraTargets]).toEqual([0.1, 0.5, 1]);
  });

  it('a Jammed Lullaby sings no Lullaby', () => {
    const { state } = world();
    const choir = placeTower(state, CHOIR, 1, 1, LULLABY);
    const e = spawn(state, SILENCER, { dist: 2 });
    lullPass(state);
    expect(e.lulled).toBe(true);
    jamTower(state, choir, 120, 1);
    lullPass(state);
    expect(e.lulled).toBe(false);
  });

  it('tallies the peak, the uptime, and the ticks over 25% (harness #10)', () => {
    const { state, ctx } = world();
    const ts: Tower[] = [];
    for (const [c, r] of [
      [1, 1],
      [3, 1],
      [4, 2],
      [1, 3],
    ] as const) {
      ts.push(placeTower(state, RIVET, c, r));
    }
    jamTower(state, ts[0]!, 10, 1);
    run(state, ctx, 5); // 1 of 4: at the limit, not over it
    expect(state.stats).toMatchObject({ jammedPeak: 1, jamOverLimitTicks: 0, towerTicks: 20 });
    jamTower(state, ts[1]!, 10, 1);
    run(state, ctx, 10);
    expect(state.stats).toMatchObject({ jammedPeak: 2, jamOverLimitTicks: 4 });
    expect(state.stats.jammedTowerTicks).toBe(5 + 4 * 2 + 5);
  });
});

describe('the Silencer’s tendril (enemies.md § 5.4; jamTendril.ts)', () => {
  it('its numbers: every 12 s, a 2 s tell, 2.5 tiles, 4 s, Choir first', () => {
    expect(JAM).toMatchObject({
      kind: 'tendril',
      periodTicks: 720,
      tellTicks: 120,
      radiusTiles: 2.5,
      durationTicks: 240,
      preferChoir: true,
    });
  });

  it('tells one period after its spawn, holds still through it, then jams its pick for 4 s', () => {
    const { state, ctx } = world();
    const rivet = placeTower(state, RIVET, 3, 1);
    const e = spawn(state, SILENCER, { dist: 2 });
    run(state, ctx, 1); // first tick alive: the period starts
    let events = run(state, ctx, WAIT - 1);
    expect(events).toEqual([]);
    events = run(state, ctx, 1);
    expect(events).toEqual([{ type: 'JamTell', uid: e.uid, kind: 'tendril', towers: [rivet.uid] }]);
    expect([tendrilTelling(e), e.jamTarget, e.paceMul]).toEqual([true, rivet.uid, 0]);
    events = run(state, ctx, JAM.tellTicks - 1);
    expect(events).toEqual([]);
    expect(e.jamTellTicks).toBe(1);
    events = run(state, ctx, 1);
    expect(events).toEqual([{ type: 'TowerJammed', uid: rivet.uid, ticks: 240, source: e.uid }]);
    expect([tendrilTelling(e), e.jamTarget, e.jamTicks]).toEqual([false, 0, JAM.periodTicks]);
    // The next tell starts a whole period after this one did.
    expect(types(run(state, ctx, WAIT - 1))).not.toContain('JamTell');
    expect(types(run(state, ctx, 1))).toContain('JamTell');
  });

  it('picks a Choir in reach first, else the highest tier, ties to the lowest uid', () => {
    const { state } = world();
    const e = spawn(state, SILENCER, { dist: 2 });
    const t1 = placeTower(state, RIVET, 1, 1, 1);
    const t3a = placeTower(state, RIVET, 3, 1, 3);
    const t3b = placeTower(state, RIVET, 3, 2, 3);
    placeTower(state, RIVET, 4, 2, 3); // out of reach
    expect(pickTendrilTarget(state, e, JAM)).toBe(t3a);
    t3a.jamImmuneTicks = 10; // skipping immune towers
    expect(pickTendrilTarget(state, e, JAM)).toBe(t3b);
    t3b.jamTicks = 10; // and Jammed ones
    expect(pickTendrilTarget(state, e, JAM)).toBe(t1);
    const choir = placeTower(state, CHOIR, 1, 3); // out of reach: not picked
    expect(pickTendrilTarget(state, e, JAM)).toBe(t1);
    choir.alive = false;
    const near = placeTower(state, CHOIR, 3, 0, 1); // a T1 Choir in reach
    expect(pickTendrilTarget(state, e, JAM)).toBe(near);
    near.jamImmuneTicks = 5;
    expect(pickTendrilTarget(state, e, JAM)).toBe(t1);
  });

  it('waits ready with nothing in reach, and tells the tick a tower is', () => {
    const { state, ctx } = world();
    const e = spawn(state, SILENCER, { dist: 2 });
    placeTower(state, RIVET, 4, 2); // out of reach
    run(state, ctx, WAIT + 30);
    expect([e.jamTicks, e.jamTarget]).toEqual([JAM.tellTicks, 0]);
    const t = placeTower(state, RIVET, 3, 1);
    expect(run(state, ctx, 1)).toEqual([
      { type: 'JamTell', uid: e.uid, kind: 'tendril', towers: [t.uid] },
    ]);
  });

  it('lands only if the tower still stands in reach and may be jammed', () => {
    for (const spoil of ['sold', 'pulled', 'rebooted', 'rally'] as const) {
      const { state, ctx } = world();
      const t = placeTower(state, RIVET, 3, 1);
      const e = spawn(state, SILENCER, { dist: 2 });
      run(state, ctx, WAIT + 1);
      expect(e.jamTarget).toBe(t.uid);
      if (spoil === 'sold') t.alive = false;
      if (spoil === 'pulled') [e.x, e.y] = [5.5, 4.5]; // a Gravity Well carried it off
      if (spoil === 'rebooted') castReboot(state, { kind: 'reboot', immuneTicks: 360 });
      if (spoil === 'rally') t.jamMul = 0;
      const events = run(state, ctx, JAM.tellTicks);
      expect(types(events), spoil).not.toContain('TowerJammed');
      expect([e.jamTarget, e.jamTicks], spoil).toEqual([0, JAM.periodTicks]);
    }
  });

  it('Stasis or Unnerved cancels a tell under way and restarts the full period', () => {
    for (const status of ['stasisTicks', 'unnervedTicks'] as const) {
      const { state, ctx } = world();
      const t = placeTower(state, RIVET, 3, 1);
      const e = spawn(state, SILENCER, { dist: 2 });
      run(state, ctx, WAIT + 1 + 50);
      e[status] = 30;
      expect(run(state, ctx, 1)).toEqual([{ type: 'JamInterrupted', uid: e.uid }]);
      expect([e.jamTarget, e.jamTellTicks, e.jamTicks]).toEqual([0, 0, JAM.periodTicks]);
      expect(t.jamTicks).toBe(0);
      e[status] = 0;
      // A whole period again before the next tell.
      expect(types(run(state, ctx, WAIT - 1))).toEqual([]);
      expect(types(run(state, ctx, 1))).toEqual(['JamTell']);
    }
  });

  it('a Silencer interrupted while ready restarts its period without a tell', () => {
    const { state, ctx } = world();
    placeTower(state, RIVET, 3, 1);
    const e = spawn(state, SILENCER, { dist: 2 });
    run(state, ctx, WAIT);
    e.stasisTicks = 5;
    expect(run(state, ctx, 1)).toEqual([]);
    expect(e.jamTicks).toBe(JAM.periodTicks);
  });

  it('Lulled stretches the wait ×1.5, never the tell', () => {
    const { state, ctx } = world();
    placeTower(state, RIVET, 3, 1);
    const e = spawn(state, SILENCER, { dist: 2 });
    let tellAt = -1;
    let landAt = -1;
    for (let i = 0; i < 2000 && landAt < 0; i++) {
      // lullPass's beat, as a Lullaby holds it every tick
      e.lulled = true;
      e.lullBeat = (e.lullBeat + 1) % 3;
      const events = run(state, ctx, 1);
      if (types(events).includes('JamTell')) tellAt = i;
      if (types(events).includes('TowerJammed')) landAt = i;
    }
    expect(tellAt).toBe(1 + WAIT * 1.5 - 1);
    expect(landAt - tellAt).toBe(JAM.tellTicks);
  });

  it('a leaving Silencer drops its tell quietly', () => {
    const { state, ctx } = world();
    placeTower(state, RIVET, 3, 1);
    const e: Enemy = spawn(state, SILENCER, { dist: 2 });
    run(state, ctx, WAIT + 1);
    e.leaving = true;
    expect(run(state, ctx, JAM.tellTicks)).toEqual([]);
    expect(e.jamTarget).toBe(0);
  });

  it('is deterministic: two runs, the same jams on the same ticks', () => {
    expect(trace()).toBe(trace());
  });
});

describe('System Reboot (core-loop.md § 3.2; abilities/reboot.ts)', () => {
  it('clears every jam and makes every tower immune for 6 s, then Rebooted', () => {
    const { state } = world();
    const a = placeTower(state, RIVET, 1, 1);
    const b = placeTower(state, RIVET, 3, 1);
    const c = placeTower(state, RIVET, 4, 2);
    jamTower(state, a, 240, 1);
    jamTower(state, c, 240, 1);
    b.jamImmuneTicks = 500; // a longer immunity stays
    state.events.length = 0;
    expect(castReboot(state, { kind: 'reboot', immuneTicks: 360 })).toBe(2);
    expect(state.events).toEqual([
      { type: 'TowerUnjammed', uid: a.uid },
      { type: 'TowerUnjammed', uid: c.uid },
      { type: 'Rebooted', towers: [a.uid, c.uid] },
    ]);
    expect([a, b, c].map((t) => [t.jamTicks, t.jamImmuneTicks])).toEqual([
      [0, 360],
      [0, 500],
      [0, 360],
    ]);
    expect(state.linksDirty).toBe(true);
    const later = placeTower(state, RIVET, 1, 3); // built after the cast: not immune
    expect(canJam(later)).toBe(true);
  });

  it('with nothing Jammed it still grants the immunity', () => {
    const { state } = world();
    const a = placeTower(state, RIVET, 1, 1);
    state.events.length = 0;
    expect(castReboot(state, { kind: 'reboot', immuneTicks: 360 })).toBe(0);
    expect(state.events).toEqual([{ type: 'Rebooted', towers: [] }]);
    expect(a.jamImmuneTicks).toBe(360);
  });

  it('lifts its gates and the Silencer’s (T702)', () => {
    expect(FEATURE_GATES['ability.reboot']).toBeNull();
    expect(FEATURE_GATES['enemy.jam']).toBeNull();
    expect(FEATURE_GATES['enemy.jam.ring']).toBeNull(); // T707 lifted it (sim/jamRing.test.ts)
    expect(LIVE.abilities.system_reboot!.effect).toEqual({ kind: 'reboot', immuneTicks: 360 });
  });
});
