// Pattern strings to timed notes, and the step sequencer that plays a compiled song (pure). A song
// is data (types.ts `Song`); compileSong turns it into events per 16th-note step, and the sequencer
// hands out the events whose time has come, looping cleanly, so the browser scheduler (synth.ts)
// only has to turn them into voices a little ahead of time.
import { noteHz } from '../notes.ts';
import type { MusicLayer, Song, Track } from '../types.ts';

/** 16th-note steps per 4/4 bar. */
export const STEPS_PER_BAR = 16;

/** One sounding token: where it starts and how long it holds, in 16th-note steps. */
export interface PatternNote {
  readonly step: number;
  readonly len: number;
  /** A note name (`C4`) or a drum letter. */
  readonly token: string;
}

export interface ParsedPattern {
  readonly notes: readonly PatternNote[];
  /** The pattern's length in 16th-note steps. */
  readonly steps: number;
  readonly problems: readonly string[];
}

/**
 * Parses a pattern: tokens separated by whitespace, bars by `|`. A token is a note or drum letter
 * (sounds), `-` (holds the previous sound one more token), or `.` (a rest). Every bar must hold
 * exactly one bar of tokens at `stepsPerToken`.
 */
export function parsePattern(pattern: string, stepsPerToken: number): ParsedPattern {
  const problems: string[] = [];
  const notes: { step: number; len: number; token: string }[] = [];
  const perBar = STEPS_PER_BAR / stepsPerToken;
  const bars = pattern.split('|');
  let step = 0;
  let last: { step: number; len: number; token: string } | null = null;
  bars.forEach((bar, b) => {
    const tokens = bar
      .trim()
      .split(/\s+/)
      .filter((t) => t !== '');
    if (tokens.length !== perBar) {
      problems.push(`bar ${b + 1} has ${tokens.length} tokens, expected ${perBar}`);
    }
    for (const t of tokens) {
      if (t === '-') {
        if (last === null) problems.push(`bar ${b + 1}: '-' holds nothing`);
        else last.len += stepsPerToken;
      } else if (t === '.') {
        last = null;
      } else {
        last = { step, len: stepsPerToken, token: t };
        notes.push(last);
      }
      step += stepsPerToken;
    }
  });
  return { notes, steps: step, problems };
}

/** One note of a compiled song, ready to play. */
export interface SeqEvent {
  readonly layer: MusicLayer;
  readonly instrument: string;
  /** The note's pitch (Hz), or null for a drum (its layers carry their own pitch). */
  readonly hz: number | null;
  /** How long the note is held (s), before its instrument's release. */
  readonly durSec: number;
  readonly gain: number;
}

export interface CompiledSong {
  readonly id: string;
  readonly loop: boolean;
  /** The song's length in 16th-note steps. */
  readonly steps: number;
  readonly secPerStep: number;
  /** Events by step (`byStep[i]` starts at step i). */
  readonly byStep: readonly (readonly SeqEvent[])[];
}

/** Seconds per 16th note at `bpm`. */
export function secPerStep(bpm: number): number {
  return 60 / bpm / 4;
}

function trackProblems(
  song: Song,
  t: Track,
  i: number,
  instruments: ReadonlySet<string>,
  drums: ReadonlySet<string>,
): string[] {
  const where = `${song.id} track ${i + 1} (${t.layer})`;
  const parsed = parsePattern(t.pattern, t.stepsPerToken);
  const out = parsed.problems.map((p) => `${where}: ${p}`);
  if (parsed.steps !== song.bars * STEPS_PER_BAR) {
    out.push(`${where}: ${parsed.steps} steps, the song has ${song.bars * STEPS_PER_BAR}`);
  }
  if (!instruments.has(t.instrument)) out.push(`${where}: unknown instrument '${t.instrument}'`);
  if (!(t.gain > 0 && t.gain <= 1)) out.push(`${where}: gain must be in (0, 1]`);
  for (const n of parsed.notes) {
    const drum = t.kit?.[n.token];
    if (drum !== undefined) {
      if (!drums.has(drum)) out.push(`${where}: '${n.token}' maps to '${drum}', not a drum`);
      continue;
    }
    let hz = 0;
    try {
      hz = noteHz(n.token);
    } catch {
      out.push(`${where}: '${n.token}' is not a note or a kit letter`);
      continue;
    }
    if (hz < 30 || hz > 4200) out.push(`${where}: ${n.token} is outside C1–C8`);
  }
  return out;
}

/**
 * Problems with a song (empty when valid): every track parses, fills the song's bars exactly, and
 * plays known instruments; drum letters map to drum instruments.
 */
export function songProblems(
  song: Song,
  instruments: ReadonlySet<string>,
  drums: ReadonlySet<string>,
): string[] {
  const out: string[] = [];
  if (!(song.bpm >= 40 && song.bpm <= 240)) out.push(`${song.id}: bpm ${song.bpm} must be 40–240`);
  if (!(Number.isInteger(song.bars) && song.bars >= 1 && song.bars <= 64)) {
    out.push(`${song.id}: bars must be a whole number 1–64`);
  }
  if (song.tracks.length === 0) out.push(`${song.id}: no tracks`);
  song.tracks.forEach((t, i) => out.push(...trackProblems(song, t, i, instruments, drums)));
  return out;
}

/** Compiles a (validated) song into per-step events. */
export function compileSong(song: Song): CompiledSong {
  const steps = song.bars * STEPS_PER_BAR;
  const sps = secPerStep(song.bpm);
  const byStep: SeqEvent[][] = Array.from({ length: steps }, () => []);
  for (const t of song.tracks) {
    for (const n of parsePattern(t.pattern, t.stepsPerToken).notes) {
      const drum = t.kit?.[n.token];
      byStep[n.step % steps]!.push({
        layer: t.layer,
        instrument: drum ?? t.instrument,
        hz: drum === undefined ? noteHz(n.token) : null,
        durSec: n.len * sps,
        gain: t.gain,
      });
    }
  }
  return { id: song.id, loop: song.loop, steps, secPerStep: sps, byStep };
}

/** Plays a compiled song from `startTime` (seconds on the caller's clock). */
export interface Sequencer {
  readonly song: CompiledSong;
  /** The song's start time. */
  readonly start: number;
  /**
   * Calls `play` for every event that starts before `until`, in order, with its start time. A
   * looping song wraps seamlessly; a one-shot stops at its end. Returns the next step's time.
   */
  pump(until: number, play: (e: SeqEvent, time: number) => void): number;
  /** True once a one-shot has handed out its last step (never for a loop). */
  readonly done: boolean;
  /** The time of the next bar line at or after `t` (for starting a change on the beat). */
  nextBar(t: number): number;
}

/** Creates a sequencer for `song` starting at `start`. */
export function createSequencer(song: CompiledSong, start: number): Sequencer {
  let next = 0;
  const timeOf = (step: number): number => start + step * song.secPerStep;
  return {
    song,
    start,
    get done() {
      return !song.loop && next >= song.steps;
    },
    pump(until, play) {
      while (timeOf(next) < until && (song.loop || next < song.steps)) {
        const at = timeOf(next);
        for (const e of song.byStep[next % song.steps]!) play(e, at);
        next++;
      }
      return timeOf(next);
    },
    nextBar(t) {
      const barSec = STEPS_PER_BAR * song.secPerStep;
      return start + Math.max(0, Math.ceil((t - start) / barSec - 1e-9)) * barSec;
    },
  };
}
