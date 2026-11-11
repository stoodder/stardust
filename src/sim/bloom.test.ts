// T608: the Stasis Bloom's field (design/towers.md § Stasis Bloom; sim/systems/fields.ts), from the
// live tower on fx_map's road ((0,0) → (2,0) → (2,3) → (3,3) → …, tile centres +0.5). A Bloom on
// (1,1) stands at (1.5, 1.5): a unit at dist 2 (2.5, 0.5) or dist 4 (2.5, 2.5) is 1.41 tiles off,
// inside T1's 2.0; one at dist 5 (2.5, 3.5) is 2.24 off, outside 2.0 and inside T3's 2.5. The
// systems run by hand: status, then the fields, then (where a test needs them) the enemy abilities.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent, CompiledTier } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { STATUS_BITS } from '../content/rules.ts';
import type { IdSpace } from '../content/types.ts';
import { placeTower, setup, spawn } from './__fixtures__/combat.ts';
import { gatherTelling } from './enemyAbilities/gather.ts';
import { enemyAbilities } from './enemyAbilities/index.ts';
import type { Enemy, Tower } from './entities.ts';
import type { SimEvent } from './events.ts';
import type { SimState } from './state.ts';
import { fieldPulseTicks, fieldReachTiles, fields } from './systems/fields.ts';
import { links } from './systems/links.ts';
import { isInterrupted, status } from './systems/status.ts';
import type { TickContext } from './tick.ts';

const LIVE: CompiledContent<IdSpace> = compileContent(RAW_CONTENT);
const E = LIVE.enemies;
const BLOOM = LIVE.towers.bloom!;
const WELL: CompiledTier = BLOOM.specs!.a;
const GARDEN: CompiledTier = BLOOM.specs!.b;

function world(over: Parameters<typeof setup>[0] = {}): { state: SimState; ctx: TickContext } {
  const { state, ctx } = setup(over);
  return { state, ctx: { ...ctx, content: LIVE } };
}

function bloom(state: SimState, tier: number | CompiledTier = 1, col = 1, row = 1): Tower {
  const t = placeTower(state, BLOOM, col, row, tier);
  t.alive = true;
  return t;
}

/** One tick of the systems the field needs: status, then the fields. */
function tick(state: SimState, ctx: TickContext): void {
  status(state);
  fields(state, ctx);
  state.tick++;
}

function events(state: SimState): SimEvent<IdSpace>[] {
  const out: SimEvent<IdSpace>[] = state.events.slice();
  state.events.length = 0;
  return out;
}

/** Clears a unit's Stasis and its immunity (a test holding it in place by hand). */
function unfreeze(u: Enemy): void {
  u.stasisTicks = 0;
  u.stasisImmuneTicks = 0;
}

function bursts(evs: readonly SimEvent<IdSpace>[]): SimEvent<IdSpace>[] {
  return evs.filter((e) => e.type === 'PulseBurst');
}

describe('the Stasis Bloom (towers.md § 7): numbers', () => {
  it('compiles the tiers and specs as designed', () => {
    expect(BLOOM.tiers.map((t) => t.field)).toEqual([
      expect.objectContaining({ radiusTiles: 2, chillPct: 0.3, pulseEveryTicks: 600 }),
      expect.objectContaining({ radiusTiles: 2, pulseEveryTicks: 480, stasisTicks: 90 }),
      expect.objectContaining({ radiusTiles: 2.5, pulseEveryTicks: 480, stasisTicks: 120 }),
    ]);
    expect(BLOOM.tiers.map((t) => t.cost)).toEqual([140, 110, 210]);
    expect(BLOOM.tiers[0].targets).toEqual({ ground: true, air: true });
    expect(BLOOM.tiers[0].attack).toBeNull();
    expect(WELL.field).toMatchObject({
      chillPct: 0.3,
      pullBackTiles: 1.5,
      pullBackCooldownTicks: 1200,
      pulseEveryTicks: 480,
    });
    expect(GARDEN.field).toMatchObject({ chillPct: 0.45, pulseEveryTicks: 360, pullBackTiles: 0 });
    expect([WELL.cost, GARDEN.cost]).toEqual([420, 420]);
  });
});

describe('the field: reach and chill', () => {
  it('Chills everyone inside, ground and air, for as long as they stay', () => {
    const { state, ctx } = world();
    bloom(state);
    const near = spawn(state, E.nibbler!, { dist: 2 });
    const flyer = spawn(state, E.puffwing!, { dist: 4 });
    const far = spawn(state, E.nibbler!, { dist: 5 });
    tick(state, ctx);
    expect([near.chillPct, flyer.chillPct, far.chillPct]).toEqual([0.3, 0.3, 0]);
    for (let k = 0; k < 120; k++) tick(state, ctx);
    expect(near.chillPct).toBe(0.3); // still inside: held every tick
  });

  it('lapses one step after a unit leaves', () => {
    const { state, ctx } = world();
    bloom(state);
    const e = spawn(state, E.nibbler!, { dist: 4 });
    tick(state, ctx);
    expect(e.chillPct).toBe(0.3);
    e.dist = 5;
    e.x = 2.5;
    e.y = 3.5; // walked out
    tick(state, ctx);
    expect(e.chillPct).toBe(0.3); // the step it leaves on
    tick(state, ctx);
    expect(e.chillPct).toBe(0);
  });

  it('a boss takes it at half strength; a stronger chill holds', () => {
    const { state, ctx } = world();
    bloom(state).cooldownTicks = 100; // no pulse yet (its Stasis would convert to Chilled 50%)
    const witch = spawn(state, E.glass_witch!, { dist: 2 });
    const cold = spawn(state, E.nibbler!, { dist: 4 });
    cold.chillPct = 0.5;
    cold.chillTicks = 100;
    tick(state, ctx);
    expect(witch.chillPct).toBeCloseTo(0.15, 12);
    expect(cold.chillPct).toBe(0.5);
  });

  it('never a neutral, burrowed, Phased, leaving, or unrevealed cloaked unit', () => {
    const { state, ctx } = world();
    bloom(state);
    const gerald = spawn(state, E.gerald!, { dist: 2 });
    const dug = spawn(state, E.digger!, { dist: 2 });
    dug.burrowed = true;
    const ghost = spawn(state, E.riftmoth!, { dist: 4 });
    ghost.phased = true;
    const gone = spawn(state, E.nibbler!, { dist: 4 });
    gone.leaving = true;
    const veiled = spawn(state, E.veilwalker!, { dist: 4 });
    tick(state, ctx);
    for (const e of [gerald, dug, ghost, gone, veiled]) {
      expect(e.chillPct, e.def!.id).toBe(0);
      expect(e.stasisTicks, e.def!.id).toBe(0);
    }
    expect(bursts(events(state))).toEqual([]); // nobody inside: no pulse
  });

  it('reaches further with Pinned Down and the radius tune-up', () => {
    const f = BLOOM.tiers[0].field!;
    expect(fieldReachTiles(f, { linkFieldRadiusTiles: 0, detectPct: 0 })).toBe(2);
    expect(fieldReachTiles(f, { linkFieldRadiusTiles: 0.3, detectPct: 0 })).toBeCloseTo(2.3, 12);
    expect(fieldReachTiles(f, { linkFieldRadiusTiles: 0.3, detectPct: 0.05 })).toBeCloseTo(
      2.415,
      12,
    );
    // A unit 2.24 tiles off is outside 2.0 and inside 2.3.
    const { state, ctx } = world();
    const t = bloom(state);
    const e = spawn(state, E.nibbler!, { dist: 5 });
    tick(state, ctx);
    expect(e.chillPct).toBe(0);
    t.linkFieldRadiusTiles = 0.3;
    tick(state, ctx);
    expect(e.chillPct).toBe(0.3);
  });

  it('the aura tune-up (rank 1) strengthens the chill 5%', () => {
    const modifiers = [
      { kind: 'supportStat', tower: 'bloom', stat: 'aura', pct: 0.05, source: 'shop:tune_bloom' },
    ] as const;
    const { state, ctx } = world({ modifiers });
    bloom(state);
    const e = spawn(state, E.nibbler!, { dist: 2 });
    tick(state, ctx);
    expect(e.chillPct).toBeCloseTo(0.315, 12);
  });
});

describe('the pulse: Stasis', () => {
  it('starts ready, freezes everyone inside, then waits its period', () => {
    const { state, ctx } = world();
    const t = bloom(state);
    for (let k = 0; k < 30; k++) tick(state, ctx); // nobody inside: it waits, ready
    expect(t.cooldownTicks).toBe(0);
    expect(t.firstFiredTick).toBe(-1);
    const a = spawn(state, E.nibbler!, { dist: 2 });
    const b = spawn(state, E.puffwing!, { dist: 4 });
    tick(state, ctx);
    expect([a.stasisTicks, b.stasisTicks]).toEqual([90, 90]);
    expect(t.cooldownTicks).toBe(600);
    expect(t.firstFiredTick).toBe(30);
    expect(bursts(events(state))).toEqual([
      { type: 'PulseBurst', towerUid: t.uid, x: 1.5, y: 1.5, radiusTiles: 2, frozen: 2 },
    ]);
    expect(isInterrupted(a)).toBe(true);
    // The next pulse comes 600 ticks later.
    let next = -1;
    for (let k = 1; k <= 700 && next < 0; k++) {
      tick(state, ctx);
      if (bursts(events(state)).length > 0) next = k;
    }
    expect(next).toBe(600);
  });

  it('T2 every 8 s; T3 a 2 s Stasis; Timeless Garden every 6 s at 45%', () => {
    for (const [tier, every, stasis, chill] of [
      [2, 480, 90, 0.3],
      [3, 480, 120, 0.3],
      [GARDEN, 360, 120, 0.45],
    ] as const) {
      const { state, ctx } = world();
      const t = bloom(state, tier);
      const e = spawn(state, E.nibbler!, { dist: 2 });
      tick(state, ctx);
      expect([t.cooldownTicks, e.stasisTicks, e.chillPct]).toEqual([every, stasis, chill]);
    }
  });

  it('Stillmind pulses 1 s sooner (never under a tick)', () => {
    const f = BLOOM.tiers[0].field!;
    expect(fieldPulseTicks(f, { linkPulseSoonerTicks: 60 })).toBe(540);
    expect(fieldPulseTicks(f, { linkPulseSoonerTicks: 90 })).toBe(510); // Linked Up's 1.5 s
    expect(fieldPulseTicks(f, { linkPulseSoonerTicks: 10_000 })).toBe(1);
  });

  it('a boss takes Chilled 50% instead; Stasis immunity stops a second Bloom chaining it', () => {
    const { state, ctx } = world();
    bloom(state);
    bloom(state, 1, 3, 1); // (3.5, 1.5): 1.41 from dist 4
    const witch = spawn(state, E.glass_witch!, { dist: 4 });
    const e = spawn(state, E.nibbler!, { dist: 4 });
    tick(state, ctx);
    expect(witch.stasisTicks).toBe(0);
    expect(witch.chillPct).toBe(0.5);
    expect(e.stasisTicks).toBe(90);
    expect(bursts(events(state)).map((b) => (b.type === 'PulseBurst' ? b.frozen : -1))).toEqual([
      1, 0,
    ]);
    expect(e.stasisImmuneTicks).toBe(180);
  });

  it("interrupts a tell this tick (the fields run before the enemies' abilities)", () => {
    const { state, ctx } = world();
    const maw = spawn(state, E.maw!, { dist: 2.5 });
    const mote = spawn(state, E.mote!, { dist: 2 });
    const g = E.maw!.gather!;
    enemyAbilities(state, ctx); // first tick alive: its timer
    maw.gatherTicks = g.tellTicks;
    enemyAbilities(state, ctx);
    expect(gatherTelling(maw)).toBe(true);
    bloom(state);
    tick(state, ctx);
    enemyAbilities(state, ctx);
    expect(gatherTelling(maw)).toBe(false);
    expect(maw.gatherTicks).toBe(g.everyTicks); // restarted from zero
    expect(mote.alive).toBe(true);
  });
});

describe('Gravity Well (spec A): the pull', () => {
  it('pulls each unit inside back 1.5 tiles along its route, a flyer along its lane', () => {
    const { state, ctx } = world();
    const t = bloom(state, WELL);
    const e = spawn(state, E.nibbler!, { dist: 4 });
    const fly = spawn(state, E.puffwing!, { dist: 2 });
    tick(state, ctx);
    expect(e.dist).toBe(2.5);
    expect([e.x, e.y]).toEqual([2.5, 1]);
    expect(fly.dist).toBe(0.5);
    expect([e.pullImmuneTicks, fly.pullImmuneTicks]).toEqual([1200, 1200]);
    expect(e.stasisTicks).toBe(120); // and frozen where it lands
    const pulled = events(state).filter((v) => v.type === 'PulledBack');
    expect(pulled).toEqual([
      {
        type: 'PulledBack',
        uid: e.uid,
        towerUid: t.uid,
        fromX: 2.5,
        fromY: 2.5,
        x: 2.5,
        y: 1,
        tiles: 1.5,
      },
      {
        type: 'PulledBack',
        uid: fly.uid,
        towerUid: t.uid,
        fromX: 2.5,
        fromY: 0.5,
        x: 1,
        y: 0.5,
        tiles: 1.5,
      },
    ]);
  });

  it('never past the route start; never a boss', () => {
    const { state, ctx } = world();
    bloom(state, WELL);
    const e = spawn(state, E.nibbler!, { dist: 1 });
    const witch = spawn(state, E.glass_witch!, { dist: 2 });
    tick(state, ctx);
    expect(e.dist).toBe(0);
    expect(witch.dist).toBe(2);
    expect(witch.pullImmuneTicks).toBe(0);
    const pulled = events(state).filter((v) => v.type === 'PulledBack');
    expect(pulled.map((p) => (p.type === 'PulledBack' ? p.tiles : 0))).toEqual([1]);
  });

  it('at most once every 20 s, whichever Well pulses it', () => {
    const { state, ctx } = world();
    bloom(state, WELL);
    bloom(state, WELL, 3, 1);
    const e = spawn(state, E.nibbler!, { dist: 4 });
    tick(state, ctx);
    expect(e.dist).toBe(2.5); // the first Well's pull; the second's waits
    // Held at dist 4 by hand: pulses every 8 s, but a pull only once the 20 s are up.
    const pulls: number[] = [];
    for (let k = 1; k <= 1500; k++) {
      e.dist = 4;
      e.x = 2.5;
      e.y = 2.5;
      unfreeze(e);
      tick(state, ctx);
      if (e.dist !== 4) pulls.push(k);
    }
    // Pulses at 480 and 960 find it immune (till 1200); the one at 1440 pulls it.
    expect(pulls).toEqual([1440]);
  });

  it('lets go of a unit a blocker holds (Blocked off; it walks back to him)', () => {
    const { state, ctx } = world();
    bloom(state, WELL);
    const e = spawn(state, E.nibbler!, { dist: 4 });
    e.blockerUid = 77;
    tick(state, ctx);
    expect(e.blockerUid).toBe(0);
    expect(events(state)).toContainEqual({
      type: 'Blocked',
      allyUid: 77,
      enemyUid: e.uid,
      on: false,
    });
  });

  it("a pull out of a Maw's radius loses its tell (enemies.md § 5.4)", () => {
    const { state, ctx } = world();
    // The Maw at dist 5.6 (3.1, 3.5) is 2.56 off, outside the Well's 2.5; the Mote it holds at
    // 4.7 (2.5, 3.2), 1.97 off, inside.
    const maw = spawn(state, E.maw!, { dist: 5.6 });
    const mote = spawn(state, E.mote!, { dist: 4.7 });
    const g = E.maw!.gather!;
    enemyAbilities(state, ctx);
    maw.gatherTicks = g.tellTicks;
    enemyAbilities(state, ctx);
    expect(gatherTelling(maw)).toBe(true);
    bloom(state, WELL);
    tick(state, ctx);
    expect(isInterrupted(maw)).toBe(false); // the Maw isn't in the field: only the pull acts
    expect(mote.dist).toBeCloseTo(3.2, 12);
    enemyAbilities(state, ctx);
    expect(gatherTelling(maw)).toBe(false);
    expect(maw.gatherTicks).toBe(g.everyTicks);
  });
});

describe('fire control', () => {
  it('Hold Fire quiets the field; its timer still counts, so it pulses as it is released', () => {
    const { state, ctx } = world();
    const t = bloom(state);
    t.cooldownTicks = 5;
    t.holdFire = true;
    const e = spawn(state, E.nibbler!, { dist: 2 });
    for (let k = 0; k < 10; k++) tick(state, ctx);
    expect([e.chillPct, e.stasisTicks, t.cooldownTicks]).toEqual([0, 0, 0]);
    expect(bursts(events(state))).toEqual([]);
    t.holdFire = false;
    tick(state, ctx);
    expect([e.chillPct, e.stasisTicks]).toEqual([0.3, 90]);
  });

  it('with the spare-runners filter it acts only while an unspared unit is inside', () => {
    const { state, ctx } = world();
    const t = bloom(state);
    t.spareRunners = true;
    const runner = spawn(state, E.nibbler!, { dist: 2, tags: ['fleeing'] });
    tick(state, ctx);
    expect([runner.chillPct, runner.stasisTicks]).toEqual([0, 0]);
    const e = spawn(state, E.nibbler!, { dist: 4 });
    tick(state, ctx);
    expect([runner.chillPct, runner.stasisTicks, e.stasisTicks]).toEqual([0.3, 90, 90]);
  });
});

describe('links: Pinned Down and Stillmind (towers.md § 6.2)', () => {
  const mask = (1 << STATUS_BITS.indexOf('chilled')) | (1 << STATUS_BITS.indexOf('stasis'));

  it('compile to their partners', () => {
    const byId = new Map(LIVE.links.map((l) => [l.id, l]));
    const [harpoon, b1] = byId.get('pinned_down')!.partners;
    expect(harpoon).toMatchObject({ tower: 'harpoon', vsStatusMask: mask, vsStatusPct: 0.3 });
    expect(b1).toMatchObject({ tower: 'bloom', fieldRadiusTiles: 0.3, pulseSoonerTicks: 0 });
    const [mindspike, b2] = byId.get('stillmind')!.partners;
    expect(mindspike).toMatchObject({ tower: 'mindspike', vsStatusMask: mask, vsStatusPct: 0.25 });
    expect(b2).toMatchObject({ tower: 'bloom', fieldRadiusTiles: 0, pulseSoonerTicks: 60 });
  });

  it('land on adjacent towers (the links system), scaled by Linked Up', () => {
    for (const [mods, k] of [
      [[], 1],
      [[{ kind: 'linkBonus', pct: 0.5, source: 'protocol:linked_up' }], 1.5],
    ] as const) {
      const { state, ctx } = world({ modifiers: mods });
      const b = bloom(state, 1, 3, 1);
      const harpoon = placeTower(state, LIVE.towers.harpoon!, 4, 2);
      harpoon.alive = true;
      const spike = placeTower(state, LIVE.towers.mindspike!, 3, 2);
      spike.alive = true;
      state.linksDirty = true;
      links(state, ctx);
      expect(b.linkFieldRadiusTiles).toBeCloseTo(0.3 * k, 12);
      expect(b.linkPulseSoonerTicks).toBe(Math.round(60 * k));
      expect([harpoon.vsStatusMask, spike.vsStatusMask]).toEqual([mask, mask]);
      expect(harpoon.vsStatusPct).toBeCloseTo(0.3 * k, 12);
      expect(spike.vsStatusPct).toBeCloseTo(0.25 * k, 12);
    }
  });

  it('a Stillmind Bloom pulses on its shorter beat', () => {
    const { state, ctx } = world();
    const t = bloom(state);
    t.linkPulseSoonerTicks = 60;
    spawn(state, E.nibbler!, { dist: 2 });
    tick(state, ctx);
    expect(t.cooldownTicks).toBe(540);
  });
});
