// System 7b: allies. Friendly non-tower units (design/maps.md § 5.4): movement by mode, attacks,
// and (later) hushes and song auras. It runs after the towers, so towers pick their targets
// first. M2 has posts only (Bricks in person); route, owner, and stationary allies, hushes, song
// auras, and scripted health are M3.
//
// - **Spawning.** The map's ally posts (`CompiledMapDef.allies`) spawn on tick 0, in map order, at
//   their marker tiles' centers: mode `post`, vulnerability `never` (Bricks is never hurt in Act I;
//   the A3M3 timeline is M3). Each emits AllySpawned.
// - **Attacks.** Like a hitscan tower: an ally fires on a tick whose cooldown starts at 0, then
//   waits `periodTicks`. It picks the **nearest** enemy in range (inclusive; ties to the lowest
//   uid) on a layer it hits, re-picking every shot, and **never** a unit whose wave group is tagged
//   `quiet_wave`, `youngling`, or `fleeing` (ALLY_NEVER_TARGET_TAGS, D005): sparing them is always
//   the player's choice. Damage goes through `applyDamage` with `{ kind: 'ally', uid }`, and
//   AllyAttacked fires once per shot.
// - **Removal.** `removeAlly` (scripts, M3) frees an ally and emits AllyRemoved; posts never leave.
import { ALLY_NEVER_TARGET_TAGS } from '../../content/rules.ts';
import type { WaveTag } from '../../content/types.ts';
import { applyDamage, PLAIN_HIT } from '../combat/damage.ts';
import { distSqTo } from '../combat/targeting.ts';
import { ALLY_BLANK, type Ally, type Enemy } from '../entities.ts';
import { poolAlloc, poolKill } from '../pool.ts';
import { emit, takeUid, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

/** Scratch damage source for ally shots (no allocation per shot). */
const allySource: { kind: 'ally'; uid: number } = { kind: 'ally', uid: 0 };

export function allies(state: SimState, ctx: TickContext): void {
  if (state.tick === 0) spawnPosts(state, ctx);
  const pool = state.allies;
  for (let i = 0; i < pool.used; i++) {
    const a = pool.items[i]!; // i < used ≤ items.length
    if (!a.alive || a.damage <= 0) continue;
    if (a.cooldownTicks > 0) a.cooldownTicks--;
    if (a.cooldownTicks > 0) continue;
    const target = pickAllyTarget(state, a);
    if (target === null) {
      a.targetUid = 0;
      a.targetSlot = -1;
      continue;
    }
    a.targetUid = target.uid;
    a.targetSlot = target.slot;
    emit(state, {
      type: 'AllyAttacked',
      uid: a.uid,
      targetUid: target.uid,
      x: a.x,
      y: a.y,
      targetX: target.x,
      targetY: target.y,
    });
    // One scratch source for every shot (applyDamage copies what an EnemyDied keeps).
    allySource.uid = a.uid;
    applyDamage(state, target, a.damage, a.damageType, allySource, PLAIN_HIT);
    a.cooldownTicks = a.periodTicks;
  }
}

/** Spawns the map's ally posts (tick 0), in map order. */
function spawnPosts(state: SimState, ctx: TickContext): void {
  for (const post of ctx.map.allies) {
    const a = poolAlloc(state.allies, ALLY_BLANK, takeUid(state));
    a.kind = post.kind;
    a.mode = 'post';
    a.vulnerability = 'never';
    a.x = post.tile[0] + 0.5;
    a.y = post.tile[1] + 0.5;
    a.damage = post.attack.damage;
    a.damageType = post.attack.type;
    a.periodTicks = post.attack.periodTicks;
    a.rangeSq = post.attack.rangeSq;
    a.hitsGround = post.attack.hitsGround;
    a.hitsAir = post.attack.hitsAir;
    emit(state, { type: 'AllySpawned', uid: a.uid, kind: post.kind, x: a.x, y: a.y });
  }
}

/** Whether an ally may ever target a unit with these wave tags (D005). */
export function allyMayTarget(tags: readonly WaveTag[]): boolean {
  for (let i = 0; i < tags.length; i++) {
    if (ALLY_NEVER_TARGET_TAGS.includes(tags[i]!)) return false; // i < length
  }
  return true;
}

/**
 * The nearest live enemy in the ally's range on a layer it hits and not exempt (allyMayTarget),
 * ties to the lowest uid; null if none. Ascending slot order, squared distances.
 */
function pickAllyTarget(state: SimState, a: Ally): Enemy | null {
  const enemies = state.enemies;
  let best: Enemy | null = null;
  let bestD2 = 0;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!e.alive || e.def === null) continue;
    if (e.def.layer === 'air' ? !a.hitsAir : !a.hitsGround) continue;
    if (!allyMayTarget(e.tags)) continue;
    const d2 = distSqTo(a.x, a.y, e);
    if (d2 > a.rangeSq) continue;
    if (best === null || d2 < bestD2 || (d2 === bestD2 && e.uid < best.uid)) {
      best = e;
      bestD2 = d2;
    }
  }
  return best;
}

/** Removes an ally from the map (a script's exit, M3): frees it and emits AllyRemoved. */
export function removeAlly(state: SimState, a: Ally): void {
  if (!a.alive) return;
  poolKill(state.allies, a);
  emit(state, { type: 'AllyRemoved', uid: a.uid });
}
