// T508: the Seer's Lantern (design/towers.md § 7): detection, a light-beam that Marks its target
// (enemies.md § 2.4: Marked, highest only), T3's two beams, All-Seeing's area Mark
// (systems/markArea.ts), Truthlight's `noEvade` (no cloak, blink, phase, or burrow while it lasts:
// systems/status.ts `evadeBlocked`, systems/detection.ts), and the Lightsong link (the Prism ramps
// 30% faster, the Lantern's Marks +5%; systems/links.ts). Also T507's leftover, owned here: the
// Chitterbloom's dig and sneeze tells ask the interrupt hook (Unnerved interrupts a boss's tells).
// fx_map's road `a` runs (0,0) → (2,0) → (2,3) → (3,3) → (3,4) → (5,4); route distance d sits on
// tile d's centre. Pads (1,1), (3,1), (4,2), (1,3); (3,1) and (4,2) touch at a corner.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent, CompiledTier } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { AREA_MARK_SEC } from '../content/rules.ts';
import type { IdSpace } from '../content/types.ts';
import { GUN, placeTower, setup as setupFixture, spawn, WALKER } from './__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig } from './__fixtures__/sim.ts';
import { beamUid } from './attacks/beam.ts';
import { applyDamage, applyEffects } from './combat/damage.ts';
import type { SimConfig } from './config.ts';
import type { Enemy, Tower } from './entities.ts';
import { BOSS_ABILITY_TELL_TICKS, bossNextAbility } from './enemyAbilities/boss.ts';
import {
  BOSS_BURROW_GAP_TICKS,
  BOSS_PHASE_INVULNERABLE_TICKS,
} from './enemyAbilities/bossPhases.ts';
import { blinkStep } from './enemyAbilities/blink.ts';
import { burrowStep, surfaceTicks } from './enemyAbilities/burrow.ts';
import { cloakedOut } from './enemyAbilities/cloak.ts';
import { enemyAbilities } from './enemyAbilities/index.ts';
import { phaseBlocked, phaseStep, solidTicks } from './enemyAbilities/phase.ts';
import { pulseStep } from './enemyAbilities/pulse.ts';
import type { SimEvent } from './events.ts';
import { gateRefusals } from './gates.ts';
import { createSim } from './sim.ts';
import type { SimState } from './state.ts';
import { bonusRangeTiles } from './bonuses.ts';
import { detection, detectRadiusTiles } from './systems/detection.ts';
import { links } from './systems/links.ts';
import { AREA_MARK_TICKS } from './systems/markArea.ts';
import {
  applyMarked,
  applyUnnerved,
  evadeBlocked,
  isInterrupted,
  isMarked,
  status,
} from './systems/status.ts';
import { towers } from './systems/towers.ts';
import type { TickContext } from './tick.ts';
import { towerStats } from './towerStats.ts';

const LIVE = compileContent(RAW_CONTENT);
const E = LIVE.enemies;
const LANTERN = LIVE.towers.lantern;
const PRISM = LIVE.towers.prism;
const [T1, T2, T3] = LANTERN.tiers;
const ALL_SEEING = LANTERN.specs!.a;
const TRUTHLIGHT = LANTERN.specs!.b;
const TRUTH = TRUTHLIGHT.effects; // [Marked 35%, 1 s, noEvade]

/** The fixture content with the live Lantern, Prism, enemies, and links. */
const CONTENT: CompiledContent<IdSpace> = {
  ...FIXTURE_CONTENT,
  towers: { ...FIXTURE_CONTENT.towers, lantern: LANTERN, prism: PRISM },
  enemies: { ...FIXTURE_CONTENT.enemies, ...E },
  links: LIVE.links,
};

function setup(over: Parameters<typeof setupFixture>[0] = {}): {
  state: SimState;
  ctx: TickContext;
} {
  const s = setupFixture({ content: CONTENT, ...over });
  return { state: s.state, ctx: { ...s.ctx, content: CONTENT } };
}

type Ev = SimEvent<IdSpace>;
function events<T extends Ev['type']>(state: SimState, type: T): Extract<Ev, { type: T }>[] {
  return state.events.filter((e): e is Extract<Ev, { type: T }> => e.type === type);
}

/** One tick of the systems these rules use, in the tick's order. */
function tick(state: SimState, ctx: TickContext): void {
  status(state);
  links(state, ctx);
  enemyAbilities(state, ctx);
  detection(state, ctx);
  towers(state, ctx);
  state.tick++;
}

/** A Lantern on (col, row) at `tier`, its links recomputed. */
function lantern(state: SimState, col: number, row: number, tier: number | CompiledTier): Tower {
  const t = placeTower(state, LANTERN, col, row, tier);
  if (typeof tier !== 'number') t.spec = tier === ALL_SEEING ? 'a' : 'b';
  state.linksDirty = true;
  return t;
}

/** fx_map's config with the Lantern in the loadout and its specs unlocked. */
function lanternConfig(): SimConfig<IdSpace> {
  return {
    ...fixtureConfig(),
    content: CONTENT,
    loadout: ['fx_gun', 'lantern'],
    specsUnlocked: ['lantern'],
  };
}

/** A sturdy organic walker (Psionic ×1, no armor). */
const HIDE = Object.freeze({ ...WALKER, id: 'fx_hide', hp: 5000 });

describe('the Lantern as data (towers.md § 7; T508 settles the beam range and the Mark’s 1 s)', () => {
  it('T1 detects 3.0 and beams 4 Psionic/s with Mark +15%; T2 +20% and 3.5; T3 two beams', () => {
    expect(T1.detect?.radiusTiles).toBe(3);
    expect(T1.attack).toMatchObject({
      kind: 'beam',
      type: 'psionic',
      damage: 4,
      rangeTiles: 3,
      beams: 1,
      rampCap: 1,
      rampPctPerTick: 0,
    });
    expect(T1.effects).toEqual([
      { status: 'marked', pct: 0.15, durationTicks: 60, noEvade: false },
    ]);
    expect(T2.detect?.radiusTiles).toBe(3.5);
    expect(T2.attack?.rangeTiles).toBe(3.5);
    expect(T2.effects).toEqual([{ status: 'marked', pct: 0.2, durationTicks: 60, noEvade: false }]);
    expect(T3.attack).toMatchObject({ beams: 2 });
    expect([T1.cost, T2.cost, T3.cost, ALL_SEEING.cost, TRUTHLIGHT.cost]).toEqual([
      120, 95, 180, 360, 360,
    ]);
    expect(AREA_MARK_TICKS).toBe(AREA_MARK_SEC * 60);
  });

  it('plays: a Lantern loadout with its specs unlocked is refused nothing', () => {
    expect(gateRefusals(lanternConfig())).toEqual([]);
  });
});

describe('the light-beam Marks its target', () => {
  it('lands 1 Psionic each 0.25 s and Marks +15% for 1 s; a held beam keeps it up', () => {
    const { state, ctx } = setup();
    const t = lantern(state, 1, 1, 1);
    const e = spawn(state, HIDE, { dist: 2 }); // (2.5, 0.5): 1.41 tiles away
    tick(state, ctx);
    expect(t.targetUid).toBe(e.uid);
    expect(e.hp).toBe(HIDE.hp - 1);
    expect([e.markPct, e.markTicks]).toEqual([0.15, 60]);
    for (let i = 0; i < 15; i++) tick(state, ctx);
    // Beam ticks on 0 and 15 (4/s): the second lands on the first's Mark.
    expect(e.hp).toBeCloseTo(HIDE.hp - 1 - 1.15, 9);
    expect(isMarked(e)).toBe(true);
    // A Marked unit takes +15% from every source.
    const before = e.hp;
    applyDamage(state, e, 100, 'kinetic', { kind: 'ability', slot: 1 });
    expect(before - e.hp).toBeCloseTo(115, 9);
  });

  it('lapses 1 s after the beam moves on', () => {
    const { state, ctx } = setup();
    const t = lantern(state, 1, 1, 1);
    const e = spawn(state, HIDE, { dist: 2 });
    tick(state, ctx);
    t.holdFire = true; // the beam goes out; its last Mark runs down
    for (let i = 0; i < 59; i++) tick(state, ctx);
    expect(isMarked(e)).toBe(true);
    tick(state, ctx);
    expect([isMarked(e), e.markPct]).toEqual([false, 0]);
  });

  it('T3 Marks two targets at once, +20%, and never the same one twice', () => {
    const { state, ctx } = setup();
    const t = lantern(state, 1, 1, 3);
    const a = spawn(state, HIDE, { dist: 1 });
    const b = spawn(state, HIDE, { dist: 2 });
    tick(state, ctx);
    expect(new Set([beamUid(t, 0), beamUid(t, 1)])).toEqual(new Set([a.uid, b.uid]));
    expect([a.markPct, b.markPct]).toEqual([0.2, 0.2]);
  });

  it('highest Mark only: a weaker Mark leaves a stronger one standing; an equal one extends it', () => {
    const { state } = setup();
    const e = spawn(state, HIDE, { dist: 2 });
    applyMarked(e, 0.35, 30, false);
    applyMarked(e, 0.15, 60, false);
    expect([e.markPct, e.markTicks]).toEqual([0.35, 30]);
    applyMarked(e, 0.35, 60, false);
    expect([e.markPct, e.markTicks]).toEqual([0.35, 60]);
  });

  it('a held beam never Marks a cloaked unit it can’t see, nor plinks Gerald with one', () => {
    const { state, ctx } = setup();
    lantern(state, 1, 1, 1);
    const g = spawn(state, E.gerald, { dist: 2 });
    for (let i = 0; i < 4; i++) tick(state, ctx);
    expect(isMarked(g)).toBe(false);
    expect(state.stats.neutralHits).toBeGreaterThan(0); // a beam at him plinks, like any shot
  });
});

describe('All-Seeing: every enemy within 3.5 is Marked +15%', () => {
  it('Marks the ground and the air in its radius (inclusive), not past it, every tick', () => {
    const { state, ctx } = setup();
    const t = lantern(state, 1, 1, ALL_SEEING);
    t.holdFire = true; // sight, not fire: it Marks while holding
    const near = spawn(state, HIDE, { dist: 0 });
    const fly = spawn(state, E.lightwing, { dist: 3 });
    const far = spawn(state, HIDE, { dist: 9 }); // (5.5, 4.5): 5 tiles away
    tick(state, ctx);
    expect([near.markPct, fly.markPct, far.markPct]).toEqual([0.15, 0.15, 0]);
    expect(near.markTicks).toBe(AREA_MARK_TICKS);
    expect(beamUid(t, 0)).toBe(0); // holding: no beam
  });

  it('keeps T3’s two beams (their +20% wins over the area’s +15%), and outlasts the radius by 1 s', () => {
    const { state, ctx } = setup();
    const t = lantern(state, 1, 1, ALL_SEEING);
    const a = spawn(state, HIDE, { dist: 1 });
    const b = spawn(state, HIDE, { dist: 2 });
    const c = spawn(state, HIDE, { dist: 3 });
    tick(state, ctx);
    expect(ALL_SEEING.attack).toMatchObject({ beams: 2 });
    expect([beamUid(t, 0), beamUid(t, 1)].filter((u) => u !== 0)).toHaveLength(2);
    const marks = [a, b, c].map((e) => e.markPct).toSorted((x, y) => x - y);
    expect(marks).toEqual([0.15, 0.2, 0.2]);
    // Sold: the area's Mark lasts AREA_MARK_TICKS more.
    t.alive = false;
    state.towerAtTile[1 * 6 + 1] = -1;
    const area = [a, b, c].find((e) => e.markPct === 0.15)!;
    for (let i = 0; i < AREA_MARK_TICKS - 1; i++) status(state);
    expect(isMarked(area)).toBe(true);
    status(state);
    expect(isMarked(area)).toBe(false);
  });

  it('passes over the untouchable (burrowed, Phased, cloaked out, leaving) and neutral units', () => {
    const { state, ctx } = setup();
    lantern(state, 1, 1, ALL_SEEING);
    const dug = spawn(state, E.digger, { dist: 1 });
    dug.burrowed = true;
    const ghost = spawn(state, E.riftmoth, { dist: 2 });
    ghost.phased = true;
    const gerald = spawn(state, E.gerald, { dist: 3 });
    detection(state, ctx);
    expect([dug.markPct, ghost.markPct, gerald.markPct]).toEqual([0, 0, 0]);
  });

  it('Marks a cloaked unit once its own detection reveals it', () => {
    const { state, ctx } = setup();
    lantern(state, 1, 1, ALL_SEEING);
    const veil = spawn(state, E.veilwalker, { dist: 2 });
    detection(state, ctx);
    expect(veil.revealedTicks).toBeGreaterThan(0);
    expect(veil.markPct).toBe(0.15);
  });
});

describe('Truthlight: its target can’t cloak, blink, phase, or burrow while Marked', () => {
  it('one beam, Marked +35%, and no evading for the Mark’s 1 s (a boss too)', () => {
    const { state, ctx } = setup();
    const t = lantern(state, 1, 1, TRUTHLIGHT);
    const e = spawn(state, HIDE, { dist: 1 });
    const other = spawn(state, HIDE, { dist: 2 });
    other.hp = 100; // Strong: the beam takes `e`
    tick(state, ctx);
    expect([beamUid(t, 0), beamUid(t, 1)]).toEqual([e.uid, 0]);
    expect([e.markPct, e.noEvadeTicks]).toEqual([0.35, 60]);
    expect(evadeBlocked(e)).toBe(true);
    expect(isInterrupted(e)).toBe(false); // not an interrupt: its other abilities go on
    const witch = spawn(state, E.glass_witch, { dist: 3 });
    applyEffects(witch, TRUTH);
    expect([witch.markPct, witch.noEvadeTicks]).toEqual([0.35, 60]);
    // It counts down with the Mark, the tick it lands counted.
    for (let i = 0; i < 59; i++) status(state);
    expect(evadeBlocked(witch)).toBe(true);
    status(state);
    expect([witch.noEvadeTicks, evadeBlocked(witch)]).toEqual([0, false]);
  });

  it('a stronger Mark beside it keeps the no-evade; a plain Mark gives none', () => {
    const { state } = setup();
    const e = spawn(state, HIDE, { dist: 1 });
    applyMarked(e, 0.5, 30, false);
    applyEffects(e, TRUTH);
    expect([e.markPct, e.noEvadeTicks]).toEqual([0.5, 60]);
    const f = spawn(state, HIDE, { dist: 2 });
    applyEffects(f, T2.effects);
    expect(f.noEvadeTicks).toBe(0);
  });

  it('no phase: a Rift Moth’s tell is cancelled and its solid stretch restarts', () => {
    const { state } = setup();
    const moth = spawn(state, E.riftmoth, { dist: 2 });
    const phase = E.riftmoth.phase!;
    phaseStep(state, moth, phase); // first tick alive
    while (moth.phaseTicks > phase.tellTicks) phaseStep(state, moth, phase);
    expect(events(state, 'PhaseShift').map((p) => p.phase)).toEqual(['tell']);
    applyEffects(moth, TRUTH);
    expect(phaseBlocked(moth)).toBe(true);
    phaseStep(state, moth, phase);
    expect(events(state, 'PhaseShift').map((p) => p.phase)).toEqual(['tell', 'interrupted']);
    expect([moth.phased, moth.phaseTicks]).toEqual([false, solidTicks(phase)]);
    // Held under the Mark, it never phases.
    for (let i = 0; i < 300; i++) {
      applyEffects(moth, TRUTH);
      phaseStep(state, moth, phase);
      expect(moth.phased).toBe(false);
    }
  });

  it('no blink: a Blinkstrider’s tell is cancelled (BlinkInterrupted) and it stays put', () => {
    const { state, ctx } = setup();
    const b = spawn(state, E.blinkstrider, { dist: 1 });
    const blink = E.blinkstrider.blink!;
    blinkStep(state, ctx, b, blink); // first tick alive
    while (b.blinkTicks > blink.tellTicks) blinkStep(state, ctx, b, blink);
    applyEffects(b, TRUTH);
    blinkStep(state, ctx, b, blink);
    expect(events(state, 'BlinkInterrupted')).toHaveLength(1);
    expect([b.blinkTicks, b.dist]).toEqual([blink.everyTicks, 1]);
    expect(events(state, 'Blinked')).toHaveLength(0);
  });

  it('no dig: a Digger’s dig is cancelled and its surface stretch restarts', () => {
    const { state } = setup();
    const d = spawn(state, E.digger, { dist: 1 });
    const burrow = E.digger.burrow!;
    burrowStep(d, burrow); // first tick alive
    while (d.abilityTicks > burrow.tellTicks) burrowStep(d, burrow);
    applyEffects(d, TRUTH);
    burrowStep(d, burrow);
    expect([d.burrowed, d.abilityTicks]).toEqual([false, surfaceTicks(burrow)]);
  });

  it('no cloak: a Marked Veilwalker stays Revealed outside any detector for the Mark’s 1 s', () => {
    const { state, ctx } = setup();
    const veil = spawn(state, E.veilwalker, { dist: 9 });
    expect(cloakedOut(veil)).toBe(true);
    veil.revealedTicks = 1; // as the Lantern saw it last tick
    applyEffects(veil, TRUTH);
    for (let i = 0; i < 59; i++) {
      status(state);
      detection(state, ctx);
      expect(cloakedOut(veil)).toBe(false);
    }
    status(state);
    detection(state, ctx);
    expect(cloakedOut(veil)).toBe(true);
    expect(events(state, 'Cloaked')).toHaveLength(1);
  });

  it('leaves a shield pulse alone (not an evade)', () => {
    const { state, ctx } = setup();
    const w = spawn(state, E.glass_witch, { dist: 1 });
    const pulse = E.glass_witch.boss!.phases[0]!.pulse!;
    pulseStep(state, ctx, w, pulse);
    while (w.pulseTicks > 1) {
      applyEffects(w, TRUTH);
      pulseStep(state, ctx, w, pulse);
    }
    applyEffects(w, TRUTH);
    pulseStep(state, ctx, w, pulse);
    expect(events(state, 'ShieldPulse').map((e) => e.phase)).toEqual(['tell', 'fired']);
  });

  it('stops the Glass Witch’s blink (a boss phase’s) like a unit’s', () => {
    const { state, ctx } = setup();
    const witch = spawn(state, E.glass_witch, { dist: 1 });
    const blink = E.glass_witch.boss!.phases[1]!.blink!;
    blinkStep(state, ctx, witch, blink); // the phase begins: its tell is next
    blinkStep(state, ctx, witch, blink);
    expect(events(state, 'BlinkTell')).toHaveLength(1);
    applyEffects(witch, TRUTH);
    blinkStep(state, ctx, witch, blink);
    expect(events(state, 'BlinkInterrupted')).toHaveLength(1);
    expect(witch.blinkTicks).toBe(blink.everyTicks);
    // While the Mark holds (no status pass here to run it down), every tell is cancelled.
    for (let i = 0; i < blink.everyTicks * 2; i++) blinkStep(state, ctx, witch, blink);
    expect(events(state, 'Blinked')).toHaveLength(0);
  });
});

describe('the Chitterbloom’s tells ask the interrupt hook (enemies.md § 2.4; T507’s note)', () => {
  /** The live Chitterbloom at `dist`, phase 1 begun. */
  function begin(): { state: SimState; ctx: TickContext; b: Enemy } {
    const { state, ctx } = setup();
    const b = spawn(state, E.chitterbloom, { dist: 2 });
    b.wave = 1;
    enemyAbilities(state, ctx);
    return { state, ctx, b };
  }
  const sneeze = E.chitterbloom.boss!.phases[0]!.spawn!;

  it('Unnerved cancels a sneeze mid-tell; its timer restarts from the full period', () => {
    const { state, ctx, b } = begin();
    while (b.abilityTicks > BOSS_ABILITY_TELL_TICKS) enemyAbilities(state, ctx);
    expect(bossNextAbility(b)).toBe('spawn');
    applyUnnerved(b, 30);
    enemyAbilities(state, ctx);
    expect(b.abilityTicks).toBe(sneeze.everyTicks);
    // While Unnerved holds, the tell can't start: it keeps restarting as the timer reaches it.
    let young = 0;
    for (let i = 0; i < sneeze.everyTicks * 2; i++) {
      if (b.abilityTicks === BOSS_ABILITY_TELL_TICKS + 1) applyUnnerved(b, 2);
      enemyAbilities(state, ctx);
      young = state.enemies.items.filter((e) => e.alive && e.def?.id === 'nibbler').length;
    }
    expect(young).toBe(0);
  });

  it('a sneeze nothing interrupts still goes off on time (Act I unchanged)', () => {
    const { state, ctx, b } = begin();
    for (let t = 0; t < sneeze.everyTicks; t++) enemyAbilities(state, ctx);
    const young = state.enemies.items.filter((e) => e.alive && e.def?.id === 'nibbler');
    expect(young).toHaveLength(sneeze.count);
    expect(b.abilityTicks).toBe(sneeze.everyTicks - 1);
  });

  it('Unnerved or Truthlight cancels a dig; the gap restarts; a surfacing is never held', () => {
    for (const block of ['unnerved', 'truthlight'] as const) {
      const { state, ctx, b } = begin();
      applyDamage(state, b, E.chitterbloom.hp * 0.4, 'psionic', { kind: 'ability', slot: 1 });
      expect(b.bossPhase).toBe(2);
      for (let t = 0; t < BOSS_PHASE_INVULNERABLE_TICKS; t++) enemyAbilities(state, ctx);
      while (b.abilityTicks > BOSS_ABILITY_TELL_TICKS) enemyAbilities(state, ctx);
      expect(bossNextAbility(b)).toBe('burrow');
      if (block === 'unnerved') applyUnnerved(b, 30);
      else applyEffects(b, TRUTH);
      enemyAbilities(state, ctx);
      expect([b.burrowed, b.abilityTicks], block).toEqual([false, BOSS_BURROW_GAP_TICKS]);
      // Once it clears, she digs at the end of the next gap and surfaces on time underground.
      for (let t = 0; t < 60; t++) status(state);
      for (let t = 0; t < BOSS_BURROW_GAP_TICKS; t++) enemyAbilities(state, ctx);
      expect(b.burrowed, block).toBe(true);
      applyUnnerved(b, 600); // can't reach her down there, but even so: nothing holds a surfacing
      const dig = E.chitterbloom.boss!.phases[1]!.burrow!.durationTicks;
      for (let t = 0; t < dig; t++) enemyAbilities(state, ctx);
      expect(b.burrowed, block).toBe(false);
    }
  });
});

describe('Lightsong (Prism + Lantern; towers.md § 6.2)', () => {
  it('sums the Prism’s faster ramp and the Lantern’s +5% Marks while adjacent, and clears them', () => {
    const { state, ctx } = setup();
    const l = lantern(state, 3, 1, 2);
    const p = placeTower(state, PRISM, 4, 2, 1); // corner-adjacent
    state.linksDirty = true;
    links(state, ctx);
    expect([p.linkRampPct, p.linkMarkPct]).toEqual([0.3, 0]);
    expect([l.linkRampPct, l.linkMarkPct]).toEqual([0, 0.05]);
    expect(events(state, 'LinkFormed').map((e) => e.link)).toEqual(['lightsong']);
    p.alive = false;
    state.towerAtTile[2 * 6 + 4] = -1;
    state.linksDirty = true;
    links(state, ctx);
    expect([l.linkRampPct, l.linkMarkPct]).toEqual([0, 0]);
  });

  it('scales with Linked Up like any link bonus', () => {
    const { state, ctx } = setup({
      modifiers: [{ kind: 'linkBonus', pct: 0.5, source: 'protocol' }],
    });
    const l = lantern(state, 3, 1, 2);
    const p = placeTower(state, PRISM, 4, 2, 1);
    state.linksDirty = true;
    links(state, ctx);
    expect(p.linkRampPct).toBeCloseTo(0.45, 12);
    expect(l.linkMarkPct).toBeCloseTo(0.075, 12);
  });

  it('the linked Lantern’s beam Marks +25% (T2), Truthlight’s +40% with its no-evade', () => {
    const { state, ctx } = setup();
    lantern(state, 3, 1, 2);
    placeTower(state, PRISM, 4, 2, 1);
    const e = spawn(state, HIDE, { dist: 3 }); // (2.5, 2.5)
    tick(state, ctx);
    expect(e.markPct).toBeCloseTo(0.25, 12);
    const s2 = setup();
    lantern(s2.state, 3, 1, TRUTHLIGHT);
    placeTower(s2.state, PRISM, 4, 2, 1);
    const f = spawn(s2.state, HIDE, { dist: 3 });
    tick(s2.state, s2.ctx);
    expect(f.markPct).toBeCloseTo(0.4, 12);
    expect(f.noEvadeTicks).toBe(60);
  });

  it('the linked All-Seeing’s area Marks +20%', () => {
    const { state, ctx } = setup();
    const l = lantern(state, 3, 1, ALL_SEEING);
    l.holdFire = true;
    placeTower(state, PRISM, 4, 2, 1).holdFire = true;
    const e = spawn(state, HIDE, { dist: 3 });
    tick(state, ctx);
    expect(e.markPct).toBeCloseTo(0.2, 12);
  });
});

describe('its reach is its detection radius, after stacking (D137, D139)', () => {
  /** A Lantern T1 on fx_map's high ground (3, 2), its links recomputed under `modifiers`. */
  function onHighGround(modifiers: SimConfig<IdSpace>['modifiers'] = []): {
    state: SimState;
    ctx: TickContext;
    t: Tower;
  } {
    const { state, ctx } = setup({ modifiers });
    const t = lantern(state, 3, 2, 1);
    links(state, ctx);
    return { state, ctx, t };
  }
  const RANGE_5: SimConfig<IdSpace>['modifiers'] = [
    { kind: 'towerStat', tower: '*', stat: 'range', pct: 0.05, source: 'rnd' },
  ];
  const TUNE_RANK_3: SimConfig<IdSpace>['modifiers'] = [
    { kind: 'towerStat', tower: 'lantern', stat: 'range', pct: 0.05, source: 'shop' },
    { kind: 'supportStat', tower: 'lantern', stat: 'radius', pct: 0.05, source: 'shop' },
  ];

  it('high ground and a range grant stretch nothing: the beam stops where the reveal does', () => {
    for (const mods of [[], RANGE_5]) {
      const { ctx, t } = onHighGround(mods);
      expect(t.pctRange).toBeGreaterThan(0.2); // +25% high ground (and the grant)
      const attack = t.tierDef!.attack!;
      expect(bonusRangeTiles(attack, t)).toBe(3);
      expect(bonusRangeTiles(attack, t)).toBe(detectRadiusTiles(t, ctx.config.modifiers));
      // The panel reads Range = Detect (P saw "Range 3.15 · Detect 3").
      expect(towerStats(LANTERN, 1, t, ctx.config.modifiers).rangeTiles).toBe(3);
    }
  });

  it('a unit past the detection radius but inside the stacked range is not beamed', () => {
    const { state, ctx, t } = onHighGround();
    const far = spawn(state, HIDE, { dist: 0 }); // (0.5, 0.5): 3.61 from (3.5, 2.5); 3.75 > it
    tick(state, ctx);
    expect([t.targetUid, far.markPct, far.hp]).toEqual([0, 0, HIDE.hp]);
    const near = spawn(state, HIDE, { dist: 4 }); // (2.5, 2.5): 1 tile away
    tick(state, ctx);
    expect(t.targetUid).toBe(near.uid);
    expect(far.markPct).toBe(0);
  });

  it('a radius tune-up widens both: rank 3 reaches 3.15 and sees 3.15', () => {
    const { ctx, t } = onHighGround(TUNE_RANK_3);
    expect(t.detectPct).toBeCloseTo(0.05, 12);
    const r = bonusRangeTiles(t.tierDef!.attack!, t);
    expect(r).toBeCloseTo(3.15, 12);
    expect(r).toBe(detectRadiusTiles(t, ctx.config.modifiers));
  });

  it("the HUD's next tier compares capped reach to capped reach (+0.5 to T2)", () => {
    const { ctx, t } = onHighGround(RANGE_5);
    const line = towerStats(LANTERN, 1, t, ctx.config.modifiers);
    expect([line.rangeTiles, line.next?.rangeTiles]).toEqual([3, 0.5]);
    // Truthlight and All-Seeing keep T2's 3.5 (their tier 3 inherits it).
    expect(towerStats(LANTERN, 4, t, [], 'b').rangeTiles).toBe(3.5);
  });

  it('a tower that detects nothing keeps its stacked range (no cap)', () => {
    const { state, ctx } = setup();
    const g = placeTower(state, GUN, 3, 2, 1); // high ground: 3 × 1.25
    state.linksDirty = true;
    links(state, ctx);
    expect(bonusRangeTiles(g.tierDef!.attack!, g)).toBeCloseTo(3.75, 12);
  });
});

/** A Lantern and an fx_gun on fx_map, run whole, to its end or 40 s: the final hash. */
function runWhole(): string {
  const sim = createSim(lanternConfig());
  sim.enqueue({ type: 'build', tower: 'lantern', tile: [1, 1] });
  sim.enqueue({ type: 'build', tower: 'fx_gun', tile: [3, 1] });
  sim.enqueue({ type: 'callWave' });
  for (let i = 0; i < 60 * 40 && sim.state.outcome === 'playing'; i++) sim.step();
  return sim.hash();
}

describe('in a whole run', () => {
  it('a Lantern build is deterministic', () => {
    expect(runWhole()).toBe(runWhole());
  });
});
