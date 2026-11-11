// An enemy's small health bar (art-direction §8, *Health bars*): 2 px tall and up to 16 px wide,
// over the body, shown only while the enemy is damaged or hovered. HP is `green.3` on an `ink.1`
// track with a 1 px `ink.1` frame round it (so a full green bar still reads on Act I's grass); a
// shield is `blue.4` segments right after the HP. A boss has its own bar at the top of
// the screen (BossBarView), never this one. Pure, so the layout is unit-tested; EnemyView draws it.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';
import { barFillPx } from './bossBar.ts';

/** The bar's height, and its width bounds (px). */
export const HEALTH_BAR_H = 2;
export const HEALTH_BAR_MAX_W = 16;
export const HEALTH_BAR_MIN_W = 8;
/** The track's frame round the fill (px, each side). */
export const HEALTH_BAR_FRAME_PX = 1;
/** The gap between the body's top and the frame's bottom, and between the frame and a tell glyph (px). */
export const HEALTH_BAR_GAP_PX = 1;
/** How much room the bar takes above the body, gaps and frame included (px). */
export const HEALTH_BAR_ROOM_PX = HEALTH_BAR_GAP_PX * 2 + HEALTH_BAR_FRAME_PX * 2 + HEALTH_BAR_H;
/** Shield segments: this many px of `blue.4`, then one px of track. */
export const SHIELD_SEGMENT_PX = 3;

export const HEALTH_BAR_COLORS = {
  track: 'ink.1',
  hp: 'green.3',
  shield: 'blue.4',
} as const satisfies Record<string, ColorName>;

/**
 * The bar's width for a body sprite `bodyW` px wide (its outlined frame): two px narrower than the
 * body, so it sits inside the silhouette, and even, so it centers on the body; 8 to 16 px.
 */
export function healthBarWidth(bodyW: number): number {
  const w = Math.floor((bodyW - 2) / 2) * 2;
  return w < HEALTH_BAR_MIN_W ? HEALTH_BAR_MIN_W : w > HEALTH_BAR_MAX_W ? HEALTH_BAR_MAX_W : w;
}

/** What a bar shows: the HP fill and the shield after it (px from the bar's left edge). */
export interface HealthBarFill {
  hpPx: number;
  shieldPx: number;
}

/**
 * Fills `out` for `hp` of `maxHp` and `shield` of `maxShield` on a `w`-px bar: HP and shield share
 * the bar by their maxima, HP from the left (any HP left shows at least a pixel), the shield
 * straight after it, the two never past the bar's end.
 */
export function healthBarFill(
  hp: number,
  maxHp: number,
  shield: number,
  maxShield: number,
  w: number,
  out: HealthBarFill,
): HealthBarFill {
  const total = maxHp + (maxShield > 0 ? maxShield : 0);
  out.hpPx = barFillPx(hp, total, w);
  const s = maxShield > 0 && shield > 0 ? barFillPx(shield, total, w) : 0;
  out.shieldPx = out.hpPx + s > w ? w - out.hpPx : s;
  return out;
}

/** Whether the bar shows: hovered, or damaged (HP or shield below its maximum). */
export function healthBarShown(
  hp: number,
  maxHp: number,
  shield: number,
  maxShield: number,
  hovered: boolean,
): boolean {
  if (!(maxHp > 0) || !(hp > 0)) return false;
  return hovered || hp < maxHp || (maxShield > 0 && shield < maxShield);
}

/** A bar strip's look: a solid track or HP fill, or the shield's segments. */
export type HealthStrip = keyof typeof HEALTH_BAR_COLORS;

/**
 * A full-width strip of one part of the bar, which EnemyView crops to the width it shows: the
 * track solid, framed (HEALTH_BAR_MAX_W × HEALTH_BAR_H plus the frame on every side); the HP solid
 * and the shield SHIELD_SEGMENT_PX on and one px clear, so the track shows between segments
 * (HEALTH_BAR_MAX_W × HEALTH_BAR_H).
 */
export function healthStripImage(strip: HealthStrip): RgbaImage {
  const pad = strip === 'track' ? HEALTH_BAR_FRAME_PX * 2 : 0;
  const w = HEALTH_BAR_MAX_W + pad;
  const h = HEALTH_BAR_H + pad;
  const data = new Uint8ClampedArray(w * h * 4);
  const c = rgbOf(HEALTH_BAR_COLORS[strip]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (strip === 'shield' && x % (SHIELD_SEGMENT_PX + 1) === SHIELD_SEGMENT_PX) continue;
      const i = (y * w + x) * 4;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = 255;
    }
  }
  return { w, h, data };
}

/** The enemy-def fields that decide a unit's bar (a CompiledEnemyDef satisfies it). */
export interface BarDef {
  readonly hp: number;
  readonly shield: { readonly hp: number } | null;
  readonly boss: unknown;
  readonly neutral: boolean;
}

/**
 * The maximum HP a unit's small bar measures against: its def's, or 0 for no bar (a boss, whose
 * bar is BossBarView's at the top of the screen; a neutral unit, which is never hurt).
 */
export function barMaxHp(def: BarDef): number {
  return def.boss !== null || def.neutral ? 0 : def.hp;
}

/**
 * The bar's maximum with `bonus` HP added (a gatherer's absorbs, the sim's `gatherMaxHp`: def HP +
 * `bonusMaxHp`), or 0 (no bar) when the unit has none to start with (a boss, a neutral unit).
 */
export function barMaxWith(maxHp: number, bonus: number): number {
  return maxHp > 0 ? maxHp + Math.max(0, bonus) : 0;
}
