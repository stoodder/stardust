// Which sprites dress each map tile (art-direction.md § Tile readability): the ground tile, and a
// prop standing on it, if any; plus the decor apron around the grid (art-direction §3). Pure, so
// the choices are unit-tested; GroundView draws them.
import type { SpriteId } from '../../content/sprites/index.ts';
import { APRON_RINGS } from '../../content/sprites/tiles/apron.ts';
import { CLIFF_VARIANTS, type CliffEdge } from '../../content/sprites/tiles/cliff.ts';
import { VERGE_VARIANTS, type VergeEdge } from '../../content/sprites/tiles/verge.ts';
import type { GridPos, MarkerId, TileChar } from '../../content/types.ts';
import { assertNever } from '../../shared/types.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';

export interface TileLook {
  readonly sprite: SpriteId;
  readonly frame: string;
}

/** A ground tile's look: a still frame, or a looping anim (the power node's pulse). */
export interface GroundLook extends TileLook {
  readonly anim?: string;
}

export interface TileDressing {
  readonly ground: GroundLook;
  /**
   * `tile.verge` overlay frames drawn over the ground, in order: darker grass clumps along each
   * edge a grass tile shares with the road (art-direction §3). Absent with none.
   */
  readonly verge?: readonly string[];
  /**
   * `tile.cliff` overlay frames drawn over the ground (and verge), in order: a terrace step down
   * from each back neighbour that stands higher (`GroundGrid.terraces`; T223). Absent with none.
   */
  readonly cliff?: readonly string[];
  /** A prop on the tile's center (the core, wreckage, decor), or null. */
  readonly prop: (TileLook & { readonly anim: string | null }) | null;
  /**
   * A raised block standing on the tile (high ground): drawn in `world` by its frame anchor at
   * the tile's top vertex, sorted by the tile center with `highGround` bias (tech-spec § Depth
   * sorting). Its top face is `ELEVATION_PX` above the ground plane.
   */
  readonly block?: TileLook;
}

/** The grid as GroundView reads it (a CompiledMapDef satisfies it). */
export interface GroundGrid {
  readonly cols: number;
  readonly rows: number;
  readonly tiles: readonly TileChar[];
  /** The map's markers; the ones named in `DECOR_MARKERS` are drawn as props. */
  readonly markers?: Readonly<Record<MarkerId, GridPos>>;
  /** Render-only terrace levels, row-major like `tiles` (MapDef.terraces); absent or null: flat. */
  readonly terraces?: readonly number[] | null;
}

/**
 * Decor markers (maps.md: markers are map-local names on non-path tiles): a marker with one of
 * these ids, or one of them plus `_<n>` (`billboard_2`, for a map with several), is drawn as its
 * prop, on any map, in place of the tile's sparse decor. Other markers (a Challenge's power node,
 * an ally post) draw nothing here. The props each map names are in act1.md (A1M2's Rig 3, housing
 * block, and scarecrow; A1M3's fallen mailbox; A1M4's fountain, podium, and Evie billboards;
 * A1M5's banner line, party tent, and confetti cannon).
 */
export const DECOR_MARKERS: Readonly<Record<MarkerId, SpriteId>> = {
  rig3: 'prop.rig',
  housing: 'prop.housing',
  scarecrow: 'prop.scarecrow',
  mailbox: 'prop.mailbox',
  fountain: 'prop.fountain',
  podium: 'prop.podium',
  billboard: 'prop.billboard',
  banner_line: 'prop.bunting',
  party_tent: 'prop.party_tent',
  confetti_cannon: 'prop.confetti_cannon',
};

/** A decor prop's frame and looping anim on the map, where it isn't `v0` and still. */
const DECOR_LOOKS: Readonly<Partial<Record<SpriteId, { frame: string; anim: string | null }>>> = {
  'prop.fountain': { frame: 'f0', anim: 'flow' },
  // Compliance Officer Prim hovers at the podium all map (act1.md § A1M4).
  'prop.podium': { frame: 'prim_0', anim: 'prim' },
  'prop.billboard': { frame: 'beaming', anim: null },
  'prop.confetti_cannon': { frame: 'idle', anim: null },
};

/**
 * Markers drawn by a view of their own, which leave their tile bare of sparse decor: the Peeker
 * (PeekerView, T309).
 */
export const VIEW_MARKERS: readonly MarkerId[] = ['peeker'];

/** A prop that arrives on a cue: its sprite, and the wave whose countdown brings it on. */
export interface CueDecor {
  readonly sprite: SpriteId;
  /** It lands as this wave's build-phase countdown starts (the cue scene's moment). */
  readonly wave: number;
}

/**
 * Props the story brings on (props on cues, T312b): their marker's tile stays bare until the cue,
 * then CuePropView drops the prop there. Zibzab's shell-shop clanks onto A1M3's verge with his W6
 * scene (`a1_m03_w06`, which plays as W6's countdown starts; act1.md § A1M3).
 */
export const CUE_DECOR: Readonly<Record<MarkerId, CueDecor>> = {
  zibzab_shop: { sprite: 'prop.zibzab_shop', wave: 6 },
};

/** The decor id a marker id names: itself, or itself less a `_<n>` suffix. */
function decorSprite(id: MarkerId): SpriteId | undefined {
  if (Object.hasOwn(DECOR_MARKERS, id)) return DECOR_MARKERS[id];
  const base = id.replace(/_\d+$/, '');
  return base !== id && Object.hasOwn(DECOR_MARKERS, base) ? DECOR_MARKERS[base] : undefined;
}

/** The decor prop a marker puts on (col, row), if any; 'bare' for a view or cue marker's tile. */
function decorAt(g: GroundGrid, col: number, row: number): SpriteId | 'bare' | null {
  if (g.markers === undefined) return null;
  for (const [id, [c, r]] of Object.entries(g.markers)) {
    if (c !== col || r !== row) continue;
    if (VIEW_MARKERS.includes(id) || Object.hasOwn(CUE_DECOR, id)) return 'bare';
    const sprite = decorSprite(id);
    if (sprite !== undefined) return sprite;
  }
  return null;
}

/**
 * The banner line's frame: slung back across the road behind its tile, along grid x (`x`) or y
 * (`y`); `x` if neither neighbour is road.
 */
function buntingFrame(g: GroundGrid, col: number, row: number): 'x' | 'y' {
  const t = (c: number, r: number): TileChar | undefined =>
    c < 0 || r < 0 || c >= g.cols || r >= g.rows ? undefined : g.tiles[r * g.cols + c];
  return !isPathLike(t(col - 1, row)) && isPathLike(t(col, row - 1)) ? 'y' : 'x';
}

/** Each tile edge's neighbour offset (verge.ts names the edges). */
const EDGES: readonly (readonly [VergeEdge, number, number])[] = [
  ['nw', -1, 0],
  ['ne', 0, -1],
  ['se', 1, 0],
  ['sw', 0, 1],
];

const GRASS_VARIANTS = 3;

/** The env palette's sprite variant: `act1` is every env sprite's default palette. */
export function envVariant(env: string): string {
  return env === 'act1' ? DEFAULT_VARIANT : env;
}

/** The `prop.wreckage` wreck on tile (col, row): `v0` or `v1`, alternating (T311b's frames). */
export function wreckageFrame(col: number, row: number): 'v0' | 'v1' {
  return (col + row) % 2 === 0 ? 'v0' : 'v1';
}

function isPathLike(t: TileChar | undefined): boolean {
  return t === '#' || t === 'S' || t === 'C';
}

/** Back neighbours a terrace face can step down from: (col, row − 1), then (col − 1, row). */
const CLIFF_EDGES: readonly (readonly [CliffEdge, number, number])[] = [
  ['ne', 0, -1],
  ['nw', -1, 0],
];

/**
 * The terrace faces on tile (col, row): one per back neighbour on a higher terrace. The road cuts
 * through (a path tile gets none: the switchbacks read as cuts), a high-ground block covers its
 * own footprint, and a pad or power node keeps its plate clear (the `_pad` frames).
 */
export function cliffFrames(g: GroundGrid, col: number, row: number): string[] {
  const out: string[] = [];
  const levels = g.terraces;
  if (levels === undefined || levels === null) return out;
  const t = g.tiles[row * g.cols + col];
  if (isPathLike(t) || t === '^') return out;
  const here = levels[row * g.cols + col] ?? 0;
  const plate = t === 'o' || t === '+' ? '_pad' : '';
  for (const [edge, dc, dr] of CLIFF_EDGES) {
    const c = col + dc;
    const r = row + dr;
    if (c < 0 || r < 0) continue;
    if ((levels[r * g.cols + c] ?? 0) > here) {
      out.push(`${edge}${plate}_${(col + row) % CLIFF_VARIANTS}`);
    }
  }
  return out;
}

/** The dressing for tile (col, row). Deterministic: the same map always looks the same. */
export function dressTile(g: GroundGrid, col: number, row: number): TileDressing {
  const look = dressBase(g, col, row);
  const cliff = cliffFrames(g, col, row);
  return cliff.length === 0 ? look : { ...look, cliff };
}

function dressBase(g: GroundGrid, col: number, row: number): TileDressing {
  const at = (c: number, r: number): TileChar | undefined =>
    c < 0 || r < 0 || c >= g.cols || r >= g.rows ? undefined : g.tiles[r * g.cols + c];
  const t = at(col, row);
  const grass: TileLook = {
    sprite: 'tile.grass',
    frame: `v${(col * 7 + row * 13) % GRASS_VARIANTS}`,
  };
  switch (t) {
    case '#':
    case 'C': {
      // Treads run along the path: rows above or below mean it runs along the grid's y axis.
      const alongY = isPathLike(at(col, row - 1)) || isPathLike(at(col, row + 1));
      const ground: TileLook = { sprite: 'tile.path', frame: alongY ? 'tread_y' : 'tread_x' };
      return {
        ground,
        prop: t === 'C' ? { sprite: 'prop.core', frame: 'idle_0', anim: 'idle' } : null,
      };
    }
    case 'S':
      return { ground: { sprite: 'tile.spawn', frame: 'v0' }, prop: null };
    case 'o':
      return { ground: { sprite: 'tile.pad', frame: 'v0' }, prop: null };
    case '^':
      // The block covers its whole footprint; the grass under it only backs its seams.
      return { ground: grass, prop: null, block: { sprite: 'tile.high_ground', frame: 'v0' } };
    case '+':
      return { ground: { sprite: 'tile.power_node', frame: 'v0', anim: 'pulse' }, prop: null };
    case 'x':
    case '.':
    case undefined: {
      // A decor marker's prop; else sparse decor, so blocked ground reads as neither pad nor path.
      // A view marker's tile (the Peeker's rock) stays bare: its view draws what stands there.
      const decor = t === undefined ? null : decorAt(g, col, row);
      let sprite: SpriteId | null = decor === 'bare' ? null : decor;
      if (decor === null) {
        if (t === 'x') sprite = 'prop.wreckage';
        else if ((col * 3 + row * 5) % 7 === 0) sprite = 'prop.flora';
        else if ((col * 5 + row * 3) % 11 === 0) sprite = 'prop.rock';
      }
      // Wreckage alternates its two wrecks by tile (a crashed drone, a toppled cart); WreckageView
      // swaps the frame as the drone works and hides it once the tile is cleared.
      let onTile: Prop | null = null;
      if (sprite === 'prop.bunting') {
        onTile = { sprite, frame: buntingFrame(g, col, row), anim: null };
      } else if (sprite !== null) {
        const look = DECOR_LOOKS[sprite];
        const frame = t === 'x' ? wreckageFrame(col, row) : (look?.frame ?? 'v0');
        onTile = { sprite, frame, anim: t === 'x' ? null : (look?.anim ?? null) };
      }
      // Grass beside the road: a verge of darker clumps on each edge it shares with the road.
      const verge: string[] = [];
      for (const [edge, dc, dr] of EDGES) {
        if (isPathLike(at(col + dc, row + dr)))
          verge.push(`${edge}_${(col + row) % VERGE_VARIANTS}`);
      }
      return verge.length === 0
        ? { ground: grass, prop: onTile }
        : { ground: grass, prop: onTile, verge };
    }
    default:
      return assertNever(t);
  }
}

/**
 * Props that keep their own palette in every act (Everglow hardware, and the scarecrow in his
 * Everglow cap); the rest follow env.
 */
const OWN_PALETTE: ReadonlySet<SpriteId> = new Set<SpriteId>([
  'prop.core',
  'prop.fence',
  'prop.dome',
  'prop.billboard',
  'prop.rig',
  'prop.housing',
  'prop.scarecrow',
  'prop.mailbox',
  'prop.zibzab_shop',
  'prop.fountain',
  'prop.podium',
  'prop.party_tent',
  'prop.confetti_cannon',
  'prop.bunting',
]);

/** The palette variant a prop draws in on a map of env `env`. */
export function propVariant(sprite: SpriteId, env: string): string {
  return OWN_PALETTE.has(sprite) ? DEFAULT_VARIANT : envVariant(env);
}

/** One apron cell: a tile outside the grid, `ring` steps from it (1 touches the grid). */
export interface ApronCell extends TileDressing {
  readonly col: number;
  readonly row: number;
  readonly ring: number;
}

type Prop = NonNullable<TileDressing['prop']>;
const prop = (sprite: SpriteId, frame: string): Prop => ({ sprite, frame, anim: null });

/**
 * Act I's colony dressing on the apron's second ring, behind the map (north edges), so it never
 * hides the playfield (and clear of the HUD's top-center banner): an Evie billboard and lettuce
 * patches along the north-west edge, Dome Row along the north-east. Positions scale with the map; a cell the road uses is
 * skipped.
 */
function colonyDecor(g: GroundGrid): ReadonlyMap<string, Prop> {
  const m = new Map<string, Prop>();
  m.set(`-2,${Math.round(g.rows * 0.2)}`, prop('prop.billboard', 'beaming'));
  m.set(`${Math.round(g.cols * 0.55)},-2`, prop('prop.dome', 'v0'));
  m.set(`${g.cols - 2},-2`, prop('prop.dome', 'v0'));
  for (let r = Math.round(g.rows * 0.4); r < Math.round(g.rows * 0.4) + 3; r++) {
    m.set(`-2,${r}`, prop('prop.lettuce', 'v0'));
  }
  return m;
}

const DECOR_BY_ENV: Readonly<Record<string, (g: GroundGrid) => ReadonlyMap<string, Prop>>> = {
  act1: colonyDecor,
};

/**
 * The decor apron: every cell within `APRON_RINGS` of the grid, back to front. Ground darkens
 * and dithers to ink ring by ring; the road runs on out of every border core tile (the road out
 * through the gate); ring 1 carries the perimeter fence, with gaps where the road leaves and
 * beside border spawns; ring 2 carries the env's decor and sparse brush. Never picked.
 */
export function apronCells(g: GroundGrid, env: string): ApronCell[] {
  const R = APRON_RINGS;
  const inGrid = (c: number, r: number): boolean => c >= 0 && r >= 0 && c < g.cols && r < g.rows;
  const tileAt = (c: number, r: number): TileChar | undefined =>
    inGrid(c, r) ? g.tiles[r * g.cols + c] : undefined;
  const roads = new Map<string, 'x' | 'y'>();
  const gaps = new Set<string>();
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const t = tileAt(c, r);
      if (t !== 'C' && t !== 'S') continue;
      for (const [dc, dr] of [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ] as const) {
        if (inGrid(c + dc, r + dr)) continue;
        gaps.add(`${c + dc},${r + dr}`);
        if (t !== 'C') continue;
        for (let k = 1; k <= R; k++) roads.set(`${c + k * dc},${r + k * dr}`, dc === 0 ? 'y' : 'x');
      }
    }
  }
  const decor = DECOR_BY_ENV[env]?.(g) ?? new Map<string, Prop>();
  const out: ApronCell[] = [];
  for (let d = -2 * R; d <= g.cols + g.rows - 2 + 2 * R; d++) {
    for (let col = -R; col < g.cols + R; col++) {
      const row = d - col;
      if (row < -R || row >= g.rows + R || inGrid(col, row)) continue;
      const ring = Math.max(
        col < 0 ? -col : col >= g.cols ? col - g.cols + 1 : 0,
        row < 0 ? -row : row >= g.rows ? row - g.rows + 1 : 0,
      );
      const key = `${col},${row}`;
      const road = roads.get(key);
      const ground: TileLook = {
        sprite: 'tile.apron',
        frame: road === undefined ? `r${ring}` : `road_${road}_r${ring}`,
      };
      let p: Prop | null = null;
      if (road === undefined && !gaps.has(key)) {
        if (ring === 1) {
          const alongX = row === -1 || row === g.rows;
          const alongY = col === -1 || col === g.cols;
          if (alongX !== alongY) p = prop('prop.fence', alongX ? 'x' : 'y');
        } else if (ring === 2) {
          p = decor.get(key) ?? null;
          if (p === null) {
            const h = (((col + 16) * 7 + (row + 16) * 11) >>> 0) % 9;
            p = h === 0 ? prop('prop.flora', 'v0') : h === 4 ? prop('prop.rock', 'v0') : null;
          }
        }
      }
      out.push({ col, row, ring, ground, prop: p });
    }
  }
  return out;
}

/**
 * The tiles behind core tile (col, row) whose tower the core's sprite would hide: the same screen
 * column (col − row equal; iso tiles in neighbouring columns sit 16 px aside, clear of the core's
 * pylon) and 2 or more diagonals back (one diagonal back is the next screen column), while the
 * tower's foot is still under the core's top (`heightPx`: the core's height above its anchor).
 */
export function tilesBehind(
  grid: { readonly cols: number; readonly tiles: readonly unknown[] },
  col: number,
  row: number,
  heightPx: number,
): number[] {
  const rows = Math.floor(grid.tiles.length / grid.cols);
  const out: number[] = [];
  // Each diagonal back is 8 px up the screen; a tower's base reaches about 6 px below its foot.
  for (let k = 1; 16 * k < heightPx + 6; k++) {
    const c = col - k;
    const r = row - k;
    if (c < 0 || r < 0 || c >= grid.cols || r >= rows) break;
    out.push(r * grid.cols + c);
  }
  return out;
}
