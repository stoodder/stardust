// Placeholder art (T400a): M4's new actors under their final sprite ids, so content can name them
// before their art lands (D069's pattern). Each is an existing sprite recoloured into its faction's
// palette, with any tier-4 spec frames dropped, so it keeps the sprite contract (enemy walks in
// four facings, tower t1–t3 frames with a mount and a head, 14×14 icons). The art tasks replace
// each behind the same id and delete its line here: T440a the Act II units, T440b the Glass Witch
// and the towers (and Scanner Sweep's icon); this folder goes away with the last of them.
import { enemyChitterbloom } from '../enemies/chitterbloom.ts';
import { enemyChonk } from '../enemies/chonk.ts';
import { enemyNibbler } from '../enemies/nibbler.ts';
import { enemyPuffwing } from '../enemies/puffwing.ts';
import { enemyZoomer } from '../enemies/zoomer.ts';
import { iconEnemyChitterbloom } from '../icons/chitterbloom.ts';
import { iconEnemyChonk } from '../icons/chonk.ts';
import { iconEnemyNibbler } from '../icons/nibbler.ts';
import { iconAbilityOrbitalStrike } from '../icons/orbital_strike.ts';
import { iconEnemyPuffwing } from '../icons/puffwing.ts';
import { iconTowerRivet } from '../icons/rivet.ts';
import { iconTowerSprinkler } from '../icons/sprinkler.ts';
import { iconTowerThumper } from '../icons/thumper.ts';
import { iconEnemyZoomer } from '../icons/zoomer.ts';
import { towerRivet, towerRivetHead } from '../towers/rivet.ts';
import { towerSprinkler, towerSprinklerHead } from '../towers/sprinkler.ts';
import { towerThumper, towerThumperHead } from '../towers/thumper.ts';
import { defineSprite } from '../defineSprite.ts';
import { GLYPH } from '../icons/iconGen.ts';
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

// Enemies (T440a; the Witch T440b).
export const enemyMote = placeholder(enemyNibbler, 'enemy.mote', 'hollow');
export const enemyGlimmer = placeholder(enemyZoomer, 'enemy.glimmer', 'aelari');
export const enemyWeftWarden = placeholder(enemyChonk, 'enemy.weft_warden', 'aelari');
export const enemyLightwing = placeholder(enemyPuffwing, 'enemy.lightwing', 'aelari');
export const enemyGlassWitch = placeholder(enemyChitterbloom, 'enemy.glass_witch', 'aelari');
export const iconEnemyMote = placeholder(iconEnemyNibbler, 'icon.enemy.mote', 'hollow');
export const iconEnemyGlimmer = placeholder(iconEnemyZoomer, 'icon.enemy.glimmer', 'aelari');
export const iconEnemyWeftWarden = placeholder(iconEnemyChonk, 'icon.enemy.weft_warden', 'aelari');
export const iconEnemyLightwing = placeholder(iconEnemyPuffwing, 'icon.enemy.lightwing', 'aelari');
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

// Tell glyphs the Act II units name (art-direction § 8; T440a draws the real ones in glyphs.ts):
// first-pass 6×6 marks, so the briefing and wave preview show something readable.

// prettier-ignore
/** `shielded`: a bubble arc over a body (blue-white, the shield's colour). */
export const iconTellShielded = defineSprite({
  id: 'icon.tell.shielded',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'aelari',
  outline: 'auto',
  legend: { C: 'blue.3', D: 'blue.4' },
  frames: { icon: ['.DDDD.', 'D....D', 'C.CC.C', 'C.CC.C', 'C....C', '.CCCC.'] },
});

// prettier-ignore
/** `regen`: a plus (the shield comes back). */
export const iconTellRegen = defineSprite({
  id: 'icon.tell.regen',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'aelari',
  outline: 'auto',
  legend: { C: 'teal.3', D: 'teal.4' },
  frames: { icon: ['..DD..', '..DD..', 'DDDDDD', 'CCCCCC', '..CC..', '..CC..'] },
});

// prettier-ignore
/** `hollow`: a broken ring (wrong in every channel), in the reserved Hollow greys. */
export const iconTellHollow = defineSprite({
  id: 'icon.tell.hollow',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'hollow',
  outline: 'auto',
  legend: { C: 'hollow.3', D: 'hollow.4' },
  frames: { icon: ['.DD.D.', 'D....D', 'D.....', '.....C', 'C....C', '.C.CC.'] },
});

// Scanner Sweep's ability icon (T440b).
export const iconAbilityScannerSweep = placeholder(
  iconAbilityOrbitalStrike,
  'icon.ability.scanner_sweep',
  'aelari',
);
