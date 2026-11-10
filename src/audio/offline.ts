// Offline renders for the level checks (nobody can listen in CI): each sound effect, cue, and
// theme, and the worst-case storms (Act I's W7 and boss, Act II's Witch fight), rendered through
// the real synth graph into an OfflineAudioContext and measured (analyze.ts). A storm renders two
// ways: with no ducking (the loudest case, for headroom), and ducked as the live game ducks, its
// clock stepped like the live pump so each duck lands when its sound does, which also measures how
// far its line's blip stands over the rest of the mix. The `__sd.audio` test hooks expose them and
// smoke/audio.spec.ts asserts the numbers. Browser only.
import { analyze, type Levels } from './analyze.ts';
import { CUES, THEMES, type CueId, type ThemeId } from './music/index.ts';
import { compileSong } from './music/pattern.ts';
import { recipeDuration } from './recipes.ts';
import { SFX, type SfxId } from './sfx/index.ts';
import { PUMP_MS } from './engine.ts';
import { HOLLOW_DUCK } from './eventTablesAct2.ts';
import {
  DEFAULT_VOLUMES,
  RADIO_DUCK,
  SPEECH_SFX_DUCK,
  Synth,
  type SynthOptions,
} from './synth.ts';

const RATE = 44_100;
const TAIL_SEC = 0.3;

/**
 * How far a storm's line stands over the rest of its mix (a ducked storm only): the blip's RMS and
 * the RMS of everything else, over the blip's own span, before the limiter (which treats both
 * alike), and their difference (D134: at least 6 dB).
 */
export interface SpeechMargin {
  readonly blip: SfxId;
  readonly blipDb: number;
  readonly restDb: number;
  readonly marginDb: number;
}

/** Levels through the full master chain, and the raw mix before the limiter (headroom). */
export interface RenderLevels {
  readonly out: Levels;
  readonly raw: Levels;
  /** A ducked storm's speech margin. */
  readonly speech?: SpeechMargin;
}

/** The live pump's step: a stepped render wakes this often. */
const STEP_SEC = PUMP_MS / 1000;

/** Something a stepped render does at `t` (s): `run(synth, delay)` with `delay` from now to `t`. */
interface Timed {
  readonly t: number;
  readonly run: (s: Synth, delay: number) => void;
}

/**
 * Renders `seconds` of a synth into a mono buffer. `build` runs on the clock's zero. With `timed`,
 * the clock is stepped (the offline context suspends every STEP_SEC): each step runs what falls
 * before the next one and pumps the music, as the live engine does, so a duck starts with its
 * sound instead of on the clock's zero; without, `build` schedules everything up front.
 */
async function renderBuffer(
  seconds: number,
  build: (s: Synth) => void,
  opts: SynthOptions,
  timed: readonly Timed[] | null = null,
): Promise<Float32Array> {
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * RATE), RATE);
  const synth = new Synth(ctx, opts);
  synth.setVolumes(DEFAULT_VOLUMES);
  build(synth);
  if (timed !== null) {
    const queue = timed.toSorted((a, b) => a.t - b.t);
    let next = 0;
    const step = (): void => {
      const now = ctx.currentTime;
      for (; next < queue.length && queue[next]!.t < now + STEP_SEC; next++) {
        const e = queue[next]!; // next < length
        e.run(synth, Math.max(0, e.t - now));
      }
      synth.pump();
    };
    step();
    for (let k = 1; k * STEP_SEC < seconds - STEP_SEC; k++) {
      void ctx.suspend(k * STEP_SEC).then(() => {
        step();
        return ctx.resume();
      });
    }
  }
  const buf = await ctx.startRendering();
  return buf.getChannelData(0);
}

async function render(
  seconds: number,
  build: (s: Synth) => void,
  opts: SynthOptions,
): Promise<Levels> {
  return analyze([await renderBuffer(seconds, build, opts)], RATE);
}

async function both(
  seconds: number,
  build: (s: Synth) => void,
  noDuck = false,
): Promise<RenderLevels> {
  return {
    out: await render(seconds, build, { noDuck }),
    raw: await render(seconds, build, { noDuck, rawMaster: true }),
  };
}

/** Renders one sound effect at default volumes. */
export function renderSfx(id: SfxId): Promise<RenderLevels> {
  return both(recipeDuration(SFX[id]) + 0.05 + TAIL_SEC, (s) => {
    s.play(id, { delay: 0.05 });
  });
}

/** Renders one music cue at default volumes. */
export function renderCue(id: CueId): Promise<RenderLevels> {
  const c = compileSong(CUES[id]);
  const secs = c.steps * c.secPerStep + 1;
  return both(secs, (s) => {
    s.cue(id);
    s.pump(secs);
  });
}

/** Renders one loop of a theme with every layer up, at default volumes. */
export function renderTheme(id: ThemeId): Promise<RenderLevels> {
  const c = compileSong(THEMES[id]);
  const secs = c.steps * c.secPerStep + 0.5;
  return both(secs, (s) => {
    s.setTheme(id, { base: 1, drums: 1, lead: 1 });
    s.pump(secs);
  });
}

/** The storm's length (s). */
export const STORM_SEC = 10;

/** One storm: its theme (every layer up), its cue (on the clock's zero), and its sounds. */
interface Storm {
  readonly theme: ThemeId;
  readonly cue: CueId;
  /** Schedules the storm's sounds with `at(t, id, pitch)`. */
  readonly sounds: (at: (t: number, id: SfxId, pitch?: number) => void) => void;
  /** A line spoken over it: its speaker's blip at `at`, then 1 s of typing (`line`). */
  readonly line: { readonly at: number; readonly blip: SfxId };
  /** Hollow units walk throughout (a ducked render holds HOLLOW_DUCK from the start). */
  readonly hollow: boolean;
}

/** How long a storm's line shows (s): its blip, 1 s of typing, and a held beat after. */
const LINE_SEC = 2.2;

/** The type-ticks of a line typing for 1 s, starting just after its speaker's blip at `blipAt`. */
function typing(at: (t: number, id: SfxId, pitch?: number) => void, blipAt: number) {
  for (let t = blipAt + 0.2; t < blipAt + 1.2; t += 0.025) at(t, 'type_tick', 5);
}

/**
 * The worst cases the levels are checked against (`render('storm')`, `render('storm:act2')`),
 * each through the voice limits, rendered with no ducking and again ducked
 * (`render('storm:act2:ducked')`):
 * - **act1**: well past A1M1's W7 at 2× and past A1M5's boss wave: the battle theme, Rivet shots
 *   attempted 20 a second, pops 10 a second (each Bunchling's split after it), Thumper fire and
 *   impacts 4 a second each, Sprinkler pulses, Skyhook flak and its bursts, a Zapcoil arc with
 *   four jumps every 0.2 s, armor and invulnerable plinks on every shot, a Puffwing flock, digs
 *   and surfacings, three leaks, a strike, Time Dilation and Clearance Sale, the boss's arrival,
 *   sneeze tell, sneeze, phase change, and retreat, its sting, Gerald, the salvage drone, the
 *   low-integrity alarm, builds, sells, an upgrade, the wave horn, and a line typing over it all.
 * - **act2**: A2M2's Witch fight past its worst wave: the Act II theme under the Witch's sting,
 *   shield ripples on every shot, sad squeaks, shatters and unravels, panic squeaks, the hush
 *   twice under the Hollow's hum, her arrival, pulse (tell, ring), blink (tell, landing), a
 *   fizzle, her phase and retreat, Seeker volleys, a Capacitor Bank charging and discharging,
 *   Flash Freeze with Stasis, cloaked footsteps and reveals, Scanner Sweep, the rigs hit three
 *   times and a leak, a checkpoint, Tidybots, and Ves'thara speaking over it.
 */
export const STORMS = {
  act1: {
    theme: 'act1_battle',
    cue: 'boss_sting',
    sounds(at) {
      for (let i = 1; i * 0.05 < STORM_SEC - 1; i++) {
        const t = i * 0.05;
        at(t, 'rivet_shot');
        at(t, i % 2 === 0 ? 'armor_plink' : 'invuln_plink');
        if (i % 2 === 0) at(t, 'enemy_pop', (i % 7) - 3);
        if (i % 6 === 0) at(t + 0.04, 'split_pop');
        if (i % 5 === 0) at(t, 'thumper_launch');
        if (i % 5 === 2) at(t, 'thumper_impact');
        if (i % 10 === 3) at(t, 'sprinkler_pulse');
        if (i % 3 === 0) at(t, 'flak_fire');
        if (i % 3 === 1) at(t, 'flak_burst');
        if (i % 4 === 0) {
          at(t, 'zap_arc');
          for (let k = 1; k <= 4; k++) at(t + k * 0.045, 'zap_jump', 2 * k);
        }
        if (i % 9 === 0) at(t, 'wing_flap');
        if (i % 15 === 0) at(t, 'drone_work');
        if (i % 40 === 10) at(t, 'burrow_dig');
        if (i % 40 === 30) at(t, 'burrow_surface');
      }
      at(0.5, 'boss_arrive');
      at(1, 'wave_start');
      at(1.5, 'sneeze_tell');
      at(2, 'dilation_swell');
      at(3, 'sneeze');
      at(3.5, 'drone_fly');
      at(4.5, 'gerald_chime');
      at(5, 'boss_phase');
      at(6, 'huddle_coo');
      at(6.5, 'sale_kaching');
      for (const t of [2, 5, 8]) at(t, 'leak');
      at(3, 'strike_charge');
      at(4, 'strike_beam');
      at(4, 'strike_boom');
      at(6, 'low_integrity');
      at(7, 'build');
      at(7.2, 'upgrade');
      at(7.4, 'sell');
      at(8, 'gerald_whistle');
      at(8.5, 'drone_cleared');
      at(8.8, 'boss_retreat');
    },
    line: { at: 7.6, blip: 'blip.quill' },
    hollow: false,
  },
  act2: {
    theme: 'act2_battle',
    cue: 'witch_sting',
    sounds(at) {
      for (let i = 1; i * 0.05 < STORM_SEC - 1; i++) {
        const t = i * 0.05;
        at(t, 'rivet_shot');
        at(t, i % 2 === 0 ? 'shield_ripple' : 'invuln_plink');
        if (i % 2 === 0) at(t, 'sad_squeak', (i % 7) - 3);
        if (i % 4 === 1) at(t, 'hollow_unravel', (i % 5) - 2);
        if (i % 6 === 0) at(t, 'aelari_shatter', (i % 3) * 2);
        if (i % 10 === 5) at(t, 'shield_shatter');
        if (i % 8 === 3) at(t, 'panic_squeak');
        if (i % 5 === 0) at(t, 'thumper_launch');
        if (i % 5 === 2) at(t, 'thumper_impact');
        if (i % 10 === 3) at(t, 'sprinkler_pulse');
        if (i % 3 === 0) at(t, 'flak_fire');
        if (i % 3 === 1) at(t, 'flak_burst');
        if (i % 40 === 0) at(t, 'seeker_launch');
        if (i % 4 === 0) {
          at(t, 'zap_arc');
          for (let k = 1; k <= 4; k++) at(t + k * 0.045, 'zap_jump', 2 * k);
        }
        if (i % 20 === 0) at(t, 'capacitor_hum', ((i / 20) % 4) * 3);
        if (i % 80 === 79) at(t, 'capacitor_discharge');
        if (i % 40 === 20) {
          at(t, 'frost_burst');
          at(t + 0.05, 'stasis_lock');
        }
        if (i % 36 === 0) at(t, 'aelari_hum');
        if (i % 11 === 0) at(t, 'cloak_steps');
        if (i % 30 === 7) at(t, 'reveal_ping');
      }
      at(0.5, 'witch_arrive');
      at(1, 'wave_start');
      at(1, 'hollow_hum');
      at(1.2, 'checkpoint');
      at(1.5, 'pulse_tell');
      at(2, 'hush_tell');
      at(2, 'dilation_swell');
      at(2.5, 'hushed');
      at(3, 'pulse_fire');
      at(3.5, 'scan_ping');
      at(4, 'blink_tell');
      at(5, 'witch_phase');
      at(5.5, 'blink');
      at(6, 'tell_fizzle');
      at(6, 'hush_tell');
      at(6.5, 'hushed');
      for (const t of [2, 5, 8]) at(t, 'asset_hit');
      at(3, 'leak');
      at(3, 'strike_charge');
      at(4, 'strike_beam');
      at(4, 'strike_boom');
      at(6, 'low_integrity');
      at(7, 'hollow_hum');
      at(7.2, 'upgrade');
      at(7.5, 'tidybot_chime');
      at(7.7, 'tidybot_chime', 3);
      at(8.8, 'witch_retreat');
    },
    line: { at: 7.6, blip: 'blip.vesthara' },
    hollow: true,
  },
} as const satisfies Readonly<Record<string, Storm>>;
export type StormId = keyof typeof STORMS;

export function isStormId(id: string): id is StormId {
  return Object.hasOwn(STORMS, id);
}

/** A storm's plays in time order, so the voice book sees them as the live game would. */
function stormPlays(storm: Storm, withBlip: boolean): [t: number, id: SfxId, pitch: number][] {
  const plays: [t: number, id: SfxId, pitch: number][] = [];
  const at = (t: number, id: SfxId, pitch = 0): void => {
    plays.push([t, id, pitch]);
  };
  storm.sounds(at);
  if (withBlip) at(storm.line.at, storm.line.blip);
  typing(at, storm.line.at);
  return plays.toSorted((a, b) => a[0] - b[0]);
}

/** A storm's theme and cue (a cue starts on the offline clock's zero, over the storm's opening). */
function stormMusic(storm: Storm, s: Synth): void {
  s.setTheme(storm.theme, { base: 1, drums: 1, lead: 1 });
  s.cue(storm.cue);
}

/**
 * A ducked storm's timeline, as the live game ducks it (app/audio.ts): the Hollow's steady duck
 * while Hollow walk, and while its line shows the radio's music duck and speech's duck of the
 * low-priority sounds; every sound's own `duck` follows the clock.
 */
function duckedTimeline(storm: Storm, withBlip: boolean): Timed[] {
  const timed: Timed[] = stormPlays(storm, withBlip).map(([t, id, pitch]) => ({
    t,
    id,
    run: (s, delay) => s.play(id, { delay, pitch }),
  }));
  if (storm.hollow) {
    timed.push({
      t: 0,
      run: (s) => s.holdDuck(HOLLOW_DUCK.key, HOLLOW_DUCK.level, HOLLOW_DUCK.fadeSec),
    });
  }
  const { at } = storm.line;
  timed.push(
    {
      t: at,
      run: (s) => {
        s.holdDuck('radio', RADIO_DUCK);
        s.holdSfxDuck('speech', SPEECH_SFX_DUCK);
      },
    },
    {
      t: at + LINE_SEC,
      run: (s) => {
        s.holdDuck('radio', null);
        s.holdSfxDuck('speech', null);
      },
    },
  );
  return timed;
}

/** RMS (dB) of `samples` over [from, to) seconds. */
function windowRmsDb(samples: Float32Array, from: number, to: number): number {
  const a = Math.max(0, Math.floor(from * RATE));
  const b = Math.min(samples.length, Math.ceil(to * RATE));
  return analyze([samples.subarray(a, b)], RATE).rmsDb;
}

/**
 * Renders storm `id` (STORMS) through the real graph, its cue over its opening: with no ducking
 * (the loudest case), or `ducked` as the live game ducks it, with its speech margin (the blip
 * against the rest of the mix, both raw, over the blip's span).
 */
export async function renderStorm(
  id: StormId = 'act1',
  { ducked = false }: { readonly ducked?: boolean } = {},
): Promise<RenderLevels> {
  const storm: Storm = STORMS[id];
  if (!ducked) {
    return both(
      STORM_SEC,
      (s) => {
        stormMusic(storm, s);
        for (const [t, sfxId, pitch] of stormPlays(storm, true)) {
          s.play(sfxId, { delay: t, pitch });
        }
        s.pump(STORM_SEC);
      },
      true,
    );
  }
  const music = (s: Synth): void => stormMusic(storm, s);
  const full = duckedTimeline(storm, true);
  const out = await renderBuffer(STORM_SEC, music, {}, full);
  const raw = await renderBuffer(STORM_SEC, music, { rawMaster: true }, full);
  // The rest of the mix without the blip, and the blip alone (the raw graph is linear).
  const rest = await renderBuffer(
    STORM_SEC,
    music,
    { rawMaster: true },
    duckedTimeline(storm, false),
  );
  const { at, blip } = storm.line;
  const alone = await renderBuffer(STORM_SEC, () => {}, { rawMaster: true }, [
    { t: at, run: (s, delay) => s.play(blip, { delay }) },
  ]);
  const end = at + recipeDuration(SFX[blip]);
  const blipDb = windowRmsDb(alone, at, end);
  const restDb = windowRmsDb(rest, at, end);
  const parts: Record<string, number> = {};
  const sub = async (name: string, keep: (id: SfxId) => boolean, withMusic: boolean) => {
    const tl = duckedTimeline(storm, false).filter((e) => {
      const id = (e as { id?: SfxId }).id;
      return id === undefined || keep(id);
    });
    const buf = await renderBuffer(STORM_SEC, withMusic ? music : () => {}, { rawMaster: true }, tl);
    parts[name] = windowRmsDb(buf, at, end);
  };
  await sub('music', () => false, true);
  await sub('low', (id) => SFX[id].priority <= 1, false);
  await sub('high', (id) => SFX[id].priority >= 2 && id !== 'type_tick', false);
  await sub('ticks', (id) => id === 'type_tick', false);
  for (const id of new Set(stormPlays(storm, false).filter(([t]) => t > at - 3 && t < end).map(([, i]) => i))) {
    if (SFX[id].priority >= 2) await sub(id, (i) => i === id, false);
  }
  const W = 0.05;
  let best = -Infinity, bestT = at;
  for (let t = at; t + W <= end; t += 0.005) {
    const v = windowRmsDb(alone, t, t + W);
    if (v > best) { best = v; bestT = t; }
  }
  let restMax = -Infinity;
  for (let t = at; t + W <= end; t += 0.005) restMax = Math.max(restMax, windowRmsDb(rest, t, t + W));
  const sub2 = async (name: string, keep: (id: SfxId) => boolean, withMusic: boolean) => {
    const tl = duckedTimeline(storm, false).filter((e) => {
      const id = (e as { id?: SfxId }).id;
      return id === undefined || keep(id);
    });
    const buf = await renderBuffer(STORM_SEC, withMusic ? music : () => {}, { rawMaster: true }, tl);
    parts['@' + name] = windowRmsDb(buf, bestT, bestT + W);
  };
  await sub2('music', () => false, true);
  await sub2('low', (id) => SFX[id].priority <= 1, false);
  await sub2('high', (id) => SFX[id].priority >= 2 && id !== 'type_tick', false);
  await sub2('hum', (id) => id === 'hollow_hum', false);
  parts['blip50'] = best;
  parts['blip50at'] = bestT;
  parts['restAtBest'] = windowRmsDb(rest, bestT, bestT + W);
  parts['restMax50'] = restMax;
  parts['blipSpan'] = blipDb;
  parts['restSpan'] = restDb;
  console.log(id, JSON.stringify(parts));
  return {
    out: analyze([out], RATE),
    raw: analyze([raw], RATE),
    speech: { blip, blipDb, restDb, marginDb: blipDb - restDb },
  };
}
