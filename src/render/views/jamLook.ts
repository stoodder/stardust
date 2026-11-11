// The jams' look, minimal (T702; design/enemies.md § 4: a black tendril creeping toward the
// tower, then static, sparks, and a countdown ring on it; art-direction.md § 8's `disabler` tell;
// T730a polishes it): pure rules, unit-tested, applied by JamView.
// - **The tendril** (a Silencer's tell): from the Silencer's body toward the tower it picked, an
//   `ink.0` rope (4 px) with a `violet.3` core (2 px), its tip creeping the whole way over the tell
//   (`tendrilReach`: 0 as the tell starts, 1 as it lands), wavering a pixel or two (still under
//   reduced motion), with a `violet.4` bead at the tip so the target reads before it lands.
// - **Jammed** (a tower with `jamTicks` > 0): a `white.1` countdown arc round the tower's base,
//   the share of JAM_MAX_SEC left (`jamArc`: full at a full 4 s jam, a Choir's halved jam starts
//   at half), over an `ink.0` under-stroke; and STATIC_SPARKS short `white.0` / `teal.4` static
//   dashes over the tower, re-strewn every STATIC_STEP_TICKS on sim time (`staticSpark`: a hash of
//   the tick step, the uid, and the dash, so it's the same at every speed and never Math.random),
//   held in place under reduced motion.
// - **System Reboot:** each tower it freed pops a `teal.4` ring (TransientFx), and every tower a
//   smaller `white.1` one.
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { JAM_MAX_SEC } from '../../content/rules.ts';
import { secToTicks } from '../../shared/time.ts';

/** JAM_MAX_SEC in ticks (sim/jam.ts's JAM_MAX_TICKS). */
const JAM_MAX_TICKS = secToTicks(JAM_MAX_SEC);

export const TENDRIL_UNDER: ColorName = 'ink.0';
export const TENDRIL_CORE: ColorName = 'violet.3';
export const TENDRIL_TIP: ColorName = 'violet.4';
export const ARC_COLOR: ColorName = 'white.1';
export const STATIC_COLORS: readonly ColorName[] = ['white.0', 'teal.4'];
export const REBOOT_COLOR: ColorName = 'teal.4';
export const STATIC_SPARKS = 4;
export const STATIC_STEP_TICKS = 4;
/** The countdown arc's radius in screen px, round the tower's base. */
export const ARC_RADIUS_PX = 9;

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

/** The countdown arc's share of a full circle: the jam's ticks left over JAM_MAX_TICKS. */
export function jamArc(jamTicks: number): number {
  if (jamTicks <= 0) return 0;
  return jamTicks >= JAM_MAX_TICKS ? 1 : jamTicks / JAM_MAX_TICKS;
}

/** A small deterministic hash (xorshift-style) of three integers, in [0, 1). */
function hash3(a: number, b: number, c: number): number {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Static dash `i` on tower `uid` at `tick`: its offset from the tower's centre (px) and color. */
export function staticSpark(
  tick: number,
  uid: number,
  i: number,
  still: boolean,
  out: { dx: number; dy: number; color: number },
): void {
  const step = still ? 0 : Math.floor(tick / STATIC_STEP_TICKS);
  out.dx = Math.round((hash3(step, uid, i * 2) - 0.5) * 14);
  out.dy = Math.round(-4 - hash3(step, uid, i * 2 + 1) * 14);
  out.color = i % STATIC_COLORS.length; // an index into STATIC_COLORS
}
