// Placeholder art (T500a): M5's new actors under their final sprite ids, so content can name them
// before their art lands (D069's pattern, as T400a did for M4). Each is an existing sprite under
// the new id in its faction's palette, without palette variants, so it keeps the sprite contract
// (enemy walks in four facings, tower t1–t3 frames with a mount and a head, 14×14 icons). The art
// tasks replace each behind the same id and delete its line here: T540a the units (Veilwalker,
// Blinkstrider, Cantor, Glimmer-shard, Fracture, Shard, Rift Moth), T540b the Penitent, the
// Aelari towers, and Stillness's icon. This file goes away with the last of them.
import { enemyGlassWitch } from '../enemies/glass_witch.ts';
import { enemyGlimmer } from '../enemies/glimmer.ts';
import { enemyLightwing } from '../enemies/lightwing.ts';
import { enemyMote } from '../enemies/mote.ts';
import { enemyWeftWarden } from '../enemies/weft_warden.ts';
import {
  iconEnemyGlimmer,
  iconEnemyLightwing,
  iconEnemyMote,
  iconEnemyWeftWarden,
} from '../icons/act2_enemies.ts';
import { iconEnemyGlassWitch } from '../icons/glass_witch.ts';
import { iconTowerRivet } from '../icons/rivet.ts';
import { iconAbilityScannerSweep } from '../icons/scanner_sweep.ts';
import { iconTowerLookout } from '../icons/vrell_towers.ts';
import { iconTowerZapcoil } from '../icons/zapcoil.ts';
import { towerLookout, towerLookoutHead } from '../towers/lookout.ts';
import { towerRivet, towerRivetHead } from '../towers/rivet.ts';
import { towerZapcoil, towerZapcoilHead } from '../towers/zapcoil.ts';
import type { PaletteId, SpriteDef } from '../types.ts';

/** `base` under a new id and palette, without its palette variants. */
function placeholder<const Id extends string>(
  base: SpriteDef,
  id: Id,
  palette: PaletteId,
): SpriteDef<Id> {
  const { variants: _variants, ...rest } = base;
  return { ...rest, id, palette };
}

// Units (T540a; the Penitent T540b).
export const enemyVeilwalker = placeholder(enemyGlimmer, 'enemy.veilwalker', 'aelari');
export const enemyBlinkstrider = placeholder(enemyGlimmer, 'enemy.blinkstrider', 'aelari');
export const enemyCantor = placeholder(enemyWeftWarden, 'enemy.cantor', 'aelari');
export const enemySunderglassPenitent = placeholder(
  enemyGlassWitch,
  'enemy.sunderglass_penitent',
  'aelari',
);
export const enemyGlimmerShard = placeholder(enemyGlimmer, 'enemy.glimmer_shard', 'aelari');
export const enemyFracture = placeholder(enemyMote, 'enemy.fracture', 'hollow');
export const enemyFractureShard = placeholder(enemyMote, 'enemy.fracture_shard', 'hollow');
export const enemyRiftmoth = placeholder(enemyLightwing, 'enemy.riftmoth', 'hollow');
export const iconEnemyVeilwalker = placeholder(iconEnemyGlimmer, 'icon.enemy.veilwalker', 'aelari');
export const iconEnemyBlinkstrider = placeholder(
  iconEnemyGlimmer,
  'icon.enemy.blinkstrider',
  'aelari',
);
export const iconEnemyCantor = placeholder(iconEnemyWeftWarden, 'icon.enemy.cantor', 'aelari');
export const iconEnemySunderglassPenitent = placeholder(
  iconEnemyGlassWitch,
  'icon.enemy.sunderglass_penitent',
  'aelari',
);
export const iconEnemyGlimmerShard = placeholder(
  iconEnemyGlimmer,
  'icon.enemy.glimmer_shard',
  'aelari',
);
export const iconEnemyFracture = placeholder(iconEnemyMote, 'icon.enemy.fracture', 'hollow');
export const iconEnemyFractureShard = placeholder(
  iconEnemyMote,
  'icon.enemy.fracture_shard',
  'hollow',
);
export const iconEnemyRiftmoth = placeholder(iconEnemyLightwing, 'icon.enemy.riftmoth', 'hollow');

// The Aelari towers (T540b), for now in borrowed Everglow and Vrell shapes.
export const towerPrism = placeholder(towerRivet, 'tower.prism', 'aelari');
export const towerPrismHead = placeholder(towerRivetHead, 'tower.prism_head', 'aelari');
export const towerMindspike = placeholder(towerZapcoil, 'tower.mindspike', 'aelari');
export const towerMindspikeHead = placeholder(towerZapcoilHead, 'tower.mindspike_head', 'aelari');
export const towerLantern = placeholder(towerLookout, 'tower.lantern', 'aelari');
export const towerLanternHead = placeholder(towerLookoutHead, 'tower.lantern_head', 'aelari');
export const iconTowerPrism = placeholder(iconTowerRivet, 'icon.tower.prism', 'aelari');
export const iconTowerMindspike = placeholder(iconTowerZapcoil, 'icon.tower.mindspike', 'aelari');
export const iconTowerLantern = placeholder(iconTowerLookout, 'icon.tower.lantern', 'aelari');

// Stillness's ability icon (T540b).
export const iconAbilityStillness = placeholder(
  iconAbilityScannerSweep,
  'icon.ability.stillness',
  'aelari',
);
