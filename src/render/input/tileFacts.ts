// The facts about one tile that input decisions need (intents.ts `TileFacts`), read from the sim:
// shared by the pointer (BattleScene) and the keyboard cursor (app/commands.ts), so a click and
// Enter on the same tile mean the same thing.
import type { CompiledMapDef } from '../../content/compiled.ts';
import type { IdSpace, MarkerId } from '../../content/types.ts';
import { isBuildableTile, liveTileAt, wreckageStatus, type Sim } from '../../sim/index.ts';
import { incomingAt } from '../views/spawnFlags.ts';
import type { TileFacts } from './intents.ts';

export type MutableTileFacts = { -readonly [K in keyof TileFacts]: TileFacts[K] };

/** A fresh scratch object for `fillTileFacts` (off the map until filled). */
export function emptyTileFacts(): MutableTileFacts {
  return {
    index: -1,
    col: -1,
    row: -1,
    buildable: false,
    towerUid: 0,
    groundPath: false,
    peeker: false,
    wreckage: 'none',
    clickable: null,
    incoming: false,
  };
}

/**
 * The tile index of the Peeker's rock (the `peeker` marker) where poking it is a UI event: on an
 * Act I map (design/core-loop.md § 6.9). −1 on a map without one, and from Act II on, where the
 * rock is a clickable world object only while a script says so (an `interact` command).
 */
export function peekerTile(map: CompiledMapDef<IdSpace>): number {
  const at = map.act === 1 ? map.markers['peeker'] : undefined;
  if (at === undefined) return -1;
  const [c, r] = at;
  return c >= 0 && r >= 0 && c < map.cols && r < map.rows ? r * map.cols + c : -1;
}

/**
 * The clickable world object on tile `index` now (T409): a marker in the sim's `state.clickable`
 * that sits there, or null. Clickable markers are few (A2M3 has one), so this walks them.
 */
export function clickableAt(sim: Sim<IdSpace>, index: number): MarkerId | null {
  const map = sim.map;
  const clickable = sim.state.clickable;
  for (let i = 0; i < clickable.length; i++) {
    const m = clickable[i]!; // i < length
    const at = Object.hasOwn(map.markers, m) ? map.markers[m] : undefined;
    if (at !== undefined && at[1] * map.cols + at[0] === index) return m;
  }
  return null;
}

/** Each map's ground-route tiles (1 where a path or rift lane runs), computed once per map. */
const groundPaths = new WeakMap<object, Uint8Array>();

/**
 * Whether tile `index` lies on one of the map's ground routes (paths and rift lanes, their spawn
 * and core tiles included): the tiles a segment ability (Suppressing Fire) can target.
 */
export function isGroundPathTile(map: CompiledMapDef<IdSpace>, index: number): boolean {
  let mask = groundPaths.get(map);
  if (mask === undefined) {
    mask = new Uint8Array(map.cols * map.rows);
    for (const route of Object.values(map.routes)) {
      if (route.kind === 'air') continue;
      for (const [c, r] of route.tiles) mask[r * map.cols + c] = 1;
    }
    groundPaths.set(map, mask);
  }
  return mask[index] === 1;
}

/** Fills `out` with the facts about tile `index` (−1, or out of range: off the map). */
export function fillTileFacts(
  sim: Sim<IdSpace>,
  index: number,
  out: MutableTileFacts,
): MutableTileFacts {
  const map = sim.map;
  if (index < 0 || index >= map.cols * map.rows) {
    out.index = -1;
    out.col = -1;
    out.row = -1;
    out.buildable = false;
    out.towerUid = 0;
    out.groundPath = false;
    out.peeker = false;
    out.wreckage = 'none';
    out.clickable = null;
    out.incoming = false;
    return out;
  }
  out.index = index;
  out.col = index % map.cols;
  out.row = (index - out.col) / map.cols;
  // A cleared wreck is its live tile (a pad, high ground, a hidden power node; D076).
  out.buildable = isBuildableTile(liveTileAt(map, sim.state.wreckage, index)); // index < cols·rows
  const slot = sim.state.towerAtTile[index] ?? -1;
  out.towerUid = slot < 0 ? 0 : (sim.state.towers.items[slot]?.uid ?? 0);
  out.groundPath = isGroundPathTile(map, index);
  out.peeker = index === peekerTile(map);
  out.wreckage = wreckageStatus(map, sim.state.wreckage, out.col, out.row);
  out.clickable = clickableAt(sim, index);
  out.incoming = incomingAt(map, sim.state, index);
  return out;
}

/**
 * Whether the ability in slot `slot` targets the path (a segment: Suppressing Fire; a path trap:
 * Underfoot, T631), so aiming it only takes ground-route tiles (the sim's `onGroundRoute` rule);
 * false for a strike (any tile) or an empty slot.
 */
export function slotAimsAtPath(sim: Sim<IdSpace>, slot: 1 | 2 | null): boolean {
  if (slot === null) return false;
  const a = sim.config.abilities;
  const id = slot === 1 ? a.slot1 : a.slot2;
  const abilities = sim.config.content.abilities;
  if (id === null || !Object.hasOwn(abilities, id)) return false;
  const kind = abilities[id]?.effect.kind;
  return kind === 'segment' || kind === 'pathTrap';
}
