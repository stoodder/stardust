// The standard legend (docs/art/tech-spec.md § The standard legend): grid character → slot.
import type { CustomChar, Slot } from './types.ts';

// prettier-ignore
export const STANDARD_LEGEND: Readonly<Record<string, Slot>> = {
  '0': 'p0', '1': 'p1', '2': 'p2', '3': 'p3', '4': 'p4',
  '5': 's0', '6': 's1', '7': 's2', '8': 's3', '9': 's4',
  a: 'a0', b: 'a1', c: 'a2', d: 'a3', e: 'a4',
  '+': 'e0', '*': 'e1',
  x: 'outline', k: 'eye', w: 'hi', _: 'shadow',
};

/** The transparent character. */
export const TRANSPARENT = '.';

/** In patch rows only: keep the pixel underneath. */
export const KEEP = ' ';

/** The grid character for each slot (the inverse of STANDARD_LEGEND). */
// prettier-ignore
export const SLOT_CHAR: Readonly<Record<Slot, string>> = {
  p0: '0', p1: '1', p2: '2', p3: '3', p4: '4',
  s0: '5', s1: '6', s2: '7', s3: '8', s4: '9',
  a0: 'a', a1: 'b', a2: 'c', a3: 'd', a4: 'e',
  e0: '+', e1: '*',
  outline: 'x', eye: 'k', hi: 'w', shadow: '_',
};

/** True for `A`–`Z`. */
export function isCustomChar(ch: string): ch is CustomChar {
  return ch.length === 1 && ch >= 'A' && ch <= 'Z';
}
