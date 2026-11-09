// Palette registry: every slot palette by id.
import { ENV_PALETTE_IDS, ENV_PALETTES } from './env.ts';
import { FACTION_PALETTE_IDS, FACTION_PALETTES } from './factions.ts';
import type { PaletteId, SlotPalette } from '../sprites/types.ts';

export const PALETTES: Readonly<Record<PaletteId, SlotPalette>> = {
  ...FACTION_PALETTES,
  ...ENV_PALETTES,
};

/** Every palette id. */
export const PALETTE_IDS: readonly PaletteId[] = [...FACTION_PALETTE_IDS, ...ENV_PALETTE_IDS];
