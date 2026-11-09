// Sprite registry: every sprite definition, in gallery order.
import { allyBricks } from './allies/bricks.ts';
import { enemyBroodHauler } from './enemies/brood_hauler.ts';
import { enemyChonk } from './enemies/chonk.ts';
import { enemyHaulerYoung } from './enemies/hauler_young.ts';
import { enemyNibbler } from './enemies/nibbler.ts';
import { enemyZoomer } from './enemies/zoomer.ts';
import { fxBombletBurst } from './fx/bomblet_burst.ts';
import { fxExplosion } from './fx/explosion.ts';
import { fxSackBurst } from './fx/sack_burst.ts';
import { fxGroundShadow } from './fx/ground_shadow.ts';
import { fxLinkTether } from './fx/link_tether.ts';
import { fxOrbitalReticle } from './fx/orbital_reticle.ts';
import { fxShadow } from './fx/shadow.ts';
import { iconEnemyBroodHauler } from './icons/brood_hauler.ts';
import { iconEnemyChonk } from './icons/chonk.ts';
import { iconAbilityOrbitalStrike } from './icons/orbital_strike.ts';
import {
  iconCore,
  iconCredits,
  iconLock,
  iconTellArmored,
  iconTellCarrier,
  iconTellFast,
} from './icons/glyphs.ts';
import { iconEnemyNibbler } from './icons/nibbler.ts';
import { iconTowerRivet } from './icons/rivet.ts';
import { iconAbilitySuppressingFire } from './icons/suppressing_fire.ts';
import { iconTowerSprinkler } from './icons/sprinkler.ts';
import { iconTowerThumper } from './icons/thumper.ts';
import { iconEnemyZoomer } from './icons/zoomer.ts';
import { projectileRivetTracer } from './projectiles/rivet_tracer.ts';
import { projectileThumperBomblet } from './projectiles/thumper_bomblet.ts';
import { projectileThumperShell } from './projectiles/thumper_shell.ts';
import { propBillboard } from './props/billboard.ts';
import { propCore } from './props/core.ts';
import { propDome } from './props/dome.ts';
import { propFence } from './props/fence.ts';
import { propFlora } from './props/flora.ts';
import { propHousing } from './props/housing.ts';
import { propLettuce } from './props/lettuce.ts';
import { propRig } from './props/rig.ts';
import { propScarecrow } from './props/scarecrow.ts';
import { propRock } from './props/rock.ts';
import { tileApron } from './tiles/apron.ts';
import { tileGrass } from './tiles/grass.ts';
import { tilePath } from './tiles/path.ts';
import { tilePad } from './tiles/pad.ts';
import { tileHighGround } from './tiles/high_ground.ts';
import { tilePowerNode } from './tiles/power_node.ts';
import { tileSpawn } from './tiles/spawn.ts';
import { tileVerge } from './tiles/verge.ts';
import { towerRivet, towerRivetHead } from './towers/rivet.ts';
import { towerSprinkler, towerSprinklerHead } from './towers/sprinkler.ts';
import { towerThumper, towerThumperHead } from './towers/thumper.ts';

export const SPRITES = [
  tileGrass,
  tileVerge,
  tilePath,
  tilePad,
  tileHighGround,
  tilePowerNode,
  tileSpawn,
  tileApron,
  propCore,
  propRock,
  propFlora,
  propFence,
  propDome,
  propBillboard,
  propLettuce,
  propRig,
  propHousing,
  propScarecrow,
  towerRivet,
  towerRivetHead,
  towerThumper,
  towerThumperHead,
  towerSprinkler,
  towerSprinklerHead,
  enemyNibbler,
  enemyZoomer,
  enemyChonk,
  enemyBroodHauler,
  enemyHaulerYoung,
  allyBricks,
  projectileRivetTracer,
  projectileThumperShell,
  projectileThumperBomblet,
  fxShadow,
  fxGroundShadow,
  fxExplosion,
  fxBombletBurst,
  fxSackBurst,
  fxLinkTether,
  fxOrbitalReticle,
  iconTowerRivet,
  iconTowerThumper,
  iconTowerSprinkler,
  iconEnemyNibbler,
  iconEnemyZoomer,
  iconEnemyChonk,
  iconEnemyBroodHauler,
  iconAbilityOrbitalStrike,
  iconAbilitySuppressingFire,
  iconCredits,
  iconCore,
  iconLock,
  iconTellFast,
  iconTellArmored,
  iconTellCarrier,
] as const;

/** Every sprite id. */
export type SpriteId = (typeof SPRITES)[number]['id'];
