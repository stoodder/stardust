// Act III's presentation dials in the event sounds (T613; core-loop.md § 6.7, enemies.md § 8): no
// win jingle (the jingle stops playing), and the Hollow die with no sound (T601d). Other acts keep
// theirs; the dials come from content/presentation.ts through story/presentation.ts.
import { describe, expect, it } from 'vitest';
import { PRESENTATION } from '../content/presentation.ts';
import type { EnemyFaction, IdSpace } from '../content/types.ts';
import type { SimEvent } from '../sim/index.ts';
import { createEventSounds, type SoundCall, type SoundDials } from './eventSounds.ts';

type E = SimEvent<IdSpace>;

const FACTIONS: Readonly<Record<string, EnemyFaction>> = {
  mote: 'hollow',
  maw: 'hollow',
  compliance: 'everglow',
};

function run(dials: SoundDials, events: E[]): string[] {
  const s = createEventSounds(dials, {
    splits: () => false,
    faction: (id) => FACTIONS[id] ?? null,
    quietAt: () => false,
  });
  const out: SoundCall[] = [];
  for (const e of events) s.sounds(e, out);
  s.endFrame(out);
  return out.map((c) => `${c.kind}:${c.id}`);
}

const died = (enemy: string): E => ({
  type: 'EnemyDied',
  uid: 1,
  enemy,
  bounty: 1,
  killer: { kind: 'tower', uid: 1 },
  x: 2,
  y: 2,
});

const { byAct } = PRESENTATION;

describe("Act III's sound dials (T613)", () => {
  it('plays no win jingle in Act III; its loss hums, never the sad trombone', () => {
    expect(run(byAct[3], [{ type: 'MapWon' }])).toEqual([]);
    expect(run(byAct[3], [{ type: 'MapLost' }])).toEqual(['cue:lose_hush']);
    for (const act of [1, 2] as const) {
      expect(run(byAct[act], [{ type: 'MapLost' }]), String(act)).toEqual(['cue:lose']);
    }
    for (const act of [1, 2, 'finale'] as const) {
      expect(run(byAct[act], [{ type: 'MapWon' }]), String(act)).toEqual(['cue:win']);
    }
  });

  it('lets the Hollow die silently in Act III, and only the Hollow', () => {
    expect(run(byAct[3], [died('mote'), died('maw')])).toEqual([]);
    expect(run(byAct[3], [died('compliance')])).not.toEqual([]);
    expect(run(byAct[2], [died('mote')])).toEqual(['sfx:hollow_unravel']);
  });

  it('keeps the old behaviour when a caller passes no new dial', () => {
    expect(run({ jingle: 'none', skitterkinDeath: 'linger' }, [{ type: 'MapWon' }])).toEqual([
      'cue:win',
    ]);
    expect(run({ jingle: 'none', skitterkinDeath: 'linger' }, [died('mote')])).toEqual([
      'sfx:hollow_unravel',
    ]);
  });
});

const withTowers = (towers: Readonly<Record<number, string>>) =>
  createEventSounds(byAct[3], {
    splits: () => false,
    faction: (id) => FACTIONS[id] ?? null,
    quietAt: () => false,
    tower: (uid) => towers[uid] ?? null,
  });
const play = (s: ReturnType<typeof createEventSounds>, events: E[]): SoundCall[] => {
  const out: SoundCall[] = [];
  for (const e of events) s.sounds(e, out);
  s.endFrame(out);
  return out;
};
const ids = (calls: SoundCall[]): string[] => calls.map((c) => c.id);

const burst = (towerUid: number, frozen: number): E => ({
  type: 'PulseBurst',
  towerUid,
  x: 1,
  y: 1,
  radiusTiles: 2,
  frozen,
});

describe("Act III's event sounds (T650)", () => {
  it("draws a unit in on the Maw's breath and swallows it; a refugee sounds like a loss", () => {
    const s = withTowers({});
    expect(
      ids(
        play(s, [
          { type: 'GatherTell', uid: 1, targetUid: 2, ally: false },
          { type: 'Gathered', uid: 1, victimUid: 2, victim: 'mote', hp: 40, absorbs: 1 },
        ]),
      ),
    ).toEqual(['maw_tell', 'maw_gulp']);
    expect(
      ids(
        play(s, [{ type: 'Gathered', uid: 1, victimUid: 3, victim: 'refugee', hp: 0, absorbs: 2 }]),
      ),
    ).toEqual(['maw_gulp', 'hushed']);
  });

  it('cracks a rift a wave ahead and tears it open as its wave starts', () => {
    const s = withTowers({});
    expect(
      ids(
        play(s, [
          { type: 'RiftOpening', route: 'r', wave: 4 },
          { type: 'RiftOpened', route: 'r', wave: 4 },
        ]),
      ),
    ).toEqual(['rift_crack', 'rift_open']);
  });

  it('bites as a swarmling latches (never as it lets go), chirps it home, and snaps a trap', () => {
    const s = withTowers({});
    expect(
      ids(
        play(s, [
          { type: 'SwarmLatch', uid: 5, enemyUid: 1, on: true },
          { type: 'SwarmLatch', uid: 5, enemyUid: 1, on: false },
          { type: 'SwarmHome', uid: 5, towerUid: 2 },
          { type: 'TrapSprung', zoneUid: 9, enemyUid: 1, x: 1, y: 1 },
        ]),
      ),
    ).toEqual(['swarm_latch', 'swarm_home', 'trap_snap']);
  });

  it("rings the Bloom's crystal chime where Flash Freeze blows frost, and thrums Gravity Well's pull", () => {
    const s = withTowers({ 1: 'bloom', 2: 'sprinkler' });
    expect(ids(play(s, [burst(1, 2)]))).toEqual(['bloom_chime', 'stasis_lock']);
    expect(ids(play(s, [burst(2, 0)]))).toEqual(['frost_burst']);
    const pulled: E = {
      type: 'PulledBack',
      uid: 3,
      towerUid: 1,
      fromX: 2,
      fromY: 2,
      x: 1,
      y: 1,
      tiles: 1.5,
    };
    expect(ids(play(s, [pulled]))).toEqual(['gravity_pull']);
  });

  it('stamps each revoked tower one after another, then an equipped uplink; the rest is silent', () => {
    const s = withTowers({});
    const out = play(s, [
      { type: 'TowerRevoked', uid: 1, tower: 'rivet', refund: 50 },
      { type: 'TowerRevoked', uid: 2, tower: 'rivet', refund: 50 },
      { type: 'ClassRevoked', tower: 'rivet', refund: 100 },
      { type: 'AbilityRevoked', ability: 'orbital_strike', slot: 1 },
      { type: 'ModifierChanged', modifier: 'quillLockout', on: true },
    ]);
    expect(ids(out)).toEqual(['revoke_stamp', 'revoke_stamp', 'revoke_stamp']);
    const delays = out.map((c) => (c.kind === 'sfx' ? c.delay : -1));
    expect(delays[0]).toBe(0);
    expect(delays[1]).toBeGreaterThan(0);
    expect(delays[2]).toBeGreaterThan(delays[1]!);
    // An unequipped uplink has no slot to stamp; a new frame starts the stagger over.
    expect(play(s, [{ type: 'AbilityRevoked', ability: 'orbital_strike', slot: null }])).toEqual(
      [],
    );
    expect(play(s, [{ type: 'TowerRevoked', uid: 3, tower: 'thumper', refund: 0 }])).toMatchObject([
      { id: 'revoke_stamp', delay: 0 },
    ]);
  });

  it('braces Bricks as he takes a unit on, slams the door on the SEAL, and keeps the rest quiet', () => {
    const s = withTowers({});
    expect(
      ids(
        play(s, [
          { type: 'ForcedInputRequested', id: 'seal' },
          { type: 'Blocked', allyUid: 1, enemyUid: 2, on: true },
          { type: 'Blocked', allyUid: 1, enemyUid: 2, on: false },
          { type: 'AllyHealthChanged', uid: 1, health: 0.5 },
          { type: 'ForcedInputResolved', id: 'seal' },
          { type: 'ForcedInputResolved', id: 'unknown' },
        ]),
      ),
    ).toEqual(['bricks_brace', 'door_seal']);
  });

  it('shuts an Everglow machine down with its price tag, pitched by size', () => {
    expect(run(byAct[3], [died('compliance')])).toEqual(['sfx:everglow_shutdown']);
  });
});
