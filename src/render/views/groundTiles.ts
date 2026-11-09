// Which sprites dress each map tile (art-direction.md § Tile readability): the ground tile, and a
// prop standing on it, if any; plus the decor apron around the grid (art-direction §3). Pure, so
// the choices are unit-tested; GroundView draws them.
import type { SpriteId } from '../../content/sprites/index.ts';
import { APRON_RINGS } from '../../content/sprites/tiles/apron.ts';
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
}

/**
 * Decor markers (maps.md: markers are map-local names on non-path tiles): a marker with one of
 * these ids is drawn as its prop, on any map, in place of the tile's sparse decor. Other markers
 * (a Challenge's power node, an ally post) draw nothing here.
 */
export const DECOR_MARKERS: Readonly<Record<MarkerId, SpriteId>> = {
  rig3: 'prop.rig',
  housing: 'prop.housing',
  scarecrow: 'prop.scarecrow',
};

/** The decor prop a marker puts on (col, row), if any. */
function decorAt(g: GroundGrid, col: number, row: number): SpriteId | null {
  if (g.markers === undefined) return null;
  for (const [id, [c, r]] of Object.entries(g.markers)) {
    const sprite = Object.hasOwn(DECOR_MARKERS, id) ? DECOR_MARKERS[id] : undefined;
    if (sprite !== undefined && c === col && r === row) return sprite;
  }
  return null;
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

function isPathLike(t: TileChar | undefined): boolean {
  return t === '#' || t === 'S' || t === 'C';
}

/** The dressing for tile (col, row). Deterministic: the same map always looks the same. */
export function dressTile(g: GroundGrid, col: number, row: number): TileDressing {
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
      const decor = t === undefined ? null : decorAt(g, col, row);
      let sprite: SpriteId | null = decor;
      if (sprite === null && t === 'x') sprite = 'prop.rock';
      else if (sprite === null && (col * 3 + row * 5) % 7 === 0) sprite = 'prop.flora';
      else if (sprite === null && (col * 5 + row * 3) % 11 === 0) sprite = 'prop.rock';
      const prop = sprite === null ? null : { sprite, frame: 'v0', anim: null };
      // Grass beside the road: a verge of darker clumps on each edge it shares with the road.
      const verge: string[] = [];
      for (const [edge, dc, dr] of EDGES) {
        if (isPathLike(at(col + dc, row + dr)))
          verge.push(`${edge}_${(col + row) % VERGE_VARIANTS}`);
      }
      return verge.length === 0 ? { ground: grass, prop } : { ground: grass, prop, verge };
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
