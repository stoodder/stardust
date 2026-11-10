// The Peeker's behaviour (design/core-loop.md § 6.9; T309): when it peeks over its rock, when it
// ducks, and when it hides again. Pure, so the rule is unit-tested; PeekerView plays the poses.
//
// - It peeks out every 20–40 s of play (play time: the clock stops while the battle is paused),
//   looks about for PEEK_HOLD_MS, then sinks back out of sight.
// - It's shy: while an enemy is within SHY_RADIUS_TILES of its rock, or the pointer or the
//   keyboard cursor is on its tile, it doesn't peek, and a peek in progress ducks at once.
// - A poke always ducks it (even from hiding: the squash and the sprout are the reaction), and
//   the next peek waits a fresh 20–40 s.
// The wait between peeks comes from a cosmetic random source the caller owns, never the sim's.

export type PeekerPose = 'hidden' | 'peek' | 'duck';

/** The marker the Peeker sits on, and the one a script makes clickable to hold Pebble (A2M3). */
export const PEEKER_MARKER = 'peeker';

/**
 * The Peeker's story state, read from the sim each frame (T409). `shy` on a map where its rock is
 * only a rock (Act I: it peeks and ducks). Where the map lists the `peeker` marker as a clickable
 * world object (A2M3, `scripted`): `holding` Pebble while it's clickable, and `empty` before (the
 * old rock stands bare until she turns up on it, from W5) and after (Bricks has her).
 */
export type PeekerHold = 'shy' | 'holding' | 'empty';

/** The hold for the sim's clickable markers (`state.clickable`) on a map that scripts the rock. */
export function peekerHold(scripted: boolean, clickable: readonly string[]): PeekerHold {
  if (!scripted) return 'shy';
  return clickable.includes(PEEKER_MARKER) ? 'holding' : 'empty';
}

/** The wait between peeks, in ms of play (core-loop.md § 6.9: every 20–40 s). */
export const PEEK_EVERY_MIN_MS = 20_000;
export const PEEK_EVERY_MAX_MS = 40_000;
/** How long a peek lasts (real ms): three of the `peek` anim's 1 s look-and-blink loops. */
export const PEEK_HOLD_MS = 3000;
/** How long the `duck` anim runs before the rock hides it (real ms: 2 frames at 8 fps). */
export const DUCK_MS = 250;
/** An enemy this close to the rock (tiles, centre to centre) keeps the Peeker down. */
export const SHY_RADIUS_TILES = 2;

export class PeekerMotion {
  readonly #rand: () => number;
  #pose: PeekerPose = 'hidden';
  /** Bumped on every pose change (and on a poke that re-ducks), so the view replays its anim. */
  #serial = 0;
  /** Play ms until the next peek. */
  #untilPeek: number;
  /** Real ms left in the current peek or duck. */
  #left = 0;

  /** `rand` returns a uniform number in [0, 1) (a cosmetic source; never the sim's RNG). */
  constructor(rand: () => number) {
    this.#rand = rand;
    this.#untilPeek = this.#nextWait();
  }

  get pose(): PeekerPose {
    return this.#pose;
  }

  get serial(): number {
    return this.#serial;
  }

  /** Play ms until the next peek (the smoke hooks and tests read it). */
  get untilPeek(): number {
    return this.#untilPeek;
  }

  /**
   * Advances by one frame: `realMs` of wall time and `playMs` of play (0 while paused). `shy`:
   * an enemy is near or the cursor is on the rock.
   */
  update(realMs: number, playMs: number, shy: boolean): void {
    const real = Number.isFinite(realMs) && realMs > 0 ? realMs : 0;
    const play = Number.isFinite(playMs) && playMs > 0 ? playMs : 0;
    switch (this.#pose) {
      case 'peek':
        if (shy) {
          this.#duck();
          return;
        }
        this.#left -= real;
        if (this.#left <= 0) this.#set('hidden', 0);
        return;
      case 'duck':
        this.#left -= real;
        if (this.#left <= 0) this.#set('hidden', 0);
        return;
      case 'hidden':
        if (shy) return;
        this.#untilPeek -= play;
        if (this.#untilPeek <= 0) {
          this.#untilPeek = this.#nextWait();
          this.#set('peek', PEEK_HOLD_MS);
        }
        return;
    }
  }

  /** A poke: it ducks (again, if it already is), and the next peek waits a fresh 20–40 s. */
  poke(): void {
    this.#untilPeek = this.#nextWait();
    this.#duck();
  }

  #duck(): void {
    this.#set('duck', DUCK_MS);
  }

  #set(pose: PeekerPose, ms: number): void {
    this.#pose = pose;
    this.#left = ms;
    this.#serial++;
  }

  #nextWait(): number {
    const r = this.#rand();
    const u = Number.isFinite(r) ? Math.min(Math.max(r, 0), 1) : 0.5;
    return PEEK_EVERY_MIN_MS + u * (PEEK_EVERY_MAX_MS - PEEK_EVERY_MIN_MS);
  }
}

/**
 * Whether any live enemy is within SHY_RADIUS_TILES of the rock's centre (`cx`, `cy`, in tiles).
 * Reads the first `used` entries of the sim's enemy pool.
 */
export function enemyNear(
  items: readonly { readonly alive: boolean; readonly x: number; readonly y: number }[],
  used: number,
  cx: number,
  cy: number,
): boolean {
  const r2 = SHY_RADIUS_TILES * SHY_RADIUS_TILES;
  for (let i = 0; i < used; i++) {
    const e = items[i];
    if (e === undefined || !e.alive) continue;
    const dx = e.x - cx;
    const dy = e.y - cy;
    if (dx * dx + dy * dy <= r2) return true;
  }
  return false;
}

/**
 * Pebble picked up (T430b, D115): as the rock goes from `holding` to `empty` her held frame lifts
 * off it, LIFT_RISE_PX up in 1 px steps over LIFT_MS (Bricks's hands, out of frame), fading on the
 * stepped-alpha ladder (100 → 70 → 40%), over a small dust ring at the rock. Real time, cosmetic.
 */
export const LIFT_MS = 480;
export const LIFT_RISE_PX = 8;
/** The dust ring the rock puffs as she leaves it: half a new tower's. */
export const LIFT_PUFF_TILES = 0.5;
export const LIFT_PUFF_MS = 240;

export interface LiftLook {
  /** How far up she has risen (whole px; 0 under reduced motion: she fades where she sat). */
  readonly risePx: number;
  readonly alpha: number;
}

/** Her lift `ms` after it began, or null once it's over. */
export function liftLook(ms: number, reduced: boolean): LiftLook | null {
  if (!(ms >= 0) || ms >= LIFT_MS) return null;
  const t = ms / LIFT_MS;
  const risePx = reduced ? 0 : Math.min(LIFT_RISE_PX, Math.floor(t * (LIFT_RISE_PX + 1)));
  const alpha = t < 1 / 3 ? 1 : t < 2 / 3 ? 0.7 : 0.4;
  return { risePx, alpha };
}
