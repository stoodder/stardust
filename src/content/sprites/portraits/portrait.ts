// Shared portrait builder (art-direction § Portraits and icons, tech-spec § Portraits): 48×48
// dialogue portraits shown 1:1, as a base frame plus expression patches and talking mouth frames.
// A portrait file paints whole frames with a function; this module turns them into a base grid
// plus patches (only the pixels an expression or mouth changes), names the frames, and adds the
// talk (and, for comms screens, scanline) animations. Deterministic and pure.
import { defineSprite } from '../defineSprite.ts';
import type { CharGrid } from '../helpers.ts';
import type { AnimDef, CustomChar, FrameDef, PaletteId, PatchFrame, SpriteDef } from '../types.ts';
import type { ColorName } from '../../palettes/master.ts';

/** Portraits are authored at their display size (art-direction § Sizes). */
export const PORTRAIT_SIZE = 48;

/** The five expressions every portrait has (style-guide §5.2). */
export const BASE_EXPRESSIONS = ['neutral', 'happy', 'worried', 'angry', 'sad'] as const;
export type BaseExpression = (typeof BASE_EXPRESSIONS)[number];

/** Mouth state of a frame: `closed` (the expression itself) or `talk` (the open mouth). */
export type Mouth = 'closed' | 'talk';

/**
 * A portrait frame's name: `[<variant>.]<expression>[_talk]`, plus `_scan` for a comms screen's
 * second scanline phase (`neutral`, `happy_talk`, `party_hat.policy`, `neutral_scan`).
 */
export function portraitFrame(
  expression: string,
  opts: { readonly variant?: string | null; readonly mouth?: Mouth; readonly scan?: boolean } = {},
): string {
  const prefix = opts.variant === undefined || opts.variant === null ? '' : `${opts.variant}.`;
  const suffix = opts.mouth === 'talk' ? '_talk' : opts.scan === true ? '_scan' : '';
  return `${prefix}${expression}${suffix}`;
}

/** The talk animation's name for an expression: `[<variant>.]talk_<expression>`. */
export function portraitTalkAnim(expression: string, variant: string | null = null): string {
  return `${variant === null ? '' : `${variant}.`}talk_${expression}`;
}

/** A comms screen's idle (scanline flicker) animation: `[<variant>.]idle_<expression>`. */
export function portraitIdleAnim(expression: string, variant: string | null = null): string {
  return `${variant === null ? '' : `${variant}.`}idle_${expression}`;
}

/** The mouth flaps at this rate while text types (art-direction § Dialogue presentation). */
export const TALK_FPS = 8;
/** A comms screen's 2-frame scanline flicker. */
export const SCAN_FPS = 4;

/** What a painter is asked to draw. */
export interface PaintArgs {
  readonly expression: string;
  /** A portrait variant (an alternate base, art-direction § Portrait roster), or null. */
  readonly variant: string | null;
  readonly mouth: Mouth;
  /** Comms screens: the second scanline phase. */
  readonly scan: boolean;
}

export interface PortraitSpec<Id extends string> {
  readonly id: Id;
  readonly palette: PaletteId;
  readonly legend: Readonly<Partial<Record<CustomChar, ColorName>>>;
  /** The base expressions plus this speaker's extras (`policy`). */
  readonly expressions: readonly string[];
  /** Portrait variants painted with every expression (`party_hat`). */
  readonly variants?: readonly string[];
  /** Comms screens bake a `_scan` frame per expression and an idle flicker anim. */
  readonly scanlines?: boolean;
  readonly paint: (args: PaintArgs) => CharGrid;
  /** Extra frames and anims (QUILL's `policy_flash`), given the painter's rows. */
  readonly extra?: (paint: (args: PaintArgs) => readonly string[]) => {
    readonly frames: Readonly<Record<string, FrameDef>>;
    readonly anims?: Readonly<Record<string, AnimDef>>;
  };
}

/**
 * The patch that turns `base` into `target`: the changed pixels' bounding box, with a space
 * (keep) wherever the two agree. `null` when they are identical.
 */
export function diffPatch(
  base: readonly string[],
  target: readonly string[],
): { x: number; y: number; rows: string[] } | null {
  let x0 = Infinity;
  let x1 = -1;
  let y0 = Infinity;
  let y1 = -1;
  target.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row.charAt(x) !== base[y]?.charAt(x)) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y);
      }
    }
  });
  if (x1 < 0) return null;
  const rows: string[] = [];
  for (let y = y0; y <= y1; y++) {
    let r = '';
    for (let x = x0; x <= x1; x++) {
      const ch = target[y]?.charAt(x) ?? '.';
      r += ch === base[y]?.charAt(x) ? ' ' : ch;
    }
    rows.push(r);
  }
  return { x: x0, y: y0, rows };
}

/** A patch frame from `from` to `target`, or a no-op patch when they are identical. */
function patchFrom(from: string, base: readonly string[], target: readonly string[]): PatchFrame {
  const p = diffPatch(base, target);
  return { from, patch: p ?? { x: 0, y: 0, rows: [' '] } };
}

/**
 * Rings the opaque pixels with a hand outline (`x`), 4-adjacent like the baker's `auto`, but
 * inside the frame: a bust cut by the frame's bottom edge gets no outline along the cut.
 */
export function outlineInPlace(g: CharGrid): void {
  const h = g.length;
  const solid = (x: number, y: number): boolean => {
    const ch = g[y]?.[x];
    return ch !== undefined && ch !== '.' && ch !== 'x' && ch !== '_';
  };
  const marks: [number, number][] = [];
  for (let y = 0; y < h; y++) {
    const row = g[y] ?? [];
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '.') continue;
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) {
        marks.push([x, y]);
      }
    }
  }
  for (const [x, y] of marks) {
    const row = g[y];
    if (row !== undefined) row[x] = 'x';
  }
}

/** The paint arguments for an expression at rest. */
function closed(expression: string, variant: string | null): PaintArgs {
  return { expression, variant, mouth: 'closed', scan: false };
}

/**
 * Declares a portrait: the default `neutral` is a full grid; every other expression is a patch
 * over its variant's `neutral`, a variant's `neutral` a patch over the default `neutral`, and each
 * talk (and scan) frame a patch over its expression. Talk anims alternate closed and open mouths.
 *
 * Painting is lazy (T766): the frames are painted the first time `frames` or `anims` is read (a
 * dialogue line's portrait, the gallery, a test), not when the module loads, so a boot that shows
 * no portrait paints none (~0.2 s of a boot's CPU). Once painted, the def keeps them.
 */
export function definePortrait<const Id extends string>(spec: PortraitSpec<Id>): SpriteDef<Id> {
  let painted: Painted | null = null;
  const frameSet = (): Painted => (painted ??= paintAll(spec));
  return defineSprite({
    id: spec.id,
    size: { w: PORTRAIT_SIZE, h: PORTRAIT_SIZE },
    // Portraits sit in a panel, not on the map: the anchor is the frame's bottom center.
    anchor: { x: PORTRAIT_SIZE / 2, y: PORTRAIT_SIZE },
    palette: spec.palette,
    outline: 'none',
    legend: spec.legend,
    get frames() {
      return frameSet().frames;
    },
    get anims() {
      return frameSet().anims;
    },
  });
}

/** A portrait's painted frames and anims. */
interface Painted {
  readonly frames: Readonly<Record<string, FrameDef>>;
  readonly anims: Readonly<Record<string, AnimDef>>;
}

/** Paints every frame and anim of a portrait (definePortrait's lazy half). */
function paintAll<const Id extends string>(spec: PortraitSpec<Id>): Painted {
  const cache = new Map<string, readonly string[]>();
  const paint = (args: PaintArgs): readonly string[] => {
    const key = `${args.variant ?? ''}|${args.expression}|${args.mouth}|${String(args.scan)}`;
    let r = cache.get(key);
    if (r === undefined) {
      const g = spec.paint(args);
      if (g.length !== PORTRAIT_SIZE || g.some((row) => row.length !== PORTRAIT_SIZE)) {
        throw new Error(`${spec.id}: painted ${key} is not ${PORTRAIT_SIZE}×${PORTRAIT_SIZE}`);
      }
      r = g.map((row) => row.join(''));
      cache.set(key, r);
    }
    return r;
  };
  const frames: Record<string, FrameDef> = {};
  const anims: Record<string, AnimDef> = {};
  const scan = spec.scanlines === true;
  for (const variant of [null, ...(spec.variants ?? [])]) {
    const neutralName = portraitFrame('neutral', { variant });
    const neutral = paint(closed('neutral', variant));
    frames[neutralName] =
      variant === null ? neutral : patchFrom('neutral', paint(closed('neutral', null)), neutral);
    for (const expression of spec.expressions) {
      const name = portraitFrame(expression, { variant });
      const rowsClosed = paint(closed(expression, variant));
      if (expression !== 'neutral') frames[name] = patchFrom(neutralName, neutral, rowsClosed);
      const talk = portraitFrame(expression, { variant, mouth: 'talk' });
      frames[talk] = patchFrom(
        name,
        rowsClosed,
        paint({ expression, variant, mouth: 'talk', scan }),
      );
      anims[portraitTalkAnim(expression, variant)] = { frames: [name, talk], fps: TALK_FPS };
      if (scan) {
        const scanName = portraitFrame(expression, { variant, scan: true });
        frames[scanName] = patchFrom(
          name,
          rowsClosed,
          paint({ expression, variant, mouth: 'closed', scan: true }),
        );
        anims[portraitIdleAnim(expression, variant)] = { frames: [name, scanName], fps: SCAN_FPS };
      }
    }
  }
  const extra = spec.extra?.(paint);
  return { frames: { ...frames, ...extra?.frames }, anims: { ...anims, ...extra?.anims } };
}
