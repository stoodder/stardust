import { describe, expect, it } from 'vitest';
import {
  chance,
  cloneRng,
  createRng,
  forkRng,
  nextFloat,
  nextInt,
  nextIntBetween,
  nextU32,
  rngFromState,
  rngState,
  type Rng,
} from './rng.ts';

function take(r: Rng, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(nextU32(r));
  return out;
}

/** The published JS sfc32 (bryc's PractRand port), written independently of ours, raw uint32. */
function referenceSfc32(a0: number, b0: number, c0: number, d0: number): () => number {
  let a = a0 | 0;
  let b = b0 | 0;
  let c = c0 | 0;
  let d = d0 | 0;
  return () => {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return t >>> 0;
  };
}

/** A fixed state (the first words of π's and e's hex expansions, counter 1). */
function knownState(): Rng {
  return { a: 0x9e3779b9 | 0, b: 0x243f6a88 | 0, c: 0xb7e15162 | 0, d: 1 };
}

describe('sfc32 core', () => {
  it('matches hand-derived outputs from the state (0, 0, 0, 1)', () => {
    // t = a + b + d; the first three are 0+0+1, 0+0+2, and 0+9+3 (b became c + c<<3 = 9).
    expect(take({ a: 0, b: 0, c: 0, d: 1 }, 3)).toEqual([1, 2, 12]);
  });

  it('matches known vectors (pinned; the reference implementation agrees)', () => {
    expect(take(knownState(), 8)).toEqual([
      3262571586, 2602127793, 3691875691, 1400833174, 2246018411, 1634095475, 113486641, 3926581280,
    ]);
    const ref = referenceSfc32(0x9e3779b9, 0x243f6a88, 0xb7e15162, 1);
    const ours = knownState();
    for (let i = 0; i < 10_000; i++) expect(nextU32(ours)).toBe(ref());
  });

  it('returns uint32 values', () => {
    const r = createRng(7);
    for (let i = 0; i < 1000; i++) {
      const x = nextU32(r);
      expect(Number.isInteger(x) && x >= 0 && x < 2 ** 32).toBe(true);
    }
  });
});

describe('createRng', () => {
  it('is deterministic per seed (pinned vectors)', () => {
    expect(take(createRng(12345), 5)).toEqual([
      1922281459, 3662312857, 3231046263, 1547307625, 2012459062,
    ]);
    expect(take(createRng(0), 5)).toEqual([
      1375209956, 1634094575, 415405708, 3110831729, 3869535853,
    ]);
    expect(take(createRng(99), 20)).toEqual(take(createRng(99), 20));
  });

  it('gives adjacent seeds unrelated streams', () => {
    const a = take(createRng(1), 4);
    const b = take(createRng(2), 4);
    for (let i = 0; i < 4; i++) expect(a[i]).not.toBe(b[i]);
  });

  it('rejects seeds that are not uint32 integers', () => {
    for (const bad of [-1, 1.5, 2 ** 32, Number.NaN, Infinity]) {
      expect(() => createRng(bad)).toThrow(RangeError);
    }
    expect(() => createRng(2 ** 32 - 1)).not.toThrow();
  });
});

describe('forkRng', () => {
  it('derives a pinned child stream without advancing the parent', () => {
    const parent = createRng(12345);
    const before = rngState(parent);
    expect(take(forkRng(parent, 'spawn'), 5)).toEqual([
      1479181067, 3678321298, 945337989, 1125230365, 1833134351,
    ]);
    expect(rngState(parent)).toEqual(before);
  });

  it('is independent of fork order and count', () => {
    const p1 = createRng(5);
    const p2 = createRng(5);
    const a1 = forkRng(p1, 'a');
    forkRng(p1, 'b');
    forkRng(p2, 'b');
    forkRng(p2, 'c');
    const a2 = forkRng(p2, 'a');
    expect(take(a1, 10)).toEqual(take(a2, 10));
  });

  it('gives different names, and different parents, different streams', () => {
    const p = createRng(5);
    expect(take(forkRng(p, 'spawn'), 4)).not.toEqual(take(forkRng(p, 'combat'), 4));
    expect(take(forkRng(createRng(6), 'spawn'), 4)).not.toEqual(take(forkRng(p, 'spawn'), 4));
    expect(take(forkRng(p, 'spawn'), 4)).not.toEqual(take(cloneRng(p), 4));
  });
});

describe('derived helpers', () => {
  it('nextFloat is in [0, 1) and is the u32 output over 2^32', () => {
    const a = createRng(3);
    const b = createRng(3);
    for (let i = 0; i < 1000; i++) {
      const f = nextFloat(a);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
      expect(f).toBe(nextU32(b) / 2 ** 32);
    }
  });

  it('nextInt covers [0, n) evenly and only that range', () => {
    const r = createRng(11);
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 60_000; i++) {
      const x = nextInt(r, 6);
      expect(Number.isInteger(x)).toBe(true);
      counts[x] = (counts[x] ?? 0) + 1;
    }
    expect(counts.length).toBe(6);
    for (const c of counts) expect(Math.abs(c - 10_000)).toBeLessThan(500);
    expect(nextInt(r, 1)).toBe(0);
  });

  it('nextInt rejects to stay unbiased (n = 3·2^30 rejects a quarter of outputs)', () => {
    // limit = 2^32 − (2^32 mod 3·2^30) = 3·2^30: outputs ≥ that are redrawn, so the stream
    // advances more than once per call about a quarter of the time.
    const r = createRng(1);
    const raw = createRng(1);
    const n = 3 * 2 ** 30;
    let extra = 0;
    for (let i = 0; i < 400; i++) {
      const x = nextInt(r, n);
      let y = nextU32(raw);
      while (y >= n) {
        y = nextU32(raw);
        extra++;
      }
      expect(x).toBe(y % n);
    }
    expect(extra).toBeGreaterThan(50);
    expect(extra).toBeLessThan(160);
  });

  it('nextInt and nextIntBetween validate their arguments', () => {
    const r = createRng(1);
    for (const bad of [0, -1, 2.5, 2 ** 32 + 1]) expect(() => nextInt(r, bad)).toThrow(RangeError);
    expect(() => nextIntBetween(r, 3, 2)).toThrow(RangeError);
    expect(() => nextIntBetween(r, 0.5, 2)).toThrow(RangeError);
  });

  it('nextIntBetween is inclusive at both ends', () => {
    const r = createRng(2);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) seen.add(nextIntBetween(r, -2, 2));
    expect([...seen].toSorted((x, y) => x - y)).toEqual([-2, -1, 0, 1, 2]);
  });

  it('chance always consumes exactly one output', () => {
    const a = createRng(4);
    const b = createRng(4);
    expect(chance(a, 0)).toBe(false);
    expect(chance(a, 1)).toBe(true);
    nextU32(b);
    nextU32(b);
    expect(nextU32(a)).toBe(nextU32(b));
  });
});

describe('serialization', () => {
  it('round-trips through rngState / rngFromState and JSON', () => {
    const r = createRng(77);
    take(r, 13);
    const parsed: unknown = JSON.parse(JSON.stringify(rngState(r)));
    if (!Array.isArray(parsed)) throw new Error('rngState should serialize to an array');
    const [a = 0, b = 0, c = 0, d = 0] = parsed.map(Number);
    const restored = rngFromState([a, b, c, d]);
    expect(take(restored, 50)).toEqual(take(r, 50));
  });

  it('cloneRng continues the same sequence independently', () => {
    const r = createRng(8);
    const c = cloneRng(r);
    expect(take(c, 10)).toEqual(take(r, 10));
    nextU32(c);
    expect(nextU32(c)).not.toBe(nextU32(r));
  });

  it('rngState gives uint32 words and rngFromState rejects anything else', () => {
    for (const w of rngState(createRng(9))) expect(w >= 0 && w < 2 ** 32).toBe(true);
    expect(() => rngFromState([0, 0, 0, -1])).toThrow(RangeError);
    expect(() => rngFromState([0, 0, 0.5, 1])).toThrow(RangeError);
  });
});
