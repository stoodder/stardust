// A3M3's blast doors as rules (act3.md § A3M3; art-direction §6 *The blast doors*; BlastDoorView
// draws them, in place of the core on each door core): which core tiles are doors, which door C3
// opened, and each door's look. Pure, so it is unit-tested.
// - **The doors** are the core tiles (`C`) under a `door_<name>` marker (`door_west`, `door_east`).
// - **Open or shut:** a door is open when a refugee group that walks this run (its `when` holds
//   under the run's story flags; A3M3's `door_choice`) leaves through it; the others are shut and
//   dark. Before C3 is answered (no group walks: the briefing's first battle, rebuilt on the answer)
//   every door stands open.
// - **The SEAL** (the forced input `seal`): each open door runs shut (`closing`, once) and holds
//   `sealed` under its turning alarm; a shut door stays shut. Under reduced motion the door is
//   `sealed_0` at once, still.
import type { CompiledMapDef } from '../../content/compiled.ts';
import type { IdSpace, ScriptFlags } from '../../content/types.ts';
import type { DeepReadonly } from '../../shared/types.ts';

/** The door's sprite. */
export const BLAST_DOOR = 'prop.blast_door' as const;
/** The forced input that seals the doors (A3M3's SEAL). */
export const SEAL_INPUT = 'seal';

/** A door marker's id: `door_` and its name. */
const DOOR_MARKER = /^door_[a-z0-9_]+$/;

export interface DoorCore {
  readonly marker: string;
  readonly col: number;
  readonly row: number;
  /** Its tile index (row-major), as GroundView keys its core props. */
  readonly index: number;
  /** C3 chose it (its refugees walk), or nothing is chosen yet. */
  readonly open: boolean;
}

/** The map as the doors read it (a CompiledMapDef satisfies it). */
export type DoorMap = DeepReadonly<
  Pick<CompiledMapDef<IdSpace>, 'cols' | 'tiles' | 'markers' | 'escort'>
>;

/** The map's door cores (in marker order) and which stand open under the run's `flags`. */
export function doorCores(map: DoorMap, flags: ScriptFlags): DoorCore[] {
  const walking = new Set<string>();
  for (const g of map.escort?.groups ?? []) {
    if (g.when === null || flags[g.when.flag] === g.when.eq) walking.add(g.exit);
  }
  const out: DoorCore[] = [];
  for (const [marker, at] of Object.entries(map.markers)) {
    if (!DOOR_MARKER.test(marker) || at === undefined) continue;
    const [col, row] = at;
    const index = row * map.cols + col;
    if (map.tiles[index] !== 'C') continue;
    out.push({ marker, col, row, index, open: walking.size === 0 || walking.has(marker) });
  }
  return out;
}

/** Where the SEAL stands: not yet, just pressed (the leaves running shut), or held. */
export type SealPhase = 'none' | 'closing' | 'sealed';

/** A door's frame and anim (null: hold the frame) for its state; `still`: reduced motion. */
export function doorLook(
  open: boolean,
  seal: SealPhase,
  still: boolean,
): { readonly frame: string; readonly anim: string | null } {
  if (!open) return { frame: 'shut', anim: null };
  if (seal === 'none') return { frame: 'open', anim: null };
  if (still) return { frame: 'sealed_0', anim: null };
  return seal === 'closing'
    ? { frame: 'closing_0', anim: 'closing' }
    : { frame: 'sealed_0', anim: 'sealed' };
}
