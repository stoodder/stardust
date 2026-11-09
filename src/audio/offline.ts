// Offline renders for the level checks (nobody can listen in CI): each sound effect, cue, and
// theme, and a W7-intensity storm, rendered through the real synth graph into an
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

/**
 * A worst case well past A1M1's W7 at 2×, and past A1M5's boss wave: the battle theme with every
 * layer up and no ducking, Rivet shots attempted 20 a second, pops 10 a second (each Bunchling's
 * split after it), Thumper fire and impacts 4 a second each, Sprinkler pulses, Skyhook flak and
 * its bursts, a Zapcoil arc with four jumps every 0.2 s, armor and invulnerable plinks on every
 * shot, a Puffwing flock, digs and surfacings, three leaks, a strike, Time Dilation and Clearance
 * Sale, the boss's arrival, sneeze tell, sneeze, phase change, and retreat, its sting, Gerald,
 * the salvage drone, the low-integrity alarm, builds, sells, an upgrade, the wave horn, and a line
 * typing over it all, through the voice limits.
 */
export function renderStorm(): Promise<RenderLevels> {
  return both(
    STORM_SEC,
    (s) => {
      s.setTheme('act1_battle', { base: 1, drums: 1, lead: 1 });
      const plays: [t: number, id: SfxId, pitch: number][] = [];
      const at = (t: number, id: SfxId, pitch = 0): void => {
        plays.push([t, id, pitch]);
      };
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
      at(7.6, 'blip.quill');
      for (let t = 7.8; t < 8.8; t += 0.025) at(t, 'type_tick', 5);
      at(8, 'gerald_whistle');
      at(8.5, 'drone_cleared');
      at(8.8, 'boss_retreat');
      // In time order, so the voice book sees them as the live game would.
      for (const [t, id, pitch] of plays.toSorted((a, b) => a[0] - b[0])) {
        s.play(id, { delay: t, pitch });
      }
      // A cue starts on the offline clock's zero: the boss sting over the storm's opening.
      s.cue('boss_sting');
      s.pump(STORM_SEC);
    },
    true,
  );
}
