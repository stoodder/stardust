// Shared helpers for content validation (validate.ts and its validate*.ts parts).
import type { GridPos, IdSpace, MapDef, TileChar, TileKey } from './types.ts';

/**
 * Collected validation errors. Each one is `[rule] where: message`; the rule name is what a
 * failing test matches, and `where` locates the data like compile errors do (`maps.x.waves[2]`).
 */
export class Issues {
  readonly errors: string[] = [];
  add(rule: string, where: string, message: string): void {
    this.errors.push(`[${rule}] ${where}: ${message}`);
  }
}

/** Tiles a tower can be built on (design/maps.md § 3). */
export const BUILDABLE: ReadonlySet<string> = new Set<TileChar>(['o', '^', '+']);

/** A map's tile grid, read straight from the authored rows. */
export interface Grid {
  readonly cols: number;
  readonly rows: number;
  at(pos: GridPos): TileChar | undefined;
  count(ch: TileChar): number;
}

/** The authored grid, or null when it is malformed (compile reports that). */
export function gridOf(def: MapDef<IdSpace>): Grid | null {
  const { cols, rows } = def.size;
  if (def.tiles.length !== rows || def.tiles.some((r) => r.length !== cols)) return null;
  return {
    cols,
    rows,
    at([c, r]) {
      if (!Number.isInteger(c) || !Number.isInteger(r) || c < 0 || r < 0 || c >= cols) {
        return undefined;
      }
      const ch = def.tiles[r]?.charAt(c);
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- compile checks the legend
      return ch === undefined || ch === '' ? undefined : (ch as TileChar);
    },
    count(ch) {
      let n = 0;
      for (const row of def.tiles) for (const t of row) if (t === ch) n++;
      return n;
    },
  };
}

export function keyOf([c, r]: GridPos): TileKey {
  return `${c},${r}`;
}

/** Parses a `"col,row"` key; null if it isn't one. */
export function parseKey(key: string): GridPos | null {
  const m = /^(\d+),(\d+)$/.exec(key);
  return m === null ? null : [Number(m[1]), Number(m[2])];
}

export function isPositive(n: unknown): boolean {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}
export function isNonNegative(n: unknown): boolean {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0;
}
export function isNonNegativeInt(n: unknown): boolean {
  return typeof n === 'number' && Number.isInteger(n) && n >= 0;
}
export function isPositiveInt(n: unknown): boolean {
  return typeof n === 'number' && Number.isInteger(n) && n > 0;
}

/** Values that occur more than once, in first-seen order. */
export function duplicates<T>(xs: readonly T[]): T[] {
  const seen = new Set<T>();
  const dups = new Set<T>();
  for (const x of xs) {
    if (seen.has(x)) dups.add(x);
    seen.add(x);
  }
  return [...dups];
}

export function fmt(pos: GridPos): string {
  return `(${pos[0]},${pos[1]})`;
}
