// Pooled views keyed by sim uid (architecture.md § Rendering; conventions.md § Performance rules):
// views are created once, handed out by uid when the sim spawns something, and returned (hidden,
// never destroyed) when it dies. Phaser-free, so the bookkeeping is unit-tested.

/** What a pooled view must do: show itself for a uid, and hide when released. */
export interface PooledView {
  /** The last sync pass that saw this view's entity alive (see `sweep`). */
  stamp: number;
  /** Hides the view and drops anything it held for its last uid. */
  release(): void;
}

export class ViewPool<V extends PooledView> {
  readonly #create: () => V;
  readonly #live = new Map<number, V>();
  readonly #free: V[] = [];
  #created = 0;
  #sweepStamp = 0;
  readonly #sweepOne = (view: V, uid: number): void => {
    if (view.stamp !== this.#sweepStamp) this.release(uid);
  };

  constructor(create: () => V) {
    this.#create = create;
  }

  /** The view for `uid`, taking one from the free list (or creating one) if it has none yet. */
  acquire(uid: number): V {
    const existing = this.#live.get(uid);
    if (existing !== undefined) return existing;
    let view = this.#free.pop();
    if (view === undefined) {
      view = this.#create();
      this.#created++;
    }
    this.#live.set(uid, view);
    return view;
  }

  /** The live view for `uid`, or undefined. */
  get(uid: number): V | undefined {
    return this.#live.get(uid);
  }

  /** Releases the view for `uid` back to the pool. A uid with no view is ignored. */
  release(uid: number): void {
    const view = this.#live.get(uid);
    if (view === undefined) return;
    this.#live.delete(uid);
    view.release();
    this.#free.push(view);
  }

  /**
   * Releases every live view whose stamp isn't `stamp`: a sync pass stamps the views of the
   * entities it finds alive, then sweeps the rest (a backstop for a missed death event).
   * Allocation-free.
   */
  sweep(stamp: number): void {
    this.#sweepStamp = stamp;
    this.#live.forEach(this.#sweepOne);
  }

  /** Releases every live view. */
  releaseAll(): void {
    for (const uid of Array.from(this.#live.keys())) this.release(uid);
  }

  /** Live views by uid (iterate it; don't mutate it). */
  get live(): ReadonlyMap<number, V> {
    return this.#live;
  }

  /** Views ever created (live + free). */
  get created(): number {
    return this.#created;
  }
}
