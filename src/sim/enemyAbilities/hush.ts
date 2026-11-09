// The hush rule (design/enemies.md § 5.4, its one home; D101). A non-boss Hollow unit
// (`def.hushes`) that comes into contact with a hushable unit (a live `fleeing` Skitterkin enemy;
// later an escort refugee, bearer, or singer) stops for the HUSH_TELL_SEC tell, then removes it
// (no leak, no bounty, not processed), heals to full, and turns Heavy (`Enemy.heavy`: base speed ×
// HUSH_SPEED_MUL, movement.ts). One hush each: a Heavy unit ignores every other hushable unit.
// - **Contact:** the same layer (a ground Hollow can't hush a flyer), within HUSH_CONTACT_TILES
//   along the route when both walk the same one, or in a straight line when they don't (where two
//   roads merge, their units share tiles). A burrowed or leaving unit is in no contact.
// - **The tell:** the Hollow unit holds `hushUid` (its victim) and `hushTicks` (the tell left), and
//   the victim holds `hushUid` (its Hollow unit); both stand still (`paceMul` 0) for the tell
//   (HushStarted). Towers can still shoot either one: if the victim dies or leaks first, the
//   Hollow unit walks on with its hush unspent; if the Hollow unit dies, the victim runs on (and
//   so does either one if the other digs in or starts leaving with a boss).
// - **The interrupt** (§ 2.4; T407a): while the interrupt hook holds a Hollow unit
//   (systems/status.ts `isInterrupted`: Stasis), it can't start a hush, and a tell under way is
//   cancelled: the victim runs on and the hush stays unspent (no event: render sees `hushUid`
//   clear).
// - **The hush:** the victim is removed, marked `leaving` so cleanup counts it neither a kill nor a
//   leak (Hushed, then TurnedHeavy), and the Skitterkin around it bolt (skittish.ts).
// - **Order independence:** new contacts are matched on the tick's state before any is applied. A
//   victim goes to its nearest free Hollow unit and a Hollow unit takes its nearest such victim,
//   ties to the lower uid, so slot order never decides who hushes whom; a unit left out waits a
//   tick. The countdown runs first, so a tell started this tick isn't counted down until the next.
// enemyAbilities runs it once a tick, after each unit's own abilities and before the huddles.
import { HUSH_CONTACT_TILES, HUSH_TELL_SEC } from '../../content/rules.ts';
import { secToTicks } from '../../shared/time.ts';
import type { Enemy } from '../entities.ts';
import { poolKill, type Pool } from '../pool.ts';
import { emit, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { isInterrupted } from '../systems/status.ts';
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
    !h.burrowed &&
    !h.leaving &&
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
    !v.burrowed &&
    !v.leaving &&
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

/** The victim free Hollow unit `h` takes this tick (one whose nearest Hollow unit it is), or null. */
function victimFor(pool: Pool<Enemy>, h: Enemy): Enemy | null {
  let best: Enemy | null = null;
  let bestD2 = -1;
  for (let i = 0; i < pool.used; i++) {
    const v = pool.items[i]!; // i < used ≤ items.length
    if (!isHushable(v)) continue;
    const d2 = contactSq(h, v);
    if (d2 < 0 || !better(d2, v.uid, bestD2, best?.uid ?? 0)) continue;
    if (nearestHollow(pool, v) !== h) continue;
    best = v;
    bestD2 = d2;
  }
  return best;
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
    if (!e.alive || e.hushUid === 0 || e.def === null) continue;
    const other = liveByUid(pool, e.hushUid);
    if (e.def.hushes) {
      const gone = other === null || other.leaving || other.burrowed;
      if (gone || e.leaving || e.burrowed || isInterrupted(e)) {
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
  // 2. New contacts, matched on this state before any is applied (order independence).
  const pairs = ctx.scratch.slots;
  pairs.length = 0;
  for (let i = 0; i < pool.used; i++) {
    const h = pool.items[i]!; // i < used ≤ items.length
    if (!canHush(h)) continue;
    const v = victimFor(pool, h);
    if (v !== null) pairs.push(h.slot, v.slot);
  }
  for (let p = 0; p < pairs.length; p += 2) {
    const h = pool.items[pairs[p]!]!; // slots pushed above, in pairs
    const v = pool.items[pairs[p + 1]!]!;
    h.hushUid = v.uid;
    h.hushTicks = HUSH_TELL_TICKS;
    v.hushUid = h.uid;
    h.paceMul = 0;
    v.paceMul = 0;
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
