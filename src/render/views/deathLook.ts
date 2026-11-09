// How a unit dies on screen (T430a; design/enemies.md § 8, the death tone ramp; art-direction §4
// and §7): a story dial chosen by the map's act and the unit's faction. Pure, unit-tested;
// battleEvents.ts plays it (EnemyView's corpse, TransientFx's debris).
// - `comic` (Act I Skitterkin): the sprite's own `death` anim, squash, pop, confetti, flecks.
// - `quiet` (Act II Skitterkin): the same squash and pop with no confetti (the anim's first two
//   frames), and one small stardust fleck that lingers on the ground. The sad squeak is audio's.
// - `still` (Act III and later Skitterkin): no pop; the body holds still a moment and steps out.
//   Not drawn yet (Act III is M6): EnemyView plays the quiet pop for it until then.
// - `shatter` (Aelari): no body left; it shatters into jewel-toned shards that fly and fall, with a
//   small white flash (the chime is audio's).
// - `unravel` (the Hollow, every act): it comes apart into cold-violet `stardust.unsung` motes
//   that drift up and away. Never a pop, never warm colour.
// - `burst` (Everglow, and a sprite with no death anim): `fx.explosion`.
import type { Act, EnemyFaction } from '../../content/types.ts';

export type DeathStyle = 'comic' | 'quiet' | 'still' | 'shatter' | 'unravel' | 'burst';

/** Each faction's death in every act; the Skitterkin's is the act's (SKITTERKIN_BY_ACT). */
const BY_FACTION: Readonly<Record<Exclude<EnemyFaction, 'skitterkin'>, DeathStyle>> = {
  hollow: 'unravel',
  aelari: 'shatter',
  everglow: 'burst',
};

export function deathStyle(act: Act, faction: EnemyFaction): DeathStyle {
  if (faction !== 'skitterkin') return BY_FACTION[faction];
  if (act === 1) return 'comic';
  return act === 2 ? 'quiet' : 'still';
}

/** A `quiet` death plays only these frames of the `death` anim (the squash and the pop). */
export const QUIET_DEATH_FRAMES = 2;
