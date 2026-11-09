// Which sprites dress each map tile (art-direction.md § Tile readability): the ground tile, and a
// prop standing on it, if any. Pure, so the choices are unit-tested; GroundView draws them.
import type { SpriteId } from '../../content/sprites/index.ts';
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
