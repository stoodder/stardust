// Level analysis (pure): peak, RMS, and audible length of rendered samples. How the levels are
// checked without anyone listening: offline.ts renders sounds through the real graph and the smoke
// test asserts on these numbers.

/** The quietest level counted as audible (-60 dBFS). */
export const AUDIBLE = 0.001;
/** Samples at or above this count as clipped. */
export const CLIP = 0.999;

export interface Levels {
  /** The largest absolute sample (1 = full scale). */
  readonly peak: number;
  /** RMS over the audible span (first to last audible sample). */
  readonly rms: number;
  readonly peakDb: number;
  readonly rmsDb: number;
  /** Seconds from the start to the last audible sample. */
  readonly durationSec: number;
  /** Samples at or above full scale. */
  readonly clipped: number;
}

const db = (x: number): number => (x > 0 ? 20 * Math.log10(x) : -Infinity);

/** Measures one or more channels (equal lengths) at `sampleRate`. */
export function analyze(channels: readonly Float32Array[], sampleRate: number): Levels {
  let peak = 0;
  let clipped = 0;
  let first = -1;
  let last = -1;
  const n = channels[0]?.length ?? 0;
  for (const ch of channels) {
    for (let i = 0; i < n; i++) {
      const a = Math.abs(ch[i]!); // i < length
      if (a > peak) peak = a;
      if (a >= CLIP) clipped++;
      if (a >= AUDIBLE) {
        if (first < 0 || i < first) first = i;
        if (i > last) last = i;
      }
    }
  }
  let sum = 0;
  let count = 0;
  if (first >= 0) {
    for (const ch of channels) {
      for (let i = first; i <= last; i++) sum += ch[i]! * ch[i]!; // first ≤ i ≤ last < length
      count += last - first + 1;
    }
  }
  const rms = count === 0 ? 0 : Math.sqrt(sum / count);
  return {
    peak,
    rms,
    peakDb: db(peak),
    rmsDb: db(rms),
    durationSec: last < 0 ? 0 : (last + 1) / sampleRate,
    clipped,
  };
}
