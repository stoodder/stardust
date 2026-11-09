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
// - **A cleared tile** becomes its `underWreckage` tile (a pad, high ground, a hidden power node, or
//   decor), read through `liveTile` (the compiled map never changes). It pays its `salvage`
//   (Salvage Rights' `economy.salvage`: `round((set ?? salvage + Σ flat) × (1 + Σ pct))`) as
//   income, counts `stats.wreckageCleared`, and emits `WreckageCleared`.
// - The Salvage Crane's double speed and +25% salvage arrive with the Crane (Act II, M4).
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

/** What tile `idx` (row-major, in range) became when cleared: its `underWreckage` (pad if unset). */
function underAt(map: WreckageMap, idx: number): TileChar {
  return map.underWreckage[keyOf(map, idx)] ?? 'o';
}

/**
 * The tile at row-major `idx` as the run stands: the map's tile, or for cleared wreckage the
 * tile under it. The sim (builds, tile bonuses) and render/HUD read tiles through this.
 */
export function liveTileAt(
  map: WreckageMap,
  wreckage: WreckageView,
  idx: number,
): TileChar {
  const tile = map.tiles[idx]!; // callers pass an in-range index
  return tile === 'x' && wreckage.cleared.includes(idx) ? underAt(map, idx) : tile;
}

/** The live tile at (col, row) (`liveTileAt`), or null off the map. */
export function liveTile(
  map: WreckageMap,
  wreckage: WreckageView,
  col: number,
  row: number,
): TileChar | null {
  const idx = tileIndex(map, col, row);
  return idx < 0 ? null : liveTileAt(map, wreckage, idx);
}

/**
 * Where (col, row) stands with the drone. The HUD's clear intent and the harness's `clear` steps
 * read it: a build on a wreckage tile waits for `cleared`.
 */
export function wreckageStatus(
  map: WreckageMap,
  wreckage: WreckageView,
  col: number,
  row: number,
): WreckageStatus {
  const idx = tileIndex(map, col, row);
  if (idx < 0 || map.tiles[idx] !== 'x') return 'none';
  if (wreckage.cleared.includes(idx)) return 'cleared';
  const at = wreckage.queue.indexOf(idx);
  if (at < 0) return 'wreckage';
  return at === 0 ? 'clearing' : 'queued';
}

/** The `clear` command for (col, row): the harness's and HUD's one way to send the drone. */
export function clearCommand(tile: GridPos): Extract<Command<IdSpace>, { type: 'clear' }> {
  return { type: 'clear', tile: [tile[0], tile[1]] };
}

/** `(set ?? base + Σ flat) × (1 + Σ pct)` over one economy stat's modifiers (economy.ts's rule). */
function economyStat(
  modifiers: readonly Modifier<IdSpace>[],
  stat: EconomyStat,
  base: number,
): number {
  let set: number | null = null;
  let flat = 0;
  let pct = 0;
  for (const m of modifiers) {
    if (m.kind !== 'economy' || m.stat !== stat) continue;
    if (m.set !== undefined) set = set === null ? m.set : Math.min(set, m.set);
    flat += m.flat ?? 0;
    pct += m.pct ?? 0;
  }
  return ((set ?? base) + flat) * (1 + pct);
}

/** Ticks the drone takes per tile under the run's `clearSpeed` modifiers (at least 1). */
export function clearTicksFor(modifiers: readonly Modifier<IdSpace>[]): number {
  const speed = economyStat(modifiers, 'clearSpeed', 1);
  if (!(speed > 0)) return WRECKAGE_CLEAR_TICKS; // a non-positive speed can't stop the drone
  const t = Math.ceil(WRECKAGE_CLEAR_TICKS / speed - 1e-9);
  return t > 1 ? t : 1;
}

/** What clearing a tile worth `base` salvage pays under the run's `salvage` modifiers (≥ 0). */
export function salvageFor(modifiers: readonly Modifier<IdSpace>[], base: number): number {
  const paid = Math.round(economyStat(modifiers, 'salvage', base));
  return paid > 0 ? paid : 0;
}

/** Advances the salvage drone: one tick on the queue's head; clears it when its time is up. */
export function wreckage(state: SimState, ctx: TickContext): void {
  const w = state.wreckage;
  if (w.queue.length === 0 || state.outcome !== 'playing') return;
  w.progressTicks++;
  if (w.progressTicks < clearTicksFor(ctx.config.modifiers)) return;
  const idx = w.queue.shift()!; // the queue is non-empty
  w.progressTicks = 0;
  w.cleared.push(idx);
  const map = ctx.map;
  const to = underAt(map, idx);
  const salvage = salvageFor(ctx.config.modifiers, map.salvage[keyOf(map, idx)] ?? 0);
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
