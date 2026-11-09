// Which anim an enemy shows, from what the sim says it's doing (T312b; art-direction §8, tech-spec
// § Format rules, *Enemy anims*). Pure, so the rules are unit-tested; EnemyView plays the result.
// A pose names an anim family (`<pose>_<facing>`); a sprite without one falls back to `walk`
// (EnemyView), except `under`, which a sprite without it draws as the generic burrow mound.
// - **Leaving** (`driveOff`, `retreat`, and a driven-off boss's brood): `flee`.
// - **Burrowed:** `under` (Chitterbloom's mound with her crown showing; a Digger's generic mound).
// - **Between phases** (a boss's invulnerability): `puff`, which EnemyView shimmers.
// - **Telling:** a boss's sneeze tell is `tell`, its dig tell `dig`; a Digger's dirt spray `dig`.
// - **Panicking** (a boss phase with haste or a huddle: Chitterbloom's phase 3): `panic`.
// - Else `walk`.
// Two poses play once, on a change the sim makes in a single tick: `sneeze` when a sneeze tell
// ends in the sneeze (not in a dig, a phase change, or a retreat), and `surface` when a burrowed
// boss comes up. Each holds until its anim ends, unless the boss leaves, burrows, or goes
// invulnerable meanwhile.
import {
  bossNextAbility,
  bossTelling,
  burrowTelling,
  type Enemy,
} from '../../sim/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';

export const ENEMY_POSES = [
  'walk',
  'tell',
  'sneeze',
  'dig',
  'under',
  'surface',
  'panic',
  'puff',
  'flee',
] as const;
export type EnemyPose = (typeof ENEMY_POSES)[number];

/** Each pose's slot in EnemyView's anim tables. */
export const POSE_INDEX: Readonly<Record<EnemyPose, number>> = {
  walk: 0,
  tell: 1,
  sneeze: 2,
  dig: 3,
  under: 4,
  surface: 5,
  panic: 6,
  puff: 7,
  flee: 8,
};

/** The poses that play once and then hand back to the state pose. */
export const ONE_SHOT_POSES: ReadonlySet<EnemyPose> = new Set<EnemyPose>(['sneeze', 'surface']);

/** What the pose depends on, read from the sim each frame. */
export interface PoseFacts {
  readonly leaving: boolean;
  readonly burrowed: boolean;
  readonly invulnerable: boolean;
  /** The tell showing: a sneeze tell (`tell`), a dig (`dig`), or none. */
  readonly telling: 'tell' | 'dig' | null;
  readonly panic: boolean;
}

/** The pose the state alone calls for (no one-shots). */
export function statePose(f: PoseFacts): EnemyPose {
  if (f.leaving) return 'flee';
  if (f.burrowed) return 'under';
  if (f.invulnerable) return 'puff';
  if (f.telling !== null) return f.telling;
  return f.panic ? 'panic' : 'walk';
}

/**
 * The one-shot a change from state pose `prev` to `next` sets off, or null: a sneeze tell ending
 * in a plain stride is the sneeze; coming up from under is the surfacing.
 */
export function oneShotFor(prev: EnemyPose, next: EnemyPose): EnemyPose | null {
  if (prev === 'tell' && (next === 'walk' || next === 'panic')) return 'sneeze';
  if (prev === 'under' && next !== 'flee' && next !== 'under' && next !== 'puff') return 'surface';
  return null;
}

/** Whether a state pose cuts a playing one-shot short (it leaves, digs in, or puffs up). */
export function interruptsOneShot(next: EnemyPose): boolean {
  return next === 'flee' || next === 'under' || next === 'puff';
}

/** An enemy as the pose reads it (a live sim Enemy). */
export type PoseEnemy = DeepReadonly<Enemy>;

/** The pose facts of a live enemy: its burrow, its boss state, and whether it's leaving. */
export function poseFacts(e: PoseEnemy, out: MutablePoseFacts): MutablePoseFacts {
  const def = e.def;
  out.leaving = e.leaving;
  out.burrowed = e.burrowed;
  out.invulnerable = e.invulnerableTicks > 0;
  out.telling = null;
  out.panic = false;
  if (def === null) return out;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the sim's readers take a live Enemy and only read it
  const live = e as Enemy;
  if (def.boss !== null) {
    if (bossTelling(live)) out.telling = bossNextAbility(live) === 'burrow' ? 'dig' : 'tell';
    const phase = def.boss.phases[e.bossPhase - 1];
    out.panic = phase !== undefined && (phase.hastePct > 0 || phase.huddle !== null);
  } else if (def.burrow !== null && burrowTelling(live, def.burrow)) {
    out.telling = 'dig';
  }
  return out;
}

export type MutablePoseFacts = { -readonly [K in keyof PoseFacts]: PoseFacts[K] };

/** A fresh facts record (one per view, reused every frame). */
export function blankFacts(): MutablePoseFacts {
  return { leaving: false, burrowed: false, invulnerable: false, telling: null, panic: false };
}
