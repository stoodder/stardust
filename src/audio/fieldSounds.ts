// Sounds from the field's state (pure): what no sim event announces, read from the state after each
// frame (architecture.md § Audio). A burrower digging in and surfacing, a boss's sneeze tell and
// the sneeze itself, a huddle forming, the loops while a kind of enemy is on the field (a
// Puffwing flock's wingbeats, the Aelari's hum, the Hollow humming the jingle wrong), a hidden
// cloaked unit's footsteps, a Capacitor Bank's hum climbing as it charges (and collapsing when the
// charge fizzles), a beam's hum climbing with its ramp (and held once it caps), the night's air at
// Sundown, and the salvage drone flying and working. It also keeps where the Hollow units stand,
// for their quiet (`quietAt`, HOLLOW_QUIET), and whether a Hum Choir stands (`choirLive`, the
// music's harmony line). Timing is in sim ticks, so a paused battle is quiet.
// It reads only public sim state (the same fields render reads), and never touches it.
import type { CompiledAttack } from '../content/compiled.ts';
import { BOSS_ABILITY_TELL_SEC } from '../content/rules.ts';
import type { EnemyFaction } from '../content/types.ts';
import { secToTicks, TICK_HZ } from '../shared/time.ts';
import { bonusChargeTicks } from '../sim/index.ts';
import {
  BURROW_SOUNDS,
  bossSounds,
  DRONE_SOUNDS,
  ENEMY_LOOPS,
  HUDDLE_SOUND,
} from './eventTables.ts';
import { CHARGE_SOUNDS, CLOAK_SOUNDS, HOLLOW_QUIET } from './eventTablesAct2.ts';
import { BEAM_SOUNDS, DARK_SOUNDS } from './eventTablesAct2b.ts';
import { ENEMY_BURROW_SOUNDS } from './eventTablesAct3.ts';
import { sfx, type SoundCall } from './eventSounds.ts';

/** A boss's tell is the last BOSS_ABILITY_TELL_SEC of its ability timer (sim/enemyAbilities/boss.ts). */
const TELL_TICKS = secToTicks(BOSS_ABILITY_TELL_SEC);

/** The enemy fields the field sounds read (a live sim Enemy passes as is). */
export interface FieldEnemy {
  readonly uid: number;
  readonly alive: boolean;
  readonly def: {
    readonly id: string;
    readonly faction: EnemyFaction;
    /** Cloaked (the `cloaked` trait): hidden unless Revealed (sim `cloakedOut`). */
    readonly cloaked: boolean;
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
  /** Position in tiles. */
  readonly x: number;
  readonly y: number;
  /** Ticks it stays Revealed (0: a cloaked unit is hidden). */
  readonly revealedTicks: number;
}

/**
 * The tower fields the field sounds read (a live sim Tower passes as is): a charge's progress, and
 * a beam's (on, and each beam's ramp; a beam's extra beams count while they have a target).
 */
export interface FieldTower {
  readonly uid: number;
  readonly alive: boolean;
  readonly tierDef: {
    readonly attack: CompiledAttack | null;
    /** Its auras' kinds (a Hum Choir projects `choir`: its harmony line, `choirLive`). */
    readonly auras?: readonly { readonly kind: string }[] | null;
  } | null;
  readonly chargeTicks: number;
  readonly flatRate: number;
  readonly pctRate: number;
  readonly beamActive?: boolean;
  readonly beamRamp?: number;
  readonly beam2Uid?: number;
  readonly beam2Ramp?: number;
  readonly beam3Uid?: number;
  readonly beam3Ramp?: number;
}

/** The state the field sounds read (the live SimState passes as is). */
export interface FieldState {
  readonly tick: number;
  readonly enemies: { readonly items: readonly FieldEnemy[]; readonly used: number };
  readonly towers: { readonly items: readonly FieldTower[]; readonly used: number };
  readonly wreckage: { readonly queue: readonly number[]; readonly progressTicks: number };
  /** Sundown's darkness, 0–1 (absent: none). */
  readonly dark?: number;
}

/**
 * The beam hum's pitch for tower `t` (whole semitones, 0 to BEAM_SOUNDS.maxPitch) from its
 * strongest beam's ramp toward the attack's cap, or null when it isn't beaming. The top step is
 * the cap itself (rounded down), so `maxPitch` means the ramp has capped and the bed takes over.
 */
export function beamPitch(t: FieldTower): number | null {
  const attack = t.tierDef?.attack ?? null;
  if (!t.alive || attack?.kind !== 'beam' || t.beamActive !== true) return null;
  let ramp = t.beamRamp ?? 1;
  if ((t.beam2Uid ?? 0) !== 0) ramp = Math.max(ramp, t.beam2Ramp ?? 1);
  if ((t.beam3Uid ?? 0) !== 0) ramp = Math.max(ramp, t.beam3Ramp ?? 1);
  const share = attack.rampCap > 1 ? (ramp - 1) / (attack.rampCap - 1) : 0;
  return Math.floor(Math.min(1, Math.max(0, share)) * BEAM_SOUNDS.maxPitch);
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
  /**
   * Whether (x, y) (tiles) lies within HOLLOW_QUIET's radius of a live Hollow unit, as the last
   * frame left them (the event sounds' `quietAt`).
   */
  quietAt(x: number, y: number): boolean;
  /**
   * Whether a live Hollow unit was on the field (not leaving) as of the last frame: the music's
   * steady duck (HOLLOW_DUCK) holds while it is.
   */
  hollowLive(): boolean;
  /**
   * Whether a tower projecting a Hum Choir aura stood as of the last frame (design/towers.md § 7:
   * any tower with a `choir` aura is a Choir): the music's harmony line (director.ts `choir`).
   */
  choirLive(): boolean;
}

/** The aura kind that makes a tower a Choir (its harmony line plays while one stands). */
const CHOIR_AURA = 'choir';

/** Whether tower `t` is a live Choir (it projects a `choir` aura at its tier or spec). */
function isChoir(t: FieldTower): boolean {
  if (!t.alive) return false;
  for (const a of t.tierDef?.auras ?? []) if (a.kind === CHOIR_AURA) return true;
  return false;
}

/** A hidden cloaked unit (mirrors sim `cloakedOut`; a burrowed or leaving one makes no steps). */
function hidden(e: FieldEnemy): boolean {
  return e.def !== null && e.def.cloaked && e.revealedTicks <= 0 && !e.burrowed && !e.leaving;
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
  /** When the next hidden footsteps play (sim tick); -1: none on the field last frame. */
  let stepsAt = -1;
  const stepsEvery = Math.max(1, Math.round(CLOAK_SOUNDS.everySec * TICK_HZ));
  /** The live Hollow units' positions as of the last frame (`hollowN` of them). */
  const hollowX: number[] = [];
  const hollowY: number[] = [];
  let hollowN = 0;
  const quietR2 = HOLLOW_QUIET.radiusTiles * HOLLOW_QUIET.radiusTiles;
  /**
   * Each charging tower's charge last frame and its last hum step this charge (CHARGE_SOUNDS), and
   * this frame's.
   */
  let charges = new Map<number, { ticks: number; step: number }>();
  let nextCharges = new Map<number, { ticks: number; step: number }>();
  /** The sim tick of the last frame (a charge's reset is a discharge or a fizzle by the gap). */
  let lastTick = -1;
  /**
   * When the beam's climbing hum plays next, its capped bed, and the night's air (sim ticks; -1:
   * not playing).
   */
  let beamAt = -1;
  const beamEvery = Math.max(1, Math.round(BEAM_SOUNDS.everySec * TICK_HZ));
  let bedAt = -1;
  const bedEvery = Math.max(1, Math.round(BEAM_SOUNDS.bedEverySec * TICK_HZ));
  let airAt = -1;
  const airEvery = Math.max(1, Math.round(DARK_SOUNDS.airEverySec * TICK_HZ));
  const workEvery = Math.max(1, Math.round(DRONE_SOUNDS.workEverySec * TICK_HZ));
  const flyTicks = clearTicks * DRONE_SOUNDS.flyFrac;
  let head = -1;
  let workAt = -1;
  let choir = false;
  return {
    hollowLive: () => hollowN > 0,
    choirLive: () => choir,
    quietAt(x, y) {
      for (let i = 0; i < hollowN; i++) {
        const dx = hollowX[i]! - x; // i < hollowN ≤ length
        const dy = hollowY[i]! - y;
        if (dx * dx + dy * dy <= quietR2) return true;
      }
      return false;
    },
    frame(state, out) {
      const { items, used } = state.enemies;
      present.clear();
      hollowN = 0;
      let anyHidden = false;
      for (let i = 0; i < used; i++) {
        const e = items[i]!; // i < used ≤ items.length
        if (!e.alive || e.def === null) continue;
        if (e.def.faction === HOLLOW_QUIET.faction && !e.leaving) {
          hollowX[hollowN] = e.x;
          hollowY[hollowN] = e.y;
          hollowN++;
        }
        if (hidden(e)) anyHidden = true;
        // Digging in and surfacing (a Digger, or a boss's burrow; a Hollow burrower its own).
        const was = burrowed.get(e.uid);
        if (was !== undefined && was !== e.burrowed) {
          const b = ENEMY_BURROW_SOUNDS[e.def.id] ?? BURROW_SOUNDS;
          out.push(sfx(e.burrowed ? b.dig : b.surface));
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
      // A hidden cloaked unit's footsteps: one voice for all of them, on sim time.
      if (!anyHidden) stepsAt = -1;
      else if (state.tick >= stepsAt) {
        out.push(sfx(CLOAK_SOUNDS.steps));
        stepsAt = state.tick + stepsEvery;
      }
      // A charge attack's hum, a step higher at each quarter of its charge; and its collapse when
      // the charge starts over short of full (it fizzled or was vented, not discharged).
      const towers = state.towers;
      const elapsed = lastTick < 0 ? 1 : Math.max(1, state.tick - lastTick);
      let beamPitchNow: number | null = null;
      choir = false;
      for (let i = 0; i < towers.used; i++) {
        const bank = towers.items[i]!; // i < used ≤ items.length
        if (!choir && isChoir(bank)) choir = true;
        const bp = beamPitch(bank);
        if (bp !== null) beamPitchNow = Math.max(beamPitchNow ?? 0, bp);
        const attack = bank.tierDef?.attack ?? null;
        if (!bank.alive || attack?.kind !== 'charge') continue;
        const full = Math.max(1, bonusChargeTicks(attack, bank));
        const prev = charges.get(bank.uid);
        let last = prev?.step ?? -1;
        if (prev !== undefined && bank.chargeTicks < prev.ticks) {
          // It started over: a discharge if it could have reached full since, else a fizzle.
          const discharged = prev.ticks + elapsed - bank.chargeTicks >= full;
          if (!discharged && prev.ticks >= full * CHARGE_SOUNDS.fizzleFrom) {
            out.push(sfx(CHARGE_SOUNDS.fizzle));
          }
          last = -1;
        }
        if (bank.chargeTicks <= 0) continue;
        const step = Math.min(
          CHARGE_SOUNDS.steps - 1,
          Math.floor(((bank.chargeTicks - 1) * CHARGE_SOUNDS.steps) / full),
        );
        if (step > last) out.push(sfx(CHARGE_SOUNDS.hum, step * CHARGE_SOUNDS.pitchPerStep));
        nextCharges.set(bank.uid, { ticks: bank.chargeTicks, step: Math.max(step, last) });
      }
      const c = charges;
      charges = nextCharges;
      nextCharges = c;
      nextCharges.clear();
      lastTick = state.tick;
      // A beam holding a target hums, one sound for every beam, climbing with the strongest ramp;
      // once that ramp has capped it settles into the held bed (and climbs again as it resets).
      const capped = beamPitchNow === BEAM_SOUNDS.maxPitch;
      if (beamPitchNow === null || capped) beamAt = -1;
      else if (state.tick >= beamAt) {
        out.push(sfx(BEAM_SOUNDS.hum, beamPitchNow));
        beamAt = state.tick + beamEvery;
      }
      if (!capped) bedAt = -1;
      else if (state.tick >= bedAt) {
        out.push(sfx(BEAM_SOUNDS.bed, BEAM_SOUNDS.maxPitch));
        bedAt = state.tick + bedEvery;
      }
      // Sundown: the night's air while it's dark enough, as loud as it is dark.
      const dark = state.dark ?? 0;
      if (dark < DARK_SOUNDS.airFrom) airAt = -1;
      else if (state.tick >= airAt) {
        out.push(sfx(DARK_SOUNDS.air, 0, 0, Math.min(1, dark)));
        airAt = state.tick + airEvery;
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
