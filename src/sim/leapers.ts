// Leapers (design/towers.md § 7, the Sproing Pad; T704): each pad keeps its `leapers` as owner
// allies from the swarmling pool (`mode: 'owner'`, kind 'leaper', the pad's uid in `ownerUid`),
// which boing out to a target in the pad's range, bonk it, and boing home. They can't be harmed
// (vulnerability `never`) and always come home. Runs after the towers and the swarmlings
// (tick.ts), so it reads this tick's sells, upgrades, and specs; sim/swarmlings.ts passes leapers
// by. Allocation-free once warm (a new leaper takes a pool slot).
//
// - **The family.** A pad keeps its tier's `leapers` (Sky Bouncers: 2); `Tower.swarmAlive` counts
//   them. Missing ones appear at home, ready (a new pad leaps at once). One past the count goes in
//   at home. A sold pad's leapers go in at once, wherever they are.
// - **Home** (`swarmState` 'home', at the pad's tile centre). Each leaper keeps its own period
//   (`cooldownTicks`: the tier's, under the pad's rate bonus, `bonusPeriodTicks`), counting down in
//   every state from the tick it leaps. Ready and home, with the pad neither holding fire nor
//   Jammed, it picks a target and leaps that tick. So it leaps once a period, or on landing home
//   when the trip took longer.
// - **The pick:** a live enemy whose centre is in the pad's range (its bonuses applied, Lookie
//   Here's +0.5 among them: systems/towers.ts `rangeOf`), on a layer the tier hits (G+A; a pinned
//   flyer counts), never burrowed, Phased, leaving, cloaked out, neutral, or a unit an ally never
//   targets (allyMayTarget, D005; the swarmlings' rule, not the spare-runners filter). It ranks, in
//   order: a flyer over a ground unit (**always prefers flyers**); with Lookie Here
//   (`Tower.linkPreferMarked`), a Marked unit over an unmarked one; a **free** unit (not Pinned and
//   no other leaper on its way to it) over a taken one, so Sky Bouncers' two spread over two
//   flyers and none wastes a bonk on a flyer already grounded; then First (least route left), then
//   the lowest uid.
// - **The leap** ('out'): LEAP_TILES_PER_SEC straight at the target's centre each tick (render
//   draws the arc). A target that dies, goes out of reach, or runs LEAP_LEASH_TILES past the pad's
//   range is swapped for a fresh pick, else the leaper boings home. A pad holding fire or Jammed
//   (enemies.md § 4: a Jammed tower holds fire) calls its leapers home: they turn back mid-air.
// - **The bonk** (on reaching the target, within one step): `LeaperBonk`, then the pad's damage
//   (`damageOn`: its bonuses, a link's conditional bonus per victim) as one Kinetic hit through the
//   pipeline (armor applies), credited to the pad (`{ kind: 'tower' }`). Big Bonk's splash hits
//   every unit within `splashTiles` of the target's centre on the tier's layers (no falloff;
//   untargetable and neutral units passed by), the target included. Then, if the target is a
//   flyer and still alive, it's **Pinned** for the tier's `pinTicks` + Bounce Chorus's
//   (`Tower.linkPinTicks`) through systems/status.ts `applyPin`: held, and **grounded**, so ground
//   towers hit it too (enemyAbilities/layers.ts `onLayers`); a Pin never stacks or extends, and the
//   unit is immune for 1 s after. A Pin that lands emits `FlyerGrounded`. A flying boss takes
//   Chilled 50% for that long instead (applyPin's boss rule; no flyer is a boss yet). A ground
//   unit is bonked, not Pinned (towers.md: "a bonked flyer is Pinned"). Only the target is Pinned,
//   never a splash victim.
// - **Back** ('back'): the same speed home, then 'home'.
import type { CompiledAttack } from '../content/compiled.ts';
import { TICK_HZ } from '../shared/time.ts';
import { bonusPeriodTicks } from './bonuses.ts';
import { applyDamage } from './combat/damage.ts';
import { isNeutral } from './combat/neutral.ts';
import { onLayers, untargetable } from './enemyAbilities/layers.ts';
import { ALLY_BLANK, type Ally, type Enemy, type Tower } from './entities.ts';
import { poolAlloc, poolKill } from './pool.ts';
import { emit, takeUid, type SimState } from './state.ts';
import { allyMayTarget } from './systems/allies.ts';
import { applyPin } from './systems/status.ts';
import { damageOn, rangeOf } from './systems/towers.ts';
import type { TickContext } from './tick.ts';

type LeaperAttack = Extract<CompiledAttack, { kind: 'leaper' }>;

/** A leaper's boing, out and back (the docs give none; T704's choice): 6 tiles/s. */
export const LEAP_TILES_PER_SEC = 6;
/** A leap drops a target this far past the pad's range (tiles), for a fresh pick or home. */
export const LEAP_LEASH_TILES = 1.5;

const STEP = LEAP_TILES_PER_SEC / TICK_HZ;

/** Whether `a` is a live leaper (an owner ally of kind 'leaper'). */
export function isLeaper(a: Ally): boolean {
  return a.alive && a.mode === 'owner' && a.kind === 'leaper';
}

/** The pad's leaper attack, or null (not a Sproing Pad). */
function leaperOf(t: Tower): LeaperAttack | null {
  const a = t.tierDef?.attack ?? null;
  return a !== null && a.kind === 'leaper' ? a : null;
}

/** The live pad `uid`, or null (sold). */
function padOf(state: SimState, uid: number): Tower | null {
  const pool = state.towers;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (t.alive && t.uid === uid) return t;
  }
  return null;
}

/** The live enemy `uid` (its pool `slot` a hint), or null. */
function enemyAt(state: SimState, slot: number, uid: number): Enemy | null {
  if (uid === 0 || slot < 0 || slot >= state.enemies.used) return null;
  const e = state.enemies.items[slot]!; // 0 ≤ slot < used
  return e.alive && e.uid === uid ? e : null;
}

/** Whether a leaper (hitting these layers) may bonk `e` (see the header). */
function reachable(e: Enemy, ground: boolean, air: boolean): boolean {
  return (
    e.alive &&
    e.def !== null &&
    !untargetable(e) &&
    !isNeutral(e) &&
    onLayers(e, ground, air) &&
    allyMayTarget(e.tags)
  );
}

export function leapers(state: SimState, ctx: TickContext): void {
  if (!anyLeaper(state)) return;
  family(state);
  const allies = state.allies;
  for (let i = 0; i < allies.used; i++) {
    const a = allies.items[i]!; // i < used ≤ items.length
    if (isLeaper(a)) step(state, ctx, a);
  }
}

/** Whether any pad stands or any leaper is out (else the pass has nothing to do). */
function anyLeaper(state: SimState): boolean {
  const towers = state.towers;
  for (let i = 0; i < towers.used; i++) {
    const t = towers.items[i]!; // i < used ≤ items.length
    if (t.alive && leaperOf(t) !== null) return true;
  }
  const allies = state.allies;
  for (let i = 0; i < allies.used; i++) {
    if (isLeaper(allies.items[i]!)) return true; // i < used ≤ items.length
  }
  return false;
}

/** Counts each pad's leapers (`swarmAlive`) and makes up the missing at home. */
function family(state: SimState): void {
  const towers = state.towers;
  const allies = state.allies;
  for (let i = 0; i < towers.used; i++) {
    const t = towers.items[i]!; // i < used ≤ items.length
    const attack = t.alive ? leaperOf(t) : null;
    if (attack === null) continue;
    let n = 0;
    for (let j = 0; j < allies.used; j++) {
      const a = allies.items[j]!; // j < used ≤ items.length
      if (isLeaper(a) && a.ownerUid === t.uid) n++;
    }
    while (n < attack.leapers) {
      spawnAtHome(state, t, attack);
      n++;
    }
    t.swarmAlive = n;
  }
}

/** A new leaper at its pad, ready. */
function spawnAtHome(state: SimState, t: Tower, attack: LeaperAttack): void {
  const a = poolAlloc(state.allies, ALLY_BLANK, takeUid(state));
  a.kind = 'leaper';
  a.mode = 'owner';
  a.vulnerability = 'never';
  a.ownerUid = t.uid;
  a.x = t.x;
  a.y = t.y;
  // No attack of its own (`damage` 0, so the allies system passes it by): its bonk is the pad's.
  a.damageType = attack.type;
  a.hitsGround = t.tierDef!.targets.ground; // leaperOf checked tierDef
  a.hitsAir = t.tierDef!.targets.air;
  a.swarmState = 'home';
  a.cooldownTicks = 0;
}

/** One tick of a leaper (see the header). */
function step(state: SimState, ctx: TickContext, a: Ally): void {
  const pad = padOf(state, a.ownerUid);
  const attack = pad === null ? null : leaperOf(pad);
  if (pad === null || attack === null) {
    poolKill(state.allies, a); // its pad was sold: it goes in at once
    return;
  }
  if (a.cooldownTicks > 0) a.cooldownTicks--;
  switch (a.swarmState) {
    case 'home':
      home(state, ctx, a, pad, attack);
      return;
    case 'out':
      leap(state, ctx, a, pad, attack);
      return;
    case 'back':
    case 'latched': // never a leaper's; home it goes
      if (moveToward(a, pad.x, pad.y)) a.swarmState = 'home';
      return;
  }
}

/** At home: ready, its pad free to fire, it picks a target and leaps (this tick). */
function home(state: SimState, ctx: TickContext, a: Ally, pad: Tower, attack: LeaperAttack): void {
  a.x = pad.x;
  a.y = pad.y;
  if (pad.swarmAlive > attack.leapers) {
    pad.swarmAlive--;
    poolKill(state.allies, a); // one past the count goes in
    return;
  }
  if (a.cooldownTicks > 0 || pad.holdFire || pad.jamTicks > 0) return;
  const target = pick(state, ctx, pad, attack, a);
  if (target === null) return;
  a.swarmState = 'out';
  a.targetUid = target.uid;
  a.targetSlot = target.slot;
  a.cooldownTicks = bonusPeriodTicks(attack, pad);
  leap(state, ctx, a, pad, attack);
}

/** In the air: re-picks a target it lost, bonks on reaching it, then heads home. */
function leap(state: SimState, ctx: TickContext, a: Ally, pad: Tower, attack: LeaperAttack): void {
  if (pad.holdFire || pad.jamTicks > 0) {
    turnBack(a); // holding fire or Jammed: it boings home mid-air
    return;
  }
  let target = enemyAt(state, a.targetSlot, a.targetUid);
  if (target !== null && !keepsChasing(ctx, pad, attack, a, target)) target = null;
  if (target === null) {
    target = pick(state, ctx, pad, attack, a);
    if (target === null) {
      turnBack(a);
      return;
    }
    a.targetUid = target.uid;
    a.targetSlot = target.slot;
  }
  if (!moveToward(a, target.x, target.y)) return;
  bonk(state, ctx, pad, attack, target);
  turnBack(a);
}

/** Whether a leaper keeps after `e`: still reachable and within the leash of the pad's range. */
function keepsChasing(
  ctx: TickContext,
  pad: Tower,
  attack: LeaperAttack,
  a: Ally,
  e: Enemy,
): boolean {
  if (!reachable(e, a.hitsGround, a.hitsAir)) return false;
  const leash = Math.sqrt(rangeOf(ctx, pad, attack).rangeSq) + LEAP_LEASH_TILES;
  const dx = e.x - pad.x;
  const dy = e.y - pad.y;
  return dx * dx + dy * dy <= leash * leash;
}

/** The bonk on `target`: damage (Big Bonk's splash), then a flyer's Pin (see the header). */
function bonk(
  state: SimState,
  ctx: TickContext,
  pad: Tower,
  attack: LeaperAttack,
  target: Enemy,
): void {
  emit(state, { type: 'LeaperBonk', tower: pad.uid, target: target.uid });
  if (pad.firstFiredTick < 0) pad.firstFiredTick = state.tick;
  // One scratch source for every hit (applyDamage copies what an EnemyDied keeps).
  const source = ctx.scratch.towerSource;
  source.uid = pad.uid;
  const flyer = target.def !== null && target.def.layer === 'air';
  if (attack.splashSq === 0) {
    applyDamage(state, target, damageOn(pad, attack, target), attack.type, source, attack);
  } else {
    // Every victim chosen before any damage, so the order of hits can't change who is in it.
    const enemies = state.enemies;
    const victims = ctx.scratch.slots;
    victims.length = 0;
    const tierTargets = pad.tierDef!.targets; // leaperOf checked tierDef
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      if (!e.alive || e.def === null || untargetable(e) || isNeutral(e)) continue;
      if (!onLayers(e, tierTargets.ground, tierTargets.air)) continue;
      const dx = e.x - target.x;
      const dy = e.y - target.y;
      if (dx * dx + dy * dy <= attack.splashSq) victims.push(i);
    }
    for (let k = 0; k < victims.length; k++) {
      const e = enemies.items[victims[k]!]!; // collected slots < used
      applyDamage(state, e, damageOn(pad, attack, e), attack.type, source, attack);
    }
    victims.length = 0;
  }
  if (!flyer || !target.alive) return;
  const ticks = attack.pinTicks + pad.linkPinTicks;
  if (applyPin(target, ticks)) emit(state, { type: 'FlyerGrounded', uid: target.uid, ticks });
}

/** Steps toward a point; returns whether it got there this tick (it snaps on). */
function moveToward(a: Ally, x: number, y: number): boolean {
  const dx = x - a.x;
  const dy = y - a.y;
  const d2 = dx * dx + dy * dy;
  if (d2 <= STEP * STEP) {
    a.x = x;
    a.y = y;
    return true;
  }
  const k = STEP / Math.sqrt(d2);
  a.x += dx * k;
  a.y += dy * k;
  return false;
}

function turnBack(a: Ally): void {
  a.swarmState = 'back';
  a.targetUid = 0;
  a.targetSlot = -1;
}

/** Route distance left to the core ("First" ranks by it). */
function remaining(e: Enemy): number {
  return e.route === null ? 0 : e.route.lengthTiles - e.dist;
}

/**
 * The pad's pick for leaper `self` (see the header): flyer, then Marked (Lookie Here), then free,
 * then First, then the lowest uid; null if no unit in range is reachable.
 */
function pick(
  state: SimState,
  ctx: TickContext,
  pad: Tower,
  attack: LeaperAttack,
  self: Ally,
): Enemy | null {
  const enemies = state.enemies;
  const rangeSq = rangeOf(ctx, pad, attack).rangeSq;
  const marks = pad.linkPreferMarked;
  let best: Enemy | null = null;
  let bAir = false;
  let bMarked = false;
  let bFree = false;
  let bLeft = 0;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!reachable(e, self.hitsGround, self.hitsAir)) continue;
    const dx = e.x - pad.x;
    const dy = e.y - pad.y;
    if (dx * dx + dy * dy > rangeSq) continue;
    const air = e.def!.layer === 'air'; // reachable checked def
    const marked = marks && e.markTicks > 0;
    const free = e.pinnedTicks === 0 && !claimed(state, e.uid, self);
    const left = remaining(e);
    if (best !== null) {
      if (air !== bAir) {
        if (!air) continue;
      } else if (marked !== bMarked) {
        if (!marked) continue;
      } else if (free !== bFree) {
        if (!free) continue;
      } else if (left !== bLeft) {
        if (left > bLeft) continue;
      } else if (e.uid > best.uid) continue;
    }
    best = e;
    bAir = air;
    bMarked = marked;
    bFree = free;
    bLeft = left;
  }
  return best;
}

/** Whether another leaper (any pad's) is on its way to enemy `uid`. */
function claimed(state: SimState, uid: number, self: Ally): boolean {
  const allies = state.allies;
  for (let i = 0; i < allies.used; i++) {
    const a = allies.items[i]!; // i < used ≤ items.length
    if (a !== self && a.targetUid === uid && a.swarmState === 'out' && isLeaper(a)) return true;
  }
  return false;
}
