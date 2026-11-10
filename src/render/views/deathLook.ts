// How a unit dies on screen (T430a; design/enemies.md § 8, the death tone ramp; art-direction §4
// and §7): the map's Skitterkin death dial (its presentation dials, content/presentation.ts, read
// through story/presentation.ts; T410b) and the unit's faction. Pure, unit-tested; battleEvents.ts
// plays it (EnemyView's corpse, TransientFx's debris).
// - `comic` (Act I Skitterkin): the sprite's own `death` anim, squash, pop, confetti, flecks.
// - `quiet` (Act II Skitterkin): the same squash and pop with no confetti (the anim's first two
//   frames), and one small stardust fleck that lingers on the ground. The sad squeak is audio's.
// - `still` (Act III's `linger`; the finale's `none`, where no Skitterkin enemy dies): no pop;
//   the body holds still a moment and steps out. Not drawn yet (Act III is M6): EnemyView plays
//   the quiet pop for it until then.
// - `shatter` (Aelari): no body left; it shatters into jewel-toned shards that fly and fall, with a
//   small white flash (the chime is audio's).
// - `unravel` (the Hollow, every act): it comes apart into cold-violet `stardust.unsung` motes
//   that drift up and away. Never a pop, never warm colour.
// - `burst` (Everglow, and a sprite with no death anim): `fx.explosion`.
import type { SkitterkinDeath } from '../../content/presentation.ts';
import type { EnemyFaction } from '../../content/types.ts';

export type DeathStyle = 'comic' | 'quiet' | 'still' | 'shatter' | 'unravel' | 'burst';

/** Each faction's death in every act; the Skitterkin's is the map's dial (BY_DIAL). */
const BY_FACTION: Readonly<Record<Exclude<EnemyFaction, 'skitterkin'>, DeathStyle>> = {
  hollow: 'unravel',
  aelari: 'shatter',
  everglow: 'burst',
};

/** The Skitterkin death dial's look: confetti, a sad squeak's quiet pop, a lingering still body. */
const BY_DIAL: Readonly<Record<SkitterkinDeath, DeathStyle>> = {
  confetti: 'comic',
  sad_squeak: 'quiet',
  linger: 'still',
  none: 'still',
};

/** How a `faction` unit dies on a map whose Skitterkin death dial is `skitterkin`. */
export function deathStyle(skitterkin: SkitterkinDeath, faction: EnemyFaction): DeathStyle {
  return faction === 'skitterkin' ? BY_DIAL[skitterkin] : BY_FACTION[faction];
}

/** A `quiet` death plays only these frames of the `death` anim (the squash and the pop). */
export const QUIET_DEATH_FRAMES = 2;
