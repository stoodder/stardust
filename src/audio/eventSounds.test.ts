import { describe, expect, it } from 'vitest';
import { SFX } from './sfx/index.ts';
import type { AttackKind, IdSpace } from '../content/types.ts';
import type { SimEvent } from '../sim/index.ts';
import {
  createEventSounds,
  ENEMY_POP_PITCH,
  HORN_AFTER_CALL_SEC,
  type SoundCall,
} from './eventSounds.ts';

const fired = (kind: AttackKind, uid: number): SimEvent<IdSpace> => ({
  type: 'ProjectileFired',
  uid,
  towerUid: 1,
  kind,
  targetUid: 2,
  x: 0,
  y: 0,
  targetX: 1,
  targetY: 1,
  sprite: null,
  flightTicks: 0,
  radiusTiles: 0,
});

/** A Cluster Thumper bomblet: a lobbed shot with no target. */
const bomblet = (uid: number): SimEvent<IdSpace> => ({ ...fired('lobbed', uid), targetUid: 0 });

function run(events: SimEvent<IdSpace>[], act: 1 | 3 = 1): SoundCall[] {
  const s = createEventSounds(act);
  const out: SoundCall[] = [];
  for (const e of events) s.sounds(e, out);
  s.endFrame(out);
  return out;
}

const ids = (calls: SoundCall[]): string[] => calls.map((c) => `${c.kind}:${c.id}`);

const died = (enemy: string): SimEvent<IdSpace> => ({
  type: 'EnemyDied',
  uid: 1,
  enemy,
  bounty: 1,
  killer: { kind: 'tower', uid: 1 },
  x: 0,
  y: 0,
});

const leak = (n: number): SimEvent<IdSpace> => ({
  type: 'EnemyLeaked',
  uid: 1,
  enemy: 'nibbler',
  leak: n,
});

const cleared = (wave: number): SimEvent<IdSpace> => ({ type: 'WaveCleared', wave, bonus: 24 });

describe('event sounds', () => {
  it('maps tower events to their sounds, upgrades rising by tier', () => {
    const calls = run([
      { type: 'TowerBuilt', uid: 1, tower: 'rivet', tile: [1, 1], cost: 100 },
      { type: 'TowerUpgraded', uid: 1, tier: 2, cost: 80 },
      { type: 'TowerUpgraded', uid: 1, tier: 3, cost: 120 },
      { type: 'TowerSold', uid: 1, refund: 70 },
      { type: 'TowerClassUnlocked', tower: 'thumper' },
    ]);
    expect(ids(calls)).toEqual([
      'sfx:build',
      'sfx:upgrade',
      'sfx:upgrade',
      'sfx:sell',
      'sfx:unlock',
    ]);
    expect(calls.map((c) => (c.kind === 'sfx' ? c.pitch : null))).toEqual([0, 0, 2, 0, 0]);
  });

  it('gives each attack kind its shot, and a shell its landing', () => {
    expect(ids(run([fired('hitscan', 0), fired('pulse', 0), fired('lobbed', 9)]))).toEqual([
      'sfx:rivet_shot',
      'sfx:sprinkler_pulse',
      'sfx:thumper_launch',
    ]);
    const landing = run([
      fired('lobbed', 9),
      { type: 'ProjectileHit', uid: 9, towerUid: 1, x: 1, y: 1, hits: 2 },
      // A hitscan hit (uid 0) and a second landing of the same shell make no sound.
      { type: 'ProjectileHit', uid: 0, towerUid: 1, x: 1, y: 1, hits: 1 },
      { type: 'ProjectileHit', uid: 9, towerUid: 1, x: 1, y: 1, hits: 0 },
    ]);
    expect(ids(landing)).toEqual(['sfx:thumper_launch', 'sfx:thumper_impact']);
    // Attack kinds with no sound yet stay silent.
    expect(run([fired('beam', 0)])).toEqual([]);
  });

  it("merges a Cluster Thumper's bomblets: no launch each, one rate-limited crackle on landing", () => {
    const calls = run([
      bomblet(20),
      bomblet(21),
      { type: 'ProjectileHit', uid: 20, towerUid: 1, x: 1, y: 1, hits: 1 },
      { type: 'ProjectileHit', uid: 21, towerUid: 1, x: 1, y: 1, hits: 0 },
    ]);
    expect(ids(calls)).toEqual(['sfx:bomblet_pop', 'sfx:bomblet_pop']);
    expect(SFX.bomblet_pop.maxVoices).toBe(1);
    expect(SFX.bomblet_pop.minGapMs).toBeGreaterThanOrEqual(100);
  });

  it('pitches enemy pops by type', () => {
    const calls = run([died('nibbler'), died('zoomer'), died('chonk'), died('unknown')]);
    expect(calls.map((c) => (c.kind === 'sfx' ? c.pitch : null))).toEqual([
      ENEMY_POP_PITCH['nibbler'],
      ENEMY_POP_PITCH['zoomer'],
      ENEMY_POP_PITCH['chonk'],
      0,
    ]);
    expect(ENEMY_POP_PITCH['zoomer']).toBeGreaterThan(ENEMY_POP_PITCH['chonk']!);
  });

  it('alarms on a leak that costs integrity, not on a free one', () => {
    expect(ids(run([leak(1), leak(0)]))).toEqual(['sfx:leak']);
  });

  it('plays the horn for a wave, after the call cue when it was called early', () => {
    expect(ids(run([{ type: 'WaveStarted', wave: 2, early: false, bonus: 0 }]))).toEqual([
      'sfx:wave_start',
    ]);
    const early = run([{ type: 'WaveStarted', wave: 2, early: true, bonus: 13 }]);
    expect(early).toEqual([
      { kind: 'sfx', id: 'wave_call', pitch: 0, delay: 0 },
      { kind: 'sfx', id: 'wave_start', pitch: 0, delay: HORN_AFTER_CALL_SEC },
    ]);
  });

  it('charges the Orbital Strike on cast', () => {
    const cast = run([
      { type: 'AbilityUsed', slot: 1, uid: 4, ability: 'orbital_strike', target: [4, 3] },
    ]);
    expect(ids(cast)).toEqual(['sfx:strike_charge']);
  });

  it('rattles Suppressing Fire on cast, and gives Bricks his post and his shots', () => {
    const calls = run([
      { type: 'AbilityUsed', slot: 2, uid: 5, ability: 'suppressing_fire', target: [4, 2] },
      { type: 'AllySpawned', uid: 2, kind: 'bricks', x: 7.5, y: 2.5 },
      { type: 'AllyAttacked', uid: 2, targetUid: 9, x: 7.5, y: 2.5, targetX: 6, targetY: 3 },
      // An ally with no sounds yet (a militia post), and an unknown uid, stay silent.
      { type: 'AllySpawned', uid: 3, kind: 'militia', x: 1.5, y: 1.5 },
      { type: 'AllyAttacked', uid: 3, targetUid: 9, x: 1.5, y: 1.5, targetX: 6, targetY: 3 },
      { type: 'AllyAttacked', uid: 8, targetUid: 9, x: 1.5, y: 1.5, targetX: 6, targetY: 3 },
      { type: 'AllyRemoved', uid: 2 },
      { type: 'AllyAttacked', uid: 2, targetUid: 9, x: 7.5, y: 2.5, targetX: 6, targetY: 3 },
    ]);
    expect(ids(calls)).toEqual(['sfx:suppress_burst', 'sfx:bricks_ready', 'sfx:bricks_shot']);
  });

  it('stings each wave clear once per frame, but not when the map ends in the same frame', () => {
    expect(ids(run([cleared(1), cleared(2)]))).toEqual(['cue:bright_sting']);
    expect(ids(run([cleared(7), { type: 'MapWon' }]))).toEqual(['cue:win']);
    expect(ids(run([{ type: 'MapLost' }]))).toEqual(['cue:lose']);
    // Act III has no wave-clear jingle (core-loop §6.7).
    expect(run([cleared(1)], 3)).toEqual([]);
  });
});
