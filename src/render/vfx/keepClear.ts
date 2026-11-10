// Keep clear of what the player can reach (D134 K2): while a world object is clickable (sim
// `state.clickable`, A2M3's Peeker rock) and as Pebble lifts off it, nothing drawn on top of the
// world covers it. Floaters (TransientFx) and the name-tag plate (NameTagView) whose spot falls
// within KEEP_CLEAR_TILES of a spot here aren't drawn: a floater is dropped at spawn (or the moment
// the spot arms, if it's already up), a plate hides until the spot clears. Pure and allocation-
// free (a fixed list the scene refills each frame), so the rule is unit-tested.

/** How near (in tiles, on the grid plane) to a clickable nothing else may draw over it. */
export const KEEP_CLEAR_TILES = 1.5;
/** Spots at most (clickables armed at once, plus a lift). */
const MAX_SPOTS = 8;

export class KeepClear {
  readonly #x = new Float64Array(MAX_SPOTS);
  readonly #y = new Float64Array(MAX_SPOTS);
  #n = 0;

  /** How many spots are kept clear now. */
  get size(): number {
    return this.#n;
  }

  /** Clears every spot (the scene refills them each frame). */
  clear(): void {
    this.#n = 0;
  }

  /** Keeps grid point (x, y) clear (a tile's center: col + 0.5, row + 0.5). Extra spots drop. */
  add(x: number, y: number): void {
    if (this.#n >= MAX_SPOTS) return;
    this.#x[this.#n] = x;
    this.#y[this.#n] = y;
    this.#n++;
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
}
