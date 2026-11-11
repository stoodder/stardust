// Which anim an enemy shows, from what the sim says it's doing (T312b; art-direction §8, tech-spec
// § Format rules, *Enemy anims*). Pure, so the rules are unit-tested; EnemyView plays the result.
// A pose names an anim family (`<pose>_<facing>`); a sprite without one falls back to `walk`
// (EnemyView), except `under`, which a sprite without it draws as the generic burrow mound.
// - **Leaving** (`driveOff`, `retreat`, and a driven-off boss's brood): `flee`.
// - **Burrowed:** `under` (Chitterbloom's mound with her crown showing; a Digger's generic mound).
// - **Between phases** (a boss's invulnerability): `puff`, which EnemyView shimmers.
// - **Telling:** a boss's sneeze tell is `tell`, its dig tell `dig`; a Digger's dirt spray `dig`;
//   a blink's tell `blink` (the Glass Witch drawn up tall and thin, held still; T430b) and a shield
//   pulse's tell `tell` (her arms raised, light in her palms; T430b). A sprite without the pose
//   walks (EnemyView), so a Glimmer's or a Cantor's tell shows only its rim.
// - **Panicking** (a boss phase with haste or a huddle: Chitterbloom's phase 3; a runner held in a
//   hush tell or bolting, T402): `panic` (a fleeing runner's panic hop, T440a).
// - **A Hollow unit's hush tell** (T440a): `tell`, its reach (no sneeze follows: a Mote has none).
//   A Maw's gather tell (`gatherTelling`, T640a) is `tell` too: its mouth agape, tendrils out.
// - **Phased** (T503, T530a): `phase`, the Rift Moth's wings folded into a blade (EnemyView draws it
//   dithered and faint; its tell flickers the walk, phaseLook.ts).
// - **Shield broken** (a boss in a shield-broken phase with its shield down, T530a): `broken`, the
//   Penitent's march with its wall shattered; the re-formed shield marches in `walk`.
// - **A jammer's tell** (T740a): a Silencer's tendril or an Auditor's ring (`jamTellTicks`) is
//   `tell` (the tendril uncoiling, the emitter up); a boss's jam (Hostile Takeover) isn't: its
//   laser is TakeoverView's, and the boss is `aim`ing through the whole phase.
// - **"Shareholder Value"** (T740a): its hangar door opening (`hangarTelling`) is `tell`; its
//   Takeover phase is `aim`, a stride (the dish raised, the lens lit); the jettison's haste is
//   `panic` like any boss phase with haste.
// - **The Gathering Maw** (T740a, on T708's sim): a part walking together in its merge's tell
//   (`mergeTelling`) is `tell`; the merged Maw (`isMergedBoss`, phase 3, enraged) is `panic`; its
//   phase-1 gather tell is the Maw's (`gatherTelling`, below).
// - **Heavy** (it has hushed someone, T440a): `heavy`, the swollen walk with the victim inside.
// - Else `walk`.
// **Fray** (T501d, T530a; art-direction §4): an Aelari construct's walk has two hurt copies, and
// `strideFor` swaps the walk for `fray1` below FRAY1_PCT of its HP and `fray2` below FRAY2_PCT
// (`frayBand`); a sprite without them walks.
// `glance` (a fleeing runner's look back, T440a) isn't a state pose: EnemyView shows it over a walk
// while fleeLook.ts says the runner is glancing, where the sprite authors it.
// Two poses play once, on a change the sim makes in a single tick: `sneeze` when a sneeze tell
// ends in the sneeze (not in a dig, a phase change, or a retreat), and `surface` when a burrowed
// boss comes up. Each holds until its anim ends, unless the boss leaves, burrows, or goes
// invulnerable meanwhile.
import {
  activeBlink,
  activePulse,
  bossNextAbility,
  bossTelling,
  blinkTelling,
  burrowTelling,
  cloakedOut,
  gatherTelling,
  hangarTelling,
  isMergedBoss,
  mergeTelling,
  pulseTelling,
  type Enemy,
} from '../../sim/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { standDownAlpha } from './standDownLook.ts';

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
  'heavy',
  'glance',
  'blink',
  'phase',
  'broken',
  'fray1',
  'fray2',
  'aim',
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
  heavy: 9,
  glance: 10,
  blink: 11,
  phase: 12,
  broken: 13,
  fray1: 14,
  fray2: 15,
  aim: 16,
};

/** The poses that stride along the route (their tempo follows the unit's pace, walkTempo.ts). */
export function isStride(pose: EnemyPose): boolean {
  return (
    pose === 'walk' ||
    pose === 'heavy' ||
    pose === 'glance' ||
    pose === 'broken' ||
    pose === 'aim' ||
    pose === 'fray1' ||
    pose === 'fray2'
  );
}

/** Below this share of its HP an Aelari construct walks in `fray1` (three threads loose). */
export const FRAY1_PCT = 2 / 3;
/** Below this share, `fray2` (six threads, the rim notched). */
export const FRAY2_PCT = 1 / 3;

/** The fray band for `hp` of `maxHp`: 0 whole (or no HP to measure), 1 or 2 (T501d). */
export function frayBand(hp: number, maxHp: number): 0 | 1 | 2 {
  if (!(maxHp > 0) || hp >= maxHp * FRAY1_PCT) return 0;
  return hp < maxHp * FRAY2_PCT ? 2 : 1;
}

/** The stride drawn for state pose `pose` at fray band `band`: the walk frays, nothing else does. */
export function strideFor(pose: EnemyPose, band: 0 | 1 | 2): EnemyPose {
  if (pose !== 'walk' || band === 0) return pose;
  return band === 2 ? 'fray2' : 'fray1';
}

/** The poses that play once and then hand back to the state pose. */
export const ONE_SHOT_POSES: ReadonlySet<EnemyPose> = new Set<EnemyPose>(['sneeze', 'surface']);

/** What the pose depends on, read from the sim each frame. */
export interface PoseFacts {
  readonly leaving: boolean;
  readonly burrowed: boolean;
  readonly invulnerable: boolean;
  /** The tell showing: a sneeze or shield pulse tell (`tell`), a dig (`dig`), a blink, or none. */
  readonly telling: 'tell' | 'dig' | 'blink' | null;
  readonly panic: boolean;
  /** Heavy: a Hollow unit that has hushed someone (T402). */
  readonly heavy: boolean;
  /** Phased (T503): out of every tower's reach. */
  readonly phased: boolean;
  /** A boss in a shield-broken phase with its shield down (the Penitent's phase 2, T506). */
  readonly shieldDown: boolean;
  /** A boss in a Hostile Takeover phase ("Shareholder Value"'s phase 2, T740a). */
  readonly aiming: boolean;
}

/** The pose the state alone calls for (no one-shots). */
export function statePose(f: PoseFacts): EnemyPose {
  if (f.leaving) return 'flee';
  if (f.burrowed) return 'under';
  if (f.invulnerable) return 'puff';
  if (f.phased) return 'phase';
  if (f.telling !== null) return f.telling;
  if (f.panic) return 'panic';
  if (f.shieldDown) return 'broken';
  if (f.aiming) return 'aim';
  return f.heavy ? 'heavy' : 'walk';
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
  out.heavy = e.heavy;
  out.phased = e.phased;
  out.shieldDown = false;
  out.aiming = false;
  if (def === null) return out;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the sim's readers take a live Enemy and only read it
  const live = e as Enemy;
  if (def.boss !== null) {
    if (bossTelling(live)) out.telling = bossNextAbility(live) === 'burrow' ? 'dig' : 'tell';
    const phase = def.boss.phases[e.bossPhase - 1];
    out.panic = phase !== undefined && (phase.hastePct > 0 || phase.huddle !== null);
    out.shieldDown = phase !== undefined && phase.onShieldBroken && e.shieldHp <= 0;
    // "Shareholder Value" (T740a): the hangar door opening is its tell; Takeover, its `aim`.
    if (phase !== undefined) {
      if (out.telling === null && hangarTelling(live, phase.hangar)) out.telling = 'tell';
      out.aiming = phase.takeover !== null;
      if (phase.jettison !== null) out.panic = true; // its haste rides the jettison, not hastePct
    }
    // The Gathering Maw (T740a): a part's merge tell, and the merged Maw's rage.
    if (out.telling === null && mergeTelling(live)) out.telling = 'tell';
    if (isMergedBoss(live)) out.panic = true;
  } else if (def.burrow !== null && burrowTelling(live, def.burrow)) {
    out.telling = 'dig';
  }
  // A blink's tell, then a shield pulse's (T430b, D123): the Witch keeps her pulse in phase 2, and
  // the blink is the more urgent read (she holds still, then moves).
  if (out.telling === null) {
    const blink = activeBlink(live);
    if (blink !== null && blinkTelling(live, blink)) out.telling = 'blink';
    else {
      const pulse = activePulse(live);
      if (pulse !== null && pulseTelling(live, pulse)) out.telling = 'tell';
    }
  }
  // The hush rule and Skittish (T402; hushLook.ts): the runner a Hollow unit holds struggles, and a
  // bolting runner runs scared; the Hollow unit in its tell reaches (`tell`: no sneeze follows it,
  // since no Hollow sprite has one).
  if (!def.hushes && (e.hushUid !== 0 || e.skittishTicks > 0)) out.panic = true;
  if (def.hushes && e.hushUid !== 0 && e.hushTicks > 0) out.telling = 'tell';
  // A Maw's gather tell (T640a): its tendril pose, `tell` (mouth agape, tendrils out).
  if (out.telling === null && gatherTelling(live)) out.telling = 'tell';
  // A jammer's tell (T740a): the Silencer's tendril, the Auditor's ring (a boss's is its `aim`).
  if (out.telling === null && def.boss === null && e.jamTellTicks > 0) out.telling = 'tell';
  return out;
}

export type MutablePoseFacts = { -readonly [K in keyof PoseFacts]: PoseFacts[K] };

/** A fresh facts record (one per view, reused every frame). */
export function blankFacts(): MutablePoseFacts {
  return {
    leaving: false,
    burrowed: false,
    invulnerable: false,
    telling: null,
    panic: false,
    heavy: false,
    phased: false,
    shieldDown: false,
    aiming: false,
  };
}

/** A leaving unit draws at this alpha (the stepped-alpha ladder's 60%; it is untargetable). */
export const LEAVING_ALPHA = 0.6;
/**
 * A cloaked, unrevealed unit's shimmer (T406; enemies.md § 2.5: the player still sees it): its
 * alpha steps between these two rungs of the stepped-alpha ladder (art-direction §7) on the 3 Hz
 * shimmer cycle, so it reads as there-but-not-quite; held at the high rung under reduced motion.
 */
export const CLOAK_ALPHA_LOW = 0.15;
export const CLOAK_ALPHA_HIGH = 0.35;
/**
 * The same shimmer on a sprite with a baked `cloak` variant (T440a: its body already half gone to
 * the 50% checker dither inside a dashed white outline), two rungs up the ladder, so it reads as
 * faint as the solid body did.
 */
export const CLOAK_DITHER_ALPHA_LOW = 0.35;
export const CLOAK_DITHER_ALPHA_HIGH = 0.6;

/**
 * The body's alpha: a leaving unit's 60%; a cloaked unit nobody has Revealed shimmers between
 * CLOAK_ALPHA_LOW and CLOAK_ALPHA_HIGH, or the dither's rungs when it draws its `cloak` variant
 * (`dithered`) (`shimmerHigh`: the cycle's high half; held high under reduced motion by the
 * caller); anyone else, whole.
 */
export function cloakAlpha(
  e: PoseEnemy,
  leaving: boolean,
  shimmerHigh: boolean,
  dithered = false,
): number {
  if (e.standDownTicks > 0) return standDownAlpha(e.standDownTicks); // T506: the stand-down fade
  if (leaving) return LEAVING_ALPHA;
  if (!cloakedOut(e)) return 1;
  if (dithered) return shimmerHigh ? CLOAK_DITHER_ALPHA_HIGH : CLOAK_DITHER_ALPHA_LOW;
  return shimmerHigh ? CLOAK_ALPHA_HIGH : CLOAK_ALPHA_LOW;
}
