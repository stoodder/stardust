import { describe, expect, it } from 'vitest';
import {
  createHasher,
  fnv1a32,
  hashByte,
  hashF64,
  hashString,
  hashU32,
  hasherDigest,
} from './hash.ts';

function digestOf(feed: (h: ReturnType<typeof createHasher>) => void): string {
  const h = createHasher();
  feed(h);
  return hasherDigest(h);
}

describe('fnv1a32', () => {
  it('matches the published FNV-1a vectors for ASCII input', () => {
    // ASCII code units have a zero high byte, which we feed too, so compare against byte-wise
    // FNV-1a over [c, 0, …]: the empty string is the offset basis either way.
    expect(fnv1a32('')).toBe(0x811c9dc5);
    let h = 0x811c9dc5;
    for (const b of [0x61, 0x00]) h = Math.imul(h ^ b, 0x01000193);
    expect(fnv1a32('a')).toBe(h >>> 0);
  });

  it('distinguishes names', () => {
    expect(fnv1a32('spawn')).not.toBe(fnv1a32('combat'));
    expect(fnv1a32('ab')).not.toBe(fnv1a32('ba'));
  });
});

describe('Hasher', () => {
  it('lane 1 is byte-wise FNV-1a (published vector: "a" → 0xe40c292c)', () => {
    const h = createHasher();
    hashByte(h, 0x61);
    expect(h.h1 >>> 0).toBe(0xe40c292c);
  });

  it('gives a stable 16-hex-digit digest', () => {
    const d = digestOf((h) => hashU32(h, 42));
    expect(d).toMatch(/^[0-9a-f]{16}$/);
    expect(digestOf((h) => hashU32(h, 42))).toBe(d);
  });

  it('is sensitive to order, value, and float bits', () => {
    const ab = digestOf((h) => {
      hashU32(h, 1);
      hashU32(h, 2);
    });
    const ba = digestOf((h) => {
      hashU32(h, 2);
      hashU32(h, 1);
    });
    expect(ab).not.toBe(ba);
    expect(digestOf((h) => hashF64(h, 0.1 + 0.2))).not.toBe(digestOf((h) => hashF64(h, 0.3)));
    expect(digestOf((h) => hashF64(h, 1))).not.toBe(digestOf((h) => hashF64(h, 2)));
  });

  it('length-prefixes strings so concatenations differ', () => {
    const a = digestOf((h) => {
      hashString(h, 'ab');
      hashString(h, 'c');
    });
    const b = digestOf((h) => {
      hashString(h, 'a');
      hashString(h, 'bc');
    });
    expect(a).not.toBe(b);
  });
});
