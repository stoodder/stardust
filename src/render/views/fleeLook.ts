// A fleeing runner's look (T430a; enemies.md § 5.4, campaign A2M1 "they're running from it"):
// pure rules on the page clock, unit-tested; EnemyView applies them.
// - **The glance back:** every GLANCE_MIN_MS–GLANCE_MAX_MS (per unit) a `fleeing` runner shows the
//   facing that looks back the way it came for GLANCE_MS, a scared look over its shoulder at what
//   follows, then runs on. Not while it's held in a hush tell (it struggles) or bolting (Skittish:
//   eyes front), and never on the first stride.
// - **Scurry:** its walk plays faster than its pace (×FLEE_TEMPO), and a bolting runner's faster
//   still (×BOLT_TEMPO), so panic reads in the legs as well as the speed.
import { hash01 } from '../../content/sprites/helpers.ts';
import type { Facing } from './spriteInfo.ts';

export const GLANCE_MIN_MS = 1400;
export const GLANCE_MAX_MS = 2600;
export const GLANCE_MS = 240;
export const FLEE_TEMPO = 1.25;
export const BOLT_TEMPO = 1.6;

/** Whether unit `uid` is glancing back at page time `nowMs`. */
export function glancing(uid: number, nowMs: number): boolean {
  const period = GLANCE_MIN_MS + Math.floor(hash01(uid, 3, 7) * (GLANCE_MAX_MS - GLANCE_MIN_MS));
  const phase = Math.floor(hash01(uid, 3, 11) * period);
  return (nowMs + phase) % period < GLANCE_MS;
}

const GLANCE_FACING: Readonly<Record<Facing, Facing>> = { se: 'sw', sw: 'se', ne: 'sw', nw: 'se' };

/**
 * The facing that looks back over the shoulder from `f`: walking away (NE, NW), it turns its face
 * to the pursuer (SW, SE); walking toward the camera, its face turns to the side the pursuer is on.
 */
export function glanceFacing(f: Facing): Facing {
  return GLANCE_FACING[f];
}

/** A runner's walk tempo multiplier: fleeing ×FLEE_TEMPO, bolting ×BOLT_TEMPO, else 1. */
export function fleeTempo(fleeing: boolean, bolting: boolean): number {
  if (bolting) return BOLT_TEMPO;
  return fleeing ? FLEE_TEMPO : 1;
}
