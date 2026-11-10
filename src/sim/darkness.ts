// Sundown's darkness (design/maps.md § 5.1; T505). D137: darkness is sim state, so what the
// player sees lit is exactly what the sim treats as lit. The rules as built:
// - **The level.** A map's lighting keys (`map.lighting`, each a wave, an env, and a `dark` 0–1)
//   set the darkness the way they set the light (render/vfx/lighting.ts `lightPosition`): 0 before
//   wave 1, each key's `dark` once its wave has started, and equal steps per wave between two keys.
//   As a wave starts, `state.dark` eases linearly from where it stood to that wave's level over
//   DARK_EASE_TICKS (4 s; the tint's LIGHT_FADE_TICKS, so the sky, the grade, and the dark move
//   together). A wave that starts mid-ease eases on from where the dark stood, never jumping. It
//   is a function of the wave schedule's start ticks alone (`darkAt`), so it holds while paused,
//   keeps up at any speed, and replays from a checkpoint identically.
// - **Light sources.** A map's lamps (`map.lights`: a marker's tile centre and a radius, by
//   default LAMP_RADIUS_TILES 1.5) always; and a live tower whose def has a light radius (the Prism
//   Spire's 2.0, `lightRadiusTiles`) while its beam is lit (`beamActive`). A tower is **lit** when
//   its tile centre is within any source's radius (inclusive): a beaming Prism lights itself.
// - **The penalty.** An unlit tower's range is × (1 − DARK_RANGE_PENALTY × dark): −15% at full
//   dark (`Tower.darkRangePct`, applied by bonuses.ts `bonusRangeTiles` after the stacking formula,
//   outside the range cap, so targeting, a pulse's radius, a Skewer's length, and the HUD's
//   towerStats all read the same range). Detection radii (the Lookout, Scanner Sweep) and allies'
//   ranges don't change.
// - **When.** The darkness system runs after the towers act (tick order 7a): it sets `state.dark`
//   and each tower's `lit` and `darkRangePct` from the state the tick leaves, which is what render
//   draws, and the next tick's towers fire under it. A tower built this tick is lit or not by the
//   tick's end (it deploys first, so it never fires in between).
// - **DarknessShift** fires on the tick a wave starts whose level differs from the dark then.
// On a map without darkness (no key with `dark` > 0 and no lamps) the system does nothing: `dark`
// stays 0, every tower `lit`, and no range changes, so no earlier map's numbers move.
import type { CompiledLight, CompiledLightingKey, CompiledMapDef } from '../content/compiled.ts';
import { DARK_RANGE_PENALTY } from '../content/rules.ts';
import type { IdSpace } from '../content/types.ts';
import { emit, type SimState } from './state.ts';
import type { TickContext } from './tick.ts';

/** How long the dark takes to reach a new wave's level: 4 s of sim time (the tint's fade). */
export const DARK_EASE_TICKS = 240;

/** Whether `map` has darkness that changes play: a key with `dark` > 0, or lamps. */
export function hasDarkness(map: Pick<CompiledMapDef<IdSpace>, 'lighting' | 'lights'>): boolean {
  return map.lights.length > 0 || map.lighting.some((k) => k.dark > 0);
}

/**
 * The darkness level once wave `wave` (0: none yet) has started and eased in: 0 before wave 1,
 * each key's `dark` from its wave, in equal steps per wave between two keys, the last key's after.
 */
export function darkTarget(keys: readonly CompiledLightingKey[], wave: number): number {
  let prevWave = 0;
  let prevDark = 0;
  for (let k = 0; k < keys.length; k++) {
    const key = keys[k]!; // k < length
    if (wave < key.wave) {
      return prevDark + ((key.dark - prevDark) * (wave - prevWave)) / (key.wave - prevWave);
    }
    prevWave = key.wave;
    prevDark = key.dark;
  }
  return prevDark;
}

/**
 * The darkness at the end of a tick whose next tick is `tick` (`state.tick + 1` while a tick runs;
 * `state.tick` between ticks), with waves 1..`wave` started at `startTick` (WaveSchedule's): each
 * wave eases from where the dark stood as it started to its level, over DARK_EASE_TICKS.
 */
export function darkAt(
  keys: readonly CompiledLightingKey[],
  startTick: readonly number[],
  wave: number,
  tick: number,
): number {
  let dark = 0;
  for (let w = 1; w <= wave; w++) {
    const start = startTick[w - 1]!; // w ≤ wave: started
    const end = w < wave ? startTick[w]! : tick; // the next wave's start, or now
    const to = darkTarget(keys, w);
    const t = Math.min(1, Math.max(0, end - start) / DARK_EASE_TICKS);
    dark = t === 1 ? to : dark + (to - dark) * t;
  }
  return dark;
}

/** What the light rules read of a tower (a Tower, or render's read-only view of one). */
export interface LightTower {
  readonly alive: boolean;
  readonly beamActive: boolean;
  readonly x: number;
  readonly y: number;
  readonly def: { readonly lightRadiusSq: number } | null;
}

/** What the light rules read of the tower pool. */
export interface LightTowers {
  readonly used: number;
  readonly items: readonly LightTower[];
}

/** Whether a tower is a light source now: alive, with a light radius, its beam lit. */
export function isLightSource(t: LightTower): boolean {
  return t.alive && t.beamActive && t.def !== null && t.def.lightRadiusSq > 0;
}

/** Whether grid point (x, y) is within any lamp or any beaming light-source tower's radius. */
export function isLitAt(
  lights: readonly CompiledLight[],
  towers: LightTowers,
  x: number,
  y: number,
): boolean {
  for (let i = 0; i < lights.length; i++) {
    const l = lights[i]!; // i < length
    const dx = x - l.x;
    const dy = y - l.y;
    if (dx * dx + dy * dy <= l.radiusSq) return true;
  }
  for (let i = 0; i < towers.used; i++) {
    const s = towers.items[i]!; // i < used
    if (!isLightSource(s)) continue;
    const dx = x - s.x;
    const dy = y - s.y;
    if (dx * dx + dy * dy <= s.def!.lightRadiusSq) return true; // isLightSource: def set
  }
  return false;
}

/** An unlit tower's range multiplier at darkness `dark`: 1 − DARK_RANGE_PENALTY × dark. */
export function darkRangeMul(dark: number, lit: boolean): number {
  return lit ? 1 : 1 - DARK_RANGE_PENALTY * dark;
}

/** System 7a (after the towers): the darkness level, then each tower's light and range penalty. */
export function darkness(state: SimState, ctx: TickContext): void {
  const map = ctx.map;
  if (!hasDarkness(map)) return;
  const s = state.schedule;
  const before = state.dark;
  state.dark = darkAt(map.lighting, s.startTick, state.wave, state.tick + 1);
  if (state.wave > 0 && s.startTick[state.wave - 1] === state.tick) {
    const to = darkTarget(map.lighting, state.wave);
    if (to !== before) emit(state, { type: 'DarknessShift', wave: state.wave, dark: to });
  }
  const pool = state.towers;
  const penalty = DARK_RANGE_PENALTY * state.dark;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used
    if (!t.alive) continue;
    t.lit = isLitAt(map.lights, pool, t.x, t.y);
    t.darkRangePct = t.lit ? 0 : penalty;
  }
}
