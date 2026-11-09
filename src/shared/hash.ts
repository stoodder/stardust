// Non-cryptographic hashing for determinism checks (the sim's `hash()`) and for deriving RNG
// streams from names. FNV-1a over bytes, plus a second, differently mixed lane so the 64-bit
// digest is much less collision-prone than 32-bit FNV alone. Not for security.

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const LANE2_OFFSET = 0x9e3779b9;
const LANE2_MUL = 0x5bd1e995;

/** An incremental hasher: plain data, fed through the functions below. */
export interface Hasher {
  h1: number;
  h2: number;
  /** Scratch for reading a float's bits (little-endian, explicit). */
  readonly view: DataView;
}

/** Creates an empty hasher. */
export function createHasher(): Hasher {
  return { h1: FNV_OFFSET, h2: LANE2_OFFSET, view: new DataView(new ArrayBuffer(8)) };
}

/** Feeds one byte (the low 8 bits of `b`). */
export function hashByte(h: Hasher, b: number): void {
  const byte = b & 0xff;
  h.h1 = Math.imul(h.h1 ^ byte, FNV_PRIME);
  const x = Math.imul(h.h2 ^ byte, LANE2_MUL);
  h.h2 = x ^ (x >>> 15);
}

/** Feeds a 32-bit integer as 4 bytes, little-endian. */
export function hashU32(h: Hasher, x: number): void {
  hashByte(h, x);
  hashByte(h, x >>> 8);
  hashByte(h, x >>> 16);
  hashByte(h, x >>> 24);
}

/** Feeds a number's exact IEEE-754 bits, so 0.1 + 0.2 and 0.3 hash differently. */
export function hashF64(h: Hasher, x: number): void {
  h.view.setFloat64(0, x, true);
  hashU32(h, h.view.getUint32(0, true));
  hashU32(h, h.view.getUint32(4, true));
}

/** Feeds a string: its length, then each UTF-16 code unit. */
export function hashString(h: Hasher, s: string): void {
  hashU32(h, s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    hashByte(h, c);
    hashByte(h, c >>> 8);
  }
}

/** The 64-bit digest as 16 lowercase hex characters. */
export function hasherDigest(h: Hasher): string {
  return toHex32(h.h1) + toHex32(h.h2);
}

/** 32-bit FNV-1a of a string's UTF-16 code units (low byte, then high byte). */
export function fnv1a32(s: string): number {
  let h = FNV_OFFSET;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h = Math.imul(h ^ (c & 0xff), FNV_PRIME);
    h = Math.imul(h ^ (c >>> 8), FNV_PRIME);
  }
  return h >>> 0;
}

function toHex32(x: number): string {
  return (x >>> 0).toString(16).padStart(8, '0');
}
