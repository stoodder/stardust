// Fire control (design/core-loop.md § 2.7): the `holdFire` and `spareRunners` commands, the
// spare-runners filter's tag test, the per-tag story stats, and the "not firing" tracking the
// towers system feeds.
//
// Command semantics (D006 follow-ups):
// - A tower uid sets that tower's flag (`tower.holdFire`, `tower.spareRunners`); `'all'` sets the
//   global toggle (`state.holdFireAll`, `state.spareRunnersAll`) and every live tower's flag, and
//   towers built while the global toggle is on start with it on (applyCommands' build).
// - Turning the global toggle off clears every tower's flag, per-tower ones included: the HUD's
//   "all" button is a master switch.
// - Both are allowed on any tower (a pulse tower picks no target, so the filter only changes when
//   it pulses; a tower with no attack just carries the flag).
import type { IdSpace, WaveTag } from '../content/types.ts';
import { NOT_FIRING_SEC, SPARE_TAGS } from '../content/rules.ts';
import { secToTicks } from '../shared/time.ts';
import type { Command, RejectReason } from './commands.ts';
import type { Tower } from './entities.ts';
import { poolFind } from './pool.ts';
import { emit, type SimState, type TagCounts } from './state.ts';
import type { TickContext } from './tick.ts';

type HoldFireCommand = Extract<Command<IdSpace>, { type: 'holdFire' }>;
type SpareRunnersCommand = Extract<Command<IdSpace>, { type: 'spareRunners' }>;

/** The "not firing" threshold (NOT_FIRING_SEC, content/rules.ts) in ticks. */
export const NOT_FIRING_TICKS = secToTicks(NOT_FIRING_SEC);

/**
 * Sets Hold Fire on one tower (`tower.holdFire`) or on all (`state.holdFireAll` plus every live
 * tower), counts `stats.holdFireUses` when it turns something on that was off, and emits
 * HoldFireChanged. Returns null on success, else why it was rejected (`noSuchTower`).
 */
export function applyHoldFire(
  state: SimState,
  _ctx: TickContext,
  cmd: HoldFireCommand,
): RejectReason | null {
  let changed: boolean;
  if (cmd.target === 'all') {
    changed = state.holdFireAll !== cmd.on;
    state.holdFireAll = cmd.on;
    forEachTower(state, (t) => {
      t.holdFire = cmd.on;
    });
  } else {
    const tower = poolFind(state.towers, cmd.target);
    if (tower === null) return 'noSuchTower';
    changed = tower.holdFire !== cmd.on;
    tower.holdFire = cmd.on;
  }
  if (cmd.on && changed) state.stats.holdFireUses++;
  emit(state, { type: 'HoldFireChanged', target: cmd.target, on: cmd.on });
  return null;
}

/**
 * Sets the spare-runners filter on one tower (`tower.spareRunners`) or on all
 * (`state.spareRunnersAll` plus every live tower), and emits SpareRunnersChanged. Returns null on
 * success, else why it was rejected (`noSuchTower`).
 */
export function applySpareRunners(
  state: SimState,
  _ctx: TickContext,
  cmd: SpareRunnersCommand,
): RejectReason | null {
  if (cmd.target === 'all') {
    state.spareRunnersAll = cmd.on;
    forEachTower(state, (t) => {
      t.spareRunners = cmd.on;
    });
  } else {
    const tower = poolFind(state.towers, cmd.target);
    if (tower === null) return 'noSuchTower';
    tower.spareRunners = cmd.on;
  }
  emit(state, { type: 'SpareRunnersChanged', target: cmd.target, on: cmd.on });
  return null;
}

/** A new tower's fire-control flags: the global toggles (towers built while one is on inherit it). */
export function inheritFireControl(state: SimState, tower: Tower): void {
  tower.holdFire = state.holdFireAll;
  tower.spareRunners = state.spareRunnersAll;
}

function forEachTower(state: SimState, fn: (t: Tower) => void): void {
  const pool = state.towers;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (t.alive) fn(t);
  }
}

/** Whether a unit with these wave tags is spared by the filter (SPARE_TAGS: fleeing, youngling). */
export function isSpared(tags: readonly WaveTag[]): boolean {
  for (let i = 0; i < tags.length; i++) {
    if (SPARE_TAGS.includes(tags[i]!)) return true; // i < length
  }
  return false;
}

/** Adds one unit to each of its tags' counts (the per-tag story stats). Allocation-free. */
export function countTags(counts: TagCounts, tags: readonly WaveTag[]): void {
  for (let i = 0; i < tags.length; i++) counts[tags[i]!]++; // i < length
}

/**
 * The "not firing" bookkeeping, once per tick after the towers fire (towers system): a shot at a
 * Skitterkin resets `stats.ticksSinceFiredAtSkitterkin`; otherwise it counts up while one is in
 * range of a tower (`skitterkinInRange`, called only then) and freezes while none is. Crossing
 * NOT_FIRING_TICKS emits NotFiringAtSkitterkin, once per run.
 */
export function trackNotFiring(
  state: SimState,
  ctx: TickContext,
  firedAtSkitterkin: boolean,
  skitterkinInRange: (state: SimState, ctx: TickContext) => boolean,
): void {
  const stats = state.stats;
  if (firedAtSkitterkin) {
    stats.ticksSinceFiredAtSkitterkin = 0;
    return;
  }
  if (!skitterkinInRange(state, ctx)) return;
  stats.ticksSinceFiredAtSkitterkin++;
  if (stats.ticksSinceFiredAtSkitterkin >= NOT_FIRING_TICKS && !state.notFiringAnnounced) {
    state.notFiringAnnounced = true;
    emit(state, { type: 'NotFiringAtSkitterkin' });
  }
}
