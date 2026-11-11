// The Long Night's light (art-direction §3 *Act III*: darkness is the default, and light comes only
// from emissives and the two moons; T630b). Act III's maps carry no lighting schedule and no
// darkness (D141: the `act3` look is cosmetic), so the world's own glow (WorldGlowView) would never
// light there; on an `act3` map it lights as in a full night instead: every piece of scenery with a
// baked `@glow` wears it (the core's heart, the domes' one red slit, the crystal's lit tips), the
// props in `PROP_GLOWS` shine (the emergency lamps), and the moons hang over the map. The props whose frame changes on a cue wear
// a glow that follows their frame (`OWN_GLOW`; their views, frameGlow.ts). Every other env reads
// exactly as before: its glow follows the sim's `dark`, its moons the lighting schedule. Pure, so
// the rule is unit-tested.
import type { SpriteId } from '../../content/sprites/index.ts';

/** The env whose world glows as a full night without a darkness schedule. */
const NIGHT_ENV = 'act3';

/**
 * How far into the night the Long Night's glows read (a share of their full-dark strength): the
 * ground isn't darkened under them as A2M6's night darkens it, so a little less keeps them lights,
 * not blooms.
 */
export const NIGHT_GLOW = 0.75;

/** Props whose views swap their frame on a cue and carry their own glow (frameGlow.ts). */
export const OWN_GLOW: ReadonlySet<SpriteId> = new Set<SpriteId>([
  'prop.shuttle',
  'prop.blast_door',
]);

/** Whether a map of `env` is in the Long Night (lit as a full night with no darkness). */
export function isLongNight(env: string | undefined): boolean {
  return env === NIGHT_ENV;
}

/**
 * How dark the world's glow reads (WorldGlowView's `dark` for its props): the sim's `dark`, or in
 * the Long Night at least a steady NIGHT_GLOW.
 */
export function glowNight(env: string | undefined, dark: number): number {
  return isLongNight(env) ? Math.max(dark, NIGHT_GLOW) : dark;
}

/** Whether scenery with a baked `@glow` wears it: on a map with darkness, or in the Long Night. */
export function bakesSceneryGlow(env: string | undefined, mapDark: boolean): boolean {
  return mapDark || isLongNight(env);
}

/** Whether the moons hang over the map: with a lighting schedule, or in the Long Night. */
export function hangsMoons(env: string | undefined, lightingKeys: number): boolean {
  return lightingKeys > 0 || isLongNight(env);
}

/** How bright the moons are: as the dark comes down, or steady and full in the Long Night. */
export function moonLevel(env: string | undefined, dark: number): number {
  return isLongNight(env) ? 1 : dark;
}
