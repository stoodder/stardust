// Keep clear of what the player can reach (D134 K2, D135): while a world object is clickable (sim
// `state.clickable`, A2M3's Peeker rock, armed in a build phase) and as Pebble lifts off it,
// nothing drawn on top of the world covers it. Each spot is kept clear twice over:
// - **on the grid**: nothing that rises from a point within KEEP_CLEAR_TILES of it (a floater
//   spawned by a unit, a tower, a link) is drawn;
// - **on screen**: nothing whose drawn box overlaps the spot's box (the object's art, its lift,
//   and the 1.5-tile ground footprint around it) is drawn, so a plate or a callout standing over
//   a tower two tiles away can't reach up across the rock either.
// Floaters (TransientFx) are dropped at spawn, or the moment a spot arms if one is already up; the
// name-tag plate (NameTagView) hides until the spot clears; an enemy standing within
// KEEP_CLEAR_TILES, or whose health bar and tell glyph would reach over the spot on screen, hides
// them (EnemyView). Inside the world the rock
// itself (PeekerView) sorts KEEP_CLEAR_RAISE_PX further forward, so the walkers round it pass
// behind it. Pure and allocation-free (fixed arrays the scene refills each frame), so the rule is
// unit-tested.
import { HALF_H, HALF_W } from '../iso.ts';

/** How near (in tiles, on the grid plane) to a clickable nothing else may draw over it. */
export const KEEP_CLEAR_TILES = 1.5;
/** KEEP_CLEAR_TILES on screen: half the footprint's width and height round a tile's center. */
export const KEEP_CLEAR_HALF_W_PX = Math.ceil(KEEP_CLEAR_TILES * Math.SQRT2 * HALF_W);
export const KEEP_CLEAR_HALF_H_PX = Math.ceil(KEEP_CLEAR_TILES * Math.SQRT2 * HALF_H);
/**
 * How much further forward (screen px of foot y) an armed clickable sorts in the world while it can
 * be reached and as Pebble lifts off it: past every walker whose foot is inside the keep-clear
 * footprint and on the tile row in front of it (whose heads reach up over its base), plus 1 px so
 * a walker on that row's edge sorts behind it too.
 */
export const KEEP_CLEAR_RAISE_PX = KEEP_CLEAR_HALF_H_PX + 2 * HALF_H + 1;
/** Spots at most (clickables armed at once, plus a lift). */
const MAX_SPOTS = 8;

/** A screen box, in game px (left/top inclusive). */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export class KeepClear {
  readonly #x = new Float64Array(MAX_SPOTS);
  readonly #y = new Float64Array(MAX_SPOTS);
  readonly #l = new Float64Array(MAX_SPOTS);
  readonly #t = new Float64Array(MAX_SPOTS);
  readonly #r = new Float64Array(MAX_SPOTS);
  readonly #b = new Float64Array(MAX_SPOTS);
  #n = 0;

  /** How many spots are kept clear now. */
  get size(): number {
    return this.#n;
  }

  /** Clears every spot (the scene refills them each frame). */
  clear(): void {
    this.#n = 0;
  }

  /**
   * Keeps grid point (x, y) clear (a tile's center: col + 0.5, row + 0.5), and on screen the box
   * `art` (its object's drawn bounds, lift included) together with the KEEP_CLEAR_TILES footprint
   * round `ground` (the tile center's screen point). Extra spots drop.
   */
  add(x: number, y: number, ground: { readonly x: number; readonly y: number }, art?: Box): void {
    const i = this.#n;
    if (i >= MAX_SPOTS) return;
    this.#x[i] = x;
    this.#y[i] = y;
    const l = ground.x - KEEP_CLEAR_HALF_W_PX;
    const t = ground.y - KEEP_CLEAR_HALF_H_PX;
    const r = ground.x + KEEP_CLEAR_HALF_W_PX;
    const b = ground.y + KEEP_CLEAR_HALF_H_PX;
    this.#l[i] = art === undefined ? l : Math.min(l, art.left);
    this.#t[i] = art === undefined ? t : Math.min(t, art.top);
    this.#r[i] = art === undefined ? r : Math.max(r, art.right);
    this.#b[i] = art === undefined ? b : Math.max(b, art.bottom);
    this.#n = i + 1;
  }

  /** Whether grid point (x, y) is within KEEP_CLEAR_TILES of a spot (on the grid plane). */
  near(x: number, y: number): boolean {
    for (let i = 0; i < this.#n; i++) {
      const dx = x - this.#x[i]!; // i < n ≤ MAX_SPOTS
      const dy = y - this.#y[i]!;
      if (dx * dx + dy * dy <= KEEP_CLEAR_TILES * KEEP_CLEAR_TILES) return true;
    }
    return false;
  }

  /** Whether the screen box (left, top)–(right, bottom) overlaps a spot's box. */
  covers(left: number, top: number, right: number, bottom: number): boolean {
    for (let i = 0; i < this.#n; i++) {
      if (right <= this.#l[i]! || left >= this.#r[i]!) continue; // i < n ≤ MAX_SPOTS
      if (bottom <= this.#t[i]! || top >= this.#b[i]!) continue;
      return true;
    }
    return false;
  }
}
