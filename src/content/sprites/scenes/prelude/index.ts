// The prelude's stills (M10, "Arrival"; art-direction § 6, *The prelude's stills*): six
// code-generated stills the prelude's stage shows, one file each. Like the finale's, they are not
// in SPRITES (sprites/index.ts), so neither the boot atlas nor the initial JS carries them: only
// the prelude's lazy chunk imports this module. The gallery shows them as cards (app/gallery.ts).
import type { SpriteDef } from '../../types.ts';
import { sceneDescent } from './descent.ts';
import { sceneDomeRow } from './domeRow.ts';
import { sceneFreighter } from './freighter.ts';
import { scenePreludeAd } from './preludeAd.ts';
import { sceneTouchdown } from './touchdown.ts';
import { sceneViewport } from './viewport.ts';

export { scenePreludeAd, sceneFreighter, sceneViewport };
// The descent is 320×300: the stage pans it 0 → 120 px down (`DESCENT_PAN`).
export { sceneDescent, sceneTouchdown, sceneDomeRow };
export { DESCENT_H, DESCENT_PAN } from './descent.ts';

/** Every prelude still, in the order the shots show them. */
export const PRELUDE_STILLS = [
  scenePreludeAd,
  sceneFreighter,
  sceneViewport,
  sceneDescent,
  sceneTouchdown,
  sceneDomeRow,
] as const;

/** A prelude still's id. */
export type PreludeStillId = (typeof PRELUDE_STILLS)[number]['id'];

/**
 * Each still's cue frames, in cue order (seams.md's cue table). A still may carry more frames than
 * its cues: an anim named after a cue frame (`scene.prelude_ad`'s `ad` and `small_print`, the
 * sparkles' 2 fps twinkle) plays while that frame shows, and holds its first frame under reduced
 * motion.
 */
export const PRELUDE_FRAMES: Readonly<Record<PreludeStillId, readonly string[]>> = {
  'scene.prelude_ad': ['ad', 'small_print'],
  'scene.freighter': ['cabin'],
  'scene.viewport': ['ad_on', 'ad_off'],
  'scene.descent': ['still'],
  'scene.touchdown': ['one', 'zero'],
  'scene.dome_row': ['still', 'wave', 'gerald'],
};

/** A prelude still's definition by id. */
export function preludeStillDef(id: PreludeStillId): SpriteDef {
  const def = PRELUDE_STILLS.find((d) => d.id === id);
  if (def === undefined) throw new Error(`no prelude still '${id}'`);
  return def;
}
