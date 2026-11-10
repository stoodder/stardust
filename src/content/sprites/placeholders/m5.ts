// Placeholder art (T500a): M5's new actors under their final sprite ids, so content can name them
// before their art lands (D069's pattern, as T400a did for M4). Each is an existing sprite under
// the new id in its faction's palette, without palette variants, so it keeps the sprite contract
// (enemy walks in four facings, tower t1–t3 frames with a mount and a head, 14×14 icons). The art
// tasks replace each behind the same id and delete its line here (T540a drew the units' bodies);
// what's left is T540b's: the Penitent, the units' icons, the Aelari towers, the tell glyphs, and
// Stillness's icon. This file goes away with the last of them.
import { enemyGlassWitch } from '../enemies/glass_witch.ts';
import {
  iconEnemyGlimmer,
  iconEnemyLightwing,
  iconEnemyMote,
  iconEnemyWeftWarden,
} from '../icons/act2_enemies.ts';
import { iconEnemyGlassWitch } from '../icons/glass_witch.ts';
import {
  iconTellFast,
  iconTellHollow,
  iconTellShielded,
  iconTellSplitter,
} from '../icons/glyphs.ts';
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

// The Penitent (T540b), and the units' icons (T540b).
export const enemySunderglassPenitent = placeholder(
  enemyGlassWitch,
  'enemy.sunderglass_penitent',
  'aelari',
);
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

// The tell glyphs M5's units name (T540b draws them; T501k): stealth, blink, shield_aura, phasing.
export const iconTellStealth = placeholder(iconTellHollow, 'icon.tell.stealth', 'aelari');
export const iconTellBlink = placeholder(iconTellFast, 'icon.tell.blink', 'aelari');
export const iconTellShieldAura = placeholder(iconTellShielded, 'icon.tell.shield_aura', 'aelari');
export const iconTellPhasing = placeholder(iconTellSplitter, 'icon.tell.phasing', 'hollow');

// Stillness's ability icon (T540b).
export const iconAbilityStillness = placeholder(
  iconAbilityScannerSweep,
  'icon.ability.stillness',
  'aelari',
);
