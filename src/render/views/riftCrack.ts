// Which `tile.rift` halves a rift lane draws (T640c; the sprite is content/sprites/tiles/rift.ts,
// its looks art-direction §8 *Rift cracks*). Pure, so the choice is unit-tested; RiftView draws
// them, reading `riftStatus(lane, wave)` each frame and playing `riftCrackLook`.
// A lane cracks only where it crosses ground that isn't road: from its first tile up to where it
// joins a road (a `#`, `S`, or `C` tile; that edge's half still reaches into the join, so the
// crack meets the road). Each crack tile draws two halves, toward the tile before it and the tile
// after it; the lane's first tile (on the map's edge) runs on straight out of the grid.
import type { RiftStatus } from '../../sim/index.ts';
import type { GridPos, TileChar } from '../../content/types.ts';
import type { VergeEdge } from '../../content/sprites/tiles/verge.ts';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';

export interface RiftCrackTile {
  readonly col: number;
  readonly row: number;
  /** The halves to draw on it (each a `tile.rift` frame's edge), toward the lane's previous tile, then the next. */
  readonly edges: readonly VergeEdge[];
}

/** The grid as the picker reads it (a CompiledMapDef satisfies it). */
export interface RiftGrid {
  readonly cols: number;
  readonly rows: number;
  readonly tiles: readonly TileChar[];
}

const ROAD: ReadonlySet<TileChar | undefined> = new Set<TileChar | undefined>(['#', 'S', 'C']);

/** The edge of (c, r) that faces its neighbour (c + dc, r + dr), or null if not a neighbour. */
function edgeToward(dc: number, dr: number): VergeEdge | null {
  if (dc === -1 && dr === 0) return 'nw';
  if (dc === 0 && dr === -1) return 'ne';
  if (dc === 1 && dr === 0) return 'se';
  if (dc === 0 && dr === 1) return 'sw';
  return null;
}

/** The crack's tiles along `lane` (in lane order): its off-road run, each with its two halves. */
export function riftCrackTiles(
  g: RiftGrid,
  lane: { readonly tiles: readonly GridPos[] },
): RiftCrackTile[] {
  const out: RiftCrackTile[] = [];
  const t = lane.tiles;
  for (let i = 0; i < t.length; i++) {
    const [c, r] = t[i]!; // i < length
    if (ROAD.has(g.tiles[r * g.cols + c])) break;
    const edges: VergeEdge[] = [];
    const prev = t[i - 1];
    const next = t[i + 1];
    if (prev !== undefined) {
      const e = edgeToward(prev[0] - c, prev[1] - r);
      if (e !== null) edges.push(e);
    } else if (next !== undefined) {
      // The lane's mouth: straight on out of the grid, away from the next tile.
      const e = edgeToward(c - next[0], r - next[1]);
      if (e !== null) edges.push(e);
    }
    if (next !== undefined) {
      const e = edgeToward(next[0] - c, next[1] - r);
      if (e !== null) edges.push(e);
    }
    out.push({ col: c, row: r, edges });
  }
  return out;
}

/** True when (col, row) is on one of the lanes' cracks (sparse decor keeps off it). */
export function onRiftCrack(
  g: RiftGrid,
  lanes: readonly { readonly tiles: readonly GridPos[] }[],
  col: number,
  row: number,
): boolean {
  return lanes.some((l) => riftCrackTiles(g, l).some((k) => k.col === col && k.row === row));
}

/**
 * A crack half's look for a status: `closed` a still frame (the old scar), `opening` and `open`
 * their looping anims (`tile.rift` `opening_<edge>`, 2 fps; `open_<edge>`, 3 fps) over their first
 * frame. Under reduced motion, draw `frame` and skip the anim.
 */
export function riftCrackLook(
  status: RiftStatus,
  edge: VergeEdge,
): { readonly frame: string; readonly anim: string | null } {
  if (status === 'closed') return { frame: `closed_${edge}`, anim: null };
  return { frame: `${status}_${edge}_0`, anim: `${status}_${edge}` };
}

/**
 * At the finale's Dawn the torn rifts go out (M8 review R2): as Phase 3 begins each lit half
 * (`opening`, `open`) fades down the stepped-alpha ladder over RIFT_DAWN_FADE_STEPS of the sun's
 * sweep (SongNightView `sunStep`, sim time: about the HUD's 1.2 s of the 8 s Dawn), then closes to
 * its old scar, so no violet tear burns across the morning. Under reduced motion the sun lands at
 * once (step SUN_STEPS), so they close at once.
 */
export const RIFT_DAWN_FADE_STEPS = 7;

/** A lit half's alpha at Dawn's sun step `step` (−1: no Dawn → 1); 0 once it has gone to its scar. */
export function riftDawnAlpha(step: number): number {
  if (step < 0) return 1;
  if (step >= RIFT_DAWN_FADE_STEPS) return 0;
  return STEPPED_ALPHA[Math.min(3, Math.floor((step / RIFT_DAWN_FADE_STEPS) * 4))]!;
}
