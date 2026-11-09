// The battle's interaction state, shared by BattleScene (which draws it and changes it on pointer
// input) and the app (which mirrors it into UI signals for the HUD, and arms build slots from the
// HUD, T106). Phaser-free, so app/ and tests can use it without a scene.

export interface InteractionSnapshot {
  /** The selected tower's uid, or 0. */
  readonly selectedTower: number;
  /** The tower id armed for building (a build slot), or null. */
  readonly armed: string | null;
}

export class BattleInteraction {
  #selectedTower = 0;
  #armed: string | null;
  readonly #listeners: ((s: InteractionSnapshot) => void)[] = [];

  constructor(armed: string | null = null) {
    this.#armed = armed;
  }

  get selectedTower(): number {
    return this.#selectedTower;
  }

  get armed(): string | null {
    return this.#armed;
  }

  /** Selects a tower by uid (0 clears the selection). */
  selectTower(uid: number): void {
    if (uid === this.#selectedTower) return;
    this.#selectedTower = uid;
    this.#notify();
  }

  /** Arms a tower id for building (null disarms). */
  arm(tower: string | null): void {
    if (tower === this.#armed) return;
    this.#armed = tower;
    this.#notify();
  }

  /** Subscribes to changes. Returns the unsubscribe. */
  subscribe(listener: (s: InteractionSnapshot) => void): () => void {
    this.#listeners.push(listener);
    return () => {
      const i = this.#listeners.indexOf(listener);
      if (i >= 0) this.#listeners.splice(i, 1);
    };
  }

  snapshot(): InteractionSnapshot {
    return { selectedTower: this.#selectedTower, armed: this.#armed };
  }

  #notify(): void {
    const s = this.snapshot();
    for (const l of this.#listeners) l(s);
  }
}
