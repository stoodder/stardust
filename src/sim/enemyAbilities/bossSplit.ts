// A boss's split (design/enemies.md § 6, the Gathering Maw's phase 2; D146; T708), run from
// boss.ts in the boss's phase step. The merge that follows is bossMerge.ts.
// - **When:** the hit that took the boss to the split phase's `fromPct` began the phase in the
//   damage pipeline (BossPhase 2, the 1.5 s of invulnerability: the telegraph, the body
//   bulging). On the first abilities pass after that invulnerability ends, the boss splits.
// - **The parts:** `count` units of `part` (the run's scaled def), born into the boss's wave with
//   its tags, spread evenly along its route from SPLIT_SPREAD_TILES behind it to as far ahead (as a
//   shield-broken boss's shards spread: pieces to find, not hidden in one sprite; kept on the
//   route). Each has `hpPct` of the boss's max HP (its def's: what its gathers added was spent
//   in phase 1, before the split), its `ownerUid` the boss's uid, `splitFrom` the boss's def (the
//   merge re-forms it), `splitMaxHp` all the parts' HP summed (the one boss bar's maximum), the
//   boss's phase number (a part is "phase 2" of the fight), and `mergeTicks` the merge's
//   countdown. No invulnerability: the telegraph was the boss's.
// - **The boss itself** is gone, not killed (marked `leaving`, so cleanup books it to its wave
//   and nothing else: no kill, no leak, no bounty), and BossSplit names it and its parts.
// - **Boss rules for a part:** its def is a boss (Pinned and Stasis become Chilled 50%; a part at
//   the gate drains everything: defeat), but it dies at 0 HP like any unit (EnemyDied; bounty 0),
//   since the fight is beaten when every part is dead (combat/damage.ts, `isSplitBorn`).
import type { CompiledBossPhase, CompiledEnemyDef } from '../../content/compiled.ts';
import { ENEMY_BLANK, type Enemy } from '../entities.ts';
import { countTags } from '../fireControl.ts';
import { placeOnRoute } from '../path.ts';
import { poolAlloc, poolKill } from '../pool.ts';
import { emit, takeUid, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { broodDef } from './brood.ts';

export type CompiledBossSplit = NonNullable<CompiledBossPhase['split']>;

/** The parts spread from this far behind the boss to this far ahead, on its route (tiles). */
export const SPLIT_SPREAD_TILES = 0.6;

/** The split phase of a boss def (its `split`), or null: the merge reads its haste here. */
export function splitOf(def: CompiledEnemyDef): CompiledBossSplit | null {
  const phases = def.boss?.phases ?? [];
  for (let i = 0; i < phases.length; i++) {
    const s = phases[i]!.split; // i < length
    if (s !== null) return s;
  }
  return null;
}

/**
 * Whether `e` was born of a boss's split: a part, or the merged boss it re-formed into
 * (`splitMaxHp` > 0). It dies at 0 HP like a unit rather than taking a boss's ending.
 */
export function isSplitBorn(e: Pick<Enemy, 'def' | 'splitMaxHp'>): boolean {
  return e.splitMaxHp > 0 && e.def !== null && e.def.boss !== null;
}

/**
 * The HP left in the fight a split-born unit belongs to: its own and every live unit's sharing its
 * `ownerUid` (the parts, or the merged boss), summed: the one boss bar's fill against `splitMaxHp`.
 */
export function splitHp(
  pool: { readonly used: number; readonly items: readonly Pick<Enemy, 'alive' | 'ownerUid' | 'splitMaxHp' | 'hp'>[] },
  ownerUid: number,
): number {
  let hp = 0;
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    if (e.alive && e.splitMaxHp > 0 && e.ownerUid === ownerUid && e.hp > 0) hp += e.hp;
  }
  return hp;
}

/**
 * Allocates a split-born unit of `def` on `parent`'s route at `dist`, in its wave with its tags
 * (EnemySpawned), owned by `ownerUid` (the boss that split). The caller sets its HP and phase.
 */
export function spawnSplitBorn(
  state: SimState,
  def: CompiledEnemyDef,
  parent: Enemy,
  dist: number,
  ownerUid: number,
  splitMaxHp: number,
): Enemy {
  const route = parent.route!; // callers pass a unit on a route
  const e = poolAlloc(state.enemies, ENEMY_BLANK, takeUid(state));
  e.def = def;
  e.wave = parent.wave;
  e.tags = parent.tags;
  countTags(state.stats.tagSpawned, parent.tags);
  e.shieldHp = def.shield === null ? 0 : def.shield.hp;
  e.spawnTick = state.tick;
  e.ownerUid = ownerUid;
  e.splitMaxHp = splitMaxHp;
  placeOnRoute(e, route, Math.min(Math.max(dist, 0), route.lengthTiles));
  if (parent.wave > 0) state.schedule.remaining[parent.wave - 1]!++; // wave ≤ waves.length
  emit(state, { type: 'EnemySpawned', uid: e.uid, enemy: def.id, route: route.id, wave: e.wave });
  return e;
}

/** Removes `e` from the field without a kill or a leak: cleanup books it to its wave only. */
export function removeGone(state: SimState, e: Enemy): void {
  e.leaving = true;
  poolKill(state.enemies, e);
}

/** The boss splits now (see the header). */
export function bossSplitStep(
  state: SimState,
  ctx: TickContext,
  boss: Enemy,
  split: CompiledBossSplit,
): void {
  if (boss.route === null) return; // every boss walks a route
  const root = boss.def!; // only a boss with a def comes here
  const partDef = broodDef(ctx, split.part);
  const hp = split.hpPct * root.hp;
  const maxHp = hp * split.count;
  const parts: number[] = [];
  for (let i = 0; i < split.count; i++) {
    const at =
      boss.dist + (split.count > 1 ? SPLIT_SPREAD_TILES * ((2 * i) / (split.count - 1) - 1) : 0);
    const p = spawnSplitBorn(state, partDef, boss, at, boss.uid, maxHp);
    p.hp = hp;
    p.bonusMaxHp = hp - partDef.hp; // its own max is its share (render's small bar)
    p.splitFrom = root;
    p.bossPhase = boss.bossPhase;
    p.mergeTicks = split.mergeAfterTicks;
    parts.push(p.uid);
  }
  removeGone(state, boss);
  emit(state, { type: 'BossSplit', uid: boss.uid, parts });
}
