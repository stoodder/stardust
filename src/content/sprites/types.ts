// Sprite and palette data shapes (docs/art/tech-spec.md §2). Pure data: no DOM, no Phaser.
import type { ColorName } from '../palettes/master.ts';

/** A palette slot named by the standard legend. */
// prettier-ignore
export type Slot =
  | 'p0' | 'p1' | 'p2' | 'p3' | 'p4'
  | 's0' | 's1' | 's2' | 's3' | 's4'
  | 'a0' | 'a1' | 'a2' | 'a3' | 'a4'
  | 'e0' | 'e1'
  | 'outline' | 'eye' | 'hi' | 'shadow';

/** A slot palette: every slot mapped to a master color. Swapping it re-skins a sprite. */
export type SlotPalette = Readonly<Record<Slot, ColorName>>;

/** Upper-case letters available for per-sprite custom legend entries. */
// prettier-ignore
export type CustomChar =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M'
  | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z';

/** A frame authored as a full grid: `h` rows of exactly `w` legend characters. */
export type GridFrame = readonly string[];

/**
 * A frame copied from another frame with some pixels overwritten. In patch rows, `.` writes
 * transparency and a space keeps the pixel underneath.
 */
export interface PatchFrame {
  readonly from: string;
  readonly patch: Patch | readonly Patch[];
}

export interface Patch {
  readonly x: number;
  readonly y: number;
  readonly rows: readonly string[];
}

/** A frame that is another frame mirrored horizontally. */
export interface MirrorFrame {
  readonly mirrorOf: string;
}

export type FrameDef = GridFrame | PatchFrame | MirrorFrame;

/** An animation over authored frames. */
export interface FramesAnim {
  readonly frames: readonly string[];
  readonly fps: number;
  /** Loops by default; `false` plays once (deaths, bursts). */
  readonly loop?: boolean;
}

/**
 * An animation that mirrors another one. Each source frame name has its facing token swapped
 * (`se`↔`sw`, `ne`↔`nw`, as a whole `_`-separated token) to name the mirrored frame.
 */
export interface MirrorAnim {
  readonly mirrorOf: string;
}

export type AnimDef = FramesAnim | MirrorAnim;

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Outline pass: `auto` rings opaque pixels 4-adjacently, `auto8` 8-adjacently. */
export type OutlineMode = 'none' | 'auto' | 'auto8';

export interface SpriteDef<Id extends string = string> {
  /** `<category>.<id>`; the category is one of SPRITE_CATEGORIES. */
  readonly id: Id;
  /** Authored grid size, before the outline pass grows it. */
  readonly size: { readonly w: number; readonly h: number };
  /** The ground point in authored pixels, as a pixel-edge coordinate (`setDisplayOrigin`). */
  readonly anchor: Point;
  /** Default palette (baked as variant `default`). */
  readonly palette: PaletteId;
  /** Extra palette variants to bake, each named by its palette id. */
  readonly variants?: readonly PaletteId[];
  /** Default `none`. `auto`/`auto8` grow the size by 2 and the anchor by 1 in each axis. */
  readonly outline?: OutlineMode;
  /** Bakes an additive `@glow` frame per frame from these slots' pixels. */
  readonly glow?: { readonly slots: readonly Slot[]; readonly radius: number };
  /** Per-sprite legend entries mapping straight to master colors (use sparingly). */
  readonly legend?: Readonly<Partial<Record<CustomChar, ColorName>>>;
  /** Tower bases only: where the head's anchor sits, in this sprite's authored pixels. */
  readonly mount?: Point;
  readonly frames: Readonly<Record<string, FrameDef>>;
  readonly anims?: Readonly<Record<string, AnimDef>>;
}

/** Sprite id categories (the part before the first dot). */
export const SPRITE_CATEGORIES = [
  'tile',
  'prop',
  'tower',
  'enemy',
  'projectile',
  'fx',
  'icon',
  'portrait',
  'ui',
] as const;
export type SpriteCategory = (typeof SPRITE_CATEGORIES)[number];

// The palette registry's ids. Declared here (not derived from the registry) so palette files can
// import these types without a cycle; palettes/index.ts checks the registry against it.
export type FactionPaletteId =
  'everglow' | 'everglow.worn' | 'skitterkin' | 'skitterkin.ally' | 'aelari' | 'vrell' | 'hollow';
export type EnvPaletteId = 'act1' | 'act2.gold' | 'act2.dusk' | 'act3' | 'finale';
export type PaletteId = FactionPaletteId | EnvPaletteId;
