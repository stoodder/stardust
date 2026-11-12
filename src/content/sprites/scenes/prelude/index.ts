// The prelude's stills (M10, "Arrival"; art-direction § 6, *The prelude's stills*): six
// code-generated stills the prelude's stage shows, one file each. Like the finale's, they are not
// in SPRITES (sprites/index.ts), so neither the boot atlas nor the initial JS carries them: only
// the prelude's lazy chunk imports this module. The gallery shows them as cards (app/gallery.ts).
import type { SpriteDef } from '../../types.ts';
import { defineSprite } from '../../defineSprite.ts';
import { sceneFreighter } from './freighter.ts';
import { scenePreludeAd } from './preludeAd.ts';
import { sceneViewport } from './viewport.ts';

/**
 * A placeholder still: one flat ink fill per frame, painted on first read. Each art owner replaces
 * its entries with the real still (T1002: ad, freighter, viewport; T1003: descent, touchdown,
 * dome row).
 */
function placeholder<const Id extends string>(
  id: Id,
  frameNames: readonly string[],
  h = 180,
): SpriteDef<Id> {
  let painted: Readonly<Record<string, readonly string[]>> | null = null;
  return defineSprite({
    id,
    size: { w: 320, h },
    anchor: { x: 160, y: h },
    palette: 'act1',
    outline: 'none',
    legend: { A: 'ink.0' },
    get frames() {
      painted ??= Object.fromEntries(
        frameNames.map((f) => [f, Array.from({ length: h }, () => 'A'.repeat(320))]),
      );
      return painted;
    },
  });
}

export { scenePreludeAd, sceneFreighter, sceneViewport };
// TODO(T1003): real art (the descent is 320×300; the stage pans 0 → 120 px down).
export const sceneDescent = placeholder('scene.descent', ['still'], 300);
export const sceneTouchdown = placeholder('scene.touchdown', ['one', 'zero']);
export const sceneDomeRow = placeholder('scene.dome_row', ['still', 'wave', 'gerald']);

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
