// Seeded, serializable RNG: sfc32 (Chris Doty-Humphrey's Small Fast Counting generator, 128-bit
// state). The sim derives one stream per system with forkRng(), so a new roll in one system
// never shifts another system's results (docs/tech/architecture.md § Determinism).
//
// An Rng is plain data (four int32 words), so it can be hashed, copied, and saved as JSON.
// Every helper is integer or exact-division arithmetic: same seed, same sequence, every engine.
import { fnv1a32 } from './hash.ts';

/** sfc32 state: four 32-bit words, stored as int32. `d` is the counter. */
export interface Rng {
  a: number;
  b: number;
  c: number;
  d: number;
}

/** An Rng's state as four uint32 words, for saving. */
export type RngState = readonly [a: number, b: number, c: number, d: number];

/** Outputs discarded after seeding or forking, so nearby seeds diverge (PractRand's sfc32 uses 12–15). */
const WARMUP = 15;
const TWO_POW_32 = 4294967296;

/** murmur3's 32-bit finalizer: a bijective avalanche mix. */
function mix32(x: number): number {
  let z = x | 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
  return z ^ (z >>> 16);
}

function warmUp(r: Rng): Rng {
  for (let i = 0; i < WARMUP; i++) nextU32(r);
  return r;
}

/** Creates a generator from a 32-bit seed (an integer in [0, 2³²)). */
export function createRng(seed: number): Rng {
  if (!Number.isInteger(seed) || seed < 0 || seed >= TWO_POW_32) {
    throw new RangeError(`an RNG seed must be an integer in [0, 2^32) (got ${seed})`);
  }
  return warmUp({
    a: mix32(seed ^ 0x9e3779b9),
    b: mix32(seed ^ 0x243f6a88),
    c: mix32(seed ^ 0xb7e15162),
    d: 1,
  });
}

/**
 * Derives an independent child stream named `name`. It reads the parent's state but never
 * advances it, so the order and number of forks don't matter: the same parent state and name
 * always give the same child.
 */
export function forkRng(parent: Readonly<Rng>, name: string): Rng {
  const h = fnv1a32(name);
  return warmUp({
    a: mix32(parent.a ^ h),
    b: mix32(parent.b ^ mix32(h ^ 0x3c6ef372)),
    c: mix32(parent.c ^ mix32(h ^ 0xa54ff53a)),
    d: mix32(parent.d ^ mix32(h ^ 0x510e527f)),
  });
}

/** The next raw 32-bit output, as an unsigned integer in [0, 2³²). */
export function nextU32(r: Rng): number {
  const t = (((r.a + r.b) | 0) + r.d) | 0;
  r.d = (r.d + 1) | 0;
  r.a = r.b ^ (r.b >>> 9);
  r.b = (r.c + (r.c << 3)) | 0;
  r.c = (((r.c << 21) | (r.c >>> 11)) + t) | 0;
  return t >>> 0;
}

/** A float in [0, 1) with 32 bits of resolution. */
export function nextFloat(r: Rng): number {
  return nextU32(r) / TWO_POW_32;
}

/** An unbiased integer in [0, n) for an integer n in [1, 2³²] (rejection sampling). */
export function nextInt(r: Rng, n: number): number {
  if (!Number.isInteger(n) || n < 1 || n > TWO_POW_32) {
    throw new RangeError(`nextInt: n must be an integer in [1, 2^32] (got ${n})`);
  }
  // Accept only outputs below the largest multiple of n, so every residue is equally likely.
  const limit = TWO_POW_32 - (TWO_POW_32 % n);
  for (;;) {
    const x = nextU32(r);
    if (x < limit) return x % n;
  }
}

/** An unbiased integer in [min, max], both inclusive. */
export function nextIntBetween(r: Rng, min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
    throw new RangeError(`nextIntBetween: need integers min ≤ max (got ${min}, ${max})`);
  }
  return min + nextInt(r, max - min + 1);
}

/**
 * True with probability `p`. Always consumes one output, even for p ≤ 0 (never true) or p ≥ 1
 * (always true), so a data change from 0 to 0.1 doesn't shift the rest of the stream.
 */
export function chance(r: Rng, p: number): boolean {
  return nextFloat(r) < p;
}

/** A copy that continues the same sequence independently. */
export function cloneRng(r: Readonly<Rng>): Rng {
  return { a: r.a, b: r.b, c: r.c, d: r.d };
}

/** The state as four uint32 words (JSON-safe). */
export function rngState(r: Readonly<Rng>): RngState {
  return [r.a >>> 0, r.b >>> 0, r.c >>> 0, r.d >>> 0];
}

/** Restores a generator saved with rngState(). */
export function rngFromState(s: RngState): Rng {
  for (const w of s) {
    if (!Number.isInteger(w) || w < 0 || w >= TWO_POW_32) {
      throw new RangeError(`an RNG state word must be a uint32 (got ${w})`);
    }
  }
  return { a: s[0] | 0, b: s[1] | 0, c: s[2] | 0, d: s[3] | 0 };
}
