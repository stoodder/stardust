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
 * A worst case well past A1M1's W7 at 2×: the battle theme with every layer up and no ducking,
 * Rivet shots attempted 20 a second, pops 10 a second, Thumper fire and impacts 4 a second each,
 * Sprinkler pulses, three leaks, a strike, the low-integrity alarm, builds, sells, an upgrade, the
 * wave horn, and the sting, all through the voice limits.
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
        if (i % 2 === 0) at(t, 'enemy_pop', (i % 7) - 3);
        if (i % 5 === 0) at(t, 'thumper_launch');
        if (i % 5 === 2) at(t, 'thumper_impact');
        if (i % 10 === 3) at(t, 'sprinkler_pulse');
      }
      at(1, 'wave_start');
      for (const t of [2, 5, 8]) at(t, 'leak');
      at(3, 'strike_charge');
      at(4, 'strike_beam');
      at(4, 'strike_boom');
      at(6, 'low_integrity');
      at(7, 'build');
      at(7.2, 'upgrade');
      at(7.4, 'sell');
      at(7.6, 'radio_quill');
      // In time order, so the voice book sees them as the live game would.
      for (const [t, id, pitch] of plays.toSorted((a, b) => a[0] - b[0])) {
        s.play(id, { delay: t, pitch });
      }
      s.pump(STORM_SEC);
    },
    true,
  );
}
