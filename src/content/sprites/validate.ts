// Sprite data validation (tech-spec § Format rules): ids, grids, patches, mirrors, anims, legend
// colors, and palette references. Pure; errors name the sprite, frame, row, and column.
import { MASTER } from '../palettes/master.ts';
import { isCustomChar, KEEP, STANDARD_LEGEND, TRANSPARENT } from './legend.ts';
import {
  SPRITE_CATEGORIES,
  type FrameDef,
  type PaletteId,
  type Patch,
  type PatchFrame,
  type SpriteDef,
} from './types.ts';

const FACING_SWAP: Readonly<Record<string, string>> = { se: 'sw', sw: 'se', ne: 'nw', nw: 'ne' };

/**
 * Mirrors a frame or anim name by swapping its facing token (`se`↔`sw`, `ne`↔`nw`, as a whole
 * `_`-separated token): `walk_se_0` → `walk_sw_0`. `null` if the name has no facing token.
 */
export function mirrorName(name: string): string | null {
  const parts = name.split('_');
  const i = parts.findIndex((p) => p in FACING_SWAP);
  if (i < 0) return null;
  parts[i] = FACING_SWAP[parts[i] ?? ''] ?? '';
  return parts.join('_');
}

/** A patch frame's patches as a list. */
export function patchList(fd: PatchFrame): readonly Patch[] {
  return 'x' in fd.patch ? [fd.patch] : fd.patch;
}

const ID_RE = /^([a-z]+)\.[a-z0-9_]+(\.[a-z0-9_]+)*$/;

function isGrid(fd: FrameDef): fd is readonly string[] {
  return Array.isArray(fd);
}

/** Every problem with the sprite definitions; empty when all are well-formed. */
export function validateSprites(
  defs: readonly SpriteDef[],
  paletteIds: readonly PaletteId[],
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const def of defs) {
    if (seen.has(def.id)) errors.push(`${def.id}: duplicate sprite id`);
    seen.add(def.id);
    errors.push(...validateSprite(def, paletteIds));
  }
  return errors;
}

/** Every problem with one sprite definition. */
export function validateSprite(def: SpriteDef, paletteIds: readonly PaletteId[]): string[] {
  const errs: string[] = [];
  const id = def.id;
  const m = ID_RE.exec(id);
  if (m === null) errs.push(`${id}: id must be '<category>.<snake_case>'`);
  else if (!(SPRITE_CATEGORIES as readonly string[]).includes(m[1] ?? '')) {
    errs.push(`${id}: unknown category '${m[1] ?? ''}'`);
  }
  const { w, h } = def.size;
  if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1) {
    errs.push(`${id}: size must be positive integers`);
  }
  for (const [what, p] of [
    ['anchor', def.anchor],
    ['mount', def.mount],
  ] as const) {
    if (p === undefined) continue;
    if (
      !Number.isInteger(p.x) ||
      !Number.isInteger(p.y) ||
      p.x < 0 ||
      p.y < 0 ||
      p.x > w ||
      p.y > h
    ) {
      errs.push(`${id}: ${what} (${p.x}, ${p.y}) must be whole pixels inside ${w}×${h}`);
    }
  }
  for (const p of [def.palette, ...(def.variants ?? [])]) {
    if (!paletteIds.includes(p)) errs.push(`${id}: unknown palette '${p}'`);
  }
  for (const [ch, color] of Object.entries(def.legend ?? {})) {
    if (!isCustomChar(ch)) errs.push(`${id}: legend key '${ch}' must be A–Z`);
    if (color === undefined || !(color in MASTER))
      errs.push(`${id}: legend '${ch}' is not a master color`);
  }
  if (def.glow !== undefined && (!Number.isInteger(def.glow.radius) || def.glow.radius < 1)) {
    errs.push(`${id}: glow radius must be a positive integer`);
  }

  const legal = (ch: string): boolean =>
    ch === TRANSPARENT ||
    ch in STANDARD_LEGEND ||
    (isCustomChar(ch) && def.legend?.[ch] !== undefined);
  const frameNames = new Set(Object.keys(def.frames));
  if (frameNames.size === 0) errs.push(`${id}: has no frames`);
  for (const [name, fd] of Object.entries(def.frames)) {
    const where = `${id} frame '${name}'`;
    if (isGrid(fd)) {
      if (fd.length !== h) errs.push(`${where}: has ${fd.length} rows, expected ${h}`);
      fd.forEach((row, y) => {
        if (row.length !== w) errs.push(`${where}: row ${y} is ${row.length} wide, expected ${w}`);
        row.split('').forEach((ch, x) => {
          if (!legal(ch)) errs.push(`${where}: row ${y} col ${x}: '${ch}' is not in the legend`);
        });
      });
    } else if ('mirrorOf' in fd) {
      if (!frameNames.has(fd.mirrorOf))
        errs.push(`${where}: mirrorOf unknown frame '${fd.mirrorOf}'`);
    } else {
      if (!frameNames.has(fd.from)) errs.push(`${where}: from unknown frame '${fd.from}'`);
      const patches = patchList(fd);
      for (const p of patches) {
        p.rows.forEach((row, dy) => {
          row.split('').forEach((ch, dx) => {
            const x = p.x + dx;
            const y = p.y + dy;
            if (x < 0 || y < 0 || x >= w || y >= h)
              errs.push(`${where}: patch pixel (${x}, ${y}) is outside ${w}×${h}`);
            if (ch !== KEEP && !legal(ch))
              errs.push(`${where}: patch row ${dy} col ${dx}: '${ch}' is not in the legend`);
          });
        });
      }
    }
  }
  errs.push(...frameCycles(def));

  const mirrored = new Set<string>();
  const anims = def.anims ?? {};
  for (const [name, anim] of Object.entries(anims)) {
    if (!('mirrorOf' in anim)) continue;
    const src = anims[anim.mirrorOf];
    if (src === undefined || 'mirrorOf' in src) {
      errs.push(`${id} anim '${name}': mirrorOf '${anim.mirrorOf}' must be an authored anim`);
      continue;
    }
    for (const f of src.frames) {
      const mn = mirrorName(f);
      if (mn === null)
        errs.push(`${id} anim '${name}': frame '${f}' has no facing token to mirror`);
      else if (frameNames.has(mn))
        errs.push(`${id} anim '${name}': mirrored frame '${mn}' is also authored`);
      else mirrored.add(mn);
    }
  }
  for (const [name, anim] of Object.entries(anims)) {
    if ('mirrorOf' in anim) continue;
    if (!(anim.fps > 0)) errs.push(`${id} anim '${name}': fps must be positive`);
    if (anim.frames.length === 0) errs.push(`${id} anim '${name}': has no frames`);
    for (const f of anim.frames) {
      if (!frameNames.has(f) && !mirrored.has(f))
        errs.push(`${id} anim '${name}': unknown frame '${f}'`);
    }
  }
  return errs;
}

function frameCycles(def: SpriteDef): string[] {
  const errs: string[] = [];
  for (const start of Object.keys(def.frames)) {
    const path = new Set<string>();
    let cur: string | undefined = start;
    while (cur !== undefined) {
      if (path.has(cur)) {
        errs.push(`${def.id} frame '${start}': reference cycle`);
        break;
      }
      path.add(cur);
      const fd: FrameDef | undefined = def.frames[cur];
      cur = fd === undefined || isGrid(fd) ? undefined : 'mirrorOf' in fd ? fd.mirrorOf : fd.from;
    }
  }
  return errs;
}
