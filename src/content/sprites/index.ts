// Sprite registry: every sprite definition, in gallery order.
import { enemyChonk } from './enemies/chonk.ts';
import { enemyNibbler } from './enemies/nibbler.ts';
import { enemyZoomer } from './enemies/zoomer.ts';
import { fxExplosion } from './fx/explosion.ts';
import { fxOrbitalReticle } from './fx/orbital_reticle.ts';
import { fxShadow } from './fx/shadow.ts';
import { projectileRivetTracer } from './projectiles/rivet_tracer.ts';
import { projectileThumperShell } from './projectiles/thumper_shell.ts';
import { propCore } from './props/core.ts';
import { propFlora } from './props/flora.ts';
import { propRock } from './props/rock.ts';
import { tileGrass } from './tiles/grass.ts';
import { tilePath } from './tiles/path.ts';
import { tilePad } from './tiles/pad.ts';
import { tileSpawn } from './tiles/spawn.ts';
import { towerRivet, towerRivetHead } from './towers/rivet.ts';
import { towerSprinkler, towerSprinklerHead } from './towers/sprinkler.ts';
import { towerThumper, towerThumperHead } from './towers/thumper.ts';

export const SPRITES = [
  tileGrass,
  tilePath,
  tilePad,
  tileSpawn,
  propCore,
  propRock,
  propFlora,
  towerRivet,
  towerRivetHead,
  towerThumper,
  towerThumperHead,
  towerSprinkler,
  towerSprinklerHead,
  enemyNibbler,
  enemyZoomer,
  enemyChonk,
  projectileRivetTracer,
  projectileThumperShell,
  fxShadow,
  fxExplosion,
  fxOrbitalReticle,
] as const;

/** Every sprite id. */
export type SpriteId = (typeof SPRITES)[number]['id'];
