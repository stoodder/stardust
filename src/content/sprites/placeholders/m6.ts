// Placeholder art (T600a): M6's new actors under their final sprite ids, so content can name them
// before their art lands (D069's pattern, as T400a and T500a did). Each is an existing sprite under
// the new id, without palette variants, so it keeps the sprite contract (enemy walks in four
// facings, tower t1–t3 frames with a mount and a head, 14×14 icons, 8×8 glyphs). A placeholder
// keeps its source's palette where the new faction's ramps may not carry the source's colours.
// The art tasks replace each behind the same id and delete its line here: T640a has drawn the
// units and their icons; T640b the towers (Scuttle Den, Hum Choir, Stasis Bloom), their icons,
// Underfoot's icon, and the `consumer` and `haste_aura` glyphs remain. This file goes away with the
// last of them.
import { iconTowerPrism } from '../icons/aelari_towers.ts';
import { iconTellFast, iconTellHollow } from '../icons/glyphs.ts';
import { iconAbilitySuppressingFire } from '../icons/suppressing_fire.ts';
import { iconTowerThumper } from '../icons/thumper.ts';
import { iconTowerLookout } from '../icons/vrell_towers.ts';
import { towerLookout, towerLookoutHead } from '../towers/lookout.ts';
import { towerPrism, towerPrismHead } from '../towers/prism.ts';
import { towerThumper, towerThumperHead } from '../towers/thumper.ts';
import type { PaletteId, SpriteDef } from '../types.ts';

/** `base` under a new id (and palette, if given), without its palette variants. */
function placeholder<const Id extends string>(
  base: SpriteDef,
  id: Id,
  palette: PaletteId = base.palette,
): SpriteDef<Id> {
  const { variants: _variants, ...rest } = base;
  return { ...rest, id, palette };
}

// Towers and icons (T640b), for now in borrowed shapes.
export const towerBurrow = placeholder(towerThumper, 'tower.burrow');
export const towerBurrowHead = placeholder(towerThumperHead, 'tower.burrow_head');
export const towerChoir = placeholder(towerLookout, 'tower.choir');
export const towerChoirHead = placeholder(towerLookoutHead, 'tower.choir_head');
export const towerBloom = placeholder(towerPrism, 'tower.bloom');
export const towerBloomHead = placeholder(towerPrismHead, 'tower.bloom_head');
export const iconTowerBurrow = placeholder(iconTowerThumper, 'icon.tower.burrow');
export const iconTowerChoir = placeholder(iconTowerLookout, 'icon.tower.choir');
export const iconTowerBloom = placeholder(iconTowerPrism, 'icon.tower.bloom');
export const iconAbilityUnderfoot = placeholder(
  iconAbilitySuppressingFire,
  'icon.ability.underfoot',
);

// The tell glyphs M6's units name (T640b): `consumer` (the Maw) and `haste_aura` (the Expediter).
export const iconTellConsumer = placeholder(iconTellHollow, 'icon.tell.consumer');
export const iconTellHasteAura = placeholder(iconTellFast, 'icon.tell.haste_aura');
