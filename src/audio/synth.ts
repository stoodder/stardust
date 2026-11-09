// The synth (architecture.md § Audio): the WebAudio graph and the voices. It builds every sound
// from tone layers (oscillators, the two chiptune pulses, and a looping noise buffer, each with an
// ADSR envelope, glides, arpeggio steps, vibrato, and a filter), keeps sound effects inside the
// voice book's limits, sequences the music themes and cues a little ahead of the audio clock, and
// ducks the music under the radio and big sounds. It works on any BaseAudioContext, so the same
// code renders offline (offline.ts) for the level checks.
//
// The bus graph:
//   sfx voices ─▶ sfx ──────────────────────────────┐
//   theme voices ─▶ layer gains ─▶ theme fade ─▶ duck ─▶ music ─▶ master ─▶ glue ─▶ limiter ─▶ clip ─▶ out
//   cue voices ─▶ cues ───────────────────────────────┘ (into music, after the duck)
import { createRng, nextFloat, type Rng } from '../shared/rng.ts';
import { midiToHz, semitones } from './notes.ts';
import { ALL_INSTRUMENTS, CUES, THEMES, type CueId, type ThemeId } from './music/index.ts';
import {
  compileSong,
  createSequencer,
  type CompiledSong,
  type SeqEvent,
  type Sequencer,
} from './music/pattern.ts';
import { recipeDuration } from './recipes.ts';
import { SFX, type SfxId } from './sfx/index.ts';
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
  readonly duck: GainNode;
  readonly cues: GainNode;
  readonly #rng: Rng;
  readonly #noise: AudioBuffer;
  readonly #pulse25: PeriodicWave;
  readonly #pulse12: PeriodicWave;
  readonly #book: VoiceBook<Voice> = createVoiceBook<Voice>(MAX_SFX_VOICES);
  readonly #compiled = new Map<string, CompiledSong>();
  #themes: PlayingTheme[] = [];
  #cueSeqs: Sequencer[] = [];
  /** Timed ducks (big sounds) and held ones (the radio), by key. */
  #ducks: { level: number; until: number }[] = [];
  readonly #held = new Map<string, number>();
  #duckTarget = 1;
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
      // Limiter: fast and hard, a little under full scale.
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -4;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.001;
      limiter.release.value = 0.1;
      // The clipper catches whatever the limiter's attack lets through.
      const clip = ctx.createWaveShaper();
      clip.curve = clipCurve();
      this.master.connect(glue);
      glue.connect(limiter);
      limiter.connect(clip);
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
    const recipe: SfxRecipe = SFX[id];
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
      dest: this.sfx,
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

  /** Plays a one-shot music cue now (it isn't ducked; it's the point of the moment). */
  cue(id: CueId): void {
    this.#cueSeqs.push(createSequencer(this.#compile(CUES[id]), this.ctx.currentTime + 0.02));
    this.played.set(`cue:${id}`, (this.played.get(`cue:${id}`) ?? 0) + 1);
    this.pump();
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
   * the music out. The same theme keeps its place in the loop and only moves its layers.
   */
  setTheme(id: ThemeId | null, levels: Readonly<Record<MusicLayer, number>>, level = 1): void {
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
    if (id === null) return;
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
    const layers = { base: layer('base'), drums: layer('drums'), lead: layer('lead') };
    this.#themes.push({
      id,
      seq: createSequencer(this.#compile(THEMES[id]), t + 0.05),
      fade,
      layers,
      levels: { ...levels },
      stopAt: null,
    });
    this.pump();
  }

  /** Holds the music ducked to `level` under `key` (the radio) until it's released with null. */
  holdDuck(key: string, level: number | null): void {
    if (level === null) this.#held.delete(key);
    else this.#held.set(key, level);
    this.#updateDuck();
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
    for (const seq of this.#cueSeqs) {
      seq.pump(until, (e, at) => {
        if (at >= now - LATE_SEC) this.#playNote(e, at, this.cues);
      });
    }
    this.#cueSeqs = this.#cueSeqs.filter((s) => !s.done);
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

  #updateDuck(): void {
    if (this.#noDuck) return;
    const now = this.ctx.currentTime;
    if (this.#ducks.some((d) => d.until <= now))
      this.#ducks = this.#ducks.filter((d) => d.until > now);
    let target = 1;
    for (const d of this.#ducks) target = Math.min(target, d.level);
    for (const level of this.#held.values()) target = Math.min(target, level);
    if (target === this.#duckTarget) return;
    const down = target < this.#duckTarget;
    this.#duckTarget = target;
    this.duck.gain.cancelScheduledValues(now);
    this.duck.gain.setTargetAtTime(target, now, down ? DUCK_ATTACK_SEC : DUCK_RELEASE_SEC);
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

function clamp01(n: number): number {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0;
}
