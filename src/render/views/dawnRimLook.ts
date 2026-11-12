// Dawn's light on the actors, the pure part (art-direction.md §3 *Finale*: at Dawn "highlights go
// gold and cyan"; M9, T901). DawnRimView draws it.
//
// Actors keep their faction palettes in every light (§3, D134): the morning never recolours a
// sprite. It edges them: once the sun's front has passed an actor (songNightPixels `isSunlit`), it
// wears two 1 px rims, each a fill-tinted copy of its frame shoved a pixel toward a light and sorted
// just under it, so only the edge shows outside its outline: **gold** on its east side, toward the
// sun (`gold.4`), and **cyan** along its top, the morning sky's light (`teal.4`, fainter). The held
// Unsung's song-side rim (UnsungView) is the same grammar.
import type { ColorName } from '../../content/palettes/master.ts';

/** One of Dawn's rims: its colour, its offset from the body (screen px), its share of its alpha. */
export interface DawnRim {
  readonly color: ColorName;
  readonly dx: number;
  readonly dy: number;
  readonly alpha: number;
}

/** The sun's rim (east: grid +x is screen right), then the sky's (from above). */
export const DAWN_RIMS: readonly DawnRim[] = [
  { color: 'gold.4', dx: 1, dy: 0, alpha: 0.9 },
  { color: 'teal.4', dx: 0, dy: -1, alpha: 0.55 },
];

/** The most actors one frame rims (the finale's towers, heads, choir and stragglers fit). */
export const MAX_DAWN_RIMMED = 160;

/** How far under its body a rim sorts (the held Unsung's RIM_UNDER). */
export const DAWN_RIM_UNDER = 1e-5;

/** What DawnRimView reads of a game object in `world` or `air` to choose whether it is an actor. */
export interface RimCandidate {
  readonly visible: boolean;
  readonly alpha: number;
  /** Phaser's blend mode (0: normal). */
  readonly blendMode: number | string;
  /** Phaser's tint mode (0: multiply; a fill-tinted copy is someone's rim). */
  readonly tintMode: number;
  /** Its frame's name (a baked `@glow` frame is light, not a body). */
  readonly frameName: string;
  /** Whether it is scenery (scenery.ts: the grade's, not an actor). */
  readonly scenery: boolean;
}

/**
 * Whether a drawn object is an actor Dawn rims: a visible, opaque-enough body drawn normally, not
 * scenery, not a glow, and not itself a rim (a fill-tinted copy: EnemyDress's, UnsungView's, ours).
 */
export function takesDawnRim(o: RimCandidate): boolean {
  return (
    o.visible &&
    o.alpha > 0.2 &&
    (o.blendMode === 0 || o.blendMode === 'NORMAL') &&
    o.tintMode === 0 &&
    !o.scenery &&
    !o.frameName.endsWith('@glow')
  );
}
