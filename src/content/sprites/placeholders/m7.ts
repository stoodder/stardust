// Placeholder art (T700a): M7's new actors under their final sprite ids, so content can name them
// before their art lands (D069's pattern, as T400a, T500a, and T600a did). Each is an existing
// sprite under the new id, without palette variants, so it keeps the sprite contract (enemy walks
// in four facings, tower t1–t3 frames with a mount and a head, 14×14 icons, 8×8 glyphs). A
// placeholder keeps its source's palette. The art tasks replace each behind the same id and delete
// its line here (T740a's units have landed: enemies/m7.ts): T740b the towers (Gloop Spitter, Sproing
// Pad), their icons, System Reboot's icon, and the `disabler` and `healer` glyphs. This file goes
// away with the last of them.
import { iconTellHeavy } from '../icons/m5_glyphs.ts';
import { iconTellRegen } from '../icons/glyphs.ts';
import { iconAbilityUnderfoot, iconTowerBurrow, iconTowerChoir } from '../icons/m6_towers.ts';
import { towerBurrow, towerBurrowHead } from '../towers/den.ts';
import { towerChoir, towerChoirHead } from '../towers/choir.ts';
import type { SpriteDef } from '../types.ts';

/** `base` under a new id, without its palette variants. */
function placeholder<const Id extends string>(base: SpriteDef, id: Id): SpriteDef<Id> {
  const { variants: _variants, ...rest } = base;
  return { ...rest, id };
}

/** M7's placeholders, in gallery order (sprites/index.ts spreads them into SPRITES). */
export const M7_PLACEHOLDERS = [
  // Towers and icons (T740b), for now in borrowed shapes.
  placeholder(towerBurrow, 'tower.gloop'),
  placeholder(towerBurrowHead, 'tower.gloop_head'),
  placeholder(towerChoir, 'tower.sproing'),
  placeholder(towerChoirHead, 'tower.sproing_head'),
  placeholder(iconTowerBurrow, 'icon.tower.gloop'),
  placeholder(iconTowerChoir, 'icon.tower.sproing'),
  placeholder(iconAbilityUnderfoot, 'icon.ability.system_reboot'),
  // The tell glyphs M7's units name (T740b): `disabler` (the jammers), `healer` (the Associate).
  placeholder(iconTellHeavy, 'icon.tell.disabler'),
  placeholder(iconTellRegen, 'icon.tell.healer'),
] as const;
