// The finale's sounds (T850; eventTablesFin.ts, sfx/fin.ts): the Leaving Song's verdicts (laid to
// rest in gold, scattered cold, a death for good), the choir, the Deep Bore, the Unsung's moments,
// Directive 0 and "Not Everglow.", Dawn, the waymark lanterns, the win and the loss, and the field
// sounds (the Bore's drill, the Unsung's surfacing tell).
import { describe, expect, it } from 'vitest';
import { BOSS_ABILITY_TELL_SEC } from '../content/rules.ts';
import { PRESENTATION } from '../content/presentation.ts';
import type { EnemyFaction, IdSpace } from '../content/types.ts';
import { secToTicks, TICK_HZ } from '../shared/time.ts';
import type { SimEvent } from '../sim/index.ts';
import { BOSS_SOUNDS, ENEMY_LOOPS } from './eventTables.ts';
import {
  BOSS_MOMENT_SOUNDS,
  CHOIR_SOUNDS,
  SONG_SOUNDS,
  TIMER_SOUNDS,
  WAYMARK_SOUNDS,
} from './eventTablesFin.ts';
import { createEventSounds, SOUND_EVENT_TYPES, type SoundCall } from './eventSounds.ts';
import { createFieldSounds, type FieldEnemy, type FieldState } from './fieldSounds.ts';
import { FIN_CUES, FIN_THEMES } from './music/fin.ts';
import { CUES, isCueId, isThemeId, loadedCue, THEMES } from './music/index.ts';
import { isSfxId, loadedSfx, SFX, type SfxId } from './sfx/index.ts';
import { FIN_SFX } from './sfx/fin.ts';

type E = SimEvent<IdSpace>;

const FACTIONS: Readonly<Record<string, EnemyFaction>> = {
  mote: 'hollow',
  unsung: 'hollow',
  unsung_part: 'hollow',
  compliance: 'everglow',
};

const finale = { ...PRESENTATION.byAct.finale, map: 'fin_m01' };
const MARKERS: Readonly<Record<string, string>> = {
  '10,11': 'waymark_1',
  '14,9': 'waymark_2',
  '4,6': 'waymark_3',
  '1,1': 'bore_rig',
};

function sounds() {
  return createEventSounds(finale, {
    splits: () => false,
    faction: (id) => FACTIONS[id] ?? null,
    quietAt: () => false,
    markerAt: (c, r) => MARKERS[`${c},${r}`] ?? null,
  });
}

/** Plays `frames` of events (each array one frame) and returns every call, frame by frame. */
function play(frames: readonly (readonly E[])[]): SoundCall[][] {
  const s = sounds();
  return frames.map((events) => {
    const out: SoundCall[] = [];
    for (const e of events) s.sounds(e, out);
    s.endFrame(out);
    return out;
  });
}
const ids = (calls: readonly SoundCall[]): string[] => calls.map((c) => `${c.kind}:${c.id}`);

const died = (uid: number, enemy: string): E => ({
  type: 'EnemyDied',
  uid,
  enemy,
  x: 3,
  y: 4,
  bounty: 0,
  killer: 0,
});
const phase = (p: number): E => ({ type: 'PhaseChanged', phase: p });

describe('the Leaving Song (T850)', () => {
  it('rings a unit laid to rest in gold, hisses one scattered, and lets one fallen for good die', () => {
    const [, frame] = play([
      [phase(2)],
      [
        died(1, 'mote'),
        died(2, 'mote'),
        died(3, 'mote'),
        { type: 'LaidToRest', uid: 1, at: [3, 4], points: 1 },
        { type: 'Scattered', uid: 2, at: [3, 4] },
      ],
    ]);
    // Unit 3 had no verdict: a second death outside the song, for good (the unravel, at the end).
    expect(ids(frame!)).toEqual(['sfx:rest_chime', 'sfx:scatter_hiss', 'sfx:hollow_unravel']);
  });

  it("sings the jingle's six notes in chimes, one after another within a frame (Dawn's rest)", () => {
    const rests = Array.from({ length: 8 }, (_, i): E => ({
      type: 'LaidToRest',
      uid: 10 + i,
      at: [0, 0],
      points: 0,
    }));
    const [frame] = play([rests]);
    const steps = SONG_SOUNDS.restSteps;
    expect(frame!.map((c) => (c.kind === 'sfx' ? c.pitch : null))).toEqual(
      Array.from({ length: 8 }, (_, i) => steps[i % steps.length]),
    );
    expect(frame!.map((c) => (c.kind === 'sfx' ? c.delay : null))).toEqual(
      Array.from(
        { length: 8 },
        (_, i) => Math.min(i, SONG_SOUNDS.restMaxStagger) * SONG_SOUNDS.restStaggerSec,
      ),
    );
    // In tune: G–C–E, F–D–C over the recipe's G4.
    expect(steps).toEqual([0, 5, 9, 10, 7, 5]);
  });

  it('keeps Phase 1 deaths as they are, and draws a re-formed unit back in', () => {
    const [p1] = play([[died(1, 'mote'), died(2, 'compliance')]]);
    expect(ids(p1!)).toEqual(['sfx:hollow_unravel', 'sfx:everglow_shutdown']);
    const [, reform] = play([[phase(2)], [{ type: 'Reformed', uid: 4 }]]);
    expect(ids(reform!)).toEqual(['sfx:scatter_reform']);
    // Everglow's units aren't the song's: they die at once in Phase 2 too.
    const [, everglow] = play([[phase(2)], [died(5, 'compliance')]]);
    expect(ids(everglow!)).toEqual(['sfx:everglow_shutdown']);
  });
});

describe('the choir, the Bore, and QUILL (T850)', () => {
  it("hushes a singer in the choir's voice, once, and halts and walks on", () => {
    const [frame] = play([
      [
        {
          type: 'Hushed',
          uid: 7,
          enemy: 'mote',
          victim: 3,
          victimEnemy: null,
          victimAlly: 'singer',
          x: 0,
          y: 0,
        },
        { type: 'SingerHushed', uid: 3 },
        { type: 'ChoirHalted', on: true },
        { type: 'ChoirHalted', on: false },
        { type: 'EchoArrived', id: 'thrum' },
      ],
    ]);
    expect(ids(frame!)).toEqual([
      `sfx:${CHOIR_SOUNDS.hushed}`,
      'sfx:choir_halt',
      'sfx:choir_walk',
      'sfx:echo_rise',
    ]);
  });

  it("breaks through as the Bore fills, and Directive 0 glitches; the class's return is warm", () => {
    const [frame] = play([
      [
        { type: 'TimerFull', id: 'deep_bore' },
        { type: 'TimerFull', id: 'some_other_timer' },
        { type: 'AbilityLocked', ability: 'time_dilation', on: true },
        { type: 'AbilityLocked', ability: 'time_dilation', on: false },
        { type: 'ClassRestored', tower: 'rivet' },
        { type: 'DawnBroke' },
        { type: 'LightingSet', key: 'dawn' },
      ],
    ]);
    expect(ids(frame!)).toEqual([
      'sfx:bore_breach',
      'sfx:directive_glitch',
      'sfx:class_restored',
      'sfx:dawn_break',
    ]);
  });

  it('lights each waymark lantern a note further up "Ev-er-glow", after the drone', () => {
    const cleared = (tile: readonly [number, number]): E => ({
      type: 'WreckageCleared',
      tile,
      to: '.',
      salvage: 10,
    });
    const [frame] = play([[cleared([10, 11]), cleared([1, 1]), cleared([14, 9]), cleared([4, 6])]]);
    expect(frame).toEqual([
      { kind: 'sfx', id: 'drone_cleared', pitch: 0, delay: 0 },
      { kind: 'sfx', id: 'lantern_lit', pitch: 0, delay: WAYMARK_SOUNDS.afterSec },
      { kind: 'sfx', id: 'drone_cleared', pitch: 0, delay: 0 },
      { kind: 'sfx', id: 'drone_cleared', pitch: 0, delay: 0 },
      { kind: 'sfx', id: 'lantern_lit', pitch: 5, delay: WAYMARK_SOUNDS.afterSec },
      { kind: 'sfx', id: 'drone_cleared', pitch: 0, delay: 0 },
      { kind: 'sfx', id: 'lantern_lit', pitch: 9, delay: WAYMARK_SOUNDS.afterSec },
    ]);
  });
});

describe('the Unsung (T850)', () => {
  const bossPhase = (p: number): E => ({ type: 'BossPhase', uid: 50, enemy: 'unsung', phase: p });

  it('rises, tears into three, rises again, digs, surfaces or is dug out, calls, sings, and rests', () => {
    const frames = play([
      [bossPhase(1)],
      [bossPhase(2), { type: 'BossSplit', uid: 50, parts: [51, 52, 53] }],
      [bossPhase(3), { type: 'BossRisen', uid: 50 }],
      [{ type: 'BossSurfaced', uid: 50, at: [5, 5], dugOut: false, hushed: 9 }],
      [{ type: 'BossSurfaced', uid: 50, at: [5, 5], dugOut: true, hushed: 0 }],
      [bossPhase(4), { type: 'BossAdds', uid: 50, enemy: 'silencer', count: 1 }],
      [{ type: 'BossEnded', uid: 50, enemy: 'unsung', how: 'layToRest' }],
    ]);
    expect(frames.map(ids)).toEqual([
      ['sfx:unsung_arrive'],
      ['sfx:unsung_split'],
      ['sfx:unsung_rise'],
      ['sfx:unsung_surface'],
      ['sfx:unsung_dug_out'],
      ['sfx:unsung_song', 'sfx:unsung_call'],
      // Laid to rest: its voices into tune, and no sting (Dawn follows).
      ['sfx:unsung_rest'],
    ]);
    expect(BOSS_SOUNDS.unsung?.endCue).toBeNull();
  });

  it("keeps the Gathering Maw's split for a boss without its own, and the hum for the Unsung", () => {
    const [frame] = play([
      [
        { type: 'BossPhase', uid: 60, enemy: 'gathering_maw', phase: 1 },
        { type: 'BossSplit', uid: 60, parts: [61] },
      ],
    ]);
    expect(ids(frame!)).toEqual(['sfx:gmaw_arrive', 'sfx:gmaw_split']);
    expect(ENEMY_LOOPS.unsung?.id).toBe('hollow_hum');
    expect(ENEMY_LOOPS.unsung_part?.id).toBe('hollow_hum');
    expect(Object.keys(BOSS_MOMENT_SOUNDS)).toEqual(['unsung']);
  });
});

describe("the finale's win and loss (T850)", () => {
  it('ends on the song landing home, and a loss hums it unfinished', () => {
    expect(play([[{ type: 'MapWon' }]]).map(ids)).toEqual([['cue:fin_win']]);
    expect(play([[{ type: 'MapLost' }]]).map(ids)).toEqual([['cue:lose_hush']]);
  });
});

describe("the finale's sounds are wired and lazy (T850)", () => {
  it('hears every finale event but the light (Dawn sounds it)', () => {
    for (const t of [
      'PhaseChanged',
      'ChoirHalted',
      'SingerHushed',
      'LaidToRest',
      'Scattered',
      'Reformed',
      'TimerFull',
      'ClassRestored',
      'AbilityLocked',
      'EchoArrived',
      'DawnBroke',
      'BossRisen',
      'BossSurfaced',
      'BossAdds',
    ] as const) {
      expect(SOUND_EVENT_TYPES, t).toContain(t);
    }
    expect(SOUND_EVENT_TYPES).not.toContain('LightingSet');
  });

  it("names only registered sounds (the finale's chunk is in under test)", () => {
    for (const id of Object.keys(FIN_SFX)) {
      expect(isSfxId(id), id).toBe(true);
      expect(loadedSfx(id as SfxId), id).toBe(SFX[id as SfxId]);
    }
    for (const id of Object.keys(FIN_THEMES)) expect(isThemeId(id), id).toBe(true);
    for (const id of Object.keys(FIN_CUES)) expect(isCueId(id), id).toBe(true);
    expect(loadedCue('fin_win')).toBe(CUES.fin_win);
    expect(THEMES.choir_hymn.id).toBe('choir_hymn');
  });
});

// ── Field sounds ──────────────────────────────────────────────────────────────────────────────

const TELL = secToTicks(BOSS_ABILITY_TELL_SEC);

type Mutable<T> = { -readonly [K in keyof T]: T[K] };
const UNSUNG: FieldEnemy['def'] = {
  id: 'unsung',
  faction: 'hollow',
  cloaked: false,
  boss: { phases: [{ spawn: null, burrow: { times: 2 } }] },
};
const boss = (o: Partial<Mutable<FieldEnemy>> = {}): Mutable<FieldEnemy> => ({
  uid: 50,
  alive: true,
  def: UNSUNG,
  burrowed: false,
  huddleUid: 0,
  bossPhase: 1,
  invulnerableTicks: 0,
  abilityTicks: 0,
  abilityCount: 2,
  leaving: false,
  x: 0,
  y: 0,
  revealedTicks: 0,
  ...o,
});

interface World {
  tick: number;
  enemies: { items: Mutable<FieldEnemy>[]; used: number };
  towers: { items: never[]; used: number };
  wreckage: { queue: number[]; progressTicks: number };
  timers: { running: boolean; full: boolean; ratePct: number }[];
  stats: { boreProgress: number };
}
const world = (...items: Mutable<FieldEnemy>[]): World => ({
  tick: 0,
  enemies: { items, used: items.length },
  towers: { items: [], used: 0 },
  wreckage: { queue: [], progressTicks: 0 },
  timers: [],
  stats: { boreProgress: 0 },
});
function frame(f: ReturnType<typeof createFieldSounds>, w: World): SoundCall[] {
  const out: SoundCall[] = [];
  const view: FieldState = w;
  f.frame(view, out);
  return out;
}

describe("the finale's field sounds (T850)", () => {
  it('digs the Unsung in, churns once as it tells its surfacing, and leaves the surfacing to its event', () => {
    const f = createFieldSounds(360);
    const u = boss({ abilityTicks: 300 });
    const w = world(u);
    // It hums the jingle wrong like every Hollow unit (on sim time: once, while the tick holds).
    expect(ids(frame(f, w))).toEqual(['sfx:hollow_hum']);
    Object.assign(u, { burrowed: true, abilityTicks: 240 });
    expect(ids(frame(f, w))).toEqual(['sfx:unsung_dig']);
    u.abilityTicks = TELL;
    expect(ids(frame(f, w))).toEqual(['sfx:unsung_churn']);
    u.abilityTicks = TELL - 10;
    expect(frame(f, w)).toEqual([]);
    Object.assign(u, { burrowed: false, abilityTicks: 300 });
    expect(frame(f, w)).toEqual([]);
    // The next dig tells again.
    Object.assign(u, { burrowed: true, abilityTicks: TELL });
    expect(ids(frame(f, w))).toEqual(['sfx:unsung_dig', 'sfx:unsung_churn']);
  });

  it('grinds the Bore while its timer runs, on sim time, a step higher each fifth of its fill', () => {
    const f = createFieldSounds(360);
    const w = world();
    expect(frame(f, w)).toEqual([]);
    w.timers = [{ running: true, full: false, ratePct: 1 }];
    w.stats.boreProgress = 45;
    expect(frame(f, w)).toEqual([{ kind: 'sfx', id: 'bore_drill', pitch: 2, delay: 0 }]);
    const every = Math.round(TIMER_SOUNDS.everySec * TICK_HZ);
    w.tick = every - 1;
    expect(frame(f, w)).toEqual([]);
    w.tick = every;
    expect(ids(frame(f, w))).toEqual(['sfx:bore_drill']);
    // Stopped (Phase 2: rate 0) or full: silent.
    w.timers[0]!.ratePct = 0;
    w.tick += every;
    expect(frame(f, w)).toEqual([]);
    w.timers[0] = { running: true, full: true, ratePct: 1 };
    w.tick += every;
    expect(frame(f, w)).toEqual([]);
  });
});
