// The Hum Choir's minimal look (T607; design/towers.md § Hum Choir, enemies.md § 2.4 Lulled): pure
// rules and pixel images, unit-tested, applied by ChoirView. T630a/T640a polish it.
// - **The song ring:** round every live tower projecting a `choir` aura, a dashed `gold.3` ring
//   over a 1 px `ink.0` under-stroke at its aura's reach (`choirReach`: its widest `choir` aura,
//   plus Harmony's extra, × its radius tune-up), so where its +damage reaches reads at a glance; the
//   warm gold of the finale's song aura (art-direction § finale), dimmer and dashed so it never
//   reads as a tower's range. Its dashes crawl a step on the hum's beat (HUM_BEAT_TICKS, sim time:
//   holds while paused, keeps pace at 2×); still under reduced motion.
// - **The Lullaby ring:** a Lullaby's own radius (`lullReach`) in a dashed `blue.4` ring, the
//   sleepy blue of the Lulled note, so its reach (2.5, past the aura's 2) reads apart. It's drawn
//   under the song ring with its dashes a step off, so where the two coincide (Harmony widens the
//   song to 2.5) the dashes interleave gold and blue.
// - **Notes:** a small `gold.4` eighth note over each Choir, bobbing a pixel up and down on the
//   beat (offset per uid so two Choirs don't bob in unison); still under reduced motion.
// - **Lulled:** a small `blue.4` note on an `ink.0` rim over each Lulled unit's head
//   (`showsLulled`: the sim's `Enemy.lulled`, out in the open), beside where Unnerved's squiggle
//   sits (LULLED_SIDE_PX to the right), so a unit both Lulled and Unnerved shows both.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';

export const SONG_COLOR: ColorName = 'gold.3';
export const SONG_UNDER: ColorName = 'ink.0';
export const LULL_RING_COLOR: ColorName = 'blue.4';
export const NOTE_COLOR: ColorName = 'gold.4';
export const LULLED_COLOR: ColorName = 'blue.4';
export const NOTE_RIM: ColorName = 'ink.0';
/** The hum's beat: one step every this many sim ticks (a slow, steady hum: 1.5 a second). */
export const HUM_BEAT_TICKS = 40;
/** A Choir's note floats this far over its tile's ground point (px), over the tower's head. */
export const NOTE_LIFT_PX = 26;
/** The Lulled note sits this far right of the head's centre, clear of Unnerved's squiggle. */
export const LULLED_SIDE_PX = 7;

/** What the ring reads of a Choir tower. */
export interface ChoirTower {
  readonly alive: boolean;
  readonly tierDef: {
    readonly auras: readonly { readonly kind: string; readonly radiusTiles: number }[];
    readonly lull: { readonly radiusTiles: number } | null;
  } | null;
  readonly linkAuraRadiusTiles: number;
  /** Its `supportStat` radius tune-up (systems/links.ts sets it on every tower). */
  readonly detectPct: number;
}

/**
 * The reach of a tower's `choir` auras (tiles): its widest, plus Harmony's extra, × its radius
 * tune-up (systems/auras.ts's rule); 0 for a tower with none, or a dead one.
 */
export function choirReach(t: ChoirTower): number {
  if (!t.alive || t.tierDef === null) return 0;
  let r = 0;
  for (const a of t.tierDef.auras) if (a.kind === 'choir' && a.radiusTiles > r) r = a.radiusTiles;
  if (r === 0) return 0;
  return (r + t.linkAuraRadiusTiles) * (1 + t.detectPct);
}

/** A Lullaby's reach (tiles; systems/status.ts `lullReachSq`'s rule), or 0 without one. */
export function lullReach(t: ChoirTower): number {
  if (!t.alive || t.tierDef === null || t.tierDef.lull === null) return 0;
  return t.tierDef.lull.radiusTiles * (1 + t.detectPct);
}

/** The ring's dash shift (0 or 1) at sim tick `tick`: it crawls on the beat, or holds still. */
export function songDashShift(tick: number, reducedMotion: boolean): 0 | 1 {
  if (reducedMotion) return 0;
  return Math.floor(tick / HUM_BEAT_TICKS) % 2 === 0 ? 0 : 1;
}

/** A Choir's note bob (px: 0 or −1) at sim tick `tick` for tower `uid`; 0 under reduced motion. */
export function noteBobPx(tick: number, uid: number, reducedMotion: boolean): 0 | -1 {
  if (reducedMotion) return 0;
  return Math.floor((tick + uid * 13) / HUM_BEAT_TICKS) % 2 === 0 ? 0 : -1;
}

/** What the Lulled note reads of a unit. */
export interface LulledUnit {
  readonly alive: boolean;
  readonly lulled: boolean;
  readonly burrowed: boolean;
  readonly phased: boolean;
  readonly leaving: boolean;
}

/** Whether a unit wears the Lulled note: alive, Lulled, and out in the open. */
export function showsLulled(e: LulledUnit): boolean {
  return e.alive && e.lulled && !e.burrowed && !e.phased && !e.leaving;
}

/** An eighth note, 5×7: 'N' the note. */
const NOTE: readonly string[] = ['..NN.', '..N.N', '..N..', '..N..', 'NNN..', 'NNN..', '.N...'];
export const NOTE_W = NOTE[0]!.length + 2; // with its rim
export const NOTE_H = NOTE.length + 2;

/** Whether the note (without its rim) lights pixel (x, y) of the rimmed image. */
function lit(x: number, y: number): boolean {
  return NOTE[y - 1]?.[x - 1] === 'N';
}

/** The note image in `color`, on a 1 px `NOTE_RIM` rim round every lit pixel (7×9). */
export function noteImage(color: ColorName): RgbaImage {
  const w = NOTE_W;
  const h = NOTE_H;
  const data = new Uint8ClampedArray(w * h * 4);
  const put = (x: number, y: number, c: ColorName): void => {
    const { r, g, b } = rgbOf(c);
    const i = (y * w + x) * 4;
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (lit(x, y)) put(x, y, color);
      else if (lit(x - 1, y) || lit(x + 1, y) || lit(x, y - 1) || lit(x, y + 1))
        put(x, y, NOTE_RIM);
    }
  }
  return { w, h, data };
}
