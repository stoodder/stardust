// The battle's interaction state, shared by BattleScene (which draws it and changes it on pointer
// input) and the app (which mirrors it into UI signals for the HUD, and arms build slots from the
// HUD, T106). Phaser-free, so app/ and tests can use it without a scene.
// Rule (T106, T113): selecting a tower, arming a build slot, and aiming a commander ability are
// exclusive. Each one drops the other two, so the playfield shows one of the tower panel, the build
// ghost, or the ability reticle.

export interface InteractionSnapshot {
  /** The selected tower's uid, or 0. */
  readonly selectedTower: number;
  /** The tower id armed for building (a build slot), or null. */
  readonly armed: string | null;
  /** The commander ability slot being aimed (click a tile to fire), or null. */
  readonly aiming: AbilitySlot | null;
}

export type AbilitySlot = 1 | 2;

export class BattleInteraction {
  #selectedTower = 0;
  #armed: string | null;
  #aiming: AbilitySlot | null = null;
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

  get aiming(): AbilitySlot | null {
    return this.#aiming;
  }

  /** Selects a tower by uid (0 clears the selection). Selecting a tower disarms and stops aiming. */
  selectTower(uid: number): void {
    if (uid === 0) this.#set(0, this.#armed, this.#aiming);
    else this.#set(uid, null, null);
  }

  /** Arms a tower id for building (null disarms). Arming drops the selection and the aim. */
  arm(tower: string | null): void {
    if (tower === null) this.#set(this.#selectedTower, null, this.#aiming);
    else this.#set(0, tower, null);
  }

  /** Aims an ability slot (null stops aiming). Aiming drops the selection and disarms. */
  aimAbility(slot: AbilitySlot | null): void {
    if (slot === null) this.#set(this.#selectedTower, this.#armed, null);
    else this.#set(0, null, slot);
  }

  /** Drops the selection, disarms, and stops aiming (Esc, right-click). */
  clear(): void {
    this.#set(0, null, null);
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
    return { selectedTower: this.#selectedTower, armed: this.#armed, aiming: this.#aiming };
  }

  #set(selected: number, armed: string | null, aiming: AbilitySlot | null): void {
    if (selected === this.#selectedTower && armed === this.#armed && aiming === this.#aiming) {
      return;
    }
    this.#selectedTower = selected;
    this.#armed = armed;
    this.#aiming = aiming;
    this.#notify();
  }

  #notify(): void {
    const s = this.snapshot();
    for (const l of this.#listeners) l(s);
  }
}
