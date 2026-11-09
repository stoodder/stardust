// hash(): a stable 64-bit digest of the whole sim state, for determinism tests, replays, and the
// harness. It walks SimState generically (pools, free slots, RNG streams, pending commands), so a
// field added later is covered without touching this file. Rules:
// - Numbers hash by their exact float bits; strings and keys by their code units.
// - Object keys hash in insertion order, which is stable because every object is created by one
//   factory (monomorphic shapes).
// - Compiled content is frozen and identical for both runs being compared, so a frozen object
//   with a string `id` (a tower, enemy, or route definition) hashes as that id. Other frozen
//   objects (a tier, an empty tag list) hash structurally.
// - Output buffers (HASH_EXCLUDED: the event buffer and the command log) are skipped.
// Not for hot loops: it walks every slot of every pool.
import {
  createHasher,
  hashByte,
  hashF64,
  hashString,
  hashU32,
  hasherDigest,
  type Hasher,
} from '../shared/hash.ts';
import { HASH_EXCLUDED, type SimState } from './state.ts';

const TAG_NUMBER = 1;
const TAG_STRING = 2;
const TAG_FALSE = 3;
const TAG_TRUE = 4;
const TAG_NULL = 5;
const TAG_UNDEFINED = 6;
const TAG_ARRAY = 7;
const TAG_OBJECT = 8;
const TAG_CONTENT_REF = 9;

/** Sim state has no cycles (entities refer to each other by uid); this catches one if it appears. */
const MAX_DEPTH = 24;

/** The state's digest as 16 hex characters. */
export function hashState(state: SimState): string {
  const h = createHasher();
  for (const key of Object.keys(state)) {
    if (HASH_EXCLUDED.has(key)) continue;
    hashString(h, key);
    const value: unknown = Reflect.get(state, key);
    hashValue(h, value, 1, key);
  }
  return hasherDigest(h);
}

function hashValue(h: Hasher, v: unknown, depth: number, path: string): void {
  if (depth > MAX_DEPTH) throw new Error(`hash: nesting deeper than ${MAX_DEPTH} at ${path}`);
  switch (typeof v) {
    case 'number':
      hashByte(h, TAG_NUMBER);
      hashF64(h, v);
      return;
    case 'string':
      hashByte(h, TAG_STRING);
      hashString(h, v);
      return;
    case 'boolean':
      hashByte(h, v ? TAG_TRUE : TAG_FALSE);
      return;
    case 'undefined':
      hashByte(h, TAG_UNDEFINED);
      return;
    case 'object':
      if (v === null) {
        hashByte(h, TAG_NULL);
      } else if (Array.isArray(v)) {
        hashByte(h, TAG_ARRAY);
        hashU32(h, v.length);
        for (let i = 0; i < v.length; i++) hashValue(h, v[i], depth + 1, path);
      } else if (Object.isFrozen(v) && 'id' in v && typeof v.id === 'string') {
        hashByte(h, TAG_CONTENT_REF);
        hashString(h, v.id);
      } else {
        hashByte(h, TAG_OBJECT);
        const keys = Object.keys(v);
        hashU32(h, keys.length);
        for (const k of keys) {
          hashString(h, k);
          const value: unknown = Reflect.get(v, k);
          hashValue(h, value, depth + 1, path);
        }
      }
      return;
    case 'bigint':
    case 'function':
    case 'symbol':
      throw new Error(`hash: can't hash a ${typeof v} at ${path} (sim state is plain data)`);
  }
}
