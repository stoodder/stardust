// Script-opened tiles (design/maps.md § 3's script-added wreckage, § 5.3; story-runtime.md § Map
// scripts; T707): the `openTile` script action and Shareholder Value's jettison
// (enemyAbilities/jettison.ts) change a predefined decor marker's tile to `to` (the plates: `x`,
// wreckage). The compiled map never changes: `state.tilesOpened` lists the opened markers in order
// and `state.tilesOpenedTo` what each became (index-aligned); render reads them through
// `openedTile` (the crash site's plates). A marker opens once: a second `openTile` on it is spent.
// - **Never a tile the player uses.** [marker] holds every `openTile` marker on decor ('.'), and
//   [jettison] every plate marker (validateMap.ts, validateM7.ts), so no event takes a pad, a path,
//   or a tower's tile. The sim runs an `openTile` to a tile nothing builds on (wreckage, decor, a
//   wall); one to a buildable tile is refused at createSim (systems/triggers.ts `unsupportedScript`,
//   M8: the build checks read the compiled map and cleared wreckage, never an opened tile).
// - **Opened wreckage isn't salvage:** the drone clears only the map's own wreckage (systems/
//   wreckage.ts reads the compiled tiles), so a plate stays where it fell.
import type { TileChar } from '../content/types.ts';
import { emit, type SimState } from './state.ts';

/**
 * Opens `marker`'s tile to `to` (TileOpened) unless it is already open. Returns whether it opened.
 * Callers pass a marker of the map (validate() checks every one).
 */
export function openTile(state: SimState, marker: string, to: TileChar): boolean {
  if (state.tilesOpened.includes(marker)) return false;
  state.tilesOpened.push(marker);
  state.tilesOpenedTo.push(to);
  emit(state, { type: 'TileOpened', marker, to });
  return true;
}

/** What a script opened `marker` to, or null while it's closed (render's plates). */
export function openedTile(
  state: Readonly<Pick<SimState, 'tilesOpened' | 'tilesOpenedTo'>>,
  marker: string,
): TileChar | null {
  const i = state.tilesOpened.indexOf(marker);
  return i < 0 ? null : (state.tilesOpenedTo[i] ?? null);
}
