// The finale's stills (T843; art-direction § 6, *The finale's stills*): the Dawn and the two final
// images by ending. They are not in SPRITES (sprites/index.ts), so neither the boot atlas nor the
// initial JS carries them: only the finale's lazy chunk imports this module (the Dawn's staging and
// the epilogue's last screen), and `ui/dialogue/finaleSceneArt.ts` bakes a frame into a data URL
// the first time one is shown. The gallery shows them as cards (app/gallery.ts).
import type { SpriteDef } from '../types.ts';
import { sceneDawn } from './dawn.ts';
import { sceneOrbit } from './orbit.ts';
import { sceneWayside } from './wayside.ts';

export { sceneDawn, sceneOrbit, sceneWayside };

/** Every finale still, in the order they show. */
export const FINALE_SCENE_SPRITES = [sceneDawn, sceneWayside, sceneOrbit] as const;

/** A finale still's id. */
export type FinaleSceneId = (typeof FINALE_SCENE_SPRITES)[number]['id'];

/** The Dawn's frames, one per beat (finale.md § FIN, `fin_m01_scene_dawn`). */
export const DAWN_FRAMES = ['dawn', 'mote', 'visor'] as const;

/** The final image's still by ending (C5's answer): Wayside for Stay, the orbit for Go. */
export const ENDING_STILL: Readonly<Record<'stay' | 'go', FinaleSceneId>> = {
  stay: 'scene.wayside',
  go: 'scene.orbit',
};

/** A finale still's definition by id. */
export function finaleSceneDef(id: FinaleSceneId): SpriteDef {
  const def = FINALE_SCENE_SPRITES.find((d) => d.id === id);
  if (def === undefined) throw new Error(`no finale still '${id}'`);
  return def;
}
