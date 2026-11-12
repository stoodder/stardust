// The synth (architecture.md § Audio): the WebAudio graph and the voices. It builds every sound
// from tone layers (oscillators, the two chiptune pulses, and a looping noise buffer, each with an
// ADSR envelope, glides, arpeggio steps, vibrato, and a filter), keeps sound effects inside the
// voice book's limits, sequences the music themes and cues a little ahead of the audio clock, and
// ducks the music under the radio and big sounds. It works on any BaseAudioContext, so the same
// code renders offline (offline.ts) for the level checks.
//
// The bus graph:
//   sfx voices (priority ≤ 2, not speech) ─▶ underSpeech ─▶ lineDip ─▶ sfx ─┐ (ducks while a line
//                                              is spoken, R10, and dips again as each one starts)
//   speech (blips, ticks), `overSpeech` sounds, alarms (3) ─▶ sfx ──────────┤
//   theme voices ─▶ layer gains ─▶ theme fade ─▶ duck ─▶ music ─▶ master ─▶ glue ─▶ limiter ─▶ trim ─▶ clip ─▶ out
//   cue voices ─▶ cues ───────────────────────────────┘ (into music, after the duck)
import { createRng, nextFloat, type Rng } from '../shared/rng.ts';
import { midiToHz, semitones } from './notes.ts';
import {
  ALL_INSTRUMENTS,
  loadedCue,
  loadedTheme,
  type CueId,
  type ThemeId,
} from './music/index.ts';
import {
  compileSong,
  createSequencer,
  type CompiledSong,
  type SeqEvent,
  type Sequencer,
} from './music/pattern.ts';
import { recipeDuration } from './recipes.ts';
import { SPEECH_SFX } from './sfx/blips.ts';
import { loadedSfx, type SfxId } from './sfx/index.ts';
import type { Instrument, MusicLayer, SfxRecipe, Song, ToneLayer } from './types.ts';
import { MUSIC_LAYERS } from './types.ts';
import { createVoiceBook, type VoiceBook } from './voices.ts';

/** Sound effect instances that may sound at once. */
export const MAX_SFX_VOICES = 16;
/** How far ahead of the audio clock the music is scheduled (s). */
export const LOOKAHEAD_SEC = 0.15;
/** Fixed trims under the player's volumes, so the defaults sit well below full scale. */
export const SFX_TRIM = 0.7;
export const MUSIC_TRIM = 0.32;
/** Layer and theme crossfades (time constants, s). */
export const LAYER_FADE_SEC = 0.35;
export const THEME_FADE_SEC = 0.5;
/** Ducking: how fast the music dips and comes back (time constants, s). */
export const DUCK_ATTACK_SEC = 0.03;
export const DUCK_RELEASE_SEC = 0.2;
/**
 * Sound effects at this priority or below, except speech's own (SPEECH_SFX: the blips and the
 * typewriter's tick), go through the `underSpeech` bus, which ducks while someone speaks (R10):
 * the rattle (0–1) and the moments (2: the Hollow's hum, a horn, a chime). Alarms (3) never duck.
 */
export const UNDER_SPEECH_MAX_PRIORITY = 2;
/**
 * The `underSpeech` bus's level while a line is spoken: −6 dB (R10; D134); with the line-start dip
 * (LINE_DIP), a speaker's blip stands at least 6 dB over the mix (smoke/audio.spec.ts measures it
 * in the ducked storms).
 */
export const SPEECH_SFX_DUCK = 0.5;
/**
 * As each line starts, the `underSpeech` bus dips a further −8 dB (D135) for LINE_DIP_SEC, on top
 * of SPEECH_SFX_DUCK, so the speaker's blip (5 dB quieter than D134's level) still clears the mix
 * by 6 dB without being loud on its own: it settles in LINE_DIP_ATTACK_SEC and comes back over
 * LINE_DIP_RELEASE_SEC (about 95% each way).
 */
export const LINE_DIP = 10 ** (-8 / 20);
export const LINE_DIP_SEC = 0.35;
export const LINE_DIP_ATTACK_SEC = 0.03;
export const LINE_DIP_RELEASE_SEC = 0.25;
/** The music's level under a spoken line (the comms panel or a scene), so the line reads as spoken. */
export const RADIO_DUCK = 0.55;
/** The limiter: its threshold (dB) and ratio; fast and hard. */
export const LIMITER_THRESHOLD_DB = -8;
export const LIMITER_RATIO = 20;
/**
 * A WebAudio compressor adds its own makeup gain, (1 / full range gain)^0.6 in the spec's
 * DynamicsCompressorNode: at a −8 dB threshold and 20:1 it lifts everything 4.6 dB, so the
 * limiter's loudest output would sit near −3.4 dBFS, not −8 (at −4 dB, its old threshold, the
 * makeup was 2.3 dB and storms peaked at −1.1 dBFS; T323).
 */
export function limiterMakeupDb(thresholdDb: number, ratio: number): number {
  return -0.6 * thresholdDb * (1 - 1 / ratio);
}
/**
 * The trim after the limiter (dB): it keeps 2.3 dB of the makeup (what the −4 dB limiter added),
 * so sounds under the threshold play exactly as loud as before, while the loud ceiling comes down
 * by the difference: storms peak about 4 dB under full scale (D033's −3 dB headroom target).
 */
export const LIMITER_TRIM_DB =
  limiterMakeupDb(-4, LIMITER_RATIO) - limiterMakeupDb(LIMITER_THRESHOLD_DB, LIMITER_RATIO);
/** Notes due longer ago than this when the scheduler wakes are skipped (s). */
const LATE_SEC = 0.05;
/** The quietest an envelope ramps to before it is cut (exponential ramps can't reach 0). */
const FLOOR = 1e-4;

export interface Volumes {
  readonly master: number;
  readonly music: number;
  readonly sfx: number;
  readonly muted: boolean;
}

export const DEFAULT_VOLUMES: Volumes = { master: 0.8, music: 0.7, sfx: 0.8, muted: false };

/** A playing voice: stop it early with a short fade. */
interface Voice {
  stop(at: number): void;
}

/** A music cue playing: its id, its sequencer, and the gain its notes play through. */
interface PlayingCue {
  readonly id: CueId;
  readonly seq: Sequencer;
  readonly out: GainNode;
}

/** How long a finished or stopped cue's gain is kept for its last notes to ring out (s). */
const CUE_TAIL_SEC = 4;
/** A stopped cue fades out over about this long (s; a time constant of a third of it). */
export const CUE_STOP_SEC = 0.15;

interface PlayingTheme {
  readonly id: ThemeId;
  readonly seq: Sequencer;
  readonly fade: GainNode;
  readonly layers: Readonly<Record<MusicLayer, GainNode>>;
  /** The levels the layers fade toward. */
  levels: Record<MusicLayer, number>;
  /** When it stops (after fading out), or null while it plays. */
  stopAt: number | null;
}

export interface SynthOptions {
  /** Seed for the cosmetic RNG (pitch jitter). Never the sim's. */
  readonly seed?: number;
  /** Bypass the glue compressor, limiter, and clipper (to measure the raw mix offline). */
  readonly rawMaster?: boolean;
  /** Never duck the music (offline worst cases: ducks follow the live clock). */
  readonly noDuck?: boolean;
}

export interface PlayOptions {
  /** Semitones (on top of the recipe's jitter). */
  readonly pitch?: number;
  /** Seconds from now. */
  readonly delay?: number;
  /** Gain multiplier. */
  readonly gain?: number;
}

/** Pulse waves for the chiptune duties, as Fourier series. */
function pulseWave(ctx: BaseAudioContext, duty: number): PeriodicWave {
  const n = 48;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) {
    real[k] = Math.sin(2 * Math.PI * k * duty) / (Math.PI * k);
    imag[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (Math.PI * k);
  }
  return ctx.createPeriodicWave(real, imag);
}

/** One second of white noise (seeded, so offline renders repeat exactly). */
function noiseBuffer(ctx: BaseAudioContext, rng: Rng): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = nextFloat(rng) * 2 - 1;
  return buf;
}

/** A soft clipper's curve: linear to 0.8, then easing into ±0.98. */
function clipCurve(): Float32Array<ArrayBuffer> {
  const n = 1024;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const ax = Math.abs(x);
    const y = ax <= 0.8 ? ax : 0.8 + 0.18 * Math.tanh((ax - 0.8) / 0.18);
    curve[i] = Math.sign(x) * y;
  }
  return curve;
}

/** The synth over a context. */
export class Synth {
  readonly ctx: BaseAudioContext;
  /** The player's master volume (and mute). */
  readonly master: GainNode;
  readonly music: GainNode;
  readonly sfx: GainNode;
  /** The sound effects that duck under speech (all but speech's own and the alarms). */
  readonly underSpeech: GainNode;
  /** The `underSpeech` bus's short dip as each line starts (`dipUnderSpeech`). */
  readonly lineDip: GainNode;
  readonly duck: GainNode;
  readonly cues: GainNode;
  readonly #rng: Rng;
  readonly #noise: AudioBuffer;
  readonly #pulse25: PeriodicWave;
  readonly #pulse12: PeriodicWave;
  readonly #book: VoiceBook<Voice> = createVoiceBook<Voice>(MAX_SFX_VOICES);
  readonly #compiled = new Map<string, CompiledSong>();
  #themes: PlayingTheme[] = [];
  /** The cues playing, each through its own gain (so one can be faded out, `stopCue`). */
  #cueSeqs: PlayingCue[] = [];
  /** Cues done or stopped, their gains kept until their last notes ring out (then disconnected). */
  #cueTails: { readonly out: GainNode; readonly until: number }[] = [];
  /** Timed ducks (big sounds) and held ones (the radio, the Hollow), by key. */
  #ducks: { level: number; until: number }[] = [];
  readonly #held = new Map<string, { level: number; fadeSec: number | null }>();
  #duckTarget = 1;
  /** Held ducks of the `underSpeech` bus (a spoken line), by key. */
  readonly #speechHeld = new Map<string, number>();
  #speechTarget = 1;
  readonly #noDuck: boolean;
  #themeLevel = 1;
  /** Sound effects started, by id (the test hooks report it). */
  readonly played = new Map<string, number>();

  constructor(ctx: BaseAudioContext, opts: SynthOptions = {}) {
    this.ctx = ctx;
    this.#rng = createRng(opts.seed ?? 0x5d_a0d1);
    this.#noDuck = opts.noDuck === true;
    this.#noise = noiseBuffer(ctx, this.#rng);
    this.#pulse25 = pulseWave(ctx, 0.25);
    this.#pulse12 = pulseWave(ctx, 0.125);
    this.master = ctx.createGain();
    this.music = ctx.createGain();
    this.sfx = ctx.createGain();
    this.underSpeech = ctx.createGain();
    this.lineDip = ctx.createGain();
    this.underSpeech.connect(this.lineDip);
    this.lineDip.connect(this.sfx);
    this.duck = ctx.createGain();
    this.cues = ctx.createGain();
    this.duck.connect(this.music);
    this.cues.connect(this.music);
    this.music.connect(this.master);
    this.sfx.connect(this.master);
    if (opts.rawMaster === true) {
      this.master.connect(ctx.destination);
    } else {
      // Glue: gentle compression that evens out the mix.
      const glue = ctx.createDynamicsCompressor();
      glue.threshold.value = -18;
      glue.knee.value = 12;
      glue.ratio.value = 3;
      glue.attack.value = 0.005;
      glue.release.value = 0.25;
      // Limiter: fast and hard, its ceiling 3 dB under full scale once trimmed.
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = LIMITER_THRESHOLD_DB;
      limiter.knee.value = 0;
      limiter.ratio.value = LIMITER_RATIO;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.1;
      const trim = ctx.createGain();
      trim.gain.value = 10 ** (LIMITER_TRIM_DB / 20);
      // The clipper catches whatever the limiter's attack lets through.
      const clip = ctx.createWaveShaper();
      clip.curve = clipCurve();
      this.master.connect(glue);
      glue.connect(limiter);
      limiter.connect(trim);
      trim.connect(clip);
      clip.connect(ctx.destination);
    }
    this.setVolumes(DEFAULT_VOLUMES);
  }

  /** Applies the player's volumes (0–1 each) and mute, with a short ramp (no zipper clicks). */
  setVolumes(v: Volumes): void {
    const t = this.ctx.currentTime;
    const set = (g: GainNode, value: number): void => {
      g.gain.cancelScheduledValues(t);
      g.gain.setTargetAtTime(value, t, 0.02);
    };
    set(this.master, v.muted ? 0 : clamp01(v.master));
    set(this.music, clamp01(v.music) * MUSIC_TRIM);
    set(this.sfx, clamp01(v.sfx) * SFX_TRIM);
  }

  /**
   * Plays a sound effect if the voice book admits it (rate limit, per-sound cap, global cap with
   * priority stealing). Returns whether it started.
   */
  play(id: SfxId, opts: PlayOptions = {}): boolean {
    // A sound whose act hasn't loaded yet (audio/sfx/index.ts) plays nothing.
    const recipe: SfxRecipe | undefined = loadedSfx(id);
    if (recipe === undefined) return false;
    const start = this.ctx.currentTime + Math.max(0, opts.delay ?? 0);
    const admit = this.#book.admit(id, recipe, start);
    if (!admit.ok) return false;
    for (const v of admit.cut) v.stop(start);
    const jitter = recipe.jitter ?? 0;
    const pitch = (opts.pitch ?? 0) + (jitter > 0 ? (nextFloat(this.#rng) * 2 - 1) * jitter : 0);
    const voice = this.#playLayers(recipe.layers, {
      when: start,
      gain: recipe.gain * (opts.gain ?? 1),
      ratio: semitones(pitch),
      noteHz: null,
      noteSec: null,
      dest: ducksUnderSpeech(id, recipe) ? this.underSpeech : this.sfx,
    });
    const end = start + recipeDuration(recipe);
    this.#book.add(id, recipe.priority, start, end, voice);
    if (recipe.duck !== undefined) {
      this.#ducks.push({ level: recipe.duck, until: end });
      this.#updateDuck();
    }
    this.played.set(id, (this.played.get(id) ?? 0) + 1);
    return true;
  }

  /**
   * Plays a one-shot music cue now (it isn't ducked; it's the point of the moment). A cue whose
   * chunk hasn't loaded (music/index.ts) plays nothing.
   */
  cue(id: CueId): void {
    const song = loadedCue(id);
    if (song === undefined) return;
    const out = this.ctx.createGain();
    out.connect(this.cues);
    const seq = createSequencer(this.#compile(song), this.ctx.currentTime + 0.02);
    this.#cueSeqs.push({ id, seq, out });
    this.played.set(`cue:${id}`, (this.played.get(`cue:${id}`) ?? 0) + 1);
    this.pump();
  }

  /**
   * Cuts every instance of sound effect `id` short, with the voices' short fade (a loop the story
   * ends: the door hum as the SEAL is pressed). Returns how many it stopped.
   */
  stop(id: SfxId): number {
    const voices = this.#book.take(id);
    const now = this.ctx.currentTime;
    for (const v of voices) v.stop(now);
    return voices.length;
  }

  /**
   * Fades every playing instance of cue `id` out over CUE_STOP_SEC and schedules no more of its
   * notes (a sung line taking over from the one before). Returns how many it stopped.
   */
  stopCue(id: CueId): number {
    const now = this.ctx.currentTime;
    let n = 0;
    this.#cueSeqs = this.#cueSeqs.filter((c) => {
      if (c.id !== id) return true;
      c.out.gain.cancelScheduledValues(now);
      c.out.gain.setTargetAtTime(0, now, CUE_STOP_SEC / 3);
      this.#cueTails.push({ out: c.out, until: now + CUE_TAIL_SEC });
      n++;
      return false;
    });
    return n;
  }

  /** The theme playing (not fading out), or null. */
  get theme(): ThemeId | null {
    return this.#themes.find((t) => t.stopAt === null)?.id ?? null;
  }

  /** The current theme's layer levels (targets). */
  get layerLevels(): Readonly<Record<MusicLayer, number>> | null {
    return this.#themes.find((t) => t.stopAt === null)?.levels ?? null;
  }

  /**
   * Plays `id` with its layers at `levels` (0–1), crossfading from whatever played; null fades
   * the music out. The same theme keeps its place in the loop and only moves its layers. A theme
   * whose chunk hasn't loaded (music/index.ts) fades the music out like null.
   */
  setTheme(
    requested: ThemeId | null,
    levels: Readonly<Record<MusicLayer, number>>,
    level = 1,
  ): void {
    const song = requested === null ? undefined : loadedTheme(requested);
    const id = song === undefined ? null : requested;
    const t = this.ctx.currentTime;
    const current = this.#themes.find((p) => p.stopAt === null) ?? null;
    if (current !== null && current.id === id) {
      this.#setLevels(current, levels, t);
      this.#setThemeLevel(current, level, t);
      return;
    }
    if (current !== null) {
      current.fade.gain.cancelScheduledValues(t);
      current.fade.gain.setTargetAtTime(0, t, THEME_FADE_SEC / 3);
      current.stopAt = t + THEME_FADE_SEC * 2;
    }
    if (id === null || song === undefined) return;
    const fade = this.ctx.createGain();
    fade.gain.setValueAtTime(0, t);
    fade.gain.setTargetAtTime(level, t, THEME_FADE_SEC / 3);
    this.#themeLevel = level;
    fade.connect(this.duck);
    const layer = (l: MusicLayer): GainNode => {
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(levels[l], t);
      g.connect(fade);
      return g;
    };
    const layers = {
      base: layer('base'),
      drums: layer('drums'),
      lead: layer('lead'),
      choir: layer('choir'),
    };
    this.#themes.push({
      id,
      seq: createSequencer(this.#compile(song), t + 0.05),
      fade,
      layers,
      levels: { ...levels },
      stopAt: null,
    });
    this.pump();
  }

  /**
   * Holds the music ducked to `level` under `key` (the radio, the Hollow) until it's released
   * with null; the lowest level of every held and timed duck wins. `fadeSec` (optional) is how
   * long the duck takes to settle (about 95%) when this hold moves the music, going down and
   * coming back: a slow, steady dip (the Hollow's) rather than the snap a big sound gets.
   */
  holdDuck(key: string, level: number | null, fadeSec?: number): void {
    const was = this.#held.get(key);
    if (level === null) this.#held.delete(key);
    else this.#held.set(key, { level, fadeSec: fadeSec ?? null });
    this.#updateDuck(fadeSec ?? was?.fadeSec ?? null);
  }

  /**
   * Holds the sound effects that duck under speech (`underSpeech`: priority ≤
   * UNDER_SPEECH_MAX_PRIORITY, not speech's own) at `level` under `key` (a spoken line, R10) until
   * it's released with null; the lowest held level wins.
   */
  holdSfxDuck(key: string, level: number | null): void {
    if (level === null) this.#speechHeld.delete(key);
    else this.#speechHeld.set(key, level);
    if (this.#noDuck) return;
    let target = 1;
    for (const l of this.#speechHeld.values()) target = Math.min(target, l);
    if (target === this.#speechTarget) return;
    const now = this.ctx.currentTime;
    const down = target < this.#speechTarget;
    this.#speechTarget = target;
    this.underSpeech.gain.cancelScheduledValues(now);
    this.underSpeech.gain.setTargetAtTime(target, now, down ? DUCK_ATTACK_SEC : DUCK_RELEASE_SEC);
  }

  /**
   * A line starts (D135): the `underSpeech` bus dips a further LINE_DIP for LINE_DIP_SEC, then
   * comes back; a new line restarts the dip. It stacks with the held speech duck (its own gain).
   */
  dipUnderSpeech(): void {
    if (this.#noDuck) return;
    const now = this.ctx.currentTime;
    const g = this.lineDip.gain;
    g.cancelScheduledValues(now);
    // A time constant settles about 95% in three of them.
    g.setTargetAtTime(LINE_DIP, now, LINE_DIP_ATTACK_SEC / 3);
    g.setTargetAtTime(1, now + LINE_DIP_SEC, LINE_DIP_RELEASE_SEC / 3);
  }

  /** Schedules the music up to the lookahead and updates the duck. Call it often (every ~25 ms). */
  pump(until = this.ctx.currentTime + LOOKAHEAD_SEC): void {
    const now = this.ctx.currentTime;
    for (const th of this.#themes) {
      if (th.stopAt !== null) continue;
      th.seq.pump(until, (e, at) => {
        // A late note (the timer was throttled) is dropped rather than played in a burst.
        if (at >= now - LATE_SEC && th.levels[e.layer] > 0.001) {
          this.#playNote(e, at, th.layers[e.layer]);
        }
      });
    }
    this.#themes = this.#themes.filter((th) => {
      if (th.stopAt === null || th.stopAt > now) return true;
      th.fade.disconnect();
      return false;
    });
    for (const c of this.#cueSeqs) {
      c.seq.pump(until, (e, at) => {
        if (at >= now - LATE_SEC) this.#playNote(e, at, c.out);
      });
    }
    this.#cueSeqs = this.#cueSeqs.filter((c) => {
      if (!c.seq.done) return true;
      this.#cueTails.push({ out: c.out, until: now + CUE_TAIL_SEC });
      return false;
    });
    if (this.#cueTails.some((t) => t.until <= now)) {
      this.#cueTails = this.#cueTails.filter((t) => {
        if (t.until > now) return true;
        t.out.disconnect();
        return false;
      });
    }
    this.#updateDuck();
  }

  /** Sound effect instances sounding now. */
  voices(): number {
    return this.#book.live(this.ctx.currentTime);
  }

  /** Stops everything (a fade of a few ms) and forgets the music. */
  stopAll(): void {
    const t = this.ctx.currentTime;
    for (const th of this.#themes) {
      th.fade.gain.cancelScheduledValues(t);
      th.fade.gain.setTargetAtTime(0, t, 0.02);
      th.stopAt = t + 0.1;
    }
    for (const c of this.#cueSeqs) this.#cueTails.push({ out: c.out, until: t + CUE_TAIL_SEC });
    this.#cueSeqs = [];
  }

  #setLevels(th: PlayingTheme, levels: Readonly<Record<MusicLayer, number>>, t: number): void {
    for (const l of MUSIC_LAYERS) {
      if (th.levels[l] === levels[l]) continue;
      th.levels[l] = levels[l];
      th.layers[l].gain.cancelScheduledValues(t);
      th.layers[l].gain.setTargetAtTime(levels[l], t, LAYER_FADE_SEC / 3);
    }
  }

  #setThemeLevel(th: PlayingTheme, level: number, t: number): void {
    if (level === this.#themeLevel) return;
    this.#themeLevel = level;
    th.fade.gain.cancelScheduledValues(t);
    th.fade.gain.setTargetAtTime(level, t, LAYER_FADE_SEC / 3);
  }

  /** Moves the music's duck to the lowest active level; `fadeSec` overrides the attack/release. */
  #updateDuck(fadeSec: number | null = null): void {
    if (this.#noDuck) return;
    const now = this.ctx.currentTime;
    if (this.#ducks.some((d) => d.until <= now))
      this.#ducks = this.#ducks.filter((d) => d.until > now);
    let target = 1;
    for (const d of this.#ducks) target = Math.min(target, d.level);
    for (const h of this.#held.values()) target = Math.min(target, h.level);
    if (target === this.#duckTarget) return;
    const down = target < this.#duckTarget;
    this.#duckTarget = target;
    // A time constant settles about 95% in three of them.
    const tc = fadeSec === null ? (down ? DUCK_ATTACK_SEC : DUCK_RELEASE_SEC) : fadeSec / 3;
    this.duck.gain.cancelScheduledValues(now);
    this.duck.gain.setTargetAtTime(target, now, tc);
  }

  #compile(song: Song): CompiledSong {
    let c = this.#compiled.get(song.id);
    if (c === undefined) {
      c = compileSong(song);
      this.#compiled.set(song.id, c);
    }
    return c;
  }

  #playNote(e: SeqEvent, at: number, dest: AudioNode): void {
    const inst: Instrument | undefined = ALL_INSTRUMENTS[e.instrument];
    if (inst === undefined) return;
    this.#playLayers(inst.layers, {
      when: at,
      gain: inst.gain * e.gain,
      ratio: 1,
      noteHz: e.hz,
      noteSec: e.hz === null ? null : e.durSec,
      dest,
    });
  }

  /** Builds and starts one voice per layer. */
  #playLayers(
    layers: readonly ToneLayer[],
    o: {
      readonly when: number;
      readonly gain: number;
      /** Pitch ratio over every layer (jitter, an effect's pitch). */
      readonly ratio: number;
      /** A note's pitch, for instrument layers without their own. */
      readonly noteHz: number | null;
      /** A note's length (s), which sets each layer's hold; null keeps the layer's own. */
      readonly noteSec: number | null;
      readonly dest: AudioNode;
    },
  ): Voice {
    const ctx = this.ctx;
    const nyquist = ctx.sampleRate / 2 - 200;
    const stops: ((at: number) => void)[] = [];
    for (const l of layers) {
      const t0 = o.when + (l.at ?? 0);
      const base = (l.freq ?? (o.noteHz ?? midiToHz(69)) * (l.ratio ?? 1)) * o.ratio;
      const { a, d, s, r } = l.env;
      const hold = o.noteSec === null ? (l.env.hold ?? 0) : Math.max(0, o.noteSec - a - d);
      const peak = l.gain * o.gain;
      const tA = t0 + a;
      const tD = tA + d;
      const tH = tD + hold;
      const tEnd = tH + r;
      // The source, and the param its pitch moves on.
      let src: AudioScheduledSourceNode;
      let pitchParam: AudioParam;
      let pitchScale: number;
      if (l.wave === 'noise') {
        const n = ctx.createBufferSource();
        n.buffer = this.#noise;
        n.loop = true;
        src = n;
        pitchParam = n.playbackRate;
        pitchScale = 1 / 440;
      } else {
        const osc = ctx.createOscillator();
        if (l.wave === 'pulse25') osc.setPeriodicWave(this.#pulse25);
        else if (l.wave === 'pulse12') osc.setPeriodicWave(this.#pulse12);
        else osc.type = l.wave;
        src = osc;
        pitchParam = osc.frequency;
        pitchScale = 1;
        if (l.vibrato !== undefined) {
          const lfo = ctx.createOscillator();
          const depth = ctx.createGain();
          lfo.frequency.value = l.vibrato.hz;
          depth.gain.value = l.vibrato.cents;
          lfo.connect(depth);
          depth.connect(osc.detune);
          lfo.start(t0);
          lfo.stop(tEnd + 0.05);
          lfo.addEventListener(
            'ended',
            () => {
              lfo.disconnect();
              depth.disconnect();
            },
            { once: true },
          );
        }
      }
      const p0 = Math.min(base, nyquist) * pitchScale;
      pitchParam.setValueAtTime(p0, t0);
      if (l.glide !== undefined && l.glideSec !== undefined) {
        pitchParam.exponentialRampToValueAtTime(
          Math.min(base * l.glide, nyquist) * pitchScale,
          t0 + l.glideSec,
        );
      }
      for (const [at, mult] of l.steps ?? []) {
        pitchParam.setValueAtTime(Math.min(base * mult, nyquist) * pitchScale, t0 + at);
      }
      // The envelope.
      const env = ctx.createGain();
      const g = env.gain;
      g.setValueAtTime(0, t0);
      g.linearRampToValueAtTime(peak, tA);
      const sustain = Math.max(peak * s, FLOOR);
      g.exponentialRampToValueAtTime(sustain, tD);
      if (hold > 0) g.setValueAtTime(sustain, tH);
      g.exponentialRampToValueAtTime(FLOOR, tEnd);
      g.setValueAtTime(0, tEnd + 0.001);
      // The filter (optional), then the envelope, then out.
      let head: AudioNode = src;
      let filter: BiquadFilterNode | null = null;
      if (l.filter !== undefined) {
        filter = ctx.createBiquadFilter();
        filter.type = l.filter.type;
        filter.Q.value = l.filter.q ?? (l.filter.type === 'bandpass' ? 1 : Math.SQRT1_2);
        const f0 = Math.min(l.filter.freq * o.ratio, nyquist);
        filter.frequency.setValueAtTime(f0, t0);
        if (l.filter.freqEnd !== undefined) {
          filter.frequency.exponentialRampToValueAtTime(
            Math.min(l.filter.freqEnd * o.ratio, nyquist),
            tD,
          );
        }
        src.connect(filter);
        head = filter;
      }
      head.connect(env);
      env.connect(o.dest);
      src.start(t0);
      src.stop(tEnd + 0.01);
      src.addEventListener(
        'ended',
        () => {
          src.disconnect();
          filter?.disconnect();
          env.disconnect();
        },
        { once: true },
      );
      stops.push((at) => {
        const when = Math.max(at, ctx.currentTime);
        if (when >= tEnd) return;
        g.cancelScheduledValues(when);
        g.setTargetAtTime(0, when, 0.005);
        src.stop(when + 0.03);
      });
    }
    return {
      stop(at) {
        for (const stop of stops) stop(at);
      },
    };
  }
}

/**
 * Whether sound `id` ducks under speech: the rattle and the moments, never a line's own sound nor
 * one that must be heard over a line (`overSpeech`: the Peeker's rock lighting up, D135).
 */
export function ducksUnderSpeech(id: SfxId, recipe: SfxRecipe): boolean {
  return (
    recipe.priority <= UNDER_SPEECH_MAX_PRIORITY &&
    recipe.overSpeech !== true &&
    !Object.hasOwn(SPEECH_SFX, id)
  );
}

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}
