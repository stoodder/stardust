// Placeholder art (T400a): M4's new actors under their final sprite ids, so content can name them
// before their art lands (D069's pattern). Each is an existing sprite recoloured into its faction's
// palette, with any tier-4 spec frames dropped, so it keeps the sprite contract (enemy walks in
// four facings, tower t1–t3 frames with a mount and a head, 14×14 icons). The art tasks replace
// each behind the same id and delete its line here (T440a drew the Act II units and tell glyphs):
// T440b the Glass Witch and the towers (and Scanner Sweep's icon); this folder goes away with the
// last of them.
import { enemyChitterbloom } from '../enemies/chitterbloom.ts';
import { iconEnemyChitterbloom } from '../icons/chitterbloom.ts';
import { iconAbilityOrbitalStrike } from '../icons/orbital_strike.ts';
import { iconTowerRivet } from '../icons/rivet.ts';
import { iconTowerSprinkler } from '../icons/sprinkler.ts';
import { iconTowerThumper } from '../icons/thumper.ts';
import { towerRivet, towerRivetHead } from '../towers/rivet.ts';
import { towerSprinkler, towerSprinklerHead } from '../towers/sprinkler.ts';
import { towerThumper, towerThumperHead } from '../towers/thumper.ts';
import type { AnimDef, FrameDef, PaletteId, SpriteDef } from '../types.ts';

/** `base` under a new id and palette, without palette variants or tier-4 spec frames. */
function placeholder<const Id extends string>(
  base: SpriteDef,
  id: Id,
  palette: PaletteId,
): SpriteDef<Id> {
  const frames: Record<string, FrameDef> = {};
  for (const [name, f] of Object.entries(base.frames)) {
    if (!name.includes('spec')) frames[name] = f;
  }
  const anims: Record<string, AnimDef> = {};
  for (const [name, a] of Object.entries(base.anims ?? {})) {
    if (!name.includes('spec')) anims[name] = a;
  }
  const { variants: _variants, ...rest } = base;
  return { ...rest, id, palette, frames, anims };
}

// The Glass Witch (T440b).
export const enemyGlassWitch = placeholder(enemyChitterbloom, 'enemy.glass_witch', 'aelari');
export const iconEnemyGlassWitch = placeholder(
  iconEnemyChitterbloom,
  'icon.enemy.glass_witch',
  'aelari',
);

// Towers (T440b): Vrell scrap, for now in borrowed Everglow shapes.
export const towerLookout = placeholder(towerSprinkler, 'tower.lookout', 'vrell');
export const towerLookoutHead = placeholder(towerSprinklerHead, 'tower.lookout_head', 'vrell');
export const towerHarpoon = placeholder(towerRivet, 'tower.harpoon', 'vrell');
export const towerHarpoonHead = placeholder(towerRivetHead, 'tower.harpoon_head', 'vrell');
export const towerCrane = placeholder(towerThumper, 'tower.crane', 'vrell');
export const towerCraneHead = placeholder(towerThumperHead, 'tower.crane_head', 'vrell');
export const iconTowerLookout = placeholder(iconTowerSprinkler, 'icon.tower.lookout', 'vrell');
export const iconTowerHarpoon = placeholder(iconTowerRivet, 'icon.tower.harpoon', 'vrell');
export const iconTowerCrane = placeholder(iconTowerThumper, 'icon.tower.crane', 'vrell');

// Scanner Sweep's ability icon (T440b).
export const iconAbilityScannerSweep = placeholder(
  iconAbilityOrbitalStrike,
  'icon.ability.scanner_sweep',
  'aelari',
);
