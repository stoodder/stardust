// Content names sprites by string id; the SpriteSource wants the registry's SpriteId union. These
// helpers resolve an id once (at spawn, never per frame) and answer the few questions views ask
// of a sprite definition: does a tower head aim, and which idle anim does it play otherwise?
import { SPRITES, type SpriteId } from '../../content/sprites/index.ts';
import type { SpriteDef } from '../../content/sprites/types.ts';

const BY_ID: ReadonlyMap<string, SpriteDef> = new Map(SPRITES.map((d) => [d.id, d]));

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
