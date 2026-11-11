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
import { BLIP_SFX } from './sfx/blips.ts';
import { isSfxId, SFX, type SfxId } from './sfx/index.ts';
import { PUMP_MS } from './engine.ts';
import { HOLLOW_DUCK } from './eventTablesAct2.ts';
import { BEAM_SOUNDS, DARK_SOUNDS } from './eventTablesAct2b.ts';
import { DEFAULT_VOLUMES, RADIO_DUCK, SPEECH_SFX_DUCK, Synth, type SynthOptions } from './synth.ts';

const RATE = 44_100;
/** Every speaker's blip. */
const BLIP_IDS: readonly SfxId[] = Object.keys(BLIP_SFX).filter(isSfxId);
const TAIL_SEC = 0.3;

/**
 * How far a line's blip stands over the rest of a ducked storm's mix as it's spoken: the blip's
 * RMS at its loudest moment (MOMENT_SEC) and the RMS of everything else over the line's opening
 * (OPENING_SEC), both before the limiter (which treats both alike), and their difference (D134,
 * D135: at least 6 dB).
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
  /**
   * A ducked storm's speech margins: its own line's blip first, then every other speaker's blip
   * spoken at the same moment over the same mix.
   */
  readonly speech?: readonly SpeechMargin[];
}

/** The moment a blip's loudness is measured over (s): about what the ear sums a short sound over. */
const MOMENT_SEC = 0.05;
/** A line's opening (s), the bed its blip is heard against. */
const OPENING_SEC = 0.3;

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
  // Two independent contexts, rendered at once (each on its own audio thread; T564b).
  const [out, raw] = await Promise.all([
    render(seconds, build, { noDuck }),
    render(seconds, build, { noDuck, rawMaster: true }),
  ]);
  return { out, raw };
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
    s.setTheme(id, { base: 1, drums: 1, lead: 1, choir: 1 });
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
  /** A line spoken over it: its speaker's blip at `at`, then 1 s of typing (`typing`). */
  readonly line: { readonly at: number; readonly blip: SfxId };
  /** Hollow units walk throughout (a ducked render holds HOLLOW_DUCK from the start). */
  readonly hollow: boolean;
  /** Sundown's dark throughout (a ducked render holds DARK_SOUNDS' duck at it), if any. */
  readonly dark?: number;
  /**
   * The blips a ducked render measures against the mix (its line's first): every speaker's when
   * absent; a newer storm names only its own speakers, since each blip is a render of its own.
   */
  readonly margins?: readonly SfxId[];
}

/** How long a storm's line shows (s): its blip, 1 s of typing, and a held beat after. */
const LINE_SEC = 2.2;

/** The type-ticks of a line typing for 1 s, starting just after its speaker's blip at `blipAt`. */
function typing(at: (t: number, id: SfxId, pitch?: number) => void, blipAt: number) {
  for (let t = blipAt + 0.2; t < blipAt + 1.2; t += 0.025) at(t, 'type_tick', 5);
}

/** The music's level under Sundown's `dark` (app/audio.ts `darkDuckLevel`, unstepped). */
const darkLevel = (dark: number): number => 1 - DARK_SOUNDS.duckDepth * dark;

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
 * - **act2_dusk**: A2M5's pivot and A2M6's W12 in full dark at once (T550): the Act II theme under
 *   the PA's minor shift change, the rattle and the deaths, Fracture cracks, Rift Moths phasing,
 *   two Prisms locking, their hum climbing and then held as a bed at full ramp, the Lantern's
 *   lock, Mindspike shots and echoes, Skewer, Magnet Crane, a fizzled charge, income coins,
 *   Cantors singing, the Penitent's arrival, break, re-forming shield and kneel, the stand-down,
 *   refugees reaching the exit (Pebble too) and two taken there, the meter's alarm, Stillness
 *   locking a freeze, the dusk's fall and the night's air, the hush, the Hollow's hum, and Goldie
 *   speaking in the dark.
 * - **act3**: A3M2's hasted rush and A3M1's Maws at once, with A3M3's door (T650): the Act III bed
 *   with every layer up (the Choir's line too) under Thrum and Pebble's Leaving Song, the rattle,
 *   Everglow's machines shutting down and their servos and the Expediter's metronome, the Hollow
 *   silent as they die but cracking as they split, Maws drawing in and swallowing (a refugee
 *   among them), rifts cracking and tearing open, Undertows sinking and rising, swarmlings
 *   latching and coming home, Underfoot and its traps, Bloom chimes with Stasis and Gravity Well,
 *   Mindspikes and a Prism, three revocation stamps, Bricks bracing, the door hum and the SEAL,
 *   refugees safe and the meter's alarm, the Hollow's hum, and Sterling speaking over it.
 * - **act3b**: A3M5's platform fight and A3M6's road at once (T750): the vats' bed with every
 *   layer up under the PA's frantic stutter, the rattle and Everglow's shutdowns, Gloop spitting
 *   and splatting, leapers boinging and a flyer grounded, puddles sizzling, Liabilities stomping, a
 *   Gunship's rotor, an Associate's hum and a Black Budget's shimmer, Auditor rings and Silencer
 *   tendrils, towers jamming, crackling and coming back, a Reboot, the platform's arrival, hangar,
 *   Takeover and laser, the jettison and four plates crashing, the Gathering Maw straining,
 *   splitting and merging, bearers humming home, Gerald's delivery, Pebble's knock-knock, the
 *   Hollow's hum, and Kip speaking over it. Its ducked render measures Kip's, Pebble's and QUILL's
 *   blips only (each blip is a render of its own; T766).
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
  act2_dusk: {
    theme: 'act2_battle',
    cue: 'pa_shift_minor',
    sounds(at) {
      for (let i = 1; i * 0.05 < STORM_SEC - 1; i++) {
        const t = i * 0.05;
        at(t, 'rivet_shot');
        if (i % 2 === 0) at(t, 'sad_squeak', (i % 7) - 3);
        if (i % 3 === 1) at(t, 'hollow_unravel', (i % 5) - 2);
        if (i % 6 === 2) at(t + 0.04, 'void_crack');
        if (i % 5 === 0) at(t, 'thumper_launch');
        if (i % 5 === 2) at(t, 'thumper_impact');
        if (i % 3 === 0) at(t, 'flak_fire');
        if (i % 3 === 1) at(t, 'flak_burst');
        if (i % 4 === 0) at(t, 'shield_ripple');
        if (i % 6 === 0) at(t, 'aelari_shatter', (i % 3) * 2);
        if (i % 10 === 0 && t < 5) at(t, 'beam_hum', Math.min(4, Math.floor(t)));
        if (i % 46 === 0 && t >= 4) at(t, 'beam_bed', BEAM_SOUNDS.maxPitch);
        if (i % 16 === 4) at(t, 'prism_lock');
        if (i % 25 === 9) at(t, 'lantern_lock');
        if (i % 4 === 2) at(t, 'mindspike_shot');
        if (i % 8 === 2) at(t + 0.02, 'echo_burst');
        if (i % 12 === 5) at(t, 'phase_tell');
        if (i % 12 === 11) at(t, 'phase_in');
        if (i % 12 === 3) at(t, 'phase_out');
        if (i % 30 === 15) at(t, 'skewer_shot');
        if (i % 40 === 25) at(t, 'magnet_grab');
        if (i % 20 === 10) at(t, 'income_coin', 3);
        if (i % 18 === 6) at(t, 'refugee_safe');
        if (i % 48 === 0) at(t, 'cantor_song');
        if (i % 36 === 0) at(t, 'aelari_hum');
        if (i % 11 === 0) at(t, 'cloak_steps');
        if (i % 50 === 0) at(t, 'night_air');
      }
      at(0.4, 'penitent_arrive');
      at(1, 'wave_start');
      at(1, 'dusk_fall');
      at(1, 'hollow_hum');
      at(1.5, 'pulse_tell');
      at(2, 'hush_tell');
      at(2.3, 'penitent_break');
      at(2.5, 'hushed');
      at(2.8, 'charge_fizzle');
      at(3, 'pulse_fire');
      at(3.4, 'stillness_cast');
      at(3.45, 'stasis_lock');
      at(4, 'refugee_taken');
      at(4.3, 'low_integrity');
      at(4.8, 'shield_reform');
      at(5.4, 'penitent_kneel');
      at(5.5, 'stand_down');
      at(5.8, 'pebble_safe');
      at(6.2, 'tell_fizzle');
      at(6.6, 'refugee_taken');
      at(7, 'hollow_hum');
      at(7.2, 'upgrade');
      at(8.4, 'checkpoint');
    },
    line: { at: 7.6, blip: 'blip.goldie' },
    hollow: true,
    dark: 1,
  },
  act3: {
    theme: 'act3_battle',
    cue: 'leaving_hum_two',
    sounds(at) {
      for (let i = 1; i * 0.05 < STORM_SEC - 1; i++) {
        const t = i * 0.05;
        at(t, 'rivet_shot');
        if (i % 2 === 0) at(t, 'everglow_shutdown', (i % 5) - 2);
        if (i % 6 === 2) at(t + 0.04, 'void_crack');
        if (i % 5 === 0) at(t, 'thumper_launch');
        if (i % 5 === 2) at(t, 'thumper_impact');
        if (i % 4 === 2) at(t, 'mindspike_shot');
        if (i % 16 === 4) at(t, 'prism_lock');
        if (i % 10 === 0 && t < 5) at(t, 'beam_hum', Math.min(4, Math.floor(t)));
        if (i % 3 === 0) at(t, 'swarm_latch');
        if (i % 7 === 3) at(t, 'swarm_home');
        if (i % 9 === 4) at(t, 'trap_snap');
        if (i % 10 === 0) at(t, 'haste_tick');
        if (i % 16 === 8) at(t, 'compliance_step');
        if (i % 14 === 5) at(t, 'gravity_pull');
        if (i % 30 === 12) at(t, 'undertow_sink');
        if (i % 30 === 27) at(t, 'undertow_rise');
        if (i % 18 === 6) at(t, 'refugee_safe');
        if (i % 12 === 7) at(t, 'armor_plink');
      }
      at(0.3, 'rift_crack');
      at(1, 'wave_start');
      at(1, 'rift_open');
      at(1, 'hollow_hum');
      at(1.4, 'maw_tell');
      at(2.4, 'maw_gulp');
      at(2.6, 'underfoot_cast');
      at(3, 'bloom_chime');
      at(3.05, 'stasis_lock');
      at(3.4, 'maw_tell');
      at(4.4, 'maw_gulp');
      at(4.4, 'hushed');
      at(4.6, 'low_integrity');
      at(5, 'revoke_stamp');
      at(5.14, 'revoke_stamp');
      at(5.28, 'revoke_stamp');
      at(5.6, 'bricks_brace');
      at(6, 'door_hum');
      at(6.5, 'bloom_chime');
      at(7, 'hollow_hum');
      at(7.2, 'upgrade');
      at(8.6, 'door_seal');
    },
    line: { at: 7.6, blip: 'blip.sterling' },
    hollow: true,
  },
  act3b: {
    theme: 'act3_vats',
    cue: 'pa_frantic',
    sounds(at) {
      for (let i = 1; i * 0.05 < STORM_SEC - 1; i++) {
        const t = i * 0.05;
        at(t, 'rivet_shot');
        if (i % 2 === 0) at(t, 'everglow_shutdown', (i % 5) - 2);
        if (i % 3 === 0) at(t, 'gloop_spit');
        if (i % 3 === 2) at(t, 'gloop_splat');
        if (i % 2 === 1) at(t, 'leaper_boing');
        if (i % 5 === 0) at(t, 'thumper_launch');
        if (i % 5 === 2) at(t, 'thumper_impact');
        if (i % 30 === 15) at(t, 'skewer_shot');
        if (i % 9 === 4) at(t, 'puddle_hiss');
        if (i % 8 === 1) at(t, 'gunship_rotor');
        if (i % 22 === 3) at(t, 'liability_stomp');
        if (i % 32 === 5) at(t, 'associate_hum');
        if (i % 11 === 0) at(t, 'bb_shimmer');
        if (i % 20 === 7) at(t, 'jam_static');
        if (i % 6 === 1) at(t, 'jammed');
        if (i % 7 === 4) at(t, 'jam_clear');
        if (i % 12 === 7) at(t, 'armor_plink');
        if (i % 14 === 9) at(t, 'grounded_thud');
      }
      at(0.2, 'sv_arrive');
      at(0.5, 'jam_ring');
      at(0.6, 'jam_tendril');
      at(1, 'wave_start');
      at(1, 'hollow_hum');
      at(1.2, 'sv_hangar');
      at(2.7, 'sv_launch');
      at(2.8, 'jam_ring');
      at(3, 'sv_takeover');
      at(3.2, 'takeover_laser');
      at(3.4, 'gmaw_arrive');
      at(4, 'tell_fizzle');
      at(4.4, 'bearer_note', 0);
      at(4.7, 'bearer_note', 5);
      at(5, 'bearer_note', 9);
      at(5.2, 'reboot');
      at(5.5, 'gmaw_strain');
      at(6, 'jettison');
      for (let k = 0; k < 4; k++) at(6.3 + k * 0.12, 'plate_crash');
      at(6.6, 'gmaw_split');
      at(6.9, 'asset_hit');
      at(7, 'mail_delivered');
      at(7.2, 'knock_knock');
      at(7.4, 'gmaw_merge');
      at(8.4, 'sv_retreat');
    },
    line: { at: 7.6, blip: 'blip.kip' },
    hollow: true,
    margins: ['blip.kip', 'blip.pebble', 'blip.quill'],
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
  s.setTheme(storm.theme, { base: 1, drums: 1, lead: 1, choir: 1 });
  s.cue(storm.cue);
}

/**
 * A ducked storm's timeline, as the live game ducks it (app/audio.ts): the Hollow's steady duck
 * while Hollow walk, and while its line shows the radio's music duck and speech's duck of the
 * low-priority sounds, with the line-start dip under its blip; every sound's own `duck` follows
 * the clock.
 */
function duckedTimeline(storm: Storm, withBlip: boolean): Timed[] {
  const timed: Timed[] = stormPlays(storm, withBlip).map(([t, id, pitch]) => ({
    t,
    run: (s, delay) => s.play(id, { delay, pitch }),
  }));
  if (storm.hollow) {
    timed.push({
      t: 0,
      run: (s) => s.holdDuck(HOLLOW_DUCK.key, HOLLOW_DUCK.level, HOLLOW_DUCK.fadeSec),
    });
  }
  const dark = storm.dark ?? 0;
  if (dark > 0) {
    timed.push({
      t: 0,
      run: (s) => s.holdDuck(DARK_SOUNDS.duck, darkLevel(dark), DARK_SOUNDS.duckFadeSec),
    });
  }
  const { at } = storm.line;
  timed.push(
    {
      t: at,
      run: (s) => {
        s.holdDuck('radio', RADIO_DUCK);
        s.holdSfxDuck('speech', SPEECH_SFX_DUCK);
        s.dipUnderSpeech();
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

/** RMS (dB) of `samples` over [from, from + sec) seconds. */
function momentDb(samples: Float32Array, from: number, sec = MOMENT_SEC): number {
  const a = Math.max(0, Math.round(from * RATE));
  const b = Math.min(samples.length, a + Math.round(sec * RATE));
  let sum = 0;
  for (let i = a; i < b; i++) sum += samples[i]! * samples[i]!; // a ≤ i < b ≤ length
  return b > a && sum > 0 ? 10 * Math.log10(sum / (b - a)) : -Infinity;
}

/**
 * How far `blip`, spoken at `at` over `rest` (a raw render), stands over it: the blip alone (raw)
 * at its loudest moment (MOMENT_SEC, stepped every 5 ms) against the rest's level over the line's
 * opening (OPENING_SEC from `at`; an average, so one shot landing on the moment doesn't decide it).
 */
async function speechMargin(blip: SfxId, rest: Float32Array, at: number): Promise<SpeechMargin> {
  const dur = recipeDuration(SFX[blip]);
  const alone = await renderBuffer(dur + 0.1, (s) => s.play(blip), { rawMaster: true });
  let blipDb = -Infinity;
  for (let t = 0; t + MOMENT_SEC <= dur; t += 0.005) blipDb = Math.max(blipDb, momentDb(alone, t));
  const restDb = momentDb(rest, at, OPENING_SEC);
  return { blip, blipDb, restDb, marginDb: blipDb - restDb };
}

/**
 * Renders storm `id` (STORMS) through the real graph, its cue over its opening: with no ducking
 * (the loudest case), or `ducked` as the live game ducks it, with its speech margins (each blip
 * at its loudest moment against the rest of the mix over the line's opening, both raw).
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
  // Three independent contexts, rendered at once (each on its own audio thread, so a stepped
  // render's suspends overlap the others' work; T564b): the mix, its raw master, and the rest of
  // the mix without the line's blip (the raw graph is linear), measured against every blip.
  const [out, raw, rest] = await Promise.all([
    renderBuffer(STORM_SEC, music, {}, full),
    renderBuffer(STORM_SEC, music, { rawMaster: true }, full),
    renderBuffer(STORM_SEC, music, { rawMaster: true }, duckedTimeline(storm, false)),
  ]);
  const blips = [
    storm.line.blip,
    ...(storm.margins ?? BLIP_IDS).filter((b) => b !== storm.line.blip),
  ];
  const speech = await Promise.all(blips.map((b) => speechMargin(b, rest, storm.line.at)));
  return { out: analyze([out], RATE), raw: analyze([raw], RATE), speech };
}
