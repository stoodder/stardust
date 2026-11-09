// Identity helper that keeps a sprite's literal id for the SpriteId union.
import type { SpriteDef } from './types.ts';

/** Declares a sprite definition (tech-spec §2). */
export function defineSprite<const Id extends string>(def: SpriteDef<Id>): SpriteDef<Id> {
  return def;
}
