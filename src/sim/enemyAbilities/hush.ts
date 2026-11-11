// The hush rule (design/enemies.md § 5.4, its one home; D101). A non-boss Hollow unit
// (`def.hushes`) that comes into contact with a hushable unit (a live `fleeing` Skitterkin enemy,
// or an escort refugee on the field, T305c; later a bearer or singer) stops for the HUSH_TELL_SEC
// tell, then removes it
// (no leak, no bounty, not processed), heals to full, and turns Heavy (`Enemy.heavy`: base speed ×
// HUSH_SPEED_MUL, movement.ts). One hush each: a Heavy unit ignores every other hushable unit.
// - **Contact:** the same layer (a ground Hollow can't hush a flyer), within HUSH_CONTACT_TILES
//   along the route when both walk the same one, or in a straight line when they don't (where two
//   roads merge, their units share tiles). A unit out of reach (burrowed, Phased, or leaving;
//   layers.ts `outOfReach`) is in no contact, either side (T507: a Phased Hollow unit can't hush).
// - **The tell:** the Hollow unit holds `hushUid` (its victim) and `hushTicks` (the tell left), and
//   the victim holds `hushUid` (its Hollow unit); both stand still (`paceMul` 0) for the tell
//   (HushStarted). Towers can still shoot either one: if the victim dies or leaks first, the
//   Hollow unit walks on with its hush unspent; if the Hollow unit dies, the victim runs on (and
//   so does either one if the other digs in, phases, or starts leaving with a boss).
// - **The interrupt** (§ 2.4; T407a): while the interrupt hook holds a Hollow unit
//   (systems/status.ts `isInterrupted`: Stasis, Unnerved), it can't start a hush, and a tell
//   under way is cancelled: the victim runs on and the hush stays unspent (no event: render sees
//   `hushUid` clear).
// - **The hush:** the victim is removed, marked `leaving` so cleanup counts it neither a kill nor a
//   leak (Hushed, then TurnedHeavy), and the Skitterkin around it bolt (skittish.ts).
// - **Refugees** (T305c; sim/escort.ts): an ally victim is matched in the same pass as enemy ones
//   (one nearest-first matching over both), holds `hushUid` and stands still the same way, and on
//   the hush is removed and lost (Hushed with `victimAlly`, then RefugeeLost `hushed`). Refugees
//   walk the ground (a flyer never hushes one); one still filing in (`dist` < 0) and Pebble
//   (`vulnerability: 'never'`) can't be hushed. A hushed refugee sets no runner bolting.
// - **Order independence:** new contacts are matched on the tick's state before any is applied. A
//   victim goes to its nearest free Hollow unit and a Hollow unit takes its nearest such victim,
//   ties to the lower uid, so slot order never decides who hushes whom; a unit left out waits a
//   tick. The countdown runs first, so a tell started this tick isn't counted down until the next.
// enemyAbilities runs it once a tick, after each unit's own abilities and before the huddles.
import { HUSH_CONTACT_TILES, HUSH_TELL_SEC } from '../../content/rules.ts';
import { secToTicks } from '../../shared/time.ts';
import type { Ally, Enemy } from '../entities.ts';
import { loseRefugee, onField } from '../escort.ts';
import { poolKill, type Pool } from '../pool.ts';
import { emit, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { isInterrupted } from '../systems/status.ts';
import { outOfReach } from './layers.ts';
import { boltNear } from './skittish.ts';

export const HUSH_TELL_TICKS = secToTicks(HUSH_TELL_SEC);
const CONTACT_SQ = HUSH_CONTACT_TILES * HUSH_CONTACT_TILES;

/** Whether `h` may start a hush: a live hushing unit on the field with its hush unspent. */
export function canHush(h: Enemy): boolean {
  const def = h.def;
  return (
    h.alive &&
    def !== null &&
    def.hushes &&
    !h.heavy &&
    h.hushUid === 0 &&
    !outOfReach(h) &&
    !isInterrupted(h)
  );
}

/** Whether `v` may be hushed: a live `fleeing` unit on the field that no Hollow unit holds. */
export function isHushable(v: Enemy): boolean {
  const def = v.def;
  return (
    v.alive &&
    def !== null &&
    def.boss === null &&
    !def.neutral &&
    v.hushUid === 0 &&
    !outOfReach(v) &&
    v.tags.includes('fleeing')
  );
}

/**
 * The squared contact distance between Hollow unit `h` and `v` (along their shared route, or a
 * straight line), or −1 when they aren't in contact (another layer, or too far).
 */
export function contactSq(h: Enemy, v: Enemy): number {
  if (h.def === null || v.def === null || h.def.layer !== v.def.layer) return -1;
  let d2: number;
  if (h.route !== null && h.route === v.route) {
    const d = h.dist - v.dist;
    d2 = d * d;
  } else {
    const dx = h.x - v.x;
    const dy = h.y - v.y;
    d2 = dx * dx + dy * dy;
  }
  return d2 <= CONTACT_SQ ? d2 : -1;
}

/** Whether refugee `a` may be hushed: a live, hushable ally on the field that no Hollow unit holds. */
export function isHushableAlly(a: Ally): boolean {
  return a.alive && a.vulnerability === 'hush' && a.hushUid === 0 && a.route !== null && onField(a);
}

/** The squared contact distance between Hollow unit `h` and ally `a` (as contactSq), or −1. */
export function allyContactSq(h: Enemy, a: Ally): number {
  if (h.def === null || h.def.layer !== 'ground') return -1; // refugees walk the ground
  let d2: number;
  if (h.route !== null && h.route === a.route) {
    const d = h.dist - a.dist;
    d2 = d * d;
  } else {
    const dx = h.x - a.x;
    const dy = h.y - a.y;
    d2 = dx * dx + dy * dy;
  }
  return d2 <= CONTACT_SQ ? d2 : -1;
}

/** Whether a candidate at `d2` with `uid` beats the best so far (nearer, then the lower uid). */
function better(d2: number, uid: number, bestD2: number, bestUid: number): boolean {
  return bestD2 < 0 || d2 < bestD2 || (d2 === bestD2 && uid < bestUid);
}

/** The free Hollow unit nearest `v` (ties: the lower uid), or null. */
function nearestHollow(pool: Pool<Enemy>, v: Enemy): Enemy | null {
  let best: Enemy | null = null;
  let bestD2 = -1;
  for (let i = 0; i < pool.used; i++) {
    const h = pool.items[i]!; // i < used ≤ items.length
    if (!canHush(h)) continue;
    const d2 = contactSq(h, v);
    if (d2 >= 0 && better(d2, h.uid, bestD2, best?.uid ?? 0)) {
      best = h;
      bestD2 = d2;
    }
  }
  return best;
}

/** The free Hollow unit nearest ally `a` (ties: the lower uid), or null. */
function nearestHollowToAlly(pool: Pool<Enemy>, a: Ally): Enemy | null {
  let best: Enemy | null = null;
  let bestD2 = -1;
  for (let i = 0; i < pool.used; i++) {
    const h = pool.items[i]!; // i < used ≤ items.length
    if (!canHush(h)) continue;
    const d2 = allyContactSq(h, a);
    if (d2 >= 0 && better(d2, h.uid, bestD2, best?.uid ?? 0)) {
      best = h;
      bestD2 = d2;
    }
  }
  return best;
}

/** No victim (victimFor). */
const NO_VICTIM = Number.MIN_SAFE_INTEGER;

/**
 * The victim free Hollow unit `h` takes this tick (one whose nearest Hollow unit it is), encoded:
 * an enemy's slot (≥ 0), an ally's as −(slot + 1), or NO_VICTIM. Enemies and allies compete on one
 * nearest-first rule (ties: the lower uid; uids are unique across pools).
 */
function victimFor(state: SimState, h: Enemy): number {
  const pool = state.enemies;
  let best = NO_VICTIM;
  let bestUid = 0;
  let bestD2 = -1;
  for (let i = 0; i < pool.used; i++) {
    const v = pool.items[i]!; // i < used ≤ items.length
    if (!isHushable(v)) continue;
    const d2 = contactSq(h, v);
    if (d2 < 0 || !better(d2, v.uid, bestD2, bestUid)) continue;
    if (nearestHollow(pool, v) !== h) continue;
    best = v.slot;
    bestUid = v.uid;
    bestD2 = d2;
  }
  const allies = state.allies;
  for (let i = 0; i < allies.used; i++) {
    const a = allies.items[i]!; // i < used ≤ items.length
    if (!isHushableAlly(a)) continue;
    const d2 = allyContactSq(h, a);
    if (d2 < 0 || !better(d2, a.uid, bestD2, bestUid)) continue;
    if (nearestHollowToAlly(pool, a) !== h) continue;
    best = -(a.slot + 1);
    bestUid = a.uid;
    bestD2 = d2;
  }
  return best;
}

/** The live ally with `uid`, or null. */
function liveAllyByUid(pool: Pool<Ally>, uid: number): Ally | null {
  for (let i = 0; i < pool.used; i++) {
    const a = pool.items[i]!; // i < used ≤ items.length
    if (a.alive && a.uid === uid) return a;
  }
  return null;
}

/** The live enemy with `uid`, or null (it died, leaked, or its slot was reused). */
function liveByUid(pool: Pool<Enemy>, uid: number): Enemy | null {
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    if (e.alive && e.uid === uid) return e;
  }
  return null;
}

/** One tick of the hush rule over every unit: tells under way, then new contacts. */
export function hushPass(state: SimState, ctx: TickContext): void {
  const pool = state.enemies;
  // 1. Tells under way: count down, land, or let go when the other side is gone.
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    // A gatherer's pair is its gather's tendril hold (gather.ts keeps it; T602).
    if (!e.alive || e.hushUid === 0 || e.def === null || e.def.gather !== null) continue;
    const other = liveByUid(pool, e.hushUid);
    if (e.def.hushes && other === null) {
      if (tellOnAlly(state, e)) continue; // its victim is a refugee (T305c)
    }
    if (e.def.hushes) {
      const gone = other === null || outOfReach(other);
      if (gone || outOfReach(e) || isInterrupted(e)) {
        e.hushUid = 0;
        e.hushTicks = 0;
        if (other !== null) other.hushUid = 0;
      } else if (--e.hushTicks <= 0) {
        landHush(state, e, other);
      } else {
        e.paceMul = 0;
        other.paceMul = 0;
      }
    } else if (other === null || other.hushUid !== e.uid) {
      e.hushUid = 0; // its Hollow unit is gone: it runs on
    }
  }
  releaseAllies(state);
  // 2. New contacts, matched on this state before any is applied (order independence).
  const pairs = ctx.scratch.slots;
  pairs.length = 0;
  for (let i = 0; i < pool.used; i++) {
    const h = pool.items[i]!; // i < used ≤ items.length
    if (!canHush(h)) continue;
    const v = victimFor(state, h);
    if (v !== NO_VICTIM) pairs.push(h.slot, v);
  }
  for (let p = 0; p < pairs.length; p += 2) {
    const h = pool.items[pairs[p]!]!; // slots pushed above, in pairs
    const code = pairs[p + 1]!;
    const v = code >= 0 ? pool.items[code]! : state.allies.items[-code - 1]!; // victimFor's code
    h.hushUid = v.uid;
    h.hushTicks = HUSH_TELL_TICKS;
    v.hushUid = h.uid;
    h.paceMul = 0;
    if (code >= 0) pool.items[code]!.paceMul = 0; // a refugee holds still by its hushUid
    emit(state, {
      type: 'HushStarted',
      uid: h.uid,
      enemy: h.def!.id, // canHush checked def
      victim: v.uid,
      x: v.x,
      y: v.y,
    });
  }
  pairs.length = 0;
}

/**
 * A tell on a refugee (T305c): counts down and lands, or lets go when the refugee is gone or the
 * Hollow unit can't go on (as an enemy victim's). Returns false when `e` holds no live ally.
 */
function tellOnAlly(state: SimState, e: Enemy): boolean {
  const a = liveAllyByUid(state.allies, e.hushUid);
  if (a === null) return false;
  if (outOfReach(e) || isInterrupted(e)) {
    e.hushUid = 0;
    e.hushTicks = 0;
    a.hushUid = 0;
  } else if (--e.hushTicks <= 0) {
    landHushAlly(state, e, a);
  } else {
    e.paceMul = 0;
  }
  return true;
}

/** Refugees whose Hollow unit is gone or let go walk on (their `hushUid` clears). */
function releaseAllies(state: SimState): void {
  const allies = state.allies;
  for (let i = 0; i < allies.used; i++) {
    const a = allies.items[i]!; // i < used ≤ items.length
    if (!a.alive || a.hushUid === 0) continue;
    const h = liveByUid(state.enemies, a.hushUid);
    if (h === null || h.hushUid !== a.uid) a.hushUid = 0;
  }
}

/** The tell on refugee `a` ran out: it is lost, and `h` heals to full and turns Heavy. */
function landHushAlly(state: SimState, h: Enemy, a: Ally): void {
  const def = h.def!; // hushPass checked it
  poolKill(state.allies, a);
  emit(state, {
    type: 'Hushed',
    uid: h.uid,
    enemy: def.id,
    victim: a.uid,
    victimEnemy: null,
    victimAlly: a.kind ?? 'refugee',
    x: a.x,
    y: a.y,
  });
  loseRefugee(state, a.uid, 'hushed', h.uid, a.group);
  emit(state, { type: 'AllyRemoved', uid: a.uid });
  h.hushUid = 0;
  h.hushTicks = 0;
  h.heavy = true;
  h.hp = def.hp; // the run's def: Story's and the modifiers' HP included
  emit(state, { type: 'TurnedHeavy', uid: h.uid, enemy: def.id });
}

/** The tell ran out: `v` is removed, `h` heals to full and turns Heavy, and the runners bolt. */
function landHush(state: SimState, h: Enemy, v: Enemy): void {
  const def = h.def!; // hushPass checked it
  const x = v.x;
  const y = v.y;
  // Gone, not killed or leaked: cleanup books it to its wave and nothing else (split.ts wasKilled).
  v.leaving = true;
  poolKill(state.enemies, v);
  emit(state, {
    type: 'Hushed',
    uid: h.uid,
    enemy: def.id,
    victim: v.uid,
    victimEnemy: v.def?.id ?? null,
    x,
    y,
  });
  h.hushUid = 0;
  h.hushTicks = 0;
  h.heavy = true;
  h.hp = def.hp; // the run's def: Story's and the modifiers' HP included
  emit(state, { type: 'TurnedHeavy', uid: h.uid, enemy: def.id });
  if (v.def?.faction === 'skitterkin') boltNear(state, x, y);
}
