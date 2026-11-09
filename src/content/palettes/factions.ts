// Faction slot palettes (docs/art/art-direction.md §4). Actors keep these in every act.
import { isColorName, type ColorName } from './master.ts';
import type { FactionPaletteId, SlotPalette } from '../sprites/types.ts';

/** Five master colors, darkest first, filling one slot ramp (`p`, `s`, or `a`). */
export type Ramp = readonly [ColorName, ColorName, ColorName, ColorName, ColorName];

/** Names of the master ramps that have five steps (`teal`, `act1.grass`, …). */
export type RampName = {
  [K in ColorName]: K extends `${infer R}.4` ? R : never;
}[ColorName];

/** The five steps of a master ramp. */
export function ramp(name: RampName): Ramp {
  const step = (i: number): ColorName => {
    const n = `${name}.${i}`;
    if (!isColorName(n)) throw new Error(`palettes: ramp '${name}' has no step ${i}`);
    return n;
  };
  return [step(0), step(1), step(2), step(3), step(4)];
}

/** Builds a slot palette from three ramps plus the single slots. */
export function slotPalette(
  p: Ramp,
  s: Ramp,
  a: Ramp,
  rest: Pick<SlotPalette, 'e0' | 'e1' | 'outline' | 'eye' | 'hi' | 'shadow'>,
): SlotPalette {
  return {
    p0: p[0],
    p1: p[1],
    p2: p[2],
    p3: p[3],
    p4: p[4],
    s0: s[0],
    s1: s[1],
    s2: s[2],
    s3: s[3],
    s4: s[4],
    a0: a[0],
    a1: a[1],
    a2: a[2],
    a3: a[3],
    a4: a[4],
    ...rest,
  };
}

// Everglow `p` is steel shading up into white paint (art-direction §4: steel + white).
const EVERGLOW_P: Ramp = ['steel.1', 'steel.2', 'steel.3', 'steel.4', 'white.0'];

const everglow = slotPalette(EVERGLOW_P, ramp('teal'), ramp('orange'), {
  e0: 'teal.3',
  e1: 'teal.4',
  outline: 'ink.0',
  eye: 'ink.1',
  hi: 'white.1',
  shadow: 'ink.0',
});

const skitterkin = slotPalette(ramp('coral'), ramp('gold'), ramp('green'), {
  e0: 'gold.3',
  e1: 'gold.4',
  outline: 'ink.0',
  eye: 'ink.1',
  hi: 'white.1',
  shadow: 'ink.0',
});

/** Every faction palette id. */
export const FACTION_PALETTE_IDS: readonly FactionPaletteId[] = [
  'everglow',
  'everglow.worn',
  'skitterkin',
  'skitterkin.ally',
  'aelari',
  'vrell',
  'hollow',
];

// prettier-ignore
export const FACTION_PALETTES: Readonly<Record<FactionPaletteId, SlotPalette>> = {
  everglow,
  // Later-act faded paint: white.0 → grime.4, teal.3 → teal.2 (art-direction §4 Faction rules).
  'everglow.worn': { ...everglow, p4: 'grime.4', s3: 'teal.2', e0: 'teal.2' },
  skitterkin,
  // Allied Skitterkin: same p/s, accent swapped to teal (the alliance nod).
  'skitterkin.ally': { ...skitterkin, a0: 'teal.0', a1: 'teal.1', a2: 'teal.2', a3: 'teal.3', a4: 'teal.4' },
  aelari: slotPalette(ramp('blue'), ramp('teal'), ramp('pink'), {
    e0: 'teal.4', e1: 'white.1', outline: 'blue.0', eye: 'blue.0', hi: 'white.1', shadow: 'ink.0',
  }),
  // Vrell `s` is rust: orange 0–2, so the top two steps repeat orange.2.
  vrell: slotPalette(ramp('brass'), ['orange.0', 'orange.1', 'orange.2', 'orange.2', 'orange.2'], ramp('patina'), {
    e0: 'orange.3', e1: 'orange.4', outline: 'ink.0', eye: 'ink.1', hi: 'white.1', shadow: 'ink.0',
  }),
  // The Hollow: pale (inverted) outline around dark interiors.
  hollow: slotPalette(ramp('hollow'), ramp('hollow'), ramp('acid'), {
    e0: 'acid.2', e1: 'acid.3', outline: 'hollow.4', eye: 'hollow.0', hi: 'hollow.4', shadow: 'ink.0',
  }),
};
