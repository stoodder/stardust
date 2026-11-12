// The finale's stills in the DOM (T843; art-direction § 6, *The finale's stills*): one frame of
// `scene.dawn`, `scene.wayside`, or `scene.orbit` as a data URL, baked on first use and kept
// (stillArt.ts). Only the finale's chunk imports this (the Dawn's staging, the epilogue's last
// screen), so the stills never reach the boot atlas or the initial JS. Show the URL 1:1 at 2×
// (640×360), pixelated.
import { finaleSceneDef, type FinaleSceneId } from '../../content/sprites/scenes/finale.ts';
import { stillArt, type StillArt } from './stillArt.ts';

/** A baked still: its data URL and size in authored px (320×180). */
export type FinaleSceneArt = StillArt;

/**
 * One frame of a finale still as a data URL (painted and baked on first use, then cached), or null
 * when the still has no such frame. Frames: `scene.dawn` `dawn` / `mote` / `visor`;
 * `scene.wayside` `still`; `scene.orbit` `still` (and `blink_1`, its anim `blink`'s dim eye).
 */
export function finaleSceneSprite(id: FinaleSceneId, frame: string): FinaleSceneArt | null {
  return stillArt(finaleSceneDef(id), frame);
}
