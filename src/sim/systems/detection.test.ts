// Detection and cloaks (T406; design/enemies.md § 2.5, towers.md § 7 Lookout Shack): an undetected
// cloaked unit is untouchable (no targeting, splash, statuses, or hits; it still leaks), a
// detector Reveals it inside its radius plus its linger, Overwatch and Skywatch add +0.5, the
// support tune-up scales the radius and the aura, Crow's Nest Marks what it reveals, and Scanner
// Sweep's zone reveals for its 10 s. No cloaked unit ships in M4, so a fixture walker wears one.
// fx_map's path runs (0,0) → (2,0) → (2,3) → (3,3) → (3,4) → (5,4); pads (1,1), (3,1), (4,2),
// (1,3), high ground (3,2). A walker at route distance 4 stands at (2.5, 2.5): 2.0 tiles from the
// pad (4,2)'s centre; at distance 2, (2.5, 0.5), 2.83 tiles from it.
import { describe, expect, it } from 'vitest';
import type { CompiledContent } from '../../content/compiled.ts';
import { compileContent } from '../../content/compile.ts';
import { RAW_CONTENT } from '../../content/registry.ts';
import type { IdSpace } from '../../content/types.ts';
import { enemyDef, GUN, MAP, placeTower, setup, spawn } from '../__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig } from '../__fixtures__/sim.ts';
import { applyDamage, applyEffects } from '../combat/damage.ts';
import { canHit, pickTarget } from '../combat/targeting.ts';
import type { Modifier, SimConfig } from '../config.ts';
import { cloakedOut } from '../enemyAbilities/cloak.ts';
import type { SimEvent } from '../events.ts';
import { createSim } from '../sim.ts';
import type { SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { abilities, abilityStats } from './abilities.ts';
import { detection, detectRadiusTiles, supportPct } from './detection.ts';
import { links } from './links.ts';
import { movement } from './movement.ts';

const LIVE = compileContent(RAW_CONTENT);
const LOOKOUT = LIVE.towers.lookout;
const RIVET = LIVE.towers.rivet;
/** A cloaked walker (Veilwalker is M5's: enemies.md § 5.3). */
const VEIL = enemyDef('fx_veil', { cloaked: true, traits: ['cloaked'] });

/** Fixture content with the live Lookout, Rivet, Skyhook, links, and Scanner Sweep added. */
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- live ids into the fixture's id space
const CONTENT = {
  ...FIXTURE_CONTENT,
  towers: { ...FIXTURE_CONTENT.towers, ...LIVE.towers },
  abilities: { ...FIXTURE_CONTENT.abilities, ...LIVE.abilities },
  links: LIVE.links,
} as unknown as CompiledContent<IdSpace>;

function world(modifiers: Modifier<IdSpace>[] = []): { state: SimState; ctx: TickContext } {
  const { state, ctx } = setup({ modifiers });
  return { state, ctx: { ...ctx, content: CONTENT, config: { ...ctx.config, modifiers } } };
}

function events(state: SimState, type: SimEvent['type']): SimEvent<IdSpace>[] {
  return state.events.filter((e) => e.type === type);
}

describe('cloaks: the untouchable rule', () => {
  it('an undetected cloaked unit takes no targeting, hits, or statuses', () => {
    const { state } = world();
    const veil = spawn(state, VEIL, { dist: 4 });
    expect(cloakedOut(veil)).toBe(true);
    expect(canHit(veil, { ground: true, air: true })).toBe(false);
    const range = { rangeSq: 100, minRangeSq: 0 };
    expect(pickTarget(state.enemies, 2.5, 2.5, { ground: true, air: false }, range, 'first')).toBe(
      null,
    );
    expect(applyDamage(state, veil, 50, 'kinetic', { kind: 'tower', uid: 1 })).toBe(0);
    applyEffects(veil, [{ status: 'chilled', pct: 0.5, durationTicks: 60 }]);
    expect(veil.hp).toBe(VEIL.hp);
    expect(veil.chillPct).toBe(0);
    // Revealed, it is open to everything.
    veil.revealedTicks = 1;
    expect(cloakedOut(veil)).toBe(false);
    expect(applyDamage(state, veil, 10, 'kinetic', { kind: 'tower', uid: 1 })).toBeGreaterThan(0);
  });

  it('a cloaked unit still leaks', () => {
    const { state } = world();
    const veil = spawn(state, VEIL, { dist: MAP.routes.a!.lengthTiles - 0.001 });
    const before = state.integrity;
    movement(state);
    expect(veil.alive).toBe(false);
    expect(state.integrity).toBe(before - VEIL.leak);
  });

  it("an uncloaked unit's reveal ticks are never touched", () => {
    const { state, ctx } = world();
    const walker = spawn(state, enemyDef('fx_plain', {}), { dist: 4 });
    placeTower(state, LOOKOUT, 4, 2, 3);
    detection(state, ctx);
    expect(walker.revealedTicks).toBe(0);
    expect(state.events).toEqual([]);
  });
});

describe('detection: radius, linger, links, tune-ups', () => {
  it('a Lookout reveals inside its radius, and the unit cloaks again a tick after it leaves', () => {
    const { state, ctx } = world();
    placeTower(state, LOOKOUT, 4, 2, 1); // detect 2.5, no linger
    const veil = spawn(state, VEIL, { dist: 2 }); // 2.83 tiles off
    detection(state, ctx);
    expect(cloakedOut(veil)).toBe(true);
    veil.dist = 4; // 2.0 tiles off (placeOnRoute's x, y follow)
    veil.x = 2.5;
    veil.y = 2.5;
    detection(state, ctx);
    expect(veil.revealedTicks).toBe(1);
    expect(events(state, 'Revealed')).toEqual([{ type: 'Revealed', uid: veil.uid }]);
    veil.x = 0.5;
    veil.y = 0.5;
    detection(state, ctx);
    expect(cloakedOut(veil)).toBe(true);
    expect(events(state, 'Cloaked')).toEqual([{ type: 'Cloaked', uid: veil.uid }]);
  });

  it('T3 keeps it Revealed 2 s after it leaves, and T2 reaches 3.0', () => {
    const { state, ctx } = world();
    const t = placeTower(state, LOOKOUT, 4, 2, 2);
    const veil = spawn(state, VEIL, { dist: 2 }); // 2.83: inside T2's 3.0
    detection(state, ctx);
    expect(veil.revealedTicks).toBe(1);
    t.tierDef = LOOKOUT.tiers[2];
    detection(state, ctx);
    expect(veil.revealedTicks).toBe(121);
    veil.x = 0.5;
    veil.y = 0.5;
    for (let i = 0; i < 120; i++) detection(state, ctx);
    expect(cloakedOut(veil)).toBe(false);
    detection(state, ctx);
    expect(cloakedOut(veil)).toBe(true);
  });

  it('Overwatch and Skywatch add +0.5 radius (scaled by Linked Up); the tune-up adds 5%', () => {
    const { state, ctx } = world();
    const lookout = placeTower(state, LOOKOUT, 4, 2, 1);
    placeTower(state, RIVET, 3, 1, 1); // adjacent: Overwatch
    state.linksDirty = true;
    links(state, ctx);
    expect(lookout.bonusDetectTiles).toBeCloseTo(0.5);
    expect(detectRadiusTiles(lookout, [])).toBeCloseTo(3.0);
    const tune: Modifier<IdSpace>[] = [
      { kind: 'supportStat', tower: 'lookout', stat: 'radius', pct: 0.05, source: 'shop:x' },
      { kind: 'supportStat', tower: 'rivet', stat: 'radius', pct: 0.5, source: 'shop:y' },
    ];
    expect(supportPct(tune, 'lookout', 'radius')).toBeCloseTo(0.05);
    expect(detectRadiusTiles(lookout, tune)).toBeCloseTo(3.15);
    const linkedUp: Modifier<IdSpace>[] = [{ kind: 'linkBonus', pct: 0.5, source: 'protocol:x' }];
    const w = world(linkedUp);
    const l2 = placeTower(w.state, LOOKOUT, 4, 2, 1);
    placeTower(w.state, LIVE.towers.skyhook, 3, 1, 1); // Skywatch
    w.state.linksDirty = true;
    links(w.state, w.ctx);
    expect(l2.bonusDetectTiles).toBeCloseTo(0.75);
    // Selling the partner takes the bonus away.
    w.state.towers.items[1]!.alive = false;
    w.state.linksDirty = true;
    links(w.state, w.ctx);
    expect(l2.bonusDetectTiles).toBe(0);
  });

  it("Crow's Nest Marks what it reveals +10%, never over a stronger Mark", () => {
    const { state, ctx } = world();
    placeTower(state, LOOKOUT, 4, 2, LOOKOUT.specs!.a);
    expect(LOOKOUT.specs!.a.detect).toMatchObject({ radiusTiles: 5, lingerTicks: 120 });
    const veil = spawn(state, VEIL, { dist: 0 }); // 4.47 tiles off: inside 5.0
    const strong = spawn(state, VEIL, { dist: 1 });
    strong.markPct = 0.15;
    strong.markTicks = 300;
    detection(state, ctx);
    expect(veil).toMatchObject({ revealedTicks: 121, markPct: 0.1, markTicks: 121 });
    expect(strong).toMatchObject({ markPct: 0.15, markTicks: 300 });
    // Overclock Rig keeps T3's 3.5 and linger, and Marks nothing.
    expect(LOOKOUT.specs!.b.detect).toMatchObject({ radiusTiles: 3.5, revealedDamagePct: 0 });
  });
});

describe('the Lookout aura (one aura kind)', () => {
  it('adjacent towers get its range; two Lookouts give only the stronger; Overclock is rate', () => {
    const { state, ctx } = world();
    const gun = placeTower(state, GUN, 3, 1, 1);
    placeTower(state, LOOKOUT, 4, 2, 3); // +20% range
    state.linksDirty = true;
    links(state, ctx);
    expect(gun.pctRange).toBeCloseTo(0.2);
    placeTower(state, LOOKOUT, 3, 2, 2); // +15%: weaker, doesn't stack
    state.linksDirty = true;
    links(state, ctx);
    expect(gun.pctRange).toBeCloseTo(0.2);
    expect(gun.pctRate).toBe(0);
    // Overclock Rig: +20% fire rate instead. Still the one `lookout` kind, so it beats the other
    // Lookout's +15% range rather than adding to it.
    state.towers.items[1]!.tierDef = LOOKOUT.specs!.b;
    state.linksDirty = true;
    links(state, ctx);
    expect(gun.pctRange).toBe(0);
    expect(gun.pctRate).toBeCloseTo(0.2);
  });

  it('the tune-up adds aura strength, as a power node does; an attacking tower ignores it', () => {
    const tune: Modifier<IdSpace>[] = [
      { kind: 'supportStat', tower: 'lookout', stat: 'aura', pct: 0.05, source: 'shop:x' },
    ];
    const { state, ctx } = world(tune);
    const gun = placeTower(state, GUN, 3, 1, 1);
    placeTower(state, LOOKOUT, 4, 2, 3);
    state.linksDirty = true;
    links(state, ctx);
    expect(gun.pctRange).toBeCloseTo(0.2 * 1.05);
  });
});

const sweepConfig = (): SimConfig<IdSpace> => ({
  ...fixtureConfig(),
  content: CONTENT,
  abilities: { slot1: 'scanner_sweep', slot2: null, slot2State: 'none' },
});

describe('Scanner Sweep', () => {
  it('opens a 4-tile reveal zone for exactly 10 s, on a 30 s cooldown', () => {
    const def = LIVE.abilities.scanner_sweep;
    expect(abilityStats(def, [])).toMatchObject({ radiusTiles: 4, cooldownTicks: 1800 });
    const sim = createSim(sweepConfig());
    sim.enqueue({ type: 'ability', slot: 1, target: [2, 2] });
    sim.step();
    const zones = sim.state.zones.items.filter((z) => z.alive);
    expect(zones).toHaveLength(1);
    expect(zones[0]).toMatchObject({ kind: 'reveal', x: 2.5, y: 2.5, radiusSq: 16 });
    expect(sim.state.abilityCooldownTicks[0]).toBe(1799); // counted down once this tick
    // Alive on the cast tick and the 599 after it: 600 ticks of detection.
    for (let i = 0; i < 599; i++) sim.step();
    expect(sim.state.zones.items.some((z) => z.alive && z.kind === 'reveal')).toBe(true);
    sim.step();
    expect(sim.state.zones.items.some((z) => z.alive && z.kind === 'reveal')).toBe(false);
  });

  it('reveals the cloaked units inside it while it lives, and they can be shot', () => {
    const { state, ctx } = world();
    const cfg = { ...ctx, config: sweepConfig() };
    const veil = spawn(state, VEIL, { dist: 4 });
    const far = spawn(state, VEIL, { dist: 9 }); // moved well outside the 4-tile circle
    far.x = 9;
    far.y = 9;
    const zone = state.zones.items[0]!;
    Object.assign(zone, {
      alive: true,
      uid: 99,
      kind: 'reveal',
      x: 2.5,
      y: 2.5,
      radiusSq: 16,
      ticksLeft: 2,
      abilitySlot: 1,
    });
    state.zones.used = Math.max(state.zones.used, 1);
    detection(state, cfg);
    expect(cloakedOut(veil)).toBe(false);
    expect(cloakedOut(far)).toBe(true);
    abilities(state, cfg); // 2 → 1
    detection(state, cfg);
    abilities(state, cfg); // 1 → 0
    detection(state, cfg);
    expect(cloakedOut(veil)).toBe(false);
    abilities(state, cfg); // expires
    detection(state, cfg);
    expect(zone.alive).toBe(false);
    expect(cloakedOut(veil)).toBe(true);
  });

  it('a Suppressing Fire segment neither slows nor hurts a cloaked unit', () => {
    const { state, ctx } = world();
    const cfg = { ...ctx, config: { ...ctx.config, content: CONTENT } };
    const veil = spawn(state, VEIL, { dist: 4 });
    const seen = spawn(state, enemyDef('fx_plain', {}), { dist: 4 });
    const zone = state.zones.items[0]!;
    Object.assign(zone, {
      alive: true,
      uid: 99,
      kind: 'segment',
      route: MAP.routes.a!,
      distFrom: 3,
      distTo: 5,
      ticksLeft: 16, // the next tick is a damage tick (15)
      damage: 20,
      damageType: 'kinetic',
      slowPct: 0.5,
      abilitySlot: 2,
    });
    state.zones.used = Math.max(state.zones.used, 1);
    abilities(state, cfg);
    expect(veil.chillPct).toBe(0);
    expect(veil.hp).toBe(VEIL.hp);
    expect(seen.chillPct).toBe(0.5);
    expect(seen.hp).toBeLessThan(seen.def!.hp);
  });
});
