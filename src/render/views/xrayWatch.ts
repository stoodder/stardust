// Whether a tower stands in front of the blocker (review R3, R2-S3): BattleScene asks it each frame
// for Bricks at the Gap and turns his x-ray on while one does (AllyView `setXray`), passing the
// towers in front (`front`) whose pixels his silhouette shows through. The rule is
// vfx/xrayPixels.ts `occludes` over the tower views' drawn boxes: one covering at least 15% of his
// box turns it on; then every tower drawn in front whose box overlaps his at all is in `front`.
// Allocation-free per frame: one bound callback, two scratch boxes, one reused list.
import { occludes, type Rect } from '../vfx/xrayPixels.ts';

/** What the watch reads of a view: its sort depth and drawn box. */
export interface Drawn {
  readonly depth: number;
  bounds(out: Rect): Rect;
}

export class XrayWatch<T extends Drawn = Drawn> {
  readonly #him: Rect = { x: 0, y: 0, w: 0, h: 0 };
  readonly #it: Rect = { x: 0, y: 0, w: 0, h: 0 };
  #depth = 0;
  #hidden = false;
  readonly #front: T[] = [];
  readonly #check = (v: T): void => {
    v.bounds(this.#it);
    if (!occludes(this.#it, v.depth, this.#him, this.#depth, 0)) return;
    this.#front.push(v);
    if (!this.#hidden && occludes(this.#it, v.depth, this.#him, this.#depth)) this.#hidden = true;
  };

  /** The views in front of him at the last `hidden` call (empty when it said false). */
  get front(): readonly T[] {
    return this.#front;
  }

  /** Whether any of `towers` draws in front of `him` and covers enough of him. */
  hidden(him: Drawn, towers: { forEach(cb: (v: T) => void): void }): boolean {
    this.#front.length = 0;
    him.bounds(this.#him);
    if (this.#him.w <= 0) return false;
    this.#depth = him.depth;
    this.#hidden = false;
    towers.forEach(this.#check);
    if (!this.#hidden) this.#front.length = 0;
    return this.#hidden;
  }
}

/** One frame a view draws, and its screen top-left (px): what the x-ray shows through. */
export interface XrayPart {
  texture: string;
  frame: string;
  x: number;
  y: number;
}

/** A view the x-ray can show through: its box and depth, and the frames it draws. */
export interface Covering extends Drawn {
  /** Writes its frames into `out` from `from` (slots reused); returns how many. */
  xrayParts(out: XrayPart[], from: number): number;
}
