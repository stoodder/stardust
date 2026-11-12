// System 1b: wreckage. The salvage drone (design/maps.md § 3, the clearing rules; T304b):
// - **`clear`** queues an uncleared wreckage tile (`x`) for the drone. It costs nothing and is
//   accepted any time the map is playing (setup and pauses included). Off the map is
//   `invalidTile`; a tile that isn't wreckage, or is already cleared or queued, is
//   `invalidTarget` ("Can't target there").
// - **The drone** clears one tile at a time, in queue order: the head takes WRECKAGE_CLEAR_SEC of
//   sim time (its flight is part of that time; render animates it), counted in whole ticks
//   (`state.wreckage.progressTicks`). Salvage Expert's `economy.clearSpeed` divides the time:
//   `ceil(WRECKAGE_CLEAR_TICKS / speed)`, `speed = (set ?? 1 + Σ flat) × (1 + Σ pct)`, so pct 1 is
//   2× faster (3 s). A queued tile clears on the tick its count reaches that time, and the next
//   head starts counting on the following tick.
// - **A cleared tile** becomes its `underWreckage` tile (a pad, high ground, a hidden power node,
//   or decor), read through `liveTile` (the compiled map never changes). It pays its `salvage`
//   (Salvage Rights' `economy.salvage`: `round((set ?? salvage + Σ flat) × (1 + Σ pct))`) as
//   income, counts `stats.wreckageCleared`, and emits `WreckageCleared`.
// - **A Salvage Crane** whose radius holds the head tile (sim/towerEconomy.ts `craneSalvageAt`;
//   T408) adds its speed and salvage percents to the run's sums: the best Crane's, read each tick
//   while the tile clears, so a Crane built or sold mid-clear changes the time left.
// State: `state.wreckage` (state.ts): the queue, the head's progress, and the cleared tiles.
import type { CompiledMapDef } from '../../content/compiled.ts';
import { WRECKAGE_CLEAR_SEC } from '../../content/rules.ts';
import type { GridPos, IdSpace, TileChar, TileKey } from '../../content/types.ts';
import { secToTicks } from '../../shared/time.ts';
import type { Command, RejectReason } from '../commands.ts';
import type { EconomyStat, Modifier } from '../config.ts';
import { earn } from '../economy.ts';
import { tileIndex } from '../grid.ts';
import { emit, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { craneSalvageAt } from '../towerEconomy.ts';

/** The drone's time per tile with no modifiers, in ticks (6 s: 360). */
export const WRECKAGE_CLEAR_TICKS = secToTicks(WRECKAGE_CLEAR_SEC);

/** The map fields the live-tile queries read; a CompiledMapDef passes as-is. */
export type WreckageMap = Pick<
  CompiledMapDef<IdSpace>,
  'cols' | 'rows' | 'tiles' | 'underWreckage' | 'salvage'
>;

/** The drone's state as the queries read it (`state.wreckage`, or a read-only view of it). */
export interface WreckageView {
  readonly queue: readonly number[];
  readonly cleared: readonly number[];
}

/** Where a tile stands with the drone: not wreckage, waiting, being cleared, or cleared. */
export type WreckageStatus = 'none' | 'wreckage' | 'queued' | 'clearing' | 'cleared';

function keyOf(map: WreckageMap, idx: number): TileKey {
  return `${idx % map.cols},${Math.floor(idx / map.cols)}`;
}

/** What wreckage tile `idx` (row-major, in range) becomes: its `underWreckage` (a pad if unset). */
function underAt(map: WreckageMap, idx: number): TileChar {
  return map.underWreckage[keyOf(map, idx)] ?? 'o';
}

/**
 * The tile at row-major `idx` as the run stands: the map's tile, or for cleared wreckage the
 * tile under it. The sim (builds, tile bonuses) and render/HUD read tiles through this.
 */
export function liveTileAt(map: WreckageMap, drone: WreckageView, idx: number): TileChar {
  const tile = map.tiles[idx]!; // callers pass an in-range index
  return tile === 'x' && drone.cleared.includes(idx) ? underAt(map, idx) : tile;
}

/** The live tile at (col, row) (`liveTileAt`), or null off the map. */
export function liveTile(
  map: WreckageMap,
  drone: WreckageView,
  col: number,
  row: number,
): TileChar | null {
  const idx = tileIndex(map, col, row);
  return idx < 0 ? null : liveTileAt(map, drone, idx);
}

/**
 * Where (col, row) stands with the drone. The HUD's clear intent and the harness's `clear` steps
 * read it: a build on a wreckage tile waits for `cleared`.
 */
export function wreckageStatus(
  map: WreckageMap,
  drone: WreckageView,
  col: number,
  row: number,
): WreckageStatus {
  const idx = tileIndex(map, col, row);
  if (idx < 0 || map.tiles[idx] !== 'x') return 'none';
  if (drone.cleared.includes(idx)) return 'cleared';
  const at = drone.queue.indexOf(idx);
  if (at < 0) return 'wreckage';
  return at === 0 ? 'clearing' : 'queued';
}

/** The `clear` command for (col, row): the harness's and HUD's one way to send the drone. */
export function clearCommand(tile: GridPos): Extract<Command<IdSpace>, { type: 'clear' }> {
  return { type: 'clear', tile: [tile[0], tile[1]] };
}

/**
 * `(set ?? base + Σ flat) × (1 + Σ pct + extraPct)` over one economy stat's modifiers (economy.ts's
 * rule); `extraPct` is a Crane's (T408).
 */
function economyStat(
  modifiers: readonly Modifier<IdSpace>[],
  stat: EconomyStat,
  base: number,
  extraPct = 0,
): number {
  let set: number | null = null;
  let floor = base;
  let flat = 0;
  let pct = 0;
  for (const m of modifiers) {
    if (m.kind !== 'economy' || m.stat !== stat) continue;
    if (m.set !== undefined) set = set === null ? m.set : Math.min(set, m.set);
    if (m.atLeast !== undefined && m.atLeast > floor) floor = m.atLeast; // D157: a floor
    flat += m.flat ?? 0;
    pct += m.pct ?? 0;
  }
  return ((set ?? floor) + flat) * (1 + pct + extraPct);
}

/**
 * Ticks the drone takes per tile under the run's `clearSpeed` modifiers (at least 1), with a
 * Crane's speed percent (`cranePct`, T408) on top.
 */
export function clearTicksFor(modifiers: readonly Modifier<IdSpace>[], cranePct = 0): number {
  const speed = economyStat(modifiers, 'clearSpeed', 1, cranePct);
  if (!(speed > 0)) return WRECKAGE_CLEAR_TICKS; // a non-positive speed can't stop the drone
  const t = Math.ceil(WRECKAGE_CLEAR_TICKS / speed - 1e-9);
  return t > 1 ? t : 1;
}

/**
 * What clearing a tile worth `base` salvage pays under the run's `salvage` modifiers (≥ 0), with a
 * Crane's salvage percent (`cranePct`, T408) on top.
 */
export function salvageFor(
  modifiers: readonly Modifier<IdSpace>[],
  base: number,
  cranePct = 0,
): number {
  const paid = Math.round(economyStat(modifiers, 'salvage', base, cranePct));
  return paid > 0 ? paid : 0;
}

/** Advances the salvage drone: one tick on the queue's head; clears it when its time is up. */
export function wreckage(state: SimState, ctx: TickContext): void {
  const w = state.wreckage;
  if (w.queue.length === 0 || state.outcome !== 'playing') return;
  w.progressTicks++;
  const map = ctx.map;
  const head = w.queue[0]!; // the queue is non-empty
  const crane = ctx.scratch.crane;
  craneSalvageAt(state, (head % map.cols) + 0.5, Math.floor(head / map.cols) + 0.5, crane);
  if (w.progressTicks < clearTicksFor(ctx.config.modifiers, crane.speedPct)) return;
  const idx = w.queue.shift()!; // the head, read above
  w.progressTicks = 0;
  w.cleared.push(idx);
  const to = underAt(map, idx);
  const base = map.salvage[keyOf(map, idx)] ?? 0;
  const salvage = salvageFor(ctx.config.modifiers, base, crane.salvagePct);
  earn(state, salvage);
  state.stats.wreckageCleared++;
  emit(state, {
    type: 'WreckageCleared',
    tile: [idx % map.cols, Math.floor(idx / map.cols)],
    to,
    salvage,
  });
}

/**
 * Validates and applies a `clear` command: the tile is on the map (`invalidTile`), is wreckage not
 * yet cleared or queued (`invalidTarget`), and joins the drone's queue.
 */
export function applyClearCommand(
  state: SimState,
  ctx: TickContext,
  cmd: Extract<Command<IdSpace>, { type: 'clear' }>,
): RejectReason | null {
  const map = ctx.map;
  const idx = tileIndex(map, cmd.tile[0], cmd.tile[1]);
  if (idx < 0) return 'invalidTile';
  const w = state.wreckage;
  if (map.tiles[idx] !== 'x' || w.cleared.includes(idx) || w.queue.includes(idx)) {
    return 'invalidTarget';
  }
  w.queue.push(idx);
  return null;
}
