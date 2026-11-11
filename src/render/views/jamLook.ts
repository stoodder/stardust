// The jams' look (T702's minimal one, polished by T730a; design/enemies.md § 4: a black tendril
// creeping toward the tower, then static, sparks, and a countdown ring on it; art-direction.md
// § 8's `disabler` tell): pure rules, unit-tested, applied by JamView (and TowerView's variant).
// - **The tendril** (a Silencer's tell): from the Silencer's body toward the tower it picked, an
//   `ink.0` rope (5 px) with a `violet.3` core (3 px) and a `violet.4` heart line, its tip creeping
//   the whole way over the tell (`tendrilReach`: 0 as the tell starts, 1 as it lands), wavering a
//   pixel or two (still under reduced motion), with a `violet.4` bead at the tip that swells as it
//   nears (`tendrilBeadPx`) so the target reads before it lands.
// - **Jammed** (a tower with `jamTicks` > 0): the tower draws in its baked steel `+jammed` variant
//   (TowerView; towerLook.ts `towerVariant`), its lights out; over it T740a's `fx.jam_static`
//   (dashes in `white.0`/`teal.4` and a crackling spark; anim `crackle`, held on `s0` under
//   reduced motion); and round its base a countdown ring on the ground, a `white.1` 2 px ellipse
//   arc (RING_RX × RING_RY) over an `ink.0` under-stroke and a faint full track, the share of
//   JAM_MAX_SEC left (`jamArc`: full at a jam of the whole cap, a Choir's halved jam starts at half),
//   draining clockwise from the top (`ringPoint`).
// - **System Reboot:** each tower it freed flashes white (TowerView's upgrade flash) and a
//   `teal.4` power-on column rises through it (`rebootColumn`: up over the first third of
//   REBOOT_MS, then stepping out), with a `teal.4` ring (TransientFx); every tower it covered gets
//   a smaller `white.1` ring. Under reduced motion the column stands whole and steps out.
// - **The fizzle** (D150, D151: a cancelled tell reads, so the counter teaches its timing): a tell
//   that lands on nothing snaps off with a `violet.4` puff where its tip was and `FIZZLED` rising
//   over it in `teal.4` (the 3×5 font), held whole FIZZLE_HOLD_MS at 1× and kept up (TransientFx
//   `keep`) so a crowd of floaters can't take it over. It shows when the sim interrupts a tell
//   (Stasis on a non-boss, Unnerved: JamInterrupted; the ring's and Hostile Takeover's too), and
//   for a tell that can no longer land: a tendril the moment it's doomed (`tellDoomed`: its tower
//   stays jam-immune past the landing, a System Reboot in the tell), a Takeover laser the moment
//   every tower it picked is (`lasersDoomed`). Its targets are fixed and immunity only counts down
//   with the tell, so doomed is read from the state each frame and holds once true. A ring has no
//   fixed targets (a tower built in reach after a Reboot isn't immune), so it fizzles only on its
//   landing tick (`ringLanded`) and only if it jammed nothing (no TowerJammed from it). Under
//   reduced motion the puff holds its size and fades.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { SpriteId } from '../../content/sprites/index.ts';
import { JAM_MAX_SEC } from '../../content/rules.ts';
import { secToTicks } from '../../shared/time.ts';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';

/** JAM_MAX_SEC in ticks (sim/jam.ts's JAM_MAX_TICKS). */
const JAM_MAX_TICKS = secToTicks(JAM_MAX_SEC);

export const TENDRIL_UNDER: ColorName = 'ink.0';
export const TENDRIL_CORE: ColorName = 'violet.3';
export const TENDRIL_TIP: ColorName = 'violet.4';
export const ARC_COLOR: ColorName = 'white.1';
export const REBOOT_COLOR: ColorName = 'teal.4';
/** The static overlay (T740a) and its anim. */
export const STATIC_SPRITE: SpriteId = 'fx.jam_static';
export const STATIC_ANIM = 'crackle';
export const STATIC_STILL_FRAME = 's0';
/** The countdown ring round a Jammed tower's base: an iso ellipse's half-axes (screen px). */
export const RING_RX = 16;
export const RING_RY = 8;
/** Segments in a whole ring (the arc draws the share of them left). */
export const RING_SEGMENTS = 24;
/** System Reboot's power-on column: how long (ms), how high (px), how wide (px). */
export const REBOOT_MS = 480;
export const REBOOT_COLUMN_PX = 34;
export const REBOOT_COLUMN_W = 4;

/** The fizzle: its word, colors, puff (tiles, ms), and how high the word rises from a body (px). */
export const FIZZLE_TEXT = 'FIZZLED';
export const FIZZLE_COLOR: ColorName = 'teal.4';
export const FIZZLE_PUFF: ColorName = 'violet.4';
export const FIZZLE_PUFF_TILES = 0.4;
export const FIZZLE_MS = 360;
/** FIZZLED's whole time up (ms) and how long of it it holds at full alpha (fxTiming `fadeAlpha`). */
export const FIZZLE_TEXT_MS = 1600;
export const FIZZLE_HOLD_MS = FIZZLE_TEXT_MS / 2;
export const FIZZLE_BODY_LIFT_PX = 22;
export const FIZZLE_BOSS_LIFT_PX = 40;

/** A palette color as a Phaser fill number. */
export function hexOf(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}

/** How far the tendril has crept (0–1) with `left` of `tellTicks` to go. */
export function tendrilReach(left: number, tellTicks: number): number {
  if (tellTicks <= 0) return 1;
  const f = 1 - left / tellTicks;
  return f < 0 ? 0 : f > 1 ? 1 : f;
}

/** The tip bead's size (px, square) at `reach`: 3 px setting out, 5 px in the last third. */
export function tendrilBeadPx(reach: number): number {
  return reach >= 2 / 3 ? 5 : reach >= 1 / 3 ? 4 : 3;
}

/** The countdown ring's share of a full ring: the jam's ticks left over JAM_MAX_TICKS. */
export function jamArc(jamTicks: number): number {
  if (jamTicks <= 0) return 0;
  return jamTicks >= JAM_MAX_TICKS ? 1 : jamTicks / JAM_MAX_TICKS;
}

/**
 * The point `f` (0–1) of the way round the countdown ring from its top, clockwise on screen, as an
 * offset (px) from the ring's centre, into `out`.
 */
export function ringPoint(f: number, out: { x: number; y: number }): void {
  const a = f * Math.PI * 2;
  out.x = Math.sin(a) * RING_RX;
  out.y = -Math.cos(a) * RING_RY;
}

/**
 * System Reboot's column `ms` into its REBOOT_MS: its height (px) and alpha (0: done). It rises
 * over the first third and steps out over the rest; under reduced motion it stands whole.
 */
export function rebootColumn(ms: number, still: boolean): { height: number; alpha: number } {
  if (ms < 0 || ms >= REBOOT_MS) return { height: 0, alpha: 0 };
  const t = ms / REBOOT_MS;
  const rise = still ? 1 : Math.min(1, t * 3);
  const fade = t < 1 / 3 ? 0 : Math.floor(((t - 1 / 3) / (2 / 3)) * STEPPED_ALPHA.length);
  const alpha = STEPPED_ALPHA[Math.min(STEPPED_ALPHA.length - 1, fade)]!; // clamped index
  return { height: Math.round(REBOOT_COLUMN_PX * rise), alpha };
}

/**
 * Whether a tell with `tellLeft` ticks to go can no longer land on a tower that is jam-immune for
 * `immuneTicks` more: the sim counts the immunity down before the tell lands (sim/jam.ts), so the
 * tower is still immune at the landing exactly when `immuneTicks` > `tellLeft`. Both count down a
 * tick at a time, so once true it stays true.
 */
export function tellDoomed(immuneTicks: number, tellLeft: number): boolean {
  return tellLeft > 0 && immuneTicks > tellLeft;
}

/** A tower as `lasersDoomed` reads it. */
interface PickedTower {
  readonly alive: boolean;
  readonly uid: number;
  readonly jamImmuneTicks: number;
}

/**
 * Whether a Hostile Takeover laser, `tellLeft` ticks from landing on the towers `picked`, can no
 * longer jam any: at least one of them still stands and every one standing is doomed
 * (`tellDoomed`). With none standing it isn't (a sale is the player's business, not a fizzle).
 */
export function lasersDoomed(
  picked: readonly number[],
  tellLeft: number,
  towers: { readonly used: number; readonly items: readonly PickedTower[] },
): boolean {
  let standing = 0;
  for (let k = 0; k < picked.length; k++) {
    const uid = picked[k]!; // k < length
    for (let i = 0; i < towers.used; i++) {
      const t = towers.items[i]!; // i < used ≤ items.length
      if (!t.alive || t.uid !== uid) continue;
      if (!tellDoomed(t.jamImmuneTicks, tellLeft)) return false;
      standing++;
      break;
    }
  }
  return standing > 0;
}

/**
 * Whether a ring seen `left` ticks from landing has landed `elapsed` ticks later (it stopped
 * telling then: the sim counts its tell down to the landing tick, sim/enemyAbilities/jamRing.ts).
 * One that stops earlier was dropped (out of reach, standing down) or interrupted, not landed.
 */
export function ringLanded(left: number, elapsed: number): boolean {
  return left > 0 && left <= elapsed;
}
