// Pitch helpers: note names to MIDI numbers and Hz (A4 = 440, equal temperament), semitones to
// pitch ratios. Pure.

const LETTER: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** MIDI number of a note name such as `C4`, `F#3`, or `Bb2` (C4 = 60); null if it isn't one. */
export function noteToMidi(name: string): number | null {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (m === null) return null;
  const base = LETTER[m[1]!]!; // the regex only matches A–G
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return (Number(m[3]) + 1) * 12 + base + acc;
}

/** Frequency (Hz) of a MIDI note number. */
export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Frequency (Hz) of a note name; throws on a bad name (data is validated before it plays). */
export function noteHz(name: string): number {
  const midi = noteToMidi(name);
  if (midi === null) throw new RangeError(`not a note name: '${name}'`);
  return midiToHz(midi);
}

/** The pitch ratio of a shift by `semitones`. */
export function semitones(n: number): number {
  return 2 ** (n / 12);
}

/** Decibels to linear gain. */
export function dbToGain(db: number): number {
  return 10 ** (db / 20);
}

/** Linear gain to decibels (-Infinity for 0). */
export function gainToDb(gain: number): number {
  return 20 * Math.log10(gain);
}
