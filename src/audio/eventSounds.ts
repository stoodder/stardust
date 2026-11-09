// Sim events → sounds (pure): which sound effects and music cues each drained event plays, from
// the data tables in eventTables.ts (a new tower attack kind, enemy, or ability gets its sound by
// adding a row there, not a branch here). Cosmetic pitch variance (a recipe's `jitter`) is the
// synth's, from its own RNG; nothing here reads or affects the sim. What no event announces (a
// sneeze's tell, a dig, the drone's flight) is fieldSounds.ts's, from the state after each frame.
import type { Act, IdSpace } from '../content/types.ts';
import type { SimEvent, SimEventType } from '../sim/index.ts';
import { assertNever } from '../shared/types.ts';
import {
  ALLY_SOUNDS,
  ATTACK_SOUNDS,
  BOMBLET_SOUNDS,
  BOSS_END_CUE,
  bossSounds,
  CHAIN_SOUNDS,
  DRONE_SOUNDS,
  ENEMY_POP_PITCH,
  FIRE_CONTROL_SOUNDS,
  HORN_AFTER_CALL_SEC,
  NEUTRAL_SOUNDS,
  PLINK_SOUNDS,
  SPLIT_SOUND,
  ABILITY_SOUNDS,
  UPGRADE_PITCH_PER_TIER,
} from './eventTables.ts';
import { WAVE_CLEAR_CUE, type CueId } from './music/index.ts';
import type { SfxId } from './sfx/index.ts';

export {
  ABILITY_SOUNDS,
  ALLY_SOUNDS,
  ATTACK_SOUNDS,
  BOMBLET_SOUNDS,
  CHAIN_SOUNDS,
  ENEMY_POP_PITCH,
  FIRE_CONTROL_SOUNDS,
  HORN_AFTER_CALL_SEC,
  PLINK_SOUNDS,
  UPGRADE_PITCH_PER_TIER,
} from './eventTables.ts';

/** A sound to play: an effect (pitch in semitones, delay in seconds) or a music cue. */
export type SoundCall =
  | { readonly kind: 'sfx'; readonly id: SfxId; readonly pitch: number; readonly delay: number }
  | { readonly kind: 'cue'; readonly id: CueId };

export const sfx = (id: SfxId, pitch = 0, delay = 0): SoundCall => ({
  kind: 'sfx',
  id,
  pitch,
  delay,
});

/** The `flying` kind of a Cluster Thumper's bomblet (BOMBLET_SOUNDS). */
const BOMBLET_KIND = 'bomblet';

/**
 * Whether each sim event type can make a sound. Exhaustive, so a new event type must be sorted
 * here; the binder subscribes to exactly the `true` rows (SOUND_EVENT_TYPES).
 */
const MAKES_SOUND: Readonly<Record<SimEventType, boolean>> = {
  TowerBuilt: true,
  TowerUpgraded: true,
  TowerSold: true,
  TowerClassUnlocked: true,
  ProjectileFired: true,
  ProjectileHit: true,
  EnemyDied: true,
  EnemyLeaked: true,
  SackBurst: true,
  WaveStarted: true,
  WaveCleared: true,
  AbilityUsed: true,
  AllySpawned: true,
  AllyAttacked: true,
  AllyRemoved: true,
  MapWon: true,
  MapLost: true,
  HoldFireChanged: true,
  SpareRunnersChanged: true,
  LinkFormed: true,
  TowerSpecialized: true,
  MedalProgress: true,
  ObjectiveProgress: false,
  CommandRejected: false,
  EnemySpawned: false,
  CountdownStarted: false,
  ScriptCue: false,
  NotFiringAtSkitterkin: false,
  LinkBroken: false,
  NeutralHit: true,
  NeutralExited: true,
  BossPhase: true,
  BossEnded: true,
  WreckageCleared: true,
};

/** The sim event types the binder hands to `EventSounds.sounds` (the rest are always silent). */
export const SOUND_EVENT_TYPES: readonly SimEventType[] = Object.keys(MAKES_SOUND)
  .filter((k): k is SimEventType => Object.hasOwn(MAKES_SOUND, k))
  .filter((t) => MAKES_SOUND[t]);

export interface EventSounds {
  /** Appends the sounds `e` plays now to `out`. */
  sounds(e: SimEvent<IdSpace>, out: SoundCall[]): void;
  /**
   * Appends what waited for the end of the frame: the wave-clear sting and the medal-forfeit
   * fall (one each per frame at most), unless the map ended in the same frame or earlier (the
   * win or lose cue stands alone).
   */
  endFrame(out: SoundCall[]): void;
}

/** What the event sounds need to know about the battle's enemies (content's compiled defs). */
export interface EnemyLookup {
  /** Whether `enemy` splits when it dies (a Bunchling). */
  splits(enemy: string): boolean;
}
const NO_ENEMIES: EnemyLookup = { splits: () => false };

/** Event sounds for a battle in act `act`. */
export function createEventSounds(act: Act, enemies: EnemyLookup = NO_ENEMIES): EventSounds {
  /** Fired projectiles' kinds by uid, so their landing finds its sound. */
  const flying = new Map<number, string>();
  /** Allies' kinds by uid, so their shots find their sound. */
  const allies = new Map<number, string>();
  /** The chain attack whose hits are arriving (its tower, or -1), and how many have. */
  let chainTower = -1;
  let chainHits = 0;
  let pendingClear = false;
  let pendingForfeit = false;
  let ended = false;
  const landing = (e: Extract<SimEvent<IdSpace>, { type: 'ProjectileHit' }>, out: SoundCall[]) => {
    if (e.uid !== 0) {
      const kind = flying.get(e.uid);
      flying.delete(e.uid);
      const land =
        kind === BOMBLET_KIND
          ? BOMBLET_SOUNDS.land
          : kind === undefined
            ? null
            : ATTACK_SOUNDS[kind]?.land;
      if (land) out.push(sfx(land));
    } else if (e.towerUid === chainTower) {
      // The arc runs down the line: each jump a beat later and a step higher.
      const k = chainHits++;
      if (k > 0) {
        const pitch = Math.min(k * CHAIN_SOUNDS.pitchPerJump, CHAIN_SOUNDS.maxPitch);
        out.push(sfx(CHAIN_SOUNDS.jump, pitch, k * CHAIN_SOUNDS.gapSec));
      }
    }
  };
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
          chainTower = e.kind === 'chain' ? e.towerUid : -1;
          chainHits = 0;
          return;
        }
        case 'ProjectileHit':
          landing(e, out);
          // The "wrong tool" tells: a hit that did nothing, else one that armor blunted.
          if (e.hits > 0 && e.damage === 0) out.push(sfx(PLINK_SOUNDS.nothing));
          else if (e.reduced) out.push(sfx(PLINK_SOUNDS.reduced));
          return;
        case 'EnemyDied':
          out.push(sfx('enemy_pop', ENEMY_POP_PITCH[e.enemy] ?? 0));
          if (enemies.splits(e.enemy)) out.push(sfx(SPLIT_SOUND.id, 0, SPLIT_SOUND.delay));
          return;
        case 'EnemyLeaked':
          if (e.leak > 0) out.push(sfx('leak'));
          return;
        case 'SackBurst':
          out.push(sfx('sack_pop'));
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
          pendingForfeit = false;
          out.push({ kind: 'cue', id: e.type === 'MapWon' ? 'win' : 'lose' });
          return;
        case 'HoldFireChanged':
          out.push(sfx(e.on ? FIRE_CONTROL_SOUNDS.on : FIRE_CONTROL_SOUNDS.off));
          return;
        case 'SpareRunnersChanged': {
          const id = e.on ? FIRE_CONTROL_SOUNDS.on : FIRE_CONTROL_SOUNDS.off;
          out.push(sfx(id, FIRE_CONTROL_SOUNDS.sparePitch));
          return;
        }
        // M2's best moments get their own sounds (D059): a link's chime, a spec's flourish, and
        // a soft, kind falling third when a medal slips away mid-run (never a buzzer; at most one
        // per frame, and never over the win or lose cue, D061).
        case 'LinkFormed':
          out.push(sfx('link_chime'));
          return;
        case 'TowerSpecialized':
          out.push(sfx('specialize'));
          return;
        case 'MedalProgress':
          if (e.status === 'forfeited' && !ended) pendingForfeit = true;
          return;
        // Gerald (D072): his chime as a shot plinks off him, his whistle as he leaves.
        case 'NeutralHit':
        case 'NeutralExited': {
          const s = Object.hasOwn(NEUTRAL_SOUNDS, e.enemy) ? NEUTRAL_SOUNDS[e.enemy] : undefined;
          if (s !== undefined) out.push(sfx(e.type === 'NeutralHit' ? s.hit : s.exit));
          return;
        }
        // The boss (D073): its arrival, each later phase, and its ending with the sting.
        case 'BossPhase': {
          const s = bossSounds(e.enemy);
          out.push(sfx(e.phase <= 1 ? s.arrive : s.phase));
          return;
        }
        case 'BossEnded':
          out.push(sfx(bossSounds(e.enemy).end));
          if (!ended) out.push({ kind: 'cue', id: BOSS_END_CUE });
          return;
        case 'WreckageCleared':
          out.push(sfx(DRONE_SOUNDS.cleared));
          return;
        // The HUD's notice plays the rejection buzz (it also covers rejections the HUD makes).
        case 'CommandRejected':
        case 'EnemySpawned':
        case 'CountdownStarted':
        case 'ScriptCue':
        case 'NotFiringAtSkitterkin':
        case 'LinkBroken':
          return;
        default:
          assertNever(e);
      }
    },
    endFrame(out) {
      const cue = WAVE_CLEAR_CUE[act];
      if (pendingClear && !ended && cue) out.push({ kind: 'cue', id: cue });
      if (pendingForfeit && !ended) out.push(sfx('medal_forfeit'));
      pendingClear = false;
      pendingForfeit = false;
      chainTower = -1;
      chainHits = 0;
    },
  };
}
