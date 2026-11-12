// Content names sprites by string id; the SpriteSource wants the registry's SpriteId union. These
// helpers resolve an id once (at spawn, never per frame) and answer the few questions views ask
// of a sprite definition: does a tower head aim, and which idle anim does it play otherwise?
import type { SpriteId } from '../../content/sprites/index.ts';
import { hasSprite, spriteDef } from '../../content/sprites/registry.ts';

/** The live registry, read at call time (a lazy chunk's sprites register when it loads; T871). */
const BY_ID = { get: spriteDef, has: hasSprite } as const;

/** The registry id for a content sprite id. Throws on an id with no sprite (a content error). */
export function spriteId(id: string): SpriteId {
  if (!BY_ID.has(id)) throw new Error(`render: content names unknown sprite '${id}'`);
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- checked against the registry above
  return id as SpriteId;
}

/**
 * The 8×8 tell glyph (art-direction §8) for an enemy's tells: the first `icon.tell.<tell>` that's
 * registered, or null.
 */
export function tellGlyph(tells: readonly string[]): SpriteId | null {
  for (const t of tells) {
    const id = `icon.tell.${t}`;
    if (BY_ID.has(id)) return spriteId(id);
  }
  return null;
}

/** The Skittish glyph (art-direction §8): every runner's, whatever its own tells (D134). */
export const SKITTISH_GLYPH = 'icon.tell.skittish';

/**
 * A unit's tell glyph: a runner (`fleeing`) wears the Skittish glyph in place of its own tells
 * (a fleeing Hauler drops nothing, so it shows no Carrier glyph; D134), any other unit its
 * tells' first glyph (tellGlyph), or null.
 */
export function unitGlyph(tells: readonly string[], fleeing: boolean): SpriteId | null {
  return fleeing ? spriteId(SKITTISH_GLYPH) : tellGlyph(tells);
}

/** Whether a unit runs as a runner: a `fleeing`-tagged unit that doesn't hush (the Hollow). */
export function isRunner(def: { readonly hushes: boolean }, tags: readonly string[]): boolean {
  return !def.hushes && tags.includes('fleeing');
}

/** How a tower head is drawn: aimed by facing (se/sw/ne/nw frames), or an idle anim. */
export type HeadStyle = { readonly kind: 'aim' } | { readonly kind: 'idle'; readonly anim: string };

/** Heads that author an `se` frame aim; the rest play their first anim (the Sprinkler's spin). */
export function headStyle(id: SpriteId): HeadStyle {
  const def = BY_ID.get(id);
  if (def === undefined) throw new Error(`render: unknown sprite '${id}'`);
  if (Object.hasOwn(def.frames, 'se')) return { kind: 'aim' };
  const anim = Object.keys(def.anims ?? {})[0];
  if (anim === undefined) throw new Error(`render: head '${id}' neither aims nor animates`);
  return { kind: 'idle', anim };
}

/** A tower's tier-4 specialization, as the sim names it. */
export type SpecLetter = 'a' | 'b';

/**
 * The base frame a tower draws (T202d): `spec_a`/`spec_b` once specialized (tier 4), when the
 * base authors it; else its tier's `t<n>`, capped at the highest in-map tier the sprite has.
 */
export function baseFrame(id: SpriteId, tier: number, spec: SpecLetter | null): string {
  const def = BY_ID.get(id);
  if (def === undefined) throw new Error(`render: unknown sprite '${id}'`);
  if (spec !== null && Object.hasOwn(def.frames, `spec_${spec}`)) return `spec_${spec}`;
  for (let t = tier; t > 1; t--) if (Object.hasOwn(def.frames, `t${t}`)) return `t${t}`;
  return 't1';
}

/**
 * The suffix of an aiming head's frames for a tier and spec (T202d; the m2 sprite notes): a spec's
 * own head (`_spec_a`, `_spec_b`) when authored, else the tier-2+ head (`_t2`) from tier 2 when
 * authored, else none. So `se` + suffix is the frame; mirrored facings exist through the head's
 * mirrored fire anims.
 */
export function headSuffix(id: SpriteId, tier: number, spec: SpecLetter | null): string {
  const def = BY_ID.get(id);
  if (def === undefined) throw new Error(`render: unknown sprite '${id}'`);
  if (spec !== null && Object.hasOwn(def.frames, `se_spec_${spec}`)) return `_spec_${spec}`;
  if (tier >= 2 && Object.hasOwn(def.frames, 'se_t2')) return '_t2';
  return '';
}

/**
 * The idle anim an idle head plays for a spec (T430b, D123): the spec's own `<idle>_spec_<a|b>`
 * once specialized, when the head authors it (the Sprinkler's and the Lookout's), else `<idle>`.
 */
export function idleAnim(id: SpriteId, idle: string, spec: SpecLetter | null): string {
  if (spec === null) return idle;
  const name = `${idle}_spec_${spec}`;
  return hasAnim(id, name) ? name : idle;
}

/** Whether a sprite authors a frame named `frame` (mirrored frames from anims aren't counted). */
export function hasFrame(id: SpriteId, frame: string): boolean {
  const def = BY_ID.get(id);
  return def !== undefined && Object.hasOwn(def.frames, frame);
}

/** Whether a sprite bakes the palette variant `palette` (its `variants`). */
export function hasPaletteVariant(id: SpriteId, palette: string): boolean {
  return BY_ID.get(id)?.variants?.some((v) => v === palette) === true;
}

/** Whether a sprite authors (or mirrors) an anim named `anim`. */
export function hasAnim(id: SpriteId, anim: string): boolean {
  const def = BY_ID.get(id);
  return def?.anims !== undefined && Object.hasOwn(def.anims, anim);
}

/** A sprite's first authored frame and first anim (null for a single still frame). */
export function firstLook(id: SpriteId): { readonly frame: string; readonly anim: string | null } {
  const def = BY_ID.get(id);
  const frame = def === undefined ? undefined : Object.keys(def.frames)[0];
  if (def === undefined || frame === undefined) throw new Error(`render: unknown sprite '${id}'`);
  return { frame, anim: Object.keys(def.anims ?? {})[0] ?? null };
}

/** The four diagonal facings (art/tech-spec.md § Format rules). */
export type Facing = 'se' | 'sw' | 'ne' | 'nw';

/**
 * The facing for a move or aim of (dx, dy) in grid units. Screen x grows with dx − dy and screen
 * y with dx + dy, so "south" is down the screen. A zero vector faces SE.
 */
export function facingOf(dx: number, dy: number): Facing {
  const sx = dx - dy;
  const sy = dx + dy;
  if (sy >= 0) return sx >= 0 ? 'se' : 'sw';
  return sx >= 0 ? 'ne' : 'nw';
}

/** The sprite a unit with the `youngling` wave tag draws (art-direction §6, D074). */
export const YOUNGLING_SPRITE = 'enemy.youngling';

/**
 * The body sprite an enemy draws: `enemy.youngling` for a `youngling`-tagged unit (the Quiet
 * Wave's little ones, an Elder's brood), else its def's own body; then, for a `fleeing`-tagged
 * runner, that body's fleeing look (`<body>_fleeing`: ears flat, the glance back, the panic hop;
 * T440a, content/sprites/enemies/flee.ts) where one is drawn.
 */
export function enemyBody(body: string, tags: readonly string[]): string {
  const own = tags.includes('youngling') ? YOUNGLING_SPRITE : body;
  if (!tags.includes('fleeing')) return own;
  const fleeing = `${own}_fleeing`;
  return BY_ID.has(fleeing) ? fleeing : own;
}
