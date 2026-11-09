// Environment palettes (docs/art/art-direction.md §3). A map's `env` field picks one; ground
// tiles and env props are baked once per environment palette, so the world darkens by palette swap.
import type { ColorName } from './master.ts';
import { ramp, slotPalette } from './factions.ts';
import type { EnvPaletteId, SlotPalette } from '../sprites/types.ts';

/**
 * Tile slot mapping, shared by every environment palette:
 * `p` ground (grass, or Act III ground), `s` path, `a` clay/cliff (Act III: crystal),
 * `e0`/`e1` the act's flora accent, `outline` the act's shade, `hi` the act's light.
 */
// prettier-ignore
export const ENV_PALETTES: Readonly<Record<EnvPaletteId, SlotPalette>> = {
  act1: slotPalette(ramp('act1.grass'), ramp('act1.path'), ramp('act1.clay'), {
    e0: 'pink.3', e1: 'pink.4', outline: 'act1.shade', eye: 'ink.0', hi: 'act1.light', shadow: 'ink.0',
  }),
  'act2.gold': slotPalette(ramp('act2.grass'), ramp('act2.path'), ramp('act2.clay'), {
    e0: 'orange.3', e1: 'orange.4', outline: 'act2.gold.shade', eye: 'ink.0', hi: 'act2.gold.light', shadow: 'ink.0',
  }),
  'act2.dusk': slotPalette(ramp('act2.grass'), ramp('act2.path'), ramp('act2.clay'), {
    e0: 'violet.3', e1: 'orange.4', outline: 'act2.dusk.shade', eye: 'ink.0', hi: 'act2.dusk.light', shadow: 'ink.0',
  }),
  // Act III's path ramp has four steps; s4 repeats the top.
  act3: slotPalette(ramp('act3.ground'),
    ['act3.path.0', 'act3.path.1', 'act3.path.2', 'act3.path.3', 'act3.path.3'], ramp('act3.crystal'), {
    e0: 'act3.crystal.2', e1: 'act3.crystal.3', outline: 'act3.shade', eye: 'ink.0', hi: 'act3.light', shadow: 'ink.0',
  }),
  // Phases 1–2 are fought on Act III ground; the finale has no path or cliff ramp of its own.
  finale: slotPalette(ramp('finale.ground'),
    ['act3.path.0', 'act3.path.1', 'act3.path.2', 'act3.path.3', 'act3.path.3'], ramp('act3.crystal'), {
    e0: 'gold.3', e1: 'gold.4', outline: 'finale.shade', eye: 'ink.0', hi: 'finale.light', shadow: 'ink.0',
  }),
};

/** The backdrop sky gradient per environment palette, top to bottom. */
export const ENV_SKY: Readonly<Record<EnvPaletteId, readonly ColorName[]>> = {
  act1: ['act1.sky.0', 'act1.sky.1', 'act1.sky.2'],
  'act2.gold': ['act2.gold.sky.0', 'act2.gold.sky.1', 'act2.gold.sky.2'],
  'act2.dusk': ['act2.dusk.sky.0', 'act2.dusk.sky.1', 'act2.dusk.sky.2'],
  act3: ['act3.sky.0', 'act3.sky.1'],
  finale: ['finale.sky.0', 'finale.sky.1', 'finale.sky.2', 'finale.sky.3', 'finale.sky.4'],
};

/** Every environment palette id, in campaign order. */
export const ENV_PALETTE_IDS: readonly EnvPaletteId[] = [
  'act1',
  'act2.gold',
  'act2.dusk',
  'act3',
  'finale',
];
