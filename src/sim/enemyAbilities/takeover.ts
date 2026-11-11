// Hostile Takeover (design/enemies.md § 4 and § 6; D146; T707): "Shareholder Value"'s phase 2
// (BossPhaseDef.takeover). Run by the jams slot (sim/jam.ts) after the rings, so its jams land
// after the countdowns (a jam landed earlier would lose a tick). In ticks, so it's deterministic;
// state on the boss: `jamTicks` (the countdown to the next laser), `jamTellTicks` (the laser's
// ticks left; > 0 only while it shows, render's TakeoverView), `takeoverTowers` (its targets), and
// `takeoverHeldTicks` (how long the last Takeover's jams have held).
// - **The cycle:** the first laser starts as the phase begins, once its 1.5 s of invulnerability
//   are over (the phase change's telegraph; ability timers wait through it), and then one every
//   `everyTicks`, laser start to laser start (the jammers' cycle: the period counts from a landing,
//   less the tell). Lulled holds the wait on its beat (`cooldownHeld`, a boss's ×1.25), never the
//   laser.
// - **The pick** (as the laser starts; `takeoverPicks`): `min(TAKEOVER_MAX_TOWERS,
//   floor(JAM_MAX_TOWER_SHARE × towers placed))` towers, over every live tower on the map (no
//   reach: a laser from the platform), among those a jam may land on (sim/jam.ts `canJam`: not
//   Jammed, not jam-immune), the highest tier first (a spec is 4), ties to the lowest uid. With
//   fewer than four towers placed, or none jammable, it waits ready (scanning only then) until
//   there is a pick. TakeoverTell names them; the laser shows on each for the whole tell, and the
//   boss walks on (a boss's pace is its phases').
// - **The landing** (as the laser ends): a jam of `durationTicks` × each target's `jamMul` from the
//   boss (`jamTower`, `jammedBy` the boss's uid) on each target still standing that a jam may land
//   on, in pick order, and only while one more jam keeps the map within the jam limit
//   (floor(JAM_MAX_TOWER_SHARE × towers placed), counting every jam standing then: an Auditor's
//   ring or a Silencer's tendril that landed during the laser takes its place; D146 addendum,
//   T721). So a Takeover never takes the map past the limit (a ring or tendril landing after it
//   still can; T760). A System Reboot during
//   the laser (its immunity), a Rally Chorus, or a sale spends that target. So a Hum Choir at T3 (×0.25: 1 s) or a Reboot timed to the laser earns **Declined**.
// - **Declined's tally:** from the landing, `takeoverHeldTicks` counts each tick (the landing's
//   included) that any of its jams still holds on its tower, and `stats.takeoverJamTicks` keeps the
//   run's longest: all of a laser's jams land together, so that is the longest single Takeover jam
//   as it held (a Reboot cast 0.5 s after the landing ends it at 31 ticks). A Choir T3's 60 ticks
//   is `lte: 60`.
// - **Interrupts** (§ 2.4, § 6): Unnerved (a boss's Stasis is a chill) cancels a laser under way
//   (JamInterrupted) or one about to start, and the full period restarts. A boss leaving, standing
//   down, or out of its Takeover phase drops a laser quietly (its jams already landed hold).
// - No allocation but the target list and the TakeoverTell event, once per laser.
import type { CompiledBossPhase } from '../../content/compiled.ts';
import { JAM_MAX_TOWER_SHARE, TAKEOVER_MAX_TOWERS } from '../../content/rules.ts';
import { NO_UIDS, type Enemy, type Tower } from '../entities.ts';
import { canJam, jamTower, towerByUid } from '../jam.ts';
import { emit, type SimState } from '../state.ts';
import { cooldownHeld, isInterrupted } from '../systems/status.ts';
import type { TickContext } from '../tick.ts';
import { outOfReach } from './layers.ts';

type CompiledTakeover = NonNullable<CompiledBossPhase['takeover']>;

/** How many towers a Takeover jams with `placed` towers on the map (D146's formula). */
export function takeoverCount(placed: number): number {
  const share = Math.floor(JAM_MAX_TOWER_SHARE * placed);
  return share < TAKEOVER_MAX_TOWERS ? share : TAKEOVER_MAX_TOWERS;
}

/**
 * How many more towers a jam may land on now within the jam limit: floor(JAM_MAX_TOWER_SHARE ×
 * towers placed) less the towers Jammed now (never below 0).
 */
function jamRoom(state: SimState): number {
  const pool = state.towers;
  let placed = 0;
  let jammed = 0;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (!t.alive || t.def === null) continue;
    placed++;
    if (t.jamTicks > 0) jammed++;
  }
  const room = Math.floor(JAM_MAX_TOWER_SHARE * placed) - jammed;
  return room > 0 ? room : 0;
}

/** Whether candidate `t` outranks `best` (the highest tier, then the lowest uid). */
function outranks(t: Readonly<Tower>, best: Readonly<Tower> | null): boolean {
  if (best === null) return true;
  if (t.tier !== best.tier) return t.tier > best.tier;
  return t.uid < best.uid;
}

/** The towers a laser starting now picks (uids, best first; empty: none). See the header. */
export function takeoverPicks(state: SimState): number[] {
  const pool = state.towers;
  let placed = 0;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (t.alive && t.def !== null) placed++;
  }
  const want = takeoverCount(placed);
  const out: number[] = [];
  let last: Tower | null = null;
  // `want` ≤ 2 passes, each the best tower below the last one picked.
  while (out.length < want) {
    let best: Tower | null = null;
    for (let i = 0; i < pool.used; i++) {
      const t = pool.items[i]!; // i < used ≤ items.length
      if (!canJam(t) || (last !== null && !outranks(last, t))) continue;
      if (outranks(t, best)) best = t;
    }
    if (best === null) break;
    out.push(best.uid);
    last = best;
  }
  return out;
}

/** Whether the boss's Takeover laser shows this tick (render reads it). */
export function takeoverTelling(e: Readonly<Enemy>): boolean {
  return e.alive && e.jamTellTicks > 0 && e.takeoverTowers.length > 0;
}

/** Drops a laser under way and its held jams' tally (no event). */
function drop(boss: Enemy): void {
  boss.jamTellTicks = 0;
  boss.takeoverTowers = NO_UIDS;
  boss.takeoverHeldTicks = 0;
}

/** Counts the last Takeover's jams that still hold (Declined's tally; see the header). */
function tallyHeld(state: SimState, boss: Enemy): void {
  const towers = boss.takeoverTowers;
  for (let k = 0; k < towers.length; k++) {
    const t = towerByUid(state, towers[k]!); // k < length
    if (t !== null && t.jamTicks > 0 && t.jammedBy === boss.uid) {
      const held = ++boss.takeoverHeldTicks;
      if (held > state.stats.takeoverJamTicks) state.stats.takeoverJamTicks = held;
      return;
    }
  }
  boss.takeoverTowers = NO_UIDS; // every one of its jams has ended
  boss.takeoverHeldTicks = 0;
}

/** One tick of a boss in a Takeover phase (see the header). */
export function takeoverStep(state: SimState, boss: Enemy, t: CompiledTakeover): void {
  if (outOfReach(boss) || boss.standDownTicks > 0) {
    if (boss.jamTellTicks > 0) drop(boss);
    return;
  }
  const tell = t.tellTicks > 0 ? t.tellTicks : 1;
  if (boss.jamTellTicks > 0) {
    // A laser under way.
    if (isInterrupted(boss)) {
      drop(boss);
      boss.jamTicks = t.everyTicks;
      emit(state, { type: 'JamInterrupted', uid: boss.uid });
      return;
    }
    if (--boss.jamTellTicks > 0) return;
    const picked = boss.takeoverTowers;
    // The jam limit at the landing: only while one more jam keeps the map within
    // floor(JAM_MAX_TOWER_SHARE × placed), counting every jam standing (a ring's, a tendril's).
    const room = jamRoom(state);
    let landed = 0;
    for (let k = 0; k < picked.length && landed < room; k++) {
      const target = towerByUid(state, picked[k]!); // k < length
      if (target !== null && jamTower(state, target, t.durationTicks, boss.uid) > 0) landed++;
    }
    boss.takeoverHeldTicks = 0;
    if (landed === 0) boss.takeoverTowers = NO_UIDS;
    else tallyHeld(state, boss);
    boss.jamTicks = t.everyTicks;
    return;
  }
  if (boss.takeoverTowers.length > 0) tallyHeld(state, boss);
  if (boss.invulnerableTicks > 0) return; // a phase change's telegraph: its timer waits
  if (boss.jamTicks <= 0) boss.jamTicks = tell; // the phase began: the first laser starts now
  if (boss.jamTicks > tell && !cooldownHeld(boss)) boss.jamTicks--; // Lulled: its beat
  if (boss.jamTicks > tell) return;
  if (isInterrupted(boss)) {
    boss.jamTicks = t.everyTicks; // a laser can't start: the period restarts from zero
    return;
  }
  const picks = takeoverPicks(state);
  if (picks.length === 0) return; // ready: it waits for towers to take over
  boss.takeoverTowers = Object.freeze(picks); // entity fields are never mutable objects
  boss.takeoverHeldTicks = 0;
  boss.jamTellTicks = tell;
  emit(state, { type: 'TakeoverTell', uid: boss.uid, towers: boss.takeoverTowers });
}

/** Every live boss's Takeover, in slot order (the jams slot; sim/jam.ts). */
export function takeoverPass(state: SimState, _ctx: TickContext): void {
  const pool = state.enemies;
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    const boss = e.def?.boss ?? null;
    if (!e.alive || boss === null || e.bossPhase === 0) continue;
    const take = boss.phases[e.bossPhase - 1]?.takeover ?? null;
    if (take !== null) takeoverStep(state, e, take);
    else if (e.takeoverTowers.length > 0) {
      // Out of its Takeover phase (the jettison): a laser under way is dropped; landed jams hold.
      if (e.jamTellTicks > 0) drop(e);
      else tallyHeld(state, e);
    }
  }
}
