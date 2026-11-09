// Recipe validation and timing (pure). Every recipe, instrument, and song is checked by the unit
// tests (recipes.test.ts, music/music.test.ts), so a bad number fails the gate instead of playing
// as a click, a squeal, or silence.
import type { Instrument, SfxRecipe, ToneLayer } from './types.ts';

/** The audible pitch range a layer may use (Hz), after glides and steps. */
export const MIN_HZ = 20;
export const MAX_HZ = 16_000;
/** The longest a sound effect may ring (s); jingles and stings are music cues, not SFX. */
export const MAX_SFX_SEC = 3;
/** The most layers one recipe may stack (each is a voice). */
export const MAX_LAYERS = 4;
/**
 * A recipe's summed peak (recipe gain × the summed gains of the layers that can sound together,
 * `overlapPeak`) stays under this, so no single sound can overload the SFX bus on its own.
 */
export const MAX_RECIPE_PEAK = 1;

/** Seconds from a layer's start offset to the end of its release, held `hold` (default its own). */
export function layerEnd(l: ToneLayer, hold = l.env.hold ?? 0): number {
  return (l.at ?? 0) + l.env.a + l.env.d + hold + l.env.r;
}

/** How long a recipe rings, in seconds (its longest layer). */
export function recipeDuration(r: { readonly layers: readonly ToneLayer[] }): number {
  let end = 0;
  for (const l of r.layers) end = Math.max(end, layerEnd(l));
  return end;
}

/** The summed peak gain of a recipe or instrument (a worst case: every layer at its peak at once). */
export function recipePeak(r: { readonly layers: readonly ToneLayer[]; readonly gain: number }) {
  let sum = 0;
  for (const l of r.layers) sum += l.gain;
  return sum * r.gain;
}

/**
 * The summed peak gain of the layers that can sound together: like `recipePeak`, except that
 * layers that never overlap in time (a rattle's separate cracks) don't add up. The overload limit
 * (MAX_RECIPE_PEAK) is checked on this.
 */
export function overlapPeak(r: { readonly layers: readonly ToneLayer[]; readonly gain: number }) {
  let peak = 0;
  for (const l of r.layers) {
    // The sum peaks at some layer's start: add every layer sounding then.
    const t = l.at ?? 0;
    let sum = 0;
    for (const o of r.layers) if ((o.at ?? 0) <= t && t < layerEnd(o)) sum += o.gain;
    peak = Math.max(peak, sum);
  }
  return peak * r.gain;
}

const finite = (n: number): boolean => Number.isFinite(n);
const inRange = (n: number, lo: number, hi: number): boolean => finite(n) && n >= lo && n <= hi;

function checkHz(hz: number, what: string, out: string[]): void {
  if (!inRange(hz, MIN_HZ, MAX_HZ)) out.push(`${what} ${hz} Hz is outside ${MIN_HZ}–${MAX_HZ}`);
}

/**
 * Problems with one layer. `fixedPitch`: the layer must name its own `freq` (a sound effect, or a
 * drum); otherwise it takes a note's pitch and may only name a `ratio`.
 */
export function layerProblems(l: ToneLayer, where: string, fixedPitch: boolean): string[] {
  const out: string[] = [];
  const p = (msg: string): void => {
    out.push(`${where}: ${msg}`);
  };
  if (!(l.gain > 0 && l.gain <= 1)) p(`gain ${l.gain} must be in (0, 1]`);
  const { a, d, s, r, hold = 0 } = l.env;
  if (![a, d, r, hold].every((n) => inRange(n, 0, 10))) p('envelope times must be 0–10 s');
  if (!inRange(s, 0, 1)) p(`sustain ${s} must be 0–1`);
  if (a < 0.001) p('attack under 1 ms clicks');
  if (r < 0.005) p('release under 5 ms clicks');
  if (!inRange(l.at ?? 0, 0, 10)) p('start offset must be 0–10 s');
  const base = l.freq ?? null;
  if (fixedPitch && base === null) p('a sound effect layer needs a freq');
  if (!fixedPitch && base !== null && l.wave !== 'noise')
    p('an instrument layer takes the note pitch');
  if (l.ratio !== undefined && !(l.ratio > 0 && l.ratio <= 8))
    p(`ratio ${l.ratio} must be in (0, 8]`);
  if (base !== null) checkHz(base, `${where}: freq`, out);
  if (l.glide !== undefined) {
    if (!(l.glide > 0)) p('glide must be > 0');
    else if (base !== null) checkHz(base * l.glide, `${where}: glide end`, out);
    if (!(l.glideSec !== undefined && l.glideSec > 0)) p('a glide needs glideSec > 0');
  } else if (l.glideSec !== undefined) p('glideSec without a glide');
  let lastAt = -1;
  for (const [at, mult] of l.steps ?? []) {
    if (!(at > lastAt)) p('steps must be in time order');
    lastAt = at;
    if (!(mult > 0)) p('a step multiplier must be > 0');
    else if (base !== null) checkHz(base * mult, `${where}: step`, out);
  }
  if (l.vibrato !== undefined) {
    if (!inRange(l.vibrato.hz, 0.1, 20)) p('vibrato rate must be 0.1–20 Hz');
    if (!inRange(l.vibrato.cents, 1, 100)) p('vibrato depth must be 1–100 cents');
  }
  if (l.filter !== undefined) {
    const f = l.filter;
    checkHz(f.freq, `${where}: filter`, out);
    if (f.freqEnd !== undefined) checkHz(f.freqEnd, `${where}: filter end`, out);
    if (f.q !== undefined && !inRange(f.q, 0.1, 30)) p('filter q must be 0.1–30');
  }
  if (l.wave === 'noise' && l.filter === undefined)
    p('noise needs a filter (raw white noise is harsh)');
  return out;
}

/** Problems with a sound effect recipe (empty when it's valid). */
export function recipeProblems(id: string, r: SfxRecipe): string[] {
  const out: string[] = [];
  if (r.layers.length === 0 || r.layers.length > MAX_LAYERS) {
    out.push(`${id}: needs 1–${MAX_LAYERS} layers`);
  }
  r.layers.forEach((l, i) => out.push(...layerProblems(l, `${id}[${i}]`, true)));
  if (!(r.gain > 0 && r.gain <= 1)) out.push(`${id}: gain ${r.gain} must be in (0, 1]`);
  if (overlapPeak(r) > MAX_RECIPE_PEAK) {
    out.push(`${id}: summed peak ${overlapPeak(r).toFixed(2)} is over ${MAX_RECIPE_PEAK}`);
  }
  if (recipeDuration(r) > MAX_SFX_SEC) {
    out.push(`${id}: rings ${recipeDuration(r).toFixed(2)} s, over ${MAX_SFX_SEC} s`);
  }
  if (r.minGapMs !== undefined && !inRange(r.minGapMs, 0, 2000)) out.push(`${id}: minGapMs 0–2000`);
  if (r.maxVoices !== undefined && !(Number.isInteger(r.maxVoices) && r.maxVoices >= 1)) {
    out.push(`${id}: maxVoices must be a whole number ≥ 1`);
  }
  if (r.jitter !== undefined && !inRange(r.jitter, 0, 6)) out.push(`${id}: jitter 0–6 semitones`);
  if (r.duck !== undefined && !inRange(r.duck, 0, 0.95)) out.push(`${id}: duck level 0–0.95`);
  return out;
}

/** Problems with an instrument (empty when it's valid). `drum`: its layers carry fixed pitches. */
export function instrumentProblems(id: string, inst: Instrument, drum: boolean): string[] {
  const out: string[] = [];
  if (inst.layers.length === 0 || inst.layers.length > MAX_LAYERS) {
    out.push(`${id}: needs 1–${MAX_LAYERS} layers`);
  }
  inst.layers.forEach((l, i) => out.push(...layerProblems(l, `${id}[${i}]`, drum)));
  if (!(inst.gain > 0 && inst.gain <= 1)) out.push(`${id}: gain ${inst.gain} must be in (0, 1]`);
  if (recipePeak(inst) > MAX_RECIPE_PEAK) {
    out.push(`${id}: summed peak ${recipePeak(inst).toFixed(2)} is over ${MAX_RECIPE_PEAK}`);
  }
  return out;
}
