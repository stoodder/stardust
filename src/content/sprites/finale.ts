// The finale's sprites (T871; architecture.md § 5, *Bundle*): the Unsung in every form, the choir,
// Thrum's echo, the song's motes, the Deep Bore, the finale's props, and the Unsung's wave-preview
// icon. Only the finale's chunk imports this (app/acts/fin.ts), so none of it is in the initial JS
// or the boot atlas: the chunk registers them (sprites/registry.ts) and the atlas bakes them into a
// page of their own when the next battle starts (CodeSpriteSource `sync`). The gallery shows them
// with the rest (sprites/all.ts). Their ids are in `SpriteId` all the same.
import { M8_ALLIES, M8_UNIT_FX, M8_UNITS } from './enemies/m8.ts';
import { M8_UNIT_ICONS } from './icons/m8_enemies.ts';
import { FINALE_PROPS } from './props/m8.ts';

/** The finale's sprites, in gallery order. */
export const FINALE_SPRITES = [
  ...FINALE_PROPS,
  ...M8_UNITS,
  ...M8_ALLIES,
  ...M8_UNIT_FX,
  ...M8_UNIT_ICONS,
] as const;
