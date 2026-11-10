// The shield-recharge aura's glint (T530a; art-direction §8 `shield_aura`): pure rules, unit-tested,
// applied by ShieldAuraView.
// - **Who glints:** every unit the sim's aura pass is refilling right now (`auraRefilling`, the
//   rule of `shieldAuraPass` in sim/enemyAbilities/shieldAura.ts read from state): alive, shielded,
//   not neutral and not a boss, in reach, its shield short of full, and inside the radius of
//   another unit of its faction projecting an aura. It stops the moment its shield is whole.
// - **The glint:** light catching the glass at the top right of its shield bubble: a 5×5 star,
//   a `white.1` heart with `blue.4` arms (the aura's colour), twinkling to a 3×3 one on the sim's
//   3 Hz tell step (vfx/fxTiming.ts: holds while paused, keeps pace at 2×), offset per uid so a
//   refilled pack doesn't blink in unison; the large star, steady, under reduced motion.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { projectedAura, type Enemy } from '../../sim/index.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';
import { TELL_STEP_TICKS } from '../vfx/fxTiming.ts';

export const GLINT_HEART: ColorName = 'white.1';
export const GLINT_ARM: ColorName = 'blue.4';
export const GLINT_SIZE = 5;

/** The two glint frames: the large star (0) and the small one (1). 'H' heart, 'A' arm. */
const STARS: readonly (readonly string[])[] = [
  ['..A..', '..A..', 'AAHAA', '..A..', '..A..'],
  ['.....', '..A..', '.AHA.', '..A..', '.....'],
];

/** Glint frame `frame` (0 large, 1 small), 5×5. */
export function glintImage(frame: 0 | 1): RgbaImage {
  const w = GLINT_SIZE;
  const data = new Uint8ClampedArray(w * w * 4);
  const heart = rgbOf(GLINT_HEART);
  const arm = rgbOf(GLINT_ARM);
  const rows = STARS[frame]!; // frame is 0 or 1
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const ch = rows[y]![x]; // y, x < 5
      if (ch === '.') continue;
      const c = ch === 'H' ? heart : arm;
      const i = (y * w + x) * 4;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = 255;
    }
  }
  return { w, h: w, data };
}

/** The glint's frame at sim tick `tick` for unit `uid`; the large star under reduced motion. */
export function glintFrame(tick: number, uid: number, reducedMotion: boolean): 0 | 1 {
  if (reducedMotion) return 0;
  return Math.floor((tick + uid * 3) / TELL_STEP_TICKS) % 2 === 0 ? 0 : 1;
}

/** The enemy pool as the rule reads it. */
export interface AuraUnits {
  readonly used: number;
  readonly items: readonly DeepReadonly<Enemy>[];
}

/**
 * Whether the aura pass is refilling `a` (slot `slot` of `pool`) now. `sources` holds the slots of
 * the units projecting an aura (`projectedAura`), the first `n` of them.
 */
export function auraRefilling(
  pool: AuraUnits,
  slot: number,
  sources: Int32Array,
  n: number,
): boolean {
  const a = pool.items[slot];
  const d = a?.def ?? null;
  if (a === undefined || d === null || !a.alive || d.shield === null) return false;
  if (d.neutral || d.boss !== null || a.burrowed || a.phased || a.leaving) return false;
  if (a.shieldHp >= d.shield.hp) return false;
  for (let s = 0; s < n; s++) {
    const k = sources[s]!; // s < n ≤ length
    if (k === slot) continue; // not itself
    const src = pool.items[k]!; // a source slot < used
    const aura = projectedAura(src);
    if (aura === null || src.def!.faction !== d.faction) continue; // projectedAura checked def
    const dx = a.x - src.x;
    const dy = a.y - src.y;
    if (dx * dx + dy * dy <= aura.radiusSq) return true;
  }
  return false;
}
