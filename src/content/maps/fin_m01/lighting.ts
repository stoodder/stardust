// FIN's sky (finale.md § FIN, *Layout*; D154's T701 ruling; art-direction.md §3 *Finale*): the map
// stands in Act III's night (`env: 'act3'`), and as Phase 1's waves give way the **eastern sky**
// warms toward the dawn's gradient, a step at a time: sky-only keys, so the world's grade and the
// finale's night over the map (render's, DarknessView) hold until Dawn's `setLighting: 'dawn'`.
// The night holds through W1 (a first key on `act3`'s own sky); then five steps, one per stretch of
// the walk (the dawn ramp's five), each reached in equal steps per wave started from the one before
// (render/vfx/lighting.ts `lightPosition`), so the horizon creeps a little as each wave clears, from
// W2 to the Halls (W18 cleared starts W19, Phase 2). Each key's sky
// is `finale`'s risen from the east edge by its place in the run (`eastGlowLevels`); Dawn's
// lighting set shows the whole dawn sky. Cosmetic: no key carries `dark`, so the sim never reads
// it.
import type { LightingKeyDef } from '../../types.ts';

/** The waves at which the eastern sky reaches each of its five steps (Phase 1: W1–W18). */
export const FIN_SKY_WAVES = [5, 9, 13, 17, 19] as const;

/** FIN's lighting schedule: sky-only keys toward the dawn, east first. */
export const FIN_SKY: readonly LightingKeyDef[] = [
  { wave: 1, env: 'act3', skyOnly: true },
  ...FIN_SKY_WAVES.map((wave) => ({ wave, env: 'finale' as const, skyOnly: true })),
];
