// Offline renders for the level checks (nobody can listen in CI): each sound effect, cue, and
// theme, and the worst-case storms (Act I's W7 and boss, Act II's Witch fight), rendered through the real synth graph into an
// OfflineAudioContext and measured (analyze.ts). The `__sd.audio` test hooks expose them and
// smoke/audio.spec.ts asserts the numbers. Browser only.
import { analyze, type Levels } from './analyze.ts';
import { CUES, THEMES, type CueId, type ThemeId } from './music/index.ts';
import { compileSong } from './music/pattern.ts';
import { recipeDuration } from './recipes.ts';
import { SFX, type SfxId } from './sfx/index.ts';
import { DEFAULT_VOLUMES, Synth, type SynthOptions } from './synth.ts';

const RATE = 44_100;
const TAIL_SEC = 0.3;

/** Levels through the full master chain, and the raw mix before the limiter (headroom). */
export interface RenderLevels {
  readonly out: Levels;
  readonly raw: Levels;
}

async function render(
  seconds: number,
  build: (s: Synth) => void,
  opts: SynthOptions,
): Promise<Levels> {
  const ctx = new OfflineAudioContext(1, Math.ceil(seconds * RATE), RATE);
  const synth = new Synth(ctx, opts);
  synth.setVolumes(DEFAULT_VOLUMES);
  build(synth);
  const buf = await ctx.startRendering();
  return analyze([buf.getChannelData(0)], RATE);
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
}

/** The type-ticks of a line typing from `from` for 1 s, after its speaker's blip. */
function line(at: (t: number, id: SfxId, pitch?: number) => void, from: number, blip: SfxId) {
  at(from - 0.2, blip);
  for (let t = from; t < from + 1; t += 0.025) at(t, 'type_tick', 5);
}

/**
 * The worst cases the levels are checked against (`render('storm')`, `render('storm:act2')`),
 * each through the voice limits with no ducking:
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
      line(at, 7.8, 'blip.quill');
      at(8, 'gerald_whistle');
      at(8.5, 'drone_cleared');
      at(8.8, 'boss_retreat');
    },
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
      line(at, 7.8, 'blip.vesthara');
      at(8.8, 'witch_retreat');
    },
  },
} as const satisfies Readonly<Record<string, Storm>>;
export type StormId = keyof typeof STORMS;

export function isStormId(id: string): id is StormId {
  return Object.hasOwn(STORMS, id);
}

/** Renders storm `id` (STORMS) through the real graph, its cue over its opening. */
export function renderStorm(id: StormId = 'act1'): Promise<RenderLevels> {
  const storm: Storm = STORMS[id];
  return both(
    STORM_SEC,
    (s) => {
      s.setTheme(storm.theme, { base: 1, drums: 1, lead: 1 });
      const plays: [t: number, id: SfxId, pitch: number][] = [];
      storm.sounds((t, sfxId, pitch = 0) => {
        plays.push([t, sfxId, pitch]);
      });
      // In time order, so the voice book sees them as the live game would.
      for (const [t, sfxId, pitch] of plays.toSorted((a, b) => a[0] - b[0])) {
        s.play(sfxId, { delay: t, pitch });
      }
      // A cue starts on the offline clock's zero: the boss sting over the storm's opening.
      s.cue(storm.cue);
      s.pump(STORM_SEC);
    },
    true,
  );
}
