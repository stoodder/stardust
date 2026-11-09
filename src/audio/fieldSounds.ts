// Sounds from the field's state (pure): what no sim event announces, read from the state after each
// frame (architecture.md § Audio). A burrower digging in and surfacing, a boss's sneeze tell and
// the sneeze itself, a huddle forming, a Puffwing flock's wingbeats, and the salvage drone flying
// and working. Timing is in sim ticks, so a paused battle is quiet. It reads only public sim
// state (the same fields render reads), and never touches it.
import { BOSS_ABILITY_TELL_SEC } from '../content/rules.ts';
import { secToTicks, TICK_HZ } from '../shared/time.ts';
import {
  BURROW_SOUNDS,
  bossSounds,
  DRONE_SOUNDS,
  ENEMY_LOOPS,
  HUDDLE_SOUND,
} from './eventTables.ts';
import { sfx, type SoundCall } from './eventSounds.ts';

/** A boss's tell is the last BOSS_ABILITY_TELL_SEC of its ability timer (sim/enemyAbilities/boss.ts). */
const TELL_TICKS = secToTicks(BOSS_ABILITY_TELL_SEC);

/** The enemy fields the field sounds read (a live sim Enemy passes as is). */
export interface FieldEnemy {
  readonly uid: number;
  readonly alive: boolean;
  readonly def: {
    readonly id: string;
    readonly boss: {
      readonly phases: readonly {
        readonly spawn: object | null;
        readonly burrow: object | null;
      }[];
    } | null;
  } | null;
  readonly burrowed: boolean;
  readonly huddleUid: number;
  readonly bossPhase: number;
  readonly invulnerableTicks: number;
  readonly abilityTicks: number;
  readonly abilityCount: number;
  readonly leaving: boolean;
}

/** The state the field sounds read (the live SimState passes as is). */
export interface FieldState {
  readonly tick: number;
  readonly enemies: { readonly items: readonly FieldEnemy[]; readonly used: number };
  readonly wreckage: { readonly queue: readonly number[]; readonly progressTicks: number };
}

/**
 * Whether boss `e` is telegraphing its spawn ability (the sneeze) this tick: its timer's last
 * TELL_TICKS lead to a spawn, not a dig (pending burrows go first) or a surfacing, and it isn't
 * between phases. Mirrors sim/enemyAbilities/boss.ts `bossTelling`.
 */
export function spawnTelling(e: FieldEnemy): boolean {
  if (!e.alive || e.leaving || e.burrowed || e.invulnerableTicks > 0) return false;
  if (e.abilityTicks <= 0 || e.abilityTicks > TELL_TICKS) return false;
  const p = e.def?.boss?.phases[e.bossPhase - 1];
  if (p === undefined) return false;
  if (e.abilityCount > 0 && p.burrow !== null) return false;
  return p.spawn !== null;
}

export interface FieldSounds {
  /** Appends the sounds the field's changes since the last frame play to `out`. */
  frame(state: FieldState, out: SoundCall[]): void;
}

/** Field sounds for one battle; `clearTicks` is the drone's time per tile (sim `clearTicksFor`). */
export function createFieldSounds(clearTicks: number): FieldSounds {
  /** Each live enemy's burrowed flag last frame, and this frame's (swapped each frame). */
  let burrowed = new Map<number, boolean>();
  let nextBurrowed = new Map<number, boolean>();
  /** Each live boss's spawn tell last frame, and its phase then. */
  let tells = new Map<number, { telling: boolean; phase: number }>();
  let nextTells = new Map<number, { telling: boolean; phase: number }>();
  /** Huddle leaders that have cooed (once each). */
  const cooed = new Set<number>();
  /** When each looping enemy sound plays next (sim tick), while that enemy is on the field. */
  const loopAt = new Map<string, number>();
  const present = new Set<string>();
  const workEvery = Math.max(1, Math.round(DRONE_SOUNDS.workEverySec * TICK_HZ));
  const flyTicks = clearTicks * DRONE_SOUNDS.flyFrac;
  let head = -1;
  let workAt = -1;
  return {
    frame(state, out) {
      const { items, used } = state.enemies;
      present.clear();
      for (let i = 0; i < used; i++) {
        const e = items[i]!; // i < used ≤ items.length
        if (!e.alive || e.def === null) continue;
        // Digging in and surfacing (a Digger, or a boss's burrow).
        const was = burrowed.get(e.uid);
        if (was !== undefined && was !== e.burrowed) {
          out.push(sfx(e.burrowed ? BURROW_SOUNDS.dig : BURROW_SOUNDS.surface));
        }
        nextBurrowed.set(e.uid, e.burrowed);
        // A boss's spawn: its tell as it starts, its sneeze as the tell runs out in the same phase.
        if (e.def.boss !== null) {
          const s = bossSounds(e.def.id);
          const telling = spawnTelling(e);
          const prev = tells.get(e.uid);
          if (telling && prev?.telling !== true && s.spawnTell !== null) {
            out.push(sfx(s.spawnTell));
          } else if (!telling && prev?.telling === true && prev.phase === e.bossPhase) {
            if (!e.leaving && s.spawn !== null) out.push(sfx(s.spawn));
          }
          nextTells.set(e.uid, { telling, phase: e.bossPhase });
        }
        // A huddle forming: its leader coos the first time it gathers young.
        if (e.huddleUid !== 0 && !cooed.has(e.huddleUid)) {
          cooed.add(e.huddleUid);
          out.push(sfx(HUDDLE_SOUND));
        }
        if (!e.leaving && Object.hasOwn(ENEMY_LOOPS, e.def.id)) present.add(e.def.id);
      }
      const b = burrowed;
      burrowed = nextBurrowed;
      nextBurrowed = b;
      nextBurrowed.clear();
      const t = tells;
      tells = nextTells;
      nextTells = t;
      nextTells.clear();
      // Loops (a flock's wingbeats): one voice per kind of enemy, on sim time.
      for (const id of loopAt.keys()) if (!present.has(id)) loopAt.delete(id);
      for (const id of present) {
        const loop = ENEMY_LOOPS[id];
        if (loop === undefined || state.tick < (loopAt.get(id) ?? -1)) continue;
        out.push(sfx(loop.id));
        loopAt.set(id, state.tick + Math.max(1, Math.round(loop.everySec * TICK_HZ)));
      }
      // The salvage drone: it flies out to each tile (or home once the queue is empty), then works.
      const w = state.wreckage;
      const now = w.queue.length > 0 ? w.queue[0]! : -1; // length > 0
      if (now !== head) {
        if (now >= 0) out.push(sfx(DRONE_SOUNDS.fly));
        else out.push(sfx(DRONE_SOUNDS.fly, DRONE_SOUNDS.homePitch));
        head = now;
        workAt = -1;
      }
      if (head >= 0 && w.progressTicks >= flyTicks && state.tick >= workAt) {
        out.push(sfx(DRONE_SOUNDS.work));
        workAt = state.tick + workEvery;
      }
    },
  };
}
