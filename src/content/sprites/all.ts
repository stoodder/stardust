// Every sprite at once (T871): the core registry, the finale's, and the portraits, for the gallery
// and the tests. Never imported by the game: it would put the lazy sprites in the initial JS (the
// game reads sprites/registry.ts, which holds what has loaded).
import { FINALE_SPRITES } from './finale.ts';
import { SPRITES } from './index.ts';
import { PORTRAIT_SPRITES } from './portraits/index.ts';

/** Every sprite: the core ones in gallery order, then the finale's, then the portraits. */
export const ALL_SPRITES = [...SPRITES, ...FINALE_SPRITES, ...PORTRAIT_SPRITES] as const;
