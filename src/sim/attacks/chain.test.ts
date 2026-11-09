// Chain attacks (T304b; attacks/chain.ts): the first hit and its jumps, compounding falloff, the
// nearest-then-lowest-uid jump rule, jump range, layers, neutral units (D072), the Conductive link
// (extra jumps, the Sprinkler's Soak) and Soaked's +25% Energy, and the event shape.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import type { IdSpace } from '../../content/types.ts';
import { MAP, enemyDef, placeTower, setup, spawn, tierWith } from '../__fixtures__/combat.ts';
import type { Enemy } from '../entities.ts';
import type { SimEvent } from '../events.ts';
import { gateRefusals } from '../gates.ts';
import { fixtureConfig } from '../__fixtures__/sim.ts';
import type { SimConfig } from '../config.ts';
import { links } from '../systems/links.ts';
import { status } from '../systems/status.ts';
import { towers } from '../systems/towers.ts';

const LIVE = compileContent(RAW_CONTENT);
const ZAPCOIL = LIVE.towers.zapcoil;
const SPRINKLER = LIVE.towers.sprinkler;
// A tough, slow, ground target: hits never kill it, so every falloff step shows.
const TANK = enemyDef('fx_tank', { hp: 10_000, speedTilesPerTick: 0 });
const FLYER = enemyDef('fx_flyer', { hp: 10_000, layer: 'air', speedTilesPerTick: 0 });

/** A fixture state with the live content (Zapcoil, Sprinkler, the Conductive link). */
function liveSetup(modifiers: SimConfig<IdSpace>['modifiers'] = []): ReturnType<typeof setup> {
  const s = setup({ modifiers });
  return { state: s.state, ctx: { ...s.ctx, content: LIVE } };
}

/** An enemy of `def` standing at (x, y). */
function at(state: ReturnType<typeof setup>['state'], def = TANK, x = 0, y = 0): Enemy {
  const e = spawn(state, def);
  e.x = x;
  e.y = y;
  return e;
}

const round3 = (x: number): number => Math.round(x * 1000) / 1000;
const lost = (e: Enemy): number => round3(e.def!.hp - e.hp);

function events(state: ReturnType<typeof setup>['state']): SimEvent<IdSpace>[] {
  return state.events;
}

describe('Zapcoil data (towers.md § 7)', () => {
  it('T1 chains to 3 (2 jumps, 1.5 tiles, −20%); T2 14 damage; T3 chains to 4 at 1.2/s', () => {
    const [t1, t2, t3] = ZAPCOIL.tiers;
    expect(t1.cost).toBe(120);
    expect(t1.targets).toEqual({ ground: true, air: true });
    expect(t1.attack).toMatchObject({
      kind: 'chain',
      type: 'energy',
      damage: 10,
      rangeTiles: 2.5,
      jumps: 2,
      jumpRangeTiles: 1.5,
      falloffPct: 0.2,
      cooldownTicks: 60,
    });
    expect(t2.attack).toMatchObject({ damage: 14, jumps: 2 });
    expect(t3.attack).toMatchObject({ damage: 14, jumps: 3, cooldownTicks: 50 });
  });

  it('plays: no gate refuses a Zapcoil loadout', () => {
    const cfg: SimConfig<IdSpace> = {
      ...fixtureConfig(),
      content: LIVE,
      mapId: 'a1_m01',
      loadout: ['zapcoil', 'sprinkler'],
    };
    expect(gateRefusals(cfg)).toEqual([]);
  });
});

describe('the chain', () => {
  it('hits the target, then jumps twice, each jump 20% weaker (compounding)', () => {
    const { state, ctx } = liveSetup();
    const t = placeTower(state, ZAPCOIL, 3, 1); // center (3.5, 1.5)
    const a = at(state, TANK, 3.5, 2.5);
    const b = at(state, TANK, 3.5, 3.5);
    const c = at(state, TANK, 3.5, 4.5);
    const d = at(state, TANK, 3.5, 5.5); // a third jump: out of T1's chain
    towers(state, ctx);
    expect([lost(a), lost(b), lost(c), lost(d)]).toEqual([10, 8, 6.4, 0]);
    expect(t.cooldownTicks).toBe(60);
    const ev = events(state).filter(
      (e) => e.type === 'ProjectileFired' || e.type === 'ProjectileHit',
    );
    expect(ev[0]).toMatchObject({ type: 'ProjectileFired', kind: 'chain', uid: 0 });
    expect(
      ev.slice(1).map((e) => [e.type, 'x' in e ? e.y : null, 'hits' in e ? e.hits : null]),
    ).toEqual([
      ['ProjectileHit', 2.5, 1],
      ['ProjectileHit', 3.5, 1],
      ['ProjectileHit', 4.5, 1],
    ]);
    expect(ev.slice(1).map((e) => (e.type === 'ProjectileHit' ? round3(e.damage) : 0))).toEqual([
      10, 8, 6.4,
    ]);
  });

  it('jumps to the nearest unhit enemy; equal distances go to the lowest uid', () => {
    const { state, ctx } = liveSetup();
    placeTower(state, ZAPCOIL, 3, 1);
    const a = at(state, TANK, 3.5, 2.5);
    const far = at(state, TANK, 3.5, 3.9); // 1.4 away
    const early = at(state, TANK, 4.5, 2.5); // 1.0 from a, earlier slot
    const late = at(state, TANK, 2.5, 2.5); // 1.0 from a, later slot
    // Swap uids so the later slot holds the lower uid: the rule is uid, not slot order.
    const u = early.uid;
    early.uid = late.uid;
    late.uid = u;
    towers(state, ctx);
    // a, then `late` (the lower uid), then the nearest unhit to `late`: `early` is 2.0 away and
    // `far` (1.0, 1.4) ≈ 1.72 away, both past 1.5, so the chain stops.
    expect([lost(a), lost(early), lost(late), lost(far)]).toEqual([10, 0, 8, 0]);
  });

  it('never strikes an enemy twice, and stops when nothing is in jump range', () => {
    const { state, ctx } = liveSetup();
    placeTower(state, ZAPCOIL, 3, 1);
    const a = at(state, TANK, 3.5, 2.5);
    const b = at(state, TANK, 3.5, 3.5);
    towers(state, ctx);
    expect([lost(a), lost(b)]).toEqual([10, 8]);
    expect(events(state).filter((e) => e.type === 'ProjectileHit')).toHaveLength(2);
  });

  it('jumps on from where a killed enemy stood', () => {
    const { state, ctx } = liveSetup();
    placeTower(state, ZAPCOIL, 3, 1);
    const weak = at(state, enemyDef('fx_weak', { hp: 5, speedTilesPerTick: 0 }), 3.5, 2.5);
    const b = at(state, TANK, 3.5, 3.5);
    towers(state, ctx);
    expect(weak.alive).toBe(false);
    expect(lost(b)).toBe(8);
  });

  it('hits only the layers its tier hits, on the first hit and every jump', () => {
    const { state, ctx } = liveSetup();
    const groundOnly = Object.freeze({
      ...ZAPCOIL.tiers[0],
      targets: { ground: true, air: false },
    });
    placeTower(state, ZAPCOIL, 3, 1, groundOnly);
    const air = at(state, FLYER, 3.5, 2.4); // nearer the tower, but air
    const a = at(state, TANK, 3.5, 2.5);
    const air2 = at(state, FLYER, 3.5, 3.0);
    const b = at(state, TANK, 3.5, 3.5);
    towers(state, ctx);
    expect([lost(air), lost(a), lost(air2), lost(b)]).toEqual([0, 10, 0, 8]);
    // The live Zapcoil hits air too.
    const live = liveSetup();
    placeTower(live.state, ZAPCOIL, 3, 1);
    const f = at(live.state, FLYER, 3.5, 2.5);
    const g = at(live.state, TANK, 3.5, 3.5);
    towers(live.state, live.ctx);
    expect([lost(f), lost(g)]).toEqual([10, 8]);
  });

  it('a neutral first target plinks (NeutralHit) and the arc jumps on; jumps skip neutrals', () => {
    const { state, ctx } = liveSetup();
    placeTower(state, ZAPCOIL, 3, 1);
    const gerald = at(state, LIVE.enemies.gerald, 3.5, 2.5);
    const a = at(state, TANK, 3.5, 3.5);
    const gerald2 = at(state, LIVE.enemies.gerald, 3.5, 4.0);
    const b = at(state, TANK, 3.5, 4.5);
    towers(state, ctx);
    expect(gerald.hp).toBe(gerald.def!.hp);
    expect(gerald2.hp).toBe(gerald2.def!.hp);
    expect([lost(a), lost(b)]).toEqual([8, 6.4]);
    expect(state.stats.neutralHits).toBe(1);
    const hits = events(state).filter((e) => e.type === 'ProjectileHit');
    expect(hits.map((e) => (e.type === 'ProjectileHit' ? e.hits : -1))).toEqual([0, 1, 1]);
    expect(events(state).filter((e) => e.type === 'NeutralHit')).toHaveLength(1);
  });

  it("applies the tier's statuses to every enemy struck", () => {
    const { state, ctx } = liveSetup();
    const soaking = Object.freeze({
      ...ZAPCOIL.tiers[0],
      effects: [{ status: 'soaked' as const, durationTicks: 30 }],
    });
    placeTower(state, ZAPCOIL, 3, 1, soaking);
    const a = at(state, TANK, 3.5, 2.5);
    const b = at(state, TANK, 3.5, 3.5);
    towers(state, ctx);
    // Statuses land after the hit: the second hit isn't boosted by its own Soak.
    expect([lost(a), lost(b)]).toEqual([10, 8]);
    expect([a.soakedTicks, b.soakedTicks]).toEqual([30, 30]);
  });

  it('keeps the bonus range for its first target, and the flat jump range for jumps', () => {
    const { state, ctx } = liveSetup();
    const t = placeTower(state, ZAPCOIL, 3, 1);
    t.flatRange = 1; // 3.5 tiles
    const a = at(state, TANK, 3.5, 4.5); // 3.0 away
    const b = at(state, TANK, 3.5, 6.1); // 1.6 from a: out of jump range
    towers(state, ctx);
    expect([lost(a), lost(b)]).toEqual([10, 0]);
  });
});

describe('Conductive (Sprinkler + Zapcoil) and Soaked', () => {
  it('links adjacent Zapcoil and Sprinkler: Zapcoil +2 jumps, Sprinkler Soaks 3 s', () => {
    const { state, ctx } = liveSetup();
    const z = placeTower(state, ZAPCOIL, 3, 1);
    const s = placeTower(state, SPRINKLER, 4, 2); // diagonal: adjacent
    state.linksDirty = true;
    links(state, ctx);
    expect(z.bonusJumps).toBe(2);
    expect(s.linkSoakedTicks).toBe(180);
    expect(z.linkSoakedTicks).toBe(0);
    expect(s.bonusJumps).toBe(0);
    expect(events(state).find((e) => e.type === 'LinkFormed')).toMatchObject({
      link: 'conductive',
    });
  });

  it('Linked Up scales the jumps and rounds down; the Soak duration never scales', () => {
    for (const [pct, jumps] of [
      [0.5, 3],
      [0.2, 2], // 2.4 → 2
    ] as const) {
      const { state, ctx } = liveSetup([{ kind: 'linkBonus', pct, source: 't' }]);
      const z = placeTower(state, ZAPCOIL, 3, 1);
      const s = placeTower(state, SPRINKLER, 4, 2);
      state.linksDirty = true;
      links(state, ctx);
      expect(z.bonusJumps, `Linked Up +${pct}`).toBe(jumps);
      expect(s.linkSoakedTicks).toBe(180);
    }
  });

  it('extra jumps lengthen the chain (T1 + Conductive strikes 5)', () => {
    const { state, ctx } = liveSetup();
    const t = placeTower(state, ZAPCOIL, 3, 1);
    t.bonusJumps = 2;
    const row = [2.5, 3.5, 4.5, 5.5, 6.5, 7.5].map((y) => at(state, TANK, 3.5, y));
    towers(state, ctx);
    expect(row.map(lost)).toEqual([10, 8, 6.4, 5.12, 4.096, 0]);
  });

  it("a linked Sprinkler's pulse Soaks at tier 1; Soaked takes +25% Energy, counts down", () => {
    const { state, ctx } = liveSetup();
    const s = placeTower(state, SPRINKLER, 4, 2);
    s.linkSoakedTicks = 180;
    const e = at(state, TANK, 4.5, 2.5);
    towers(state, ctx);
    expect(e.soakedTicks).toBe(180);
    expect(e.chillPct).toBeGreaterThan(0); // its own Chilled still lands
    status(state);
    expect(e.soakedTicks).toBe(179);
    // A shorter Soak never cuts a longer one; a longer one refreshes it.
    s.linkSoakedTicks = 10;
    s.cooldownTicks = 0;
    towers(state, ctx);
    expect(e.soakedTicks).toBe(179);
    // Energy on a Soaked enemy: the Zapcoil's 10 lands as 12.5.
    const z = placeTower(state, ZAPCOIL, 3, 1);
    z.cooldownTicks = 0;
    s.cooldownTicks = 99;
    const before = e.hp;
    towers(state, ctx);
    expect(before - e.hp).toBeCloseTo(12.5, 9);
  });

  it('an unlinked Sprinkler applies no Soak (its own tier-3 Soak is M4 data)', () => {
    const { state, ctx } = liveSetup();
    placeTower(state, SPRINKLER, 4, 2, 3);
    const e = at(state, TANK, 4.5, 2.5);
    towers(state, ctx);
    expect(e.soakedTicks).toBe(0);
  });

  it('tierWith keeps the chain fields (sanity for derived tiers)', () => {
    const tier = tierWith(ZAPCOIL.tiers[0], { damage: 20 });
    expect(tier.attack).toMatchObject({ kind: 'chain', damage: 20, jumps: 2 });
    expect(MAP.cols).toBe(6);
  });
});
