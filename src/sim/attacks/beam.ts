// Beam attacks (the Prism Spire and its specs; the Seer's Lantern's light-beam, T508; design/
// towers.md § 5 and § 7, enemies.md § 2.3; T504). The rules as built:
// - **Beams and targets.** A beam tower runs `beams` beams at once (1; Refractor 3; the Lantern's
//   T3 2; at most MAX_BEAMS), each on its own target: no two beams share one, and a beam with no
//   target left to take stays dark (unlike a volley, beams never double up). Beam 1's target is
//   `targetUid`/`targetSlot` (render aims with it); beams 2 and 3 are `beam2Uid`/`beam3Uid`.
// - **Sticky.** A beam keeps its target until it dies, leaks, or stops being hittable or in range
//   (burrowed, cloaked out, leaving, out of range), whatever the tower's priority says, because the
//   ramp is the point (towers.md § 5). The spare-runners filter drops a spared target. A beam
//   without a target picks one by the tower's priority (Strong by default), passing over the
//   targets the other beams hold.
// - **The ramp.** Each beam has its own multiplier (`beamRamp`, `beam2Ramp`, `beam3Ramp`): 1 on the
//   tick it locks a target, then + `rampPctPerTick` × (1 + `linkRampPct`, Lightsong's Prism) every
//   tick it holds it, up to `rampCap`. Linear: the Prism's +50% per second reaches ×4 after 6 s,
//   Sunlance's +100% per second ×10 after 9 s. Retargeting (a new target for that beam, for any
//   reason) resets it to 1, and so does losing the target. An upgrade keeps it (a lower cap, as
//   Refractor's ×3 under T3's ×5, clamps it). The ramp multiplies the hit after the stacking
//   formula: it is the beam's own, not a tower bonus, so the damage cap doesn't touch it.
// - **Beam ticks.** Damage lands in beam ticks, one every `cooldownTicks` (the attack's
//   `ratePerSec`, which restates the tick: 4/s for 0.25 s ticks; content tests hold the two equal),
//   on every lit beam at once. A beam tick deals `dps × ramp × beamTickSec` (dps: the tower's damage
//   with its bonuses and, per target, its conditional bonuses: `vsStatus`, and Resonance's
//   `vsShieldPct` while the target's shield is up), and armor applies to it at `armor ×
//   beamTickSec` (combat/damage.ts; enemies.md § 2.3), so armor blunts a beam per second, not per
//   tick. A rate bonus (a power node, Overclock) shortens the period like any fire rate: more beam
//   ticks, each the same size, so it raises the beam's damage and its armor per second alike. The
//   first tick lands on the tick a beam locks on when the tower is ready (cooldown 0). Every victim
//   then takes the tier's effects (the Lantern's Mark) and the link's statuses. A neutral target
//   (Gerald) plinks each tick (combat/neutral.ts).
// - **Hold Fire** puts every beam out (`beamOff`, from systems/towers.ts); the cooldown keeps
//   counting down.
// - **Events.** ProjectileFired (`kind: 'beam'`, uid 0) when a beam locks a target (the moment its
//   ramp starts); ProjectileHit (uid 0, at the target) for each beam on each beam tick, with the HP
//   it took; BeamChanged when `beamActive` (any beam lit) turns on or off. Render reads
//   `beamActive`, the targets, and the ramps; Sundown (T505) reads `beamActive` (a lit Prism is a
//   light source).
// Allocation-free: the held targets live in the tick's scratch slot list.
import type { CompiledAttack, CompiledTier } from '../../content/compiled.ts';
import { applyDamage, applyEffects, armorReduces } from '../combat/damage.ts';
import { hitNeutral, isNeutral } from '../combat/neutral.ts';
import { isStillTarget, pickTarget } from '../combat/targeting.ts';
import { bonusPeriodTicks } from '../bonuses.ts';
import type { Enemy, Tower } from '../entities.ts';
import type { Pool } from '../pool.ts';
import { emit, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { applyLinkStatuses } from '../systems/status.ts';
import { damageOn, rangeOf } from '../systems/towers.ts';

export type BeamAttack = Extract<CompiledAttack, { kind: 'beam' }>;

/** Beams one tower can run at once (Tower has fields for three: Refractor's split). */
export const MAX_BEAMS = 3;

/** Beam `k`'s (0-based) target uid. */
export function beamUid(t: Tower, k: number): number {
  return k === 0 ? t.targetUid : k === 1 ? t.beam2Uid : t.beam3Uid;
}

/** Beam `k`'s (0-based) ramp multiplier (1: none yet). */
export function beamRampOf(t: Tower, k: number): number {
  return k === 0 ? t.beamRamp : k === 1 ? t.beam2Ramp : t.beam3Ramp;
}

function setBeam(t: Tower, k: number, uid: number, slot: number, ramp: number): void {
  if (k === 0) {
    t.targetUid = uid;
    t.targetSlot = slot;
    t.beamRamp = ramp;
  } else if (k === 1) {
    t.beam2Uid = uid;
    t.beam2Ramp = ramp;
  } else {
    t.beam3Uid = uid;
    t.beam3Ramp = ramp;
  }
}

/** The pool slot of the live enemy `uid` (beams 2 and 3 keep no slot hint), or −1. */
function slotOfUid(enemies: Pool<Enemy>, uid: number): number {
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (e.uid === uid) return e.alive ? i : -1;
  }
  return -1;
}

/** Sets `beamActive`, emitting BeamChanged when it changes. */
function setActive(state: SimState, t: Tower, on: boolean): void {
  if (t.beamActive === on) return;
  t.beamActive = on;
  emit(state, { type: 'BeamChanged', towerUid: t.uid, on });
}

/** Puts every beam out (Hold Fire): no targets, ramps back to 1, `beamActive` off. */
export function beamOff(state: SimState, t: Tower): void {
  for (let k = 0; k < MAX_BEAMS; k++) setBeam(t, k, 0, -1, 1);
  setActive(state, t, false);
}

/**
 * A beam tower's tick: keep or pick each beam's target, grow the ramps, and land a beam tick on
 * every lit beam when the tower is ready. Returns whether a beam tick hit a Skitterkin (the "not
 * firing" clock, fireControl.ts).
 */
export function beamAttack(
  state: SimState,
  ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: BeamAttack,
): boolean {
  const enemies = state.enemies;
  const layers = tier.targets;
  const range = rangeOf(ctx, t, attack);
  const spare = t.spareRunners;
  const beams = attack.beams < MAX_BEAMS ? attack.beams : MAX_BEAMS;
  const cap = attack.rampCap;
  const step = attack.rampPctPerTick * (1 + t.linkRampPct);
  const held = ctx.scratch.slots;
  held.length = 0;

  // Keep: each beam holds its target while it stays valid, and its ramp grows.
  for (let k = 0; k < MAX_BEAMS; k++) {
    const uid = beamUid(t, k);
    if (uid === 0) continue;
    const slot = k === 0 ? t.targetSlot : slotOfUid(enemies, uid);
    const e = k < beams ? isStillTarget(enemies, slot, uid, t.x, t.y, layers, range, spare) : null;
    if (e === null) {
      setBeam(t, k, 0, -1, 1);
      continue;
    }
    const grown = beamRampOf(t, k) + step;
    setBeam(t, k, uid, e.slot, grown < cap ? grown : cap);
    held.push(e.slot);
  }
  // Pick: each dark beam takes the best target the others don't hold; its ramp starts at 1.
  const priority = t.priority ?? 'strong';
  for (let k = 0; k < beams; k++) {
    if (beamUid(t, k) !== 0) continue;
    const e = pickTarget(enemies, t.x, t.y, layers, range, priority, spare, held);
    if (e === null) break;
    setBeam(t, k, e.uid, e.slot, 1);
    held.push(e.slot);
    emit(state, {
      type: 'ProjectileFired',
      uid: 0,
      towerUid: t.uid,
      kind: 'beam',
      targetUid: e.uid,
      x: t.x,
      y: t.y,
      targetX: e.x,
      targetY: e.y,
      sprite: null,
      flightTicks: 0,
      radiusTiles: 0,
    });
  }
  const lit = held.length;
  held.length = 0;
  setActive(state, t, lit > 0);
  if (lit === 0 || t.cooldownTicks > 0) return false;

  // A beam tick on every lit beam, in beam order.
  let atSkitterkin = false;
  for (let k = 0; k < beams; k++) {
    const uid = beamUid(t, k);
    if (uid === 0) continue;
    const e = enemies.items[k === 0 ? t.targetSlot : slotOfUid(enemies, uid)]!; // kept or picked above
    if (e.def?.faction === 'skitterkin') atSkitterkin = true;
    beamTick(state, ctx, t, tier, attack, e, beamRampOf(t, k));
  }
  t.cooldownTicks = bonusPeriodTicks(attack, t);
  if (t.firstFiredTick < 0) t.firstFiredTick = state.tick;
  return atSkitterkin;
}

/** One beam tick on `e` at `ramp`: ProjectileHit, the damage, then effects and link statuses. */
function beamTick(
  state: SimState,
  ctx: TickContext,
  t: Tower,
  tier: CompiledTier,
  attack: BeamAttack,
  e: Enemy,
  ramp: number,
): void {
  const neutral = isNeutral(e);
  const hit = {
    type: 'ProjectileHit' as const,
    uid: 0,
    towerUid: t.uid,
    x: e.x,
    y: e.y,
    hits: neutral ? 0 : 1,
    damage: 0,
    reduced: !neutral && armorReduces(e, attack.type, attack),
  };
  emit(state, hit);
  if (neutral) {
    hitNeutral(state, e, t.uid);
    return;
  }
  const source = ctx.scratch.towerSource;
  source.uid = t.uid;
  const amount = beamTickDamage(damageOn(t, attack, e), ramp, attack.beamTickSec);
  // Filled in after the damage lands (events.ts, ProjectileHit).
  hit.damage = applyDamage(state, e, amount, attack.type, source, attack);
  applyEffects(e, tier.effects);
  applyLinkStatuses(t, e);
}

/** A beam tick's raw damage: damage per second × the ramp × the tick's length in seconds. */
export function beamTickDamage(dps: number, ramp: number, tickSec: number): number {
  return dps * ramp * tickSec;
}
