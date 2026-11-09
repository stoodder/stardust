// Pure sprite baker: definition × palettes → RGBA frames with stable keys (docs/art/tech-spec.md §2).
// Resolves patches and mirrors, rasterizes through each palette variant, runs the outline and glow
// passes, and adds the derived variants. No DOM, no Phaser.
import { luminance } from '../../content/palettes/color.ts';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { mirrorName, patchList } from '../../content/sprites/validate.ts';
import {
  isCustomChar,
  SLOT_CHAR,
  STANDARD_LEGEND,
  TRANSPARENT,
} from '../../content/sprites/legend.ts';
import {
  SPRITE_CATEGORIES,
  type FrameDef,
  type PaletteId,
  type Point,
  type SlotPalette,
  type SpriteCategory,
  type SpriteDef,
} from '../../content/sprites/types.ts';
import {
  applyPatch,
  colorize,
  glowPass,
  isClear,
  mirrorH,
  outlinePass,
  parseGrid,
  type ColorLookup,
  type IndexedImage,
  type Rgba,
  type RgbaImage,
} from './rasterize.ts';

/** Variant name of the sprite's default palette. */
export const DEFAULT_VARIANT = 'default';

/** Derived variants (tech-spec § What the baker produces), appended to a palette variant with `+`. */
export type DerivedVariant = 'selected' | 'jammed' | 'dark';

/** One baked frame: its pixels and where its ground point is, in its own pixels. */
export interface BakedFrame {
  readonly key: string;
  readonly image: RgbaImage;
  readonly anchor: Point;
}

export interface BakedAnim {
  readonly key: string;
  readonly frameKeys: readonly string[];
  readonly fps: number;
  readonly loop: boolean;
}

export interface BakedSprite {
  readonly id: string;
  /** Size and anchor of the default frames, after the outline pass. */
  readonly meta: { readonly w: number; readonly h: number; readonly anchor: Point };
  /** Every variant name baked: palette variants, then derived ones (`default+selected`, …). */
  readonly variants: readonly string[];
  /** Frame names in authoring order, including mirrored ones. */
  readonly frameNames: readonly string[];
  readonly frames: readonly BakedFrame[];
  readonly anims: readonly BakedAnim[];
}

/** `<spriteId>#<variant>:<frame>` (tech-spec § Naming contract). */
export function frameKey(spriteId: string, variant: string, frame: string): string {
  return `${spriteId}#${variant}:${frame}`;
}

/** `<spriteId>#<variant>:<anim>`. */
export function animKey(spriteId: string, variant: string, anim: string): string {
  return `${spriteId}#${variant}:${anim}`;
}

/** The glow frame key for a frame key. */
export function glowKey(key: string): string {
  return `${key}@glow`;
}

/** The category of a sprite id (`enemy.nibbler` → `enemy`). */
export function categoryOf(spriteId: string): SpriteCategory {
  const prefix = spriteId.slice(0, spriteId.indexOf('.'));
  const category = SPRITE_CATEGORIES.find((c) => c === prefix);
  if (category === undefined) throw new Error(`sprites: '${spriteId}' has no known category`);
  return category;
}

/**
 * Derived variants baked for a category: actors get `selected`, towers also `jammed`, and
 * portraits `dark` (an absent speaker's frame).
 */
export function derivedFor(category: SpriteCategory): readonly DerivedVariant[] {
  if (category === 'tower') return ['selected', 'jammed'];
  if (category === 'portrait') return ['dark'];
  if (category === 'enemy') return ['selected'];
  return [];
}

function isLegalFor(def: SpriteDef): (ch: string) => boolean {
  return (ch) =>
    ch === TRANSPARENT ||
    ch in STANDARD_LEGEND ||
    (isCustomChar(ch) && def.legend?.[ch] !== undefined);
}

interface ResolvedFrame {
  readonly img: IndexedImage;
  readonly mirrored: boolean;
}

/**
 * Resolves every frame of a sprite to a full grid: grids are parsed, patches applied to their
 * source, mirror frames flipped, and anim-level mirrors expanded into named frames.
 */
export function resolveFrames(def: SpriteDef): Map<string, ResolvedFrame> {
  const legal = isLegalFor(def);
  const out = new Map<string, ResolvedFrame>();
  const visiting = new Set<string>();

  const resolve = (name: string): ResolvedFrame => {
    const done = out.get(name);
    if (done !== undefined) return done;
    const fd: FrameDef | undefined = def.frames[name];
    const where = `${def.id} frame '${name}'`;
    if (fd === undefined) throw new Error(`${def.id}: unknown frame '${name}'`);
    if (visiting.has(name)) throw new Error(`${where}: reference cycle`);
    visiting.add(name);
    let r: ResolvedFrame;
    if (isGrid(fd)) {
      r = { img: parseGrid(fd, def.size.w, def.size.h, legal, where), mirrored: false };
    } else if ('mirrorOf' in fd) {
      const src = resolve(fd.mirrorOf);
      r = { img: mirrorH(src.img), mirrored: !src.mirrored };
    } else {
      const src = resolve(fd.from);
      const patches = patchList(fd);
      let img = src.img;
      for (const p of patches) img = applyPatch(img, p.x, p.y, p.rows, legal, where);
      r = { img, mirrored: src.mirrored };
    }
    visiting.delete(name);
    out.set(name, r);
    return r;
  };

  for (const name of Object.keys(def.frames)) resolve(name);
  for (const [animName, anim] of Object.entries(def.anims ?? {})) {
    if (!('mirrorOf' in anim)) continue;
    const src = def.anims?.[anim.mirrorOf];
    if (src === undefined || 'mirrorOf' in src) {
      throw new Error(
        `${def.id} anim '${animName}': mirrorOf '${anim.mirrorOf}' must be an authored anim`,
      );
    }
    for (const f of src.frames) {
      const m = mirrorName(f);
      if (m === null)
        throw new Error(`${def.id} anim '${animName}': frame '${f}' has no facing token`);
      if (def.frames[m] !== undefined) {
        throw new Error(`${def.id} anim '${animName}': mirrored frame '${m}' is also authored`);
      }
      const s = resolve(f);
      out.set(m, { img: mirrorH(s.img), mirrored: !s.mirrored });
    }
  }
  return out;
}

function isGrid(fd: FrameDef): fd is readonly string[] {
  return Array.isArray(fd);
}

function rgbaOf(name: ColorName, a = 255): Rgba {
  const c = rgbOf(name);
  return { r: c.r, g: c.g, b: c.b, a };
}

/** Ground shadow alpha (`ink.0` at 50%; tech-spec § The standard legend). */
const SHADOW_ALPHA = 128;

/** Builds the char-code → color lookup for one sprite under one palette. */
export function paletteLookup(def: SpriteDef, palette: SlotPalette): ColorLookup {
  const table = new Map<number, Rgba>();
  for (const [ch, slot] of Object.entries(STANDARD_LEGEND)) {
    table.set(ch.charCodeAt(0), rgbaOf(palette[slot], slot === 'shadow' ? SHADOW_ALPHA : 255));
  }
  for (const [ch, color] of Object.entries(def.legend ?? {})) {
    if (color !== undefined) table.set(ch.charCodeAt(0), rgbaOf(color));
  }
  return (code) => table.get(code) ?? null;
}

const OUTLINE_CODE = SLOT_CHAR.outline.charCodeAt(0);
/** Opaque for the outline pass: shadow pixels don't grow an outline. */
function isSolid(code: number): boolean {
  return !isClear(code) && code !== SHADOW_CODE;
}
const SHADOW_CODE = SLOT_CHAR.shadow.charCodeAt(0);
const STEEL: readonly Rgba[] = (
  ['steel.0', 'steel.1', 'steel.2', 'steel.3', 'steel.4'] as const
).map((n) => rgbaOf(n));
const STEEL_LUM = STEEL.map(luminance);
const SELECTED_OUTLINE = rgbaOf('white.1');
/** `dark`: the ink steps a portrait's colors fall onto, and the luminance at which each starts. */
const DARK_STEPS: readonly { readonly from: number; readonly color: Rgba }[] = [
  { from: 0.2, color: rgbaOf('ink.3') },
  { from: 0.035, color: rgbaOf('ink.2') },
  { from: 0, color: rgbaOf('ink.1') },
];
const DARK_OUTLINE = rgbaOf('ink.0');

/** The lookup for a derived variant of a palette lookup. */
export function derivedLookup(base: ColorLookup, derived: DerivedVariant): ColorLookup {
  switch (derived) {
    case 'selected':
      return (code) => (code === OUTLINE_CODE ? SELECTED_OUTLINE : base(code));
    case 'jammed':
      // Every color mapped by luminance onto the nearest step of the steel ramp; alpha kept.
      return (code) => {
        const c = base(code);
        if (c === null) return null;
        const l = luminance(c);
        let best = 0;
        STEEL_LUM.forEach((sl, i) => {
          if (Math.abs(sl - l) < Math.abs((STEEL_LUM[best] ?? 0) - l)) best = i;
        });
        const s = STEEL[best] ?? SELECTED_OUTLINE;
        return { r: s.r, g: s.g, b: s.b, a: c.a };
      };
    case 'dark':
      // Every color onto ink.1–ink.3 by luminance band (bright parts stay the lightest), alpha
      // kept; the outline goes to ink.0.
      return (code) => {
        if (code === OUTLINE_CODE) return DARK_OUTLINE;
        const c = base(code);
        if (c === null) return null;
        const l = luminance(c);
        const s = (DARK_STEPS.find((d) => l >= d.from) ?? DARK_STEPS[DARK_STEPS.length - 1])?.color;
        return s === undefined ? null : { r: s.r, g: s.g, b: s.b, a: c.a };
      };
    default: {
      const never: never = derived;
      throw new Error(`unknown derived variant ${String(never)}`);
    }
  }
}

/** Bakes every variant and frame of a sprite. Throws on malformed data, naming the sprite. */
export function bakeSprite(
  def: SpriteDef,
  palettes: Readonly<Record<PaletteId, SlotPalette>>,
): BakedSprite {
  const resolved = resolveFrames(def);
  const mode = def.outline ?? 'none';
  const pad = mode === 'none' ? 0 : 1;
  const outlined = new Map<string, { img: IndexedImage; anchor: Point }>();
  for (const [name, r] of resolved) {
    const ax = r.mirrored ? def.size.w - def.anchor.x : def.anchor.x;
    outlined.set(name, {
      img: outlinePass(r.img, mode, OUTLINE_CODE, isSolid),
      anchor: { x: ax + pad, y: def.anchor.y + pad },
    });
  }

  const paletteVariants: { name: string; palette: SlotPalette }[] = [
    { name: DEFAULT_VARIANT, palette: palettes[def.palette] },
    ...(def.variants ?? []).map((id) => ({ name: id, palette: palettes[id] })),
  ];
  const derived = derivedFor(categoryOf(def.id));
  const emissive = new Set((def.glow?.slots ?? []).map((s) => SLOT_CHAR[s].charCodeAt(0)));
  const frames: BakedFrame[] = [];
  const variants: string[] = [];
  const anims: BakedAnim[] = [];

  const addVariant = (variant: string, lookup: ColorLookup, withGlow: boolean): void => {
    variants.push(variant);
    for (const [name, o] of outlined) {
      const key = frameKey(def.id, variant, name);
      frames.push({ key, image: colorize(o.img, lookup), anchor: o.anchor });
      if (withGlow && def.glow !== undefined) {
        const r = def.glow.radius;
        frames.push({
          key: glowKey(key),
          image: glowPass(o.img, lookup, emissive, r),
          anchor: { x: o.anchor.x + r, y: o.anchor.y + r },
        });
      }
    }
    for (const [animName, anim] of Object.entries(def.anims ?? {})) {
      const src = 'mirrorOf' in anim ? def.anims?.[anim.mirrorOf] : anim;
      if (src === undefined || 'mirrorOf' in src) continue; // resolveFrames already rejected this
      const names = 'mirrorOf' in anim ? src.frames.map((f) => mirrorName(f) ?? f) : src.frames;
      for (const f of names) {
        if (!outlined.has(f)) throw new Error(`${def.id} anim '${animName}': unknown frame '${f}'`);
      }
      anims.push({
        key: animKey(def.id, variant, animName),
        frameKeys: names.map((f) => frameKey(def.id, variant, f)),
        fps: src.fps,
        loop: src.loop ?? true,
      });
    }
  };

  for (const pv of paletteVariants) {
    addVariant(pv.name, paletteLookup(def, pv.palette), true);
  }
  for (const pv of paletteVariants) {
    for (const d of derived) {
      addVariant(`${pv.name}+${d}`, derivedLookup(paletteLookup(def, pv.palette), d), false);
    }
  }

  const first = outlined.values().next().value;
  if (first === undefined) throw new Error(`${def.id}: has no frames`);
  return {
    id: def.id,
    meta: {
      w: first.img.w,
      h: first.img.h,
      anchor: { x: def.anchor.x + pad, y: def.anchor.y + pad },
    },
    variants,
    frameNames: [...outlined.keys()],
    frames,
    anims,
  };
}

/** Bakes every sprite. Throws on the first malformed definition or duplicate id. */
export function bakeAll(
  defs: readonly SpriteDef[],
  palettes: Readonly<Record<PaletteId, SlotPalette>>,
): BakedSprite[] {
  const seen = new Set<string>();
  return defs.map((def) => {
    if (seen.has(def.id)) throw new Error(`sprites: duplicate id '${def.id}'`);
    seen.add(def.id);
    return bakeSprite(def, palettes);
  });
}

/** The head mount of a tower base in outlined pixels, or `null`. */
export function mountOf(def: SpriteDef): Point | null {
  if (def.mount === undefined) return null;
  const pad = (def.outline ?? 'none') === 'none' ? 0 : 1;
  return { x: def.mount.x + pad, y: def.mount.y + pad };
}
