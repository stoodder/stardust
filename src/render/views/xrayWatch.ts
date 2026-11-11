// Whether a tower stands in front of the blocker (review R3): BattleScene asks it each frame for
// Bricks at the Gap and turns his x-ray outline on while one does (AllyView `setXray`). The rule
// is vfx/xrayPixels.ts `occludes`, over the tower views' drawn boxes. Allocation-free per frame:
// one bound callback and two scratch boxes.
import { occludes, type Rect } from '../vfx/xrayPixels.ts';

/** What the watch reads of a view: its sort depth and drawn box. */
export interface Drawn {
  readonly depth: number;
  bounds(out: Rect): Rect;
}

export class XrayWatch {
  readonly #him: Rect = { x: 0, y: 0, w: 0, h: 0 };
  readonly #it: Rect = { x: 0, y: 0, w: 0, h: 0 };
  #depth = 0;
  #hidden = false;
  readonly #check = (v: Drawn): void => {
    if (this.#hidden) return;
    if (occludes(v.bounds(this.#it), v.depth, this.#him, this.#depth)) this.#hidden = true;
  };

  /** Whether any of `towers` draws in front of `him` and covers enough of him. */
  hidden(him: Drawn, towers: { forEach(cb: (v: Drawn) => void): void }): boolean {
    him.bounds(this.#him);
    if (this.#him.w <= 0) return false;
    this.#depth = him.depth;
    this.#hidden = false;
    towers.forEach(this.#check);
    return this.#hidden;
  }
}
