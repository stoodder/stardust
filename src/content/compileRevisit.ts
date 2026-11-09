// Revisits by reference (design/maps.md § 7; T410a): a revisit (`revisitOf`, A2M3 of A1M2) reuses
// the original's layout, composed here before validation and compilation, so an edit to the
// original flows into its revisit and nothing is copied. The original's tiles, terraces, routes
// (paths, air lanes, rift lanes), markers, and wreckage (`underWreckage`, `salvage`) are placed
// at `revisitAt`, unchanged; the revisit's own `tiles` hold the added band, with `REVISIT_TILE`
// on every tile of the original's footprint, and its own routes, markers, and wreckage join the
// original's. Everything else (waves, scripts, medals, builds, env, lighting) is the revisit's.
//
// The layout rules ([revisit], with validateMap.ts's): the original is another map and not itself
// a revisit; it sits centred in the revisit (an odd margin may lean either way) and inside it; the
// footprint is all `REVISIT_TILE` and the band has none, so the original's pads stay unchanged and
// new pads appear only in the band; no route, marker, or wreckage key of the revisit's collides
// with the original's.
import type { GridPos, IdSpace, MapDef, RawContent, TileKey } from './types.ts';

/** The character a revisit's `tiles` (and `terraces`) hold on the original's footprint. */
export const REVISIT_TILE = '*';

/**
 * Every revisit in `raw.maps` composed with its original (the rest unchanged), and the layout
 * errors, each `[revisit] where: message`. A revisit whose `revisitOf` or `revisitAt` is missing
 * or names no other map is left as it is (validate's [revisit] reports it).
 */
export function composeRevisits<K extends IdSpace>(
  raw: RawContent<K>,
): { readonly raw: RawContent<K>; readonly errors: string[] } {
  const errors: string[] = [];
  const maps: Record<string, MapDef<K>> = { ...raw.maps };
  let changed = false;
  for (const [key, def] of Object.entries<MapDef<K>>(raw.maps)) {
    const of = def.revisitOf;
    if (of === undefined || def.revisitAt === undefined || of === def.id) continue;
    if (!Object.hasOwn(raw.maps, of)) continue;
    const original: MapDef<K> = (raw.maps as Readonly<Record<string, MapDef<K>>>)[of]!; // hasOwn
    if (original.revisitOf !== undefined) {
      errors.push(`[revisit] maps.${def.id}.revisitOf: '${of}' is itself a revisit`);
      continue;
    }
    maps[key] = composeRevisit(original, def, def.revisitAt, errors);
    changed = true;
  }
  if (!changed) return { raw, errors };
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- same keys, each map recomposed
  return { raw: { ...raw, maps: maps as RawContent<K>['maps'] }, errors };
}

/** `revisit` with `original`'s layout placed at `at` (see the file header). */
export function composeRevisit<K extends IdSpace, M extends MapDef<K>>(
  original: MapDef<K>,
  revisit: M,
  at: GridPos,
  errors: string[],
): M {
  const where = `[revisit] maps.${revisit.id}`;
  const [ax, ay] = at;
  const { cols, rows } = revisit.size;
  const o = original.size;
  if (!fitsCentred(ax, cols, o.cols) || !fitsCentred(ay, rows, o.rows)) {
    errors.push(
      `${where}.revisitAt: (${ax},${ay}) doesn't centre '${original.id}' (${o.cols}×${o.rows}) ` +
        `in ${cols}×${rows}; centred is (${centre(cols, o.cols)},${centre(rows, o.rows)})`,
    );
    return revisit;
  }
  const inFoot = (c: number, r: number): boolean =>
    c >= ax && r >= ay && c < ax + o.cols && r < ay + o.rows;
  const tiles = overlay(revisit.tiles, original.tiles, at, inFoot, `${where}.tiles`, errors);
  const terraces =
    revisit.terraces === undefined && original.terraces === undefined
      ? undefined
      : overlay(
          revisit.terraces ?? band(cols, rows, inFoot),
          original.terraces ?? band(o.cols, o.rows, () => false),
          at,
          inFoot,
          `${where}.terraces`,
          errors,
        );
  const shift = ([c, r]: GridPos): GridPos => [c + ax, r + ay];
  const routeIds = new Set<string>();
  for (const r of [
    ...original.paths,
    ...(original.airLanes ?? []),
    ...(original.riftLanes ?? []),
  ]) {
    routeIds.add(r.id);
  }
  const own = (id: string, w: string): void => {
    if (routeIds.has(id)) errors.push(`${where}.${w}: route id '${id}' is the original's`);
  };
  revisit.paths.forEach((p, i) => own(p.id, `paths[${i}]`));
  (revisit.airLanes ?? []).forEach((p, i) => own(p.id, `airLanes[${i}]`));
  (revisit.riftLanes ?? []).forEach((p, i) => own(p.id, `riftLanes[${i}]`));
  const markers = { ...shiftKeys(original.markers, shift) };
  for (const [id, pos] of Object.entries(revisit.markers ?? {})) {
    if (Object.hasOwn(markers, id)) errors.push(`${where}.markers.${id}: the original's marker`);
    markers[id] = pos;
  }
  return {
    ...revisit,
    tiles,
    ...(terraces === undefined ? {} : { terraces }),
    paths: [
      ...original.paths.map((p) => Object.assign({}, p, { tiles: p.tiles.map(shift) })),
      ...revisit.paths,
    ],
    airLanes: [
      ...(original.airLanes ?? []).map((p) =>
        Object.assign({}, p, { points: p.points.map(shift) }),
      ),
      ...(revisit.airLanes ?? []),
    ],
    riftLanes: [
      ...(original.riftLanes ?? []).map((p) => Object.assign({}, p, { tiles: p.tiles.map(shift) })),
      ...(revisit.riftLanes ?? []),
    ],
    markers,
    underWreckage: mergeKeyed(
      original.underWreckage,
      revisit.underWreckage,
      shift,
      `${where}.underWreckage`,
      errors,
    ),
    salvage: mergeKeyed(original.salvage, revisit.salvage, shift, `${where}.salvage`, errors),
  };
}

/** A margin of `outer − inner` split evenly (an odd one leans either way), and inside. */
function fitsCentred(at: number, outer: number, inner: number): boolean {
  const m = outer - inner;
  return Number.isInteger(at) && m >= 0 && (at === Math.floor(m / 2) || at === Math.ceil(m / 2));
}
function centre(outer: number, inner: number): number {
  return Math.floor((outer - inner) / 2);
}

/** A `cols`×`rows` grid of '0', with `REVISIT_TILE` where `foot` holds. */
function band(cols: number, rows: number, foot: (c: number, r: number) => boolean): string[] {
  return Array.from({ length: rows }, (_row, r) =>
    Array.from({ length: cols }, (_col, c) => (foot(c, r) ? REVISIT_TILE : '0')).join(''),
  );
}

/**
 * The revisit's `outer` rows with the original's `inner` rows laid over the footprint. Every
 * footprint character must be `REVISIT_TILE` and no band character may be; a row of the wrong
 * length is left to compileMap's shape checks.
 */
function overlay(
  outer: readonly string[],
  inner: readonly string[],
  [ax, ay]: GridPos,
  inFoot: (c: number, r: number) => boolean,
  where: string,
  errors: string[],
): string[] {
  return outer.map((row, r) => {
    let out = '';
    for (let c = 0; c < row.length; c++) {
      const ch = row.charAt(c);
      if (inFoot(c, r)) {
        if (ch !== REVISIT_TILE) {
          errors.push(
            `${where}[${r}][${c}]: is '${ch}', but the original's footprint is '${REVISIT_TILE}'`,
          );
        }
        out += inner[r - ay]?.charAt(c - ax) ?? ch;
      } else {
        if (ch === REVISIT_TILE) {
          errors.push(`${where}[${r}][${c}]: '${REVISIT_TILE}' outside the original's footprint`);
        }
        out += ch;
      }
    }
    return out;
  });
}

function shiftKeys(
  rec: Readonly<Record<string, GridPos>> | undefined,
  shift: (p: GridPos) => GridPos,
): Record<string, GridPos> {
  const out: Record<string, GridPos> = {};
  for (const [id, pos] of Object.entries(rec ?? {})) out[id] = shift(pos);
  return out;
}

/** The original's tile-keyed record with its keys moved, then the revisit's (no key twice). */
function mergeKeyed<T>(
  original: Readonly<Partial<Record<TileKey, T>>> | undefined,
  revisit: Readonly<Partial<Record<TileKey, T>>> | undefined,
  shift: (p: GridPos) => GridPos,
  where: string,
  errors: string[],
): Partial<Record<TileKey, T>> {
  const out: Partial<Record<TileKey, T>> = {};
  for (const [key, v] of Object.entries<T | undefined>(original ?? {})) {
    const pos = parsed(key);
    if (pos === null || v === undefined) continue; // validate's [wreckage] reports a bad key
    const [c, r] = shift(pos);
    out[`${c},${r}`] = v;
  }
  for (const [key, v] of Object.entries<T | undefined>(revisit ?? {})) {
    const pos = parsed(key);
    if (pos === null || v === undefined) continue;
    const k: TileKey = `${pos[0]},${pos[1]}`;
    if (Object.hasOwn(out, k)) errors.push(`${where}.${key}: the original's tile`);
    out[k] = v;
  }
  return out;
}

/** A `"col,row"` key's tile, or null. */
function parsed(key: string): GridPos | null {
  const m = /^(\d+),(\d+)$/.exec(key);
  return m === null ? null : [Number(m[1]), Number(m[2])];
}
