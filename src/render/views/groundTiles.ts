// Which sprites dress each map tile (art-direction.md § Tile readability): the ground tile, and a
// prop standing on it, if any; plus the decor apron around the grid (art-direction §3). Pure, so
// the choices are unit-tested; GroundView draws them.
import type { SpriteId } from '../../content/sprites/index.ts';
import { APRON_RINGS } from '../../content/sprites/tiles/apron.ts';
import type { TileChar } from '../../content/types.ts';
import { assertNever } from '../../shared/types.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';

export interface TileLook {
  readonly sprite: SpriteId;
  readonly frame: string;
}

export interface TileDressing {
  readonly ground: TileLook;
  /** A prop on the tile's center (the core, wreckage, decor), or null. */
  readonly prop: (TileLook & { readonly anim: string | null }) | null;
}

/** The grid as GroundView reads it (a CompiledMapDef satisfies it). */
export interface GroundGrid {
  readonly cols: number;
  readonly rows: number;
  readonly tiles: readonly TileChar[];
}

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
    // High ground and power nodes have no art of their own yet: they read as pads (T117).
    case 'o':
    case '^':
    case '+':
      return { ground: { sprite: 'tile.pad', frame: 'v0' }, prop: null };
    case 'x':
      return { ground: grass, prop: { sprite: 'prop.rock', frame: 'v0', anim: null } };
    case '.':
    case undefined: {
      // Sparse decor, so blocked ground reads as neither pad nor path.
      const h = (col * 3 + row * 5) % 7;
      const prop =
        h === 0
          ? { sprite: 'prop.flora' as const, frame: 'v0', anim: null }
          : (col * 5 + row * 3) % 11 === 0
            ? { sprite: 'prop.rock' as const, frame: 'v0', anim: null }
            : null;
      return { ground: grass, prop };
    }
    default:
      return assertNever(t);
  }
}

/** Props that are Everglow hardware keep their faction palette in every act; the rest follow env. */
const HARDWARE: ReadonlySet<SpriteId> = new Set<SpriteId>([
  'prop.core',
  'prop.fence',
  'prop.dome',
  'prop.billboard',
]);

/** The palette variant a prop draws in on a map of env `env`. */
export function propVariant(sprite: SpriteId, env: string): string {
  return HARDWARE.has(sprite) ? DEFAULT_VARIANT : envVariant(env);
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
