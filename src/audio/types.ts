// Audio data shapes (architecture.md § Audio): every sound and every piece of music is data. A
// sound effect is a recipe of tone layers; an instrument is the same layers pitched by a note; a
// song is tracks of pattern strings played by instruments. The synth (synth.ts) turns them into
// WebAudio nodes; nothing here touches WebAudio, so the shapes are validated and sequenced in
// plain unit tests.

/**
 * A voice's waveform. `pulse25` and `pulse12` are the narrow chiptune pulses (25% and 12.5% duty,
 * built as PeriodicWaves); `noise` is white noise (a looping buffer), colored by a filter.
 */
export type Wave = 'square' | 'triangle' | 'sawtooth' | 'sine' | 'pulse25' | 'pulse12' | 'noise';

/** An ADSR envelope, in seconds; `s` is the sustain level as a share of the layer's peak gain. */
export interface Envelope {
  readonly a: number;
  readonly d: number;
  readonly s: number;
  readonly r: number;
  /** Seconds held at the sustain level before the release (a music note's length sets it). */
  readonly hold?: number;
}

export interface Filter {
  readonly type: 'lowpass' | 'highpass' | 'bandpass';
  /** Cutoff (Hz), scaled by the sound's pitch so its timbre follows it. */
  readonly freq: number;
  /** A cutoff sweep's end (Hz), reached over the layer's attack + decay. */
  readonly freqEnd?: number;
  readonly q?: number;
}

/** One oscillator (or noise source) with its envelope: the unit every sound is built from. */
export interface ToneLayer {
  readonly wave: Wave;
  /** Start offset within the sound (s). */
  readonly at?: number;
  /**
   * Pitch (Hz) for a sound effect. Instruments leave it out and take the note's pitch × `ratio`.
   * Noise uses it as the playback rate's reference: 440 plays the buffer as is.
   */
  readonly freq?: number;
  /** Pitch multiplier over the note (instruments; default 1). */
  readonly ratio?: number;
  /** A glide: the pitch moves exponentially to `freq × glide` over `glideSec`. */
  readonly glide?: number;
  readonly glideSec?: number;
  /** Chiptune arpeggio steps: at `at` seconds into the layer, the pitch jumps to `freq × mult`. */
  readonly steps?: readonly (readonly [at: number, mult: number])[];
  /** Vibrato: rate (Hz) and depth (cents). */
  readonly vibrato?: { readonly hz: number; readonly cents: number };
  readonly filter?: Filter;
  readonly env: Envelope;
  /** Peak gain (0–1]. */
  readonly gain: number;
}

/** Voice priority: a full voice table steals the oldest voice of the lowest priority below the new one. */
export type Priority = 0 | 1 | 2 | 3;

/** A sound effect recipe (src/audio/sfx/). */
export interface SfxRecipe {
  readonly layers: readonly ToneLayer[];
  /** The recipe's overall gain (0–1], applied over each layer's. */
  readonly gain: number;
  readonly priority: Priority;
  /** Rate limit: a new instance within this many ms of the last start is dropped. */
  readonly minGapMs?: number;
  /** At most this many instances at once (the oldest is cut for a new one). */
  readonly maxVoices?: number;
  /** Cosmetic pitch variance: ± this many semitones, from the audio's own RNG (never the sim's). */
  readonly jitter?: number;
  /** Music ducks to this level (0–1) while the sound plays (big sounds only). */
  readonly duck?: number;
}

/** A music instrument: tone layers pitched by the note (`freq` left out) or fixed (drums). */
export interface Instrument {
  readonly layers: readonly ToneLayer[];
  readonly gain: number;
}

/** The music layers a battle adds as it intensifies (D001 #9; architecture.md § Audio). */
export type MusicLayer = 'base' | 'drums' | 'lead';
export const MUSIC_LAYERS: readonly MusicLayer[] = ['base', 'drums', 'lead'];

/**
 * One track of a song: a pattern string (music/pattern.ts) played by an instrument on a layer.
 * Pattern tokens are notes (`C4`, `F#3`, `Bb2`), `-` (hold the previous note), `.` (rest), or a
 * drum letter that `kit` maps to an instrument. Bars are separated by `|`.
 */
export interface Track {
  readonly layer: MusicLayer;
  /** The instrument for note tokens. */
  readonly instrument: string;
  /** Drum letters → instrument ids. */
  readonly kit?: Readonly<Record<string, string>>;
  /** 16th notes per token: 1 (16ths), 2 (8ths), or 4 (quarters). */
  readonly stepsPerToken: 1 | 2 | 4;
  readonly pattern: string;
  /** The track's level (0–1], over the instrument's gain. */
  readonly gain: number;
}

/** A song: a looping battle or title theme, or a one-shot cue (a sting or jingle). */
export interface Song {
  readonly id: string;
  readonly bpm: number;
  /** Bars of 4/4 (16 steps each). */
  readonly bars: number;
  /** Loops forever (themes) or plays once (cues). */
  readonly loop: boolean;
  readonly tracks: readonly Track[];
}
