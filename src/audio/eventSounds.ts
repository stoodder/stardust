// Sim events → sounds (pure): which sound effects and music cues each drained event plays, from
// the data tables in eventTables.ts and eventTablesAct2.ts (a new tower attack kind, enemy, or
// ability gets its sound by adding a row there, not a branch here). Cosmetic pitch variance (a
// recipe's `jitter`) is the synth's, from its own RNG; nothing here reads or affects the sim. What
// no event announces (a sneeze's tell, a dig, the drone's flight) is fieldSounds.ts's, from the
// state after each frame; so is where the Hollow units stand, which drops the small sounds an
// event places near one (HOLLOW_QUIET).
import type { JingleVariant, SkitterkinDeath } from '../content/presentation.ts';
import type { EnemyFaction, IdSpace } from '../content/types.ts';
import type { SimEvent, SimEventType } from '../sim/index.ts';
import { assertNever } from '../shared/types.ts';
import {
  ALLY_SOUNDS,
  ATTACK_SOUNDS,
  BOMBLET_SOUNDS,
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
import {
  ASSET_HIT_SOUND,
  BLINK_SOUNDS,
  CHECKPOINT_SOUND,
  CLOAK_SOUNDS,
  FACTION_DEATH_SOUNDS,
  HOLLOW_QUIET,
  HUSH_SOUNDS,
  PROJECTILE_SOUNDS,
  PULSE_SOUNDS,
  SHIELD_SOUNDS,
  SKITTERKIN_DEATH_SOUNDS,
  STASIS_SOUNDS,
} from './eventTablesAct2.ts';
import { WAVE_CLEAR_CUE, type CueId } from './music/index.ts';
import { SFX, type SfxId } from './sfx/index.ts';

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
  // Act II's events (T450).
  HushStarted: true,
  Hushed: true,
  // The hush's sound covers it.
  TurnedHeavy: false,
  SkittishBolt: true,
  ShieldPulse: true,
  ShieldHit: true,
  BlinkTell: true,
  Blinked: true,
  BlinkInterrupted: true,
  PulseBurst: true,
  // Crane income and Reel It In's credits (T408): the floater is enough for now.
  TowerIncome: false,
  Revealed: true,
  // Slipping back into the cloak: the footsteps resume (fieldSounds.ts).
  Cloaked: false,
  AssetHit: true,
  // The loss cue follows it (MapLost) and stands alone.
  AssetLost: false,
  CheckpointReached: true,
  ClickableChanged: false,
  Interacted: false,
  // M5's (T500a seams): their sounds arrive with T550.
  PhaseShift: false,
  ShieldReformed: false,
  StoodDown: false,
  ObjectiveChanged: false,
  RefugeeEvacuated: false,
  RefugeeLost: false,
  BeamChanged: false,
  EchoBurst: false,
  StasisArea: false,
  DarknessShift: false,
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

/**
 * What the event sounds need to know about the battle's enemies (content's compiled defs) and its
 * field (fieldSounds.ts).
 */
export interface EnemyLookup {
  /** Whether `enemy` splits when it dies (a Bunchling). */
  splits(enemy: string): boolean;
  /** `enemy`'s faction (its death sound), or null if unknown (it pops). */
  faction(enemy: string): EnemyFaction | null;
  /** Whether (x, y) (tiles) is inside a Hollow unit's quiet (HOLLOW_QUIET), as of the last frame. */
  quietAt(x: number, y: number): boolean;
}
const NO_ENEMIES: EnemyLookup = { splits: () => false, faction: () => null, quietAt: () => false };

/** The map's presentation dials the event sounds play by (story/presentation.ts). */
export interface SoundDials {
  /**
   * The wave-clear jingle (WAVE_CLEAR_CUE), read at each WaveCleared: it can change mid-battle
   * (A2M4's truth scene turns it minor; app/audio.ts passes a live getter).
   */
  readonly jingle: JingleVariant;
  /** How a Skitterkin dies (SKITTERKIN_DEATH_SOUNDS). */
  readonly skitterkinDeath: SkitterkinDeath;
}

/** Whether `id` is one of the small sounds the Hollow's quiet drops (HOLLOW_QUIET). */
function quietable(id: SfxId): boolean {
  return (
    SFX[id].priority <= HOLLOW_QUIET.maxPriority &&
    !(HOLLOW_QUIET.keep as readonly SfxId[]).includes(id)
  );
}

/**
 * Event sounds for a battle with presentation dials `dials` (story/presentation.ts
 * `presentationOfMap`).
 */
export function createEventSounds(
  dials: SoundDials,
  enemies: EnemyLookup = NO_ENEMIES,
): EventSounds {
  /** A Skitterkin's death sound under this map's dial. */
  const skitterkinDeath = SKITTERKIN_DEATH_SOUNDS[dials.skitterkinDeath];
  /** The death sound of `enemy` (by its faction; enemies.md § 8), or null for none. */
  const deathSound = (enemy: string): SfxId | null => {
    const faction = enemies.faction(enemy);
    if (faction === 'skitterkin') return skitterkinDeath;
    return (faction === null ? undefined : FACTION_DEATH_SOUNDS[faction]) ?? 'enemy_pop';
  };
  /** Pushes a sound placed at (x, y), unless the Hollow's quiet swallows it there. */
  const at = (out: SoundCall[], id: SfxId, x: number, y: number, pitch = 0, delay = 0): void => {
    if (quietable(id) && enemies.quietAt(x, y)) return;
    out.push(sfx(id, pitch, delay));
  };
  /** Fired projectiles' kinds (or their PROJECTILE_SOUNDS sprite) by uid, for their landing. */
  const flying = new Map<number, string>();
  /** Allies' kinds by uid, so their shots find their sound. */
  const allies = new Map<number, string>();
  /** The chain attack whose hits are arriving (its tower, or -1), and how many have. */
  let chainTower = -1;
  let chainHits = 0;
  /**
   * A hit that took no HP waits for the next event before it plinks: if it's that hit's ShieldHit,
   * the shield's ripple says it instead (an Energy hit stripping a shield isn't the wrong tool).
   */
  let plink: { x: number; y: number } | null = null;
  const flushPlink = (out: SoundCall[]): void => {
    if (plink !== null) at(out, PLINK_SOUNDS.nothing, plink.x, plink.y);
    plink = null;
  };
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
            : (PROJECTILE_SOUNDS[kind] ?? ATTACK_SOUNDS[kind])?.land;
      if (land) at(out, land, e.x, e.y);
    } else if (e.towerUid === chainTower) {
      // The arc runs down the line: each jump a beat later and a step higher.
      const k = chainHits++;
      if (k > 0) {
        const pitch = Math.min(k * CHAIN_SOUNDS.pitchPerJump, CHAIN_SOUNDS.maxPitch);
        at(out, CHAIN_SOUNDS.jump, e.x, e.y, pitch, k * CHAIN_SOUNDS.gapSec);
      }
    }
  };
  return {
    sounds(e, out) {
      if (e.type !== 'ShieldHit') flushPlink(out);
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
          const own = e.sprite === null ? undefined : PROJECTILE_SOUNDS[e.sprite];
          const s = bomblet ? BOMBLET_SOUNDS : (own ?? ATTACK_SOUNDS[e.kind]);
          // A shot sounds where it's fired from (the tower).
          if (s?.fire) at(out, s.fire, e.x, e.y);
          if (e.uid !== 0 && s?.land) {
            flying.set(e.uid, bomblet ? BOMBLET_KIND : own !== undefined ? e.sprite! : e.kind);
          }
          chainTower = e.kind === 'chain' ? e.towerUid : -1;
          chainHits = 0;
          return;
        }
        case 'ProjectileHit':
          landing(e, out);
          // The "wrong tool" tells: a hit that did nothing (unless its shield ripples, above),
          // else one that armor blunted.
          if (e.hits > 0 && e.damage === 0) plink = { x: e.x, y: e.y };
          else if (e.reduced) at(out, PLINK_SOUNDS.reduced, e.x, e.y);
          return;
        case 'EnemyDied': {
          const id = deathSound(e.enemy);
          if (id !== null) at(out, id, e.x, e.y, ENEMY_POP_PITCH[e.enemy] ?? 0);
          if (enemies.splits(e.enemy)) at(out, SPLIT_SOUND.id, e.x, e.y, 0, SPLIT_SOUND.delay);
          return;
        }
        case 'EnemyLeaked':
          if (e.leak > 0) out.push(sfx('leak'));
          return;
        case 'SackBurst':
          at(out, 'sack_pop', e.x, e.y);
          return;
        case 'WaveStarted':
          if (e.early) out.push(sfx('wave_call'), sfx('wave_start', 0, HORN_AFTER_CALL_SEC));
          else out.push(sfx('wave_start'));
          return;
        case 'WaveCleared':
          if (!ended && WAVE_CLEAR_CUE[dials.jingle] !== null) pendingClear = true;
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
          plink = null;
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
        case 'BossEnded': {
          const s = bossSounds(e.enemy);
          out.push(sfx(s.end));
          if (!ended) out.push({ kind: 'cue', id: s.endCue });
          return;
        }
        case 'WreckageCleared':
          out.push(sfx(DRONE_SOUNDS.cleared));
          return;
        // Act II (T450). The Aelari: shields ripple and shatter, pulses and blinks tell, fire,
        // and fizzle when Stasis cuts the tell short (one fizzle for both).
        case 'ShieldHit':
          // It replaces its hit's nothing-plink, if it was waiting.
          plink = null;
          if (e.broken) out.push(sfx(SHIELD_SOUNDS.shatter));
          else at(out, SHIELD_SOUNDS.ripple, e.x, e.y);
          return;
        case 'ShieldPulse':
          out.push(sfx(PULSE_SOUNDS[e.phase]));
          return;
        case 'BlinkTell':
          out.push(sfx(BLINK_SOUNDS.tell));
          return;
        case 'Blinked':
          out.push(sfx(BLINK_SOUNDS.blinked));
          return;
        case 'BlinkInterrupted':
          out.push(sfx(BLINK_SOUNDS.interrupted));
          return;
        // The hush: the breath, the hush itself, and a runner bolting in panic.
        case 'HushStarted':
          out.push(sfx(HUSH_SOUNDS.tell));
          return;
        case 'Hushed':
          out.push(sfx(HUSH_SOUNDS.hushed));
          return;
        case 'SkittishBolt':
          out.push(sfx(HUSH_SOUNDS.bolt));
          return;
        // Flash Freeze's frost, and Stasis locking in when it froze anything.
        case 'PulseBurst':
          at(out, STASIS_SOUNDS.burst, e.x, e.y);
          if (e.frozen > 0) out.push(sfx(STASIS_SOUNDS.lock, 0, STASIS_SOUNDS.lockAfterSec));
          return;
        case 'Revealed':
          out.push(sfx(CLOAK_SOUNDS.reveal));
          return;
        case 'AssetHit':
          out.push(sfx(ASSET_HIT_SOUND));
          return;
        case 'CheckpointReached':
          out.push(sfx(CHECKPOINT_SOUND));
          return;
        // The HUD's notice plays the rejection buzz (it also covers rejections the HUD makes).
        case 'CommandRejected':
        case 'EnemySpawned':
        case 'CountdownStarted':
        case 'ScriptCue':
        case 'NotFiringAtSkitterkin':
        case 'LinkBroken':
        case 'ObjectiveProgress':
        case 'TurnedHeavy':
        case 'TowerIncome':
        case 'Cloaked':
        case 'AssetLost':
        case 'ClickableChanged':
        case 'Interacted':
        case 'PhaseShift':
        case 'ShieldReformed':
        case 'StoodDown':
        case 'ObjectiveChanged':
        case 'RefugeeEvacuated':
        case 'RefugeeLost':
        case 'BeamChanged':
        case 'EchoBurst':
        case 'StasisArea':
        case 'DarknessShift':
          return;
        default:
          assertNever(e);
      }
    },
    endFrame(out) {
      flushPlink(out);
      const cue = WAVE_CLEAR_CUE[dials.jingle];
      if (pendingClear && !ended && cue !== null) out.push({ kind: 'cue', id: cue });
      if (pendingForfeit && !ended) out.push(sfx('medal_forfeit'));
      pendingClear = false;
      pendingForfeit = false;
      chainTower = -1;
      chainHits = 0;
    },
  };
}
