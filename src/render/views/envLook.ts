// What a map's env changes in how the playfield draws (review A1, D143): one row per env palette,
// read by the helpers that used to compare the env by name (groundTiles' `isActTwo`, `decorLook`
// and `peekerShows`, nightRings.ts, vfx/nightGlow.ts's `isLongNight`). A new env is one row here.
// Pure, so it's unit-tested.
import type { EnvPaletteId } from '../../content/sprites/types.ts';

/** How an env draws. */
export interface EnvLook {
  /** Whose decor looks its props take (groundTiles' ACT2_LOOKS / ACT3_LOOKS), or none. */
  readonly decor: 'act2' | 'act3' | null;
  /** Whether the Peeker peeks from her rock (not in the Long Night: no Skitterkin hides there). */
  readonly peeker: boolean;
  /** Whether decal rings draw whole, never at partial alpha (night rings, nightRings.ts). */
  readonly nightRings: boolean;
  /** Whether the world glows as a full night with no darkness schedule (vfx/nightGlow.ts). */
  readonly longNight: boolean;
}

/** Each env palette's look. */
export const ENV_LOOKS: Readonly<Record<EnvPaletteId, EnvLook>> = {
  act1: { decor: null, peeker: true, nightRings: false, longNight: false },
  'act2.gold': { decor: 'act2', peeker: true, nightRings: false, longNight: false },
  'act2.dusk': { decor: 'act2', peeker: true, nightRings: false, longNight: false },
  act3: { decor: 'act3', peeker: false, nightRings: true, longNight: true },
  finale: { decor: null, peeker: true, nightRings: true, longNight: false },
};

/** An env the table doesn't know (a dev map with none): Act I's look. */
const DEFAULT_LOOK: EnvLook = ENV_LOOKS.act1;

function isEnv(env: string): env is EnvPaletteId {
  return Object.hasOwn(ENV_LOOKS, env);
}

/** The look of a map baked in `env`. */
export function envLook(env: string | undefined): EnvLook {
  return env !== undefined && isEnv(env) ? ENV_LOOKS[env] : DEFAULT_LOOK;
}
