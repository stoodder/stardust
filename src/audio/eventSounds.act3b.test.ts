// Act III, part two's event sounds (T750; eventTablesAct3b.ts): jamming and System Reboot,
// "Shareholder Value" (its phases, Hostile Takeover's laser and its interrupt, the jettison and
// its crash site, its frantic retreat), the Gathering Maw (split, merge, and its beaten sting with
// no BossEnded), the leapers, Gloop and its puddle, the bearers' six notes, and the moments keyed
// to a map (Gerald's delivery on A3M4, the domes opening on A3M6).
import { describe, expect, it } from 'vitest';
import { PRESENTATION } from '../content/presentation.ts';
import type { EnemyFaction, IdSpace } from '../content/types.ts';
import type { SimEvent } from '../sim/index.ts';
import {
  ABILITY_SOUNDS,
  BOSS_SOUNDS,
  ENEMY_LOOPS,
  ENEMY_POP_PITCH,
  NEUTRAL_SOUNDS,
} from './eventTables.ts';
import { BEARER_SOUNDS, ENEMY_CLOAK_SOUNDS } from './eventTablesAct3b.ts';
import { createEventSounds, type SoundCall, type SoundDials } from './eventSounds.ts';
import { recipeDuration } from './recipes.ts';
import { SFX, sfxRecipe, type SfxId } from './sfx/index.ts';

type E = SimEvent<IdSpace>;

const FACTIONS: Readonly<Record<string, EnemyFaction>> = {
  gathering_maw: 'hollow',
  gathering_maw_part: 'hollow',
  silencer: 'hollow',
  liability: 'everglow',
};

const act3 = PRESENTATION.byAct[3];

function sounds(
  o: { map?: string; towers?: Readonly<Record<number, string>>; quiet?: boolean } = {},
) {
  const dials: SoundDials = o.map === undefined ? act3 : { ...act3, map: o.map };
  return createEventSounds(dials, {
    splits: () => false,
    faction: (id) => FACTIONS[id] ?? null,
    quietAt: () => o.quiet === true,
    tower: (uid) => o.towers?.[uid] ?? null,
  });
}
const play = (s: ReturnType<typeof createEventSounds>, events: E[]): SoundCall[] => {
  const out: SoundCall[] = [];
  for (const e of events) s.sounds(e, out);
  s.endFrame(out);
  return out;
};
const ids = (calls: SoundCall[]): string[] => calls.map((c) => `${c.kind}:${c.id}`);
const delays = (calls: SoundCall[]): number[] =>
  calls.map((c) => (c.kind === 'sfx' ? c.delay : -1));
const pitches = (calls: SoundCall[]): number[] =>
  calls.map((c) => (c.kind === 'sfx' ? c.pitch : 0));

const died = (enemy: string, uid = 1): E => ({
  type: 'EnemyDied',
  uid,
  enemy,
  bounty: 0,
  killer: { kind: 'tower', uid: 1 },
  x: 2,
  y: 2,
});

const svPhase = (n: number): E => ({
  type: 'BossPhase',
  uid: 9,
  enemy: 'shareholder_value',
  phase: n,
});
const mawPhase = (n: number, uid = 7): E => ({
  type: 'BossPhase',
  uid,
  enemy: 'gathering_maw',
  phase: n,
});
const plate = (marker: string): E => ({ type: 'TileOpened', marker, to: 'x' });
const home = (uid: number): E => ({ type: 'BearerHome', uid, group: 'b1' });

describe('jamming (T750)', () => {
  it('tells each jammer by its kind, crackles a tower dark and blips it back, and fizzles an interrupt', () => {
    const s = sounds();
    expect(
      ids(
        play(s, [
          { type: 'JamTell', uid: 1, kind: 'ring', towers: [5, 6] },
          { type: 'JamTell', uid: 2, kind: 'tendril', towers: [5] },
          { type: 'TowerJammed', uid: 5, ticks: 60, source: 2 },
          { type: 'TowerUnjammed', uid: 5 },
          { type: 'JamInterrupted', uid: 1 },
        ]),
      ),
    ).toEqual([
      'sfx:jam_ring',
      'sfx:jam_tendril',
      'sfx:jammed',
      'sfx:jam_clear',
      'sfx:tell_fizzle',
    ]);
  });

  it('fizzles a ring a counter turned (T777) like any cancelled tell', () => {
    expect(ids(play(sounds(), [{ type: 'JamFizzled', uid: 1 }]))).toEqual(['sfx:tell_fizzle']);
  });

  it("boots System Reboot on its cast; its Rebooted rides the cast's sound", () => {
    expect(ABILITY_SOUNDS.system_reboot?.cast).toBe('reboot');
    const s = sounds();
    expect(ids(play(s, [{ type: 'Rebooted', towers: [5, 6] }]))).toEqual([]);
    expect(
      ids(
        play(s, [{ type: 'AbilityUsed', ability: 'system_reboot', uid: 0, slot: 1, target: null }]),
      ),
    ).toEqual(['sfx:reboot']);
  });

  it('keeps a script group walking in silent (the horn covers it)', () => {
    expect(play(sounds(), [{ type: 'ScriptGroupSpawned', id: 'surge' }])).toEqual([]);
  });
});

describe('"Shareholder Value" (T750)', () => {
  it('arrives, arms the Takeover at phase 2, and leaves phase 3 to the jettison', () => {
    const s = sounds();
    expect(ids(play(s, [svPhase(1)]))).toEqual(['sfx:sv_arrive']);
    expect(ids(play(s, [svPhase(2)]))).toEqual(['sfx:sv_takeover']);
    expect(ids(play(s, [svPhase(3), { type: 'Jettisoned', uid: 9 }]))).toEqual(['sfx:jettison']);
  });

  it('charges the laser, and cuts it dead only when its own tell is interrupted', () => {
    const s = sounds();
    const tell: E = { type: 'TakeoverTell', uid: 9, towers: [5, 6] };
    expect(ids(play(s, [tell]))).toEqual(['sfx:takeover_laser']);
    expect(ids(play(s, [{ type: 'JamInterrupted', uid: 9 }]))).toEqual([
      'stop:takeover_laser',
      'sfx:tell_fizzle',
    ]);
    // A laser that landed its jams is over: a later interrupt (a Silencer's) cuts nothing.
    play(s, [tell, { type: 'TowerJammed', uid: 5, ticks: 60, source: 9 }]);
    expect(ids(play(s, [{ type: 'JamInterrupted', uid: 9 }]))).toEqual(['sfx:tell_fizzle']);
    expect(ids(play(s, [{ type: 'JamInterrupted', uid: 4 }]))).toEqual(['sfx:tell_fizzle']);
    // Jettisoning or being driven off mid-laser cuts it too.
    play(s, [tell]);
    expect(ids(play(s, [{ type: 'Jettisoned', uid: 9 }]))).toEqual([
      'stop:takeover_laser',
      'sfx:jettison',
    ]);
  });

  it('crashes each jettisoned plate onto its tile, one after another', () => {
    const s = sounds();
    const out = play(s, [plate('p1'), plate('p2'), plate('p3'), plate('p4')]);
    expect(ids(out)).toEqual(Array.from({ length: 4 }, () => 'sfx:plate_crash'));
    const d = delays(out);
    expect(d[0]).toBe(0);
    for (let i = 1; i < d.length; i++) expect(d[i]).toBeGreaterThan(d[i - 1]!);
    // A new frame starts over; a tile opened to anything else is silent.
    expect(delays(play(s, [plate('p5')]))).toEqual([0]);
    expect(play(s, [{ type: 'TileOpened', marker: 'm', to: '.' }])).toEqual([]);
  });

  it('limps away when driven off, the PA stuttering after it', () => {
    const s = sounds();
    const end: E = { type: 'BossEnded', uid: 9, enemy: 'shareholder_value', how: 'driveOff' };
    expect(ids(play(s, [end]))).toEqual(['sfx:sv_retreat', 'cue:pa_frantic']);
  });
});

describe('the Gathering Maw (T750)', () => {
  it('arrives, strains before its split, tears, and slides back together (one sound per merge)', () => {
    const s = sounds();
    expect(ids(play(s, [mawPhase(1)]))).toEqual(['sfx:gmaw_arrive']);
    expect(ids(play(s, [mawPhase(2)]))).toEqual(['sfx:gmaw_strain']);
    expect(ids(play(s, [{ type: 'BossSplit', uid: 7, parts: [11, 12, 13] }]))).toEqual([
      'sfx:gmaw_split',
    ]);
    expect(ids(play(s, [mawPhase(3, 14), { type: 'BossMerged', uid: 14 }]))).toEqual([
      'sfx:gmaw_merge',
    ]);
  });

  it('dies silent like every Hollow unit in Act III, its parts too, but its end is a sting', () => {
    const s = sounds();
    expect(play(s, [died('gathering_maw_part', 11), died('gathering_maw_part', 12)])).toEqual([]);
    // Its merged body's death (no BossEnded): the Hollow's voices finishing the phrase in tune.
    expect(ids(play(s, [died('gathering_maw', 14)]))).toEqual(['cue:gmaw_beaten']);
    // Never over the loss cue.
    expect(ids(play(sounds(), [{ type: 'MapLost' }, died('gathering_maw', 14)]))).toEqual([
      'cue:lose_hush',
    ]);
  });
});

describe("the warren's towers (T750)", () => {
  it('boings a leaper, thuds a grounded flyer, and spits and splats a Gloop glob', () => {
    const s = sounds({ towers: { 3: 'gloop' } });
    expect(
      ids(
        play(s, [
          { type: 'LeaperBonk', tower: 2, target: 5 },
          { type: 'FlyerGrounded', uid: 5, ticks: 60 },
        ]),
      ),
    ).toEqual(['sfx:leaper_boing', 'sfx:grounded_thud']);
    const fired: E = {
      type: 'ProjectileFired',
      uid: 40,
      towerUid: 3,
      kind: 'lobbed',
      targetUid: 5,
      x: 1,
      y: 1,
      targetX: 3,
      targetY: 3,
      sprite: null,
      flightTicks: 36,
      radiusTiles: 0.5,
    };
    const hit: E = {
      type: 'ProjectileHit',
      uid: 40,
      towerUid: 3,
      x: 3,
      y: 3,
      hits: 1,
      damage: 10,
      reduced: false,
    };
    expect(ids(play(s, [fired, hit]))).toEqual(['sfx:gloop_spit', 'sfx:gloop_splat']);
  });

  it("sizzles Big Glorp's puddle, unless the Hollow's quiet swallows it there", () => {
    const puddle: E = { type: 'PuddleSpawned', zoneUid: 3, at: [4, 4] };
    expect(ids(play(sounds(), [puddle]))).toEqual(['sfx:puddle_hiss']);
    expect(play(sounds({ quiet: true }), [puddle])).toEqual([]);
  });
});

describe('the bearers (T750)', () => {
  it('hums the six notes, one per bearer home, in order and round again, staggered in a frame', () => {
    const s = sounds();
    const first = play(s, [home(1), home(2), home(3), home(4)]);
    expect(ids(first)).toEqual(Array.from({ length: 4 }, () => 'sfx:bearer_note'));
    expect(pitches(first)).toEqual(BEARER_SOUNDS.steps.slice(0, 4));
    expect(delays(first)).toEqual([0, 1, 2, 3].map((k) => k * BEARER_SOUNDS.staggerSec));
    const next = play(s, [home(5), home(6), home(7)]);
    expect(pitches(next)).toEqual([...BEARER_SOUNDS.steps.slice(4), BEARER_SOUNDS.steps[0]]);
    expect(delays(next)[0]).toBe(0);
  });

  it('sings "Everglow Bright" in tune: G–C–E, F–D–C over G', () => {
    expect(BEARER_SOUNDS.steps).toEqual([0, 5, 9, 10, 7, 5]);
  });
});

describe('moments keyed to a map (T750)', () => {
  it('delivers the mail as Gerald leaves A3M4; elsewhere he whistles away', () => {
    const exit: E = { type: 'NeutralExited', uid: 4, enemy: 'gerald', x: 1, y: 1 };
    expect(ids(play(sounds({ map: 'a3_m04' }), [exit]))).toEqual(['sfx:mail_delivered']);
    expect(ids(play(sounds({ map: 'a1_m03' }), [exit]))).toEqual([
      `sfx:${NEUTRAL_SOUNDS.gerald!.exit}`,
    ]);
  });

  it("opens the domes on A3M6's first refugee in, once; no other map plays it", () => {
    const safe: E = { type: 'RefugeeEvacuated', uid: 3, pebble: false };
    const s = sounds({ map: 'a3_m06' });
    expect(ids(play(s, [safe]))).toEqual(['sfx:refugee_safe', 'cue:domes_open']);
    expect(ids(play(s, [safe]))).toEqual(['sfx:refugee_safe']);
    expect(ids(play(sounds({ map: 'a3_m01' }), [safe]))).toEqual(['sfx:refugee_safe']);
  });
});

describe("M7's tables and mix (T750)", () => {
  it('gives every M7 unit a death pitch, every M7 boss its own sounds, and the walkers their loops', () => {
    for (const id of [
      'silencer',
      'auditor',
      'associate',
      'liability',
      'gunship',
      'blackbudget',
      'gathering_maw',
      'gathering_maw_part',
    ]) {
      expect(ENEMY_POP_PITCH[id], id).toBeTypeOf('number');
    }
    for (const id of ['shareholder_value', 'gathering_maw', 'gathering_maw_part']) {
      expect(BOSS_SOUNDS[id]?.arrive, id).not.toBe('boss_arrive');
    }
    expect(BOSS_SOUNDS.shareholder_value?.spawnTell).toBe('sv_hangar');
    expect(BOSS_SOUNDS.gathering_maw?.beaten).toBe('gmaw_beaten');
    // The Hollow hum the jingle wrong; Everglow Security's walkers and flyers make their own.
    for (const id of ['silencer', 'gathering_maw']) expect(ENEMY_LOOPS[id]?.id).toBe('hollow_hum');
    expect(ENEMY_LOOPS.liability?.id).toBe('liability_stomp');
    expect(ENEMY_LOOPS.gunship?.id).toBe('gunship_rotor');
    expect(ENEMY_LOOPS.associate?.id).toBe('associate_hum');
    expect(ENEMY_CLOAK_SOUNDS.blackbudget).toBe('bb_shimmer');
  });

  it('rate-limits the frequent ones, keeps them short and in few voices', () => {
    const frequent: SfxId[] = [
      'leaper_boing',
      'grounded_thud',
      'gloop_spit',
      'gloop_splat',
      'puddle_hiss',
      'jammed',
      'jam_clear',
      'jam_static',
      'plate_crash',
      'gunship_rotor',
      'liability_stomp',
      'bb_shimmer',
      'associate_hum',
    ];
    for (const id of frequent) {
      const r = sfxRecipe(id);
      expect(r.minGapMs, id).toBeGreaterThan(0);
      expect(r.maxVoices ?? 99, id).toBeLessThanOrEqual(3);
      expect(recipeDuration(r), id).toBeLessThan(0.8);
      expect(r.priority, id).toBeLessThanOrEqual(2);
    }
    // PuddleSpawned and LeaperBonk can fire every few ticks: real gaps, not a buzz.
    expect(SFX.puddle_hiss.minGapMs).toBeGreaterThanOrEqual(300);
    expect(SFX.leaper_boing.minGapMs).toBeGreaterThanOrEqual(80);
  });

  it('sets the priorities: tells are moments the quiet keeps, loops sit at the bottom, the knock is a line', () => {
    for (const id of [
      'jam_ring',
      'jam_tendril',
      'takeover_laser',
      'reboot',
      'bearer_note',
    ] as const) {
      expect(SFX[id].priority, id).toBe(2);
    }
    for (const id of ['jam_static', 'gunship_rotor', 'liability_stomp', 'bb_shimmer'] as const) {
      expect(SFX[id].priority, id).toBe(0);
    }
    expect(SFX.knock_knock.priority).toBe(3);
    // The laser lasts its 3 s tell, never longer; the tells about their 2 s.
    expect(recipeDuration(SFX.takeover_laser)).toBeGreaterThan(2.7);
    expect(recipeDuration(SFX.takeover_laser)).toBeLessThanOrEqual(3);
    for (const id of ['jam_ring', 'jam_tendril'] as const) {
      expect(recipeDuration(SFX[id]), id).toBeGreaterThan(1.7);
      expect(recipeDuration(SFX[id]), id).toBeLessThan(2.3);
    }
  });
});
