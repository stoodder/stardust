// The battle's interaction state, shared by BattleScene (which draws it and changes it on pointer
// input) and the app (which mirrors it into UI signals for the HUD, and arms build slots from the
// HUD, T106). Phaser-free, so app/ and tests can use it without a scene.
// Rule (T106, T113): selecting a tower, arming a build slot, and aiming a commander ability are
// exclusive. Each one drops the other two, so the playfield shows one of the tower panel, the build
// ghost, or the ability reticle.
// The keyboard tile cursor (T126) lives here too: the tile it's on (or hidden), the last tile it
// was on (where it reappears), and the line its last arrow moves travelled (input/cursor.ts). It
// is independent of the three above: it marks a tile, and Enter acts there as a click would.
import type { CursorAxis } from './cursor.ts';

export interface InteractionSnapshot {
  /** The selected tower's uid, or 0. */
  readonly selectedTower: number;
  /** The tower id armed for building (a build slot), or null. */
  readonly armed: string | null;
  /** The commander ability slot being aimed (click a tile to fire), or null. */
  readonly aiming: AbilitySlot | null;
}

export type AbilitySlot = 1 | 2;

/** The line the cursor's last arrow moves travelled (input/cursor.ts `cursorStep`). */
export interface CursorNav {
  readonly axis: CursorAxis;
  readonly anchor: number;
}

export class BattleInteraction {
  #selectedTower = 0;
  #armed: string | null;
  #aiming: AbilitySlot | null = null;
  #cursor = -1;
  #cursorLast = -1;
  #cursorNav: CursorNav | null = null;
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

  /** The keyboard cursor's tile index, or −1 while it's hidden. */
  get cursor(): number {
    return this.#cursor;
  }

  /** The tile the cursor was last on (−1 before it first showed): where it reappears. */
  get cursorLast(): number {
    return this.#cursorLast;
  }

  /** The line the last arrow moves travelled, or null after the cursor appeared or jumped. */
  get cursorNav(): CursorNav | null {
    return this.#cursorNav;
  }

  /** Shows the cursor on tile `index` (an arrow key), with the line it's travelling (or null). */
  setCursor(index: number, nav: CursorNav | null = null): void {
    this.#cursorNav = nav;
    if (index === this.#cursor) return;
    this.#cursor = index;
    if (index >= 0) this.#cursorLast = index;
    this.#notify();
  }

  /** Hides the cursor (the mouse moved, or Esc with nothing else to cancel); it remembers its tile. */
  hideCursor(): void {
    this.#cursorNav = null;
    if (this.#cursor < 0) return;
    this.#cursor = -1;
    this.#notify();
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
