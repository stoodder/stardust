// Sim events → sounds (pure): which sound effects and music cues each drained event plays. The
// tables are data, so a new tower attack kind, enemy, or ability gets its sound by adding a row,
// not a branch. Cosmetic pitch variance (a recipe's `jitter`) is the synth's, from its own RNG;
// nothing here reads or affects the sim.
import type { Act, IdSpace } from '../content/types.ts';
import type { SimEvent } from '../sim/index.ts';
import { assertNever } from '../shared/types.ts';
import { WAVE_CLEAR_CUE, type CueId } from './music/index.ts';
import type { SfxId } from './sfx/index.ts';

/** A sound to play: an effect (pitch in semitones, delay in seconds) or a music cue. */
export type SoundCall =
  | { readonly kind: 'sfx'; readonly id: SfxId; readonly pitch: number; readonly delay: number }
  | { readonly kind: 'cue'; readonly id: CueId };

/** What each attack kind sounds like as it fires, and as its projectile lands (if it has one). */
export const ATTACK_SOUNDS: Readonly<
  Partial<Record<string, { readonly fire: SfxId | null; readonly land: SfxId | null }>>
> = {
  hitscan: { fire: 'rivet_shot', land: null },
  lobbed: { fire: 'thumper_launch', land: 'thumper_impact' },
  pulse: { fire: 'sprinkler_pulse', land: null },
};

/**
 * A Cluster Thumper's bomblets (a lobbed shot with no target, scattered where its shell landed):
 * no launch of their own (the shell's impact covers it), and one rate-limited crackle as they land.
 */
export const BOMBLET_SOUNDS = { fire: null, land: 'bomblet_pop' } as const satisfies {
  readonly fire: SfxId | null;
  readonly land: SfxId | null;
};
const BOMBLET_KIND = 'bomblet';

/** Each enemy's pop pitch (semitones): small and quick is high, big and slow is low. */
export const ENEMY_POP_PITCH: Readonly<Partial<Record<string, number>>> = {
  nibbler: 0,
  zoomer: 4,
  chonk: -6,
};

/**
 * Each ability's cast sound, and the sounds when its zone lands (the binder watches the zone; the
 * Orbital Strike's beam and boom land with it, D022).
 */
export const ABILITY_SOUNDS: Readonly<
  Partial<Record<string, { readonly cast: SfxId; readonly land: readonly SfxId[] }>>
> = {
  orbital_strike: { cast: 'strike_charge', land: ['strike_beam', 'strike_boom'] },
  // The segment starts as it's cast; its end is quiet.
  suppressing_fire: { cast: 'suppress_burst', land: [] },
};

/** Each ally kind's sounds: as it takes its post (AllySpawned), and per shot (AllyAttacked). */
export const ALLY_SOUNDS: Readonly<
  Partial<Record<string, { readonly spawn: SfxId | null; readonly attack: SfxId | null }>>
> = {
  bricks: { spawn: 'bricks_ready', attack: 'bricks_shot' },
};

/** Semitones an upgrade's arpeggio rises per tier above 2. */
export const UPGRADE_PITCH_PER_TIER = 2;
/** The early-call cue plays first; the wave's horn follows after this (s). */
export const HORN_AFTER_CALL_SEC = 0.25;

const sfx = (id: SfxId, pitch = 0, delay = 0): SoundCall => ({ kind: 'sfx', id, pitch, delay });

export interface EventSounds {
  /** Appends the sounds `e` plays now to `out`. */
  sounds(e: SimEvent<IdSpace>, out: SoundCall[]): void;
  /**
   * Appends what waited for the end of the frame: the wave-clear sting, unless the map ended in
   * the same frame (the win jingle replaces it).
   */
  endFrame(out: SoundCall[]): void;
}

/** Event sounds for a battle in act `act`. */
export function createEventSounds(act: Act): EventSounds {
  /** Fired projectiles' kinds by uid, so their landing finds its sound. */
  const flying = new Map<number, string>();
  /** Allies' kinds by uid, so their shots find their sound. */
  const allies = new Map<number, string>();
  let pendingClear = false;
  let ended = false;
  return {
    sounds(e, out) {
      switch (e.type) {
        case 'TowerBuilt':
          out.push(sfx('build'));
          return;
        case 'TowerUpgraded':
          out.push(sfx('upgrade', Math.max(0, e.tier - 2) * UPGRADE_PITCH_PER_TIER));
          return;
        case 'TowerSold':
          out.push(sfx('sell'));
          return;
        case 'TowerClassUnlocked':
          out.push(sfx('unlock'));
          return;
        case 'ProjectileFired': {
          const bomblet = e.kind === 'lobbed' && e.targetUid === 0;
          const s = bomblet ? BOMBLET_SOUNDS : ATTACK_SOUNDS[e.kind];
          if (s?.fire) out.push(sfx(s.fire));
          if (e.uid !== 0 && s?.land) flying.set(e.uid, bomblet ? BOMBLET_KIND : e.kind);
          return;
        }
        case 'ProjectileHit': {
          if (e.uid === 0) return;
          const kind = flying.get(e.uid);
          flying.delete(e.uid);
          const land =
            kind === BOMBLET_KIND
              ? BOMBLET_SOUNDS.land
              : kind === undefined
                ? null
                : ATTACK_SOUNDS[kind]?.land;
          if (land) out.push(sfx(land));
          return;
        }
        case 'EnemyDied':
          out.push(sfx('enemy_pop', ENEMY_POP_PITCH[e.enemy] ?? 0));
          return;
        case 'EnemyLeaked':
          if (e.leak > 0) out.push(sfx('leak'));
          return;
        case 'WaveStarted':
          if (e.early) out.push(sfx('wave_call'), sfx('wave_start', 0, HORN_AFTER_CALL_SEC));
          else out.push(sfx('wave_start'));
          return;
        case 'WaveCleared':
          if (!ended && WAVE_CLEAR_CUE[act]) pendingClear = true;
          return;
        case 'AbilityUsed': {
          const s = ABILITY_SOUNDS[e.ability];
          if (s !== undefined) out.push(sfx(s.cast));
          return;
        }
        case 'AllySpawned': {
          allies.set(e.uid, e.kind);
          const id = ALLY_SOUNDS[e.kind]?.spawn;
          if (id) out.push(sfx(id));
          return;
        }
        case 'AllyAttacked': {
          const kind = allies.get(e.uid);
          const id = kind === undefined ? null : ALLY_SOUNDS[kind]?.attack;
          if (id) out.push(sfx(id));
          return;
        }
        case 'AllyRemoved':
          allies.delete(e.uid);
          return;
        case 'MapWon':
        case 'MapLost':
          ended = true;
          pendingClear = false;
          out.push({ kind: 'cue', id: e.type === 'MapWon' ? 'win' : 'lose' });
          return;
        // The HUD's notice plays the rejection buzz (it also covers rejections the HUD makes).
        case 'CommandRejected':
        case 'EnemySpawned':
        case 'CountdownStarted':
        case 'ScriptCue':
        // Their sounds come with their M2 tasks (T202 specs and links, T206 Hold Fire).
        case 'TowerSpecialized':
        case 'HoldFireChanged':
        case 'SpareRunnersChanged':
        case 'NotFiringAtSkitterkin':
        case 'LinkFormed':
        case 'LinkBroken':
        case 'MedalProgress':
          return;
        default:
          assertNever(e);
      }
    },
    endFrame(out) {
      const cue = WAVE_CLEAR_CUE[act];
      if (pendingClear && !ended && cue) out.push({ kind: 'cue', id: cue });
      pendingClear = false;
    },
  };
}
