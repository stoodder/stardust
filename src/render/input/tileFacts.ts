// The facts about one tile that input decisions need (intents.ts `TileFacts`), read from the sim:
// shared by the pointer (BattleScene) and the keyboard cursor (app/commands.ts), so a click and
// Enter on the same tile mean the same thing.
import type { IdSpace } from '../../content/types.ts';
import { isBuildableTile, type Sim } from '../../sim/index.ts';
import type { TileFacts } from './intents.ts';

export type MutableTileFacts = { -readonly [K in keyof TileFacts]: TileFacts[K] };

/** A fresh scratch object for `fillTileFacts` (off the map until filled). */
export function emptyTileFacts(): MutableTileFacts {
  return { index: -1, col: -1, row: -1, buildable: false, towerUid: 0 };
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
    return out;
  }
  out.index = index;
  out.col = index % map.cols;
  out.row = (index - out.col) / map.cols;
  out.buildable = isBuildableTile(map.tiles[index]!); // index < cols·rows
  const slot = sim.state.towerAtTile[index] ?? -1;
  out.towerUid = slot < 0 ? 0 : (sim.state.towers.items[slot]?.uid ?? 0);
  return out;
}
