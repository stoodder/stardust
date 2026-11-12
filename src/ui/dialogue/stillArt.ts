// A code-generated still in the DOM (the finale's, T843; the prelude's, T1001): bakes one frame of a
// sprite definition kept out of the boot atlas into a data URL the first time it is asked for, and
// keeps it. Only the lazy chunks that draw such stills import their definitions (the finale's
// screens, the prelude's stage), so the stills never reach the boot atlas or the initial JS. Show
// the URL 1:1 at 2× on the 640×360 stage, pixelated.
import { PALETTES } from '../../content/palettes/index.ts';
import type { SpriteDef } from '../../content/sprites/types.ts';
import {
  bakeSprite,
  DEFAULT_VARIANT,
  frameKey,
  type BakedSprite,
} from '../../render/sprites/bake.ts';
import { imageToCanvas } from '../../render/sprites/canvas.ts';

/** A baked still: its data URL and size in authored px (320×180 for most). */
export interface StillArt {
  readonly url: string;
  readonly w: number;
  readonly h: number;
}

const sprites = new Map<string, BakedSprite>();
const urls = new Map<string, StillArt | null>();

/**
 * One frame of still `def` as a data URL (painted and baked on first use, then cached by the
 * still's id), or null when the still has no such frame.
 */
export function stillArt(def: SpriteDef, frame: string): StillArt | null {
  const cacheKey = `${def.id}|${frame}`;
  const hit = urls.get(cacheKey);
  if (hit !== undefined) return hit;
  let baked = sprites.get(def.id);
  if (baked === undefined) {
    baked = bakeSprite(def, PALETTES);
    sprites.set(def.id, baked);
  }
  const key = frameKey(def.id, DEFAULT_VARIANT, frame);
  const f = baked.frames.find((b) => b.key === key);
  const out =
    f === undefined
      ? null
      : { url: imageToCanvas(f.image).toDataURL(), w: f.image.w, h: f.image.h };
  urls.set(cacheKey, out);
  return out;
}
