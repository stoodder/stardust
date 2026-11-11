// The Jammed state (design/enemies.md § 4; D146; T700a slot, T702): the jams tick slot, after the
// enemy abilities and before the towers fire, and the jam API every jammer lands through (the
// Silencer's tendril here, T702; the Auditor's ring and Hostile Takeover, T707).
// - **A jam** (`jamTower`) lands only on a live tower that is neither Jammed (a jam never stacks or
//   extends) nor jam-immune (`jamImmune`: its post-jam or System Reboot immunity, `jamImmuneTicks`,
//   or a Rally Chorus covering it, `jamMul` 0). It lasts the jammer's duration × the tower's
//   `jamMul` as the jam starts (the Hum Choir's rule: T1–T2 ×0.5, T3 and Lullaby ×0.25; systems/
//   auras.ts), rounded to whole ticks, never past JAM_MAX_SEC (`jamTicksFor`), counting the tick
//   it lands. `jammedBy` names the jammer (a boss's uid for a Takeover). TowerJammed.
// - **While Jammed** (`jamTicks` > 0) the tower doesn't fire (systems/towers.ts, as holding fire:
//   no target, a charge vented, beams out, its cooldown still counting; a Den's swarmlings come
//   home, sim/swarmlings.ts; a Bloom's field goes quiet, systems/fields.ts; a Lullaby goes silent,
//   systems/status.ts), and its auras (its jam rule too) and links are off (systems/auras.ts,
//   systems/links.ts). Nothing else changes: it can be sold, upgraded, specialized, or retargeted,
//   and the jam persists through an upgrade. Its detection and area Mark aren't fire or auras and
//   go on. Each start or end sets `state.linksDirty` and recomputes at once (links.ts
//   `relinkIfDirty`), so the links and auras are off from the tick it's jammed.
// - **The end:** `jamTicks` counts down here; at 0 the jam ends (TowerUnjammed) and the tower is
//   immune for JAM_IMMUNITY_SEC (`jamImmuneTicks`, counting the tick it ends). System Reboot
//   (sim/abilities/reboot.ts) ends every jam at once the same way, with its own immunity.
// - **The order** in this pass: the countdowns (immunity, then jams), then the jammers whose jams
//   land in this slot (the Silencer's tendril, enemyAbilities/jamTendril.ts; T707 adds the ring
//   and the Takeover after it), then the tallies. A jam landed here holds from this tick for
//   exactly its ticks; one landed earlier in the tick would lose a tick to this countdown.
// - **The tallies** (integers, `state.stats`): `jammedPeak` (the most towers Jammed at once: Keep
//   the Lights On), `jamOverLimitTicks` (ticks with more than JAM_MAX_TOWER_SHARE of the live towers
//   Jammed: harness #10, balance/jamLimit.ts), and `jammedTowerTicks` / `towerTicks` (jam uptime,
//   the report's). One pass over the towers a tick; no allocation.
import { JAM_IMMUNITY_SEC, JAM_MAX_SEC, JAM_MAX_TOWER_SHARE } from '../content/rules.ts';
import { secToTicks } from '../shared/time.ts';
import { jamTendrilPass } from './enemyAbilities/jamTendril.ts';
import type { Tower } from './entities.ts';
import { emit, type SimState } from './state.ts';
import { relinkIfDirty } from './systems/links.ts';
import type { TickContext } from './tick.ts';

/** JAM_MAX_SEC in ticks: no jam lasts longer. */
export const JAM_MAX_TICKS = secToTicks(JAM_MAX_SEC);
/** JAM_IMMUNITY_SEC in ticks: the immunity after a jam ends. */
export const JAM_IMMUNITY_TICKS = secToTicks(JAM_IMMUNITY_SEC);

/** Whether `t` is Jammed now. */
export function isJammed(t: Readonly<Pick<Tower, 'jamTicks'>>): boolean {
  return t.jamTicks > 0;
}

/** Whether `t` can't be jammed now: its immunity (a jam's end, System Reboot) or a Rally Chorus. */
export function jamImmune(t: Readonly<Pick<Tower, 'jamImmuneTicks' | 'jamMul'>>): boolean {
  return t.jamImmuneTicks > 0 || t.jamMul <= 0;
}

/** Whether a jam may land on `t`: a live tower, neither Jammed nor jam-immune. */
export function canJam(t: Readonly<Tower>): boolean {
  return t.alive && t.def !== null && !isJammed(t) && !jamImmune(t);
}

/** A jam of `durationTicks` on `t` as it would land now: × its `jamMul`, capped (0: immune). */
export function jamTicksFor(t: Readonly<Pick<Tower, 'jamMul'>>, durationTicks: number): number {
  if (t.jamMul <= 0) return 0;
  const ticks = Math.round(durationTicks * t.jamMul);
  const capped = ticks < JAM_MAX_TICKS ? ticks : JAM_MAX_TICKS;
  return capped > 1 ? capped : 1;
}

/**
 * Jams `t` for `durationTicks` (before its `jamMul`) from `source` (a jammer's uid, or a boss's):
 * lands only when `canJam`. Returns the ticks it landed for, or 0 when it didn't.
 */
export function jamTower(state: SimState, t: Tower, durationTicks: number, source: number): number {
  if (!canJam(t)) return 0;
  const ticks = jamTicksFor(t, durationTicks);
  if (ticks <= 0) return 0;
  t.jamTicks = ticks;
  t.jammedBy = source;
  state.linksDirty = true;
  emit(state, { type: 'TowerJammed', uid: t.uid, ticks, source });
  return ticks;
}

/** Ends `t`'s jam now (its countdown or System Reboot) and starts `immuneTicks` of immunity. */
export function unjamTower(state: SimState, t: Tower, immuneTicks: number): void {
  t.jamTicks = 0;
  t.jammedBy = 0;
  if (immuneTicks > t.jamImmuneTicks) t.jamImmuneTicks = immuneTicks;
  state.linksDirty = true;
  emit(state, { type: 'TowerUnjammed', uid: t.uid });
}

/** The live tower with `uid`, or null (a jammer's target: one scan, on a tell's tick only). */
export function towerByUid(state: SimState, uid: number): Tower | null {
  if (uid === 0) return null;
  const pool = state.towers;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (t.alive && t.uid === uid) return t;
  }
  return null;
}

/** The jams pass (see the header). */
export function jams(state: SimState, ctx: TickContext): void {
  const pool = state.towers;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (!t.alive) continue;
    if (t.jamImmuneTicks > 0) t.jamImmuneTicks--;
    if (t.jamTicks > 0 && --t.jamTicks === 0) unjamTower(state, t, JAM_IMMUNITY_TICKS);
  }
  jamTendrilPass(state, ctx);
  relinkIfDirty(state, ctx);
  let live = 0;
  let jammed = 0;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (!t.alive) continue;
    live++;
    if (t.jamTicks > 0) jammed++;
  }
  const stats = state.stats;
  stats.towerTicks += live;
  if (jammed === 0) return;
  stats.jammedTowerTicks += jammed;
  if (jammed > stats.jammedPeak) stats.jammedPeak = jammed;
  if (jammed > JAM_MAX_TOWER_SHARE * live) stats.jamOverLimitTicks++;
}
