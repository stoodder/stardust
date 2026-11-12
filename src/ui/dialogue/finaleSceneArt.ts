// The finale's stills in the DOM (T843; art-direction § 6, *The finale's stills*): bakes one frame
// of `scene.dawn`, `scene.wayside`, or `scene.orbit` into a data URL the first time it is asked
// for, and keeps it. Only the finale's chunk imports this (the Dawn's staging, the epilogue's last
// screen), so the stills never reach the boot atlas or the initial JS. Show the URL 1:1 at 2×
// (640×360), pixelated.
import { PALETTES } from '../../content/palettes/index.ts';
import { finaleSceneDef, type FinaleSceneId } from '../../content/sprites/scenes/finale.ts';
import {
  bakeSprite,
  DEFAULT_VARIANT,
  frameKey,
  type BakedSprite,
} from '../../render/sprites/bake.ts';
import { imageToCanvas } from '../../render/sprites/canvas.ts';

/** A baked still: its data URL and size in authored px (320×180). */
export interface FinaleSceneArt {
  readonly url: string;
  readonly w: number;
  readonly h: number;
}

const sprites = new Map<FinaleSceneId, BakedSprite>();
const urls = new Map<string, FinaleSceneArt | null>();

/**
 * One frame of a finale still as a data URL (painted and baked on first use, then cached), or null
 * when the still has no such frame. Frames: `scene.dawn` `dawn` / `mote` / `visor`;
 * `scene.wayside` `still`; `scene.orbit` `still` (and `blink_1`, its anim `blink`'s dim eye).
 */
export function finaleSceneSprite(id: FinaleSceneId, frame: string): FinaleSceneArt | null {
  const cacheKey = `${id}|${frame}`;
  const hit = urls.get(cacheKey);
  if (hit !== undefined) return hit;
  let baked = sprites.get(id);
  if (baked === undefined) {
    baked = bakeSprite(finaleSceneDef(id), PALETTES);
    sprites.set(id, baked);
  }
  const key = frameKey(id, DEFAULT_VARIANT, frame);
  const f = baked.frames.find((b) => b.key === key);
  const out =
    f === undefined
      ? null
      : { url: imageToCanvas(f.image).toDataURL(), w: f.image.w, h: f.image.h };
  urls.set(cacheKey, out);
  return out;
}
