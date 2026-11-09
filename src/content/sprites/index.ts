// Sprite registry: every sprite definition, in gallery order.
import { allyBricks } from './allies/bricks.ts';
import { enemyBroodHauler } from './enemies/brood_hauler.ts';
import { enemyChonk } from './enemies/chonk.ts';
import { enemyHaulerYoung } from './enemies/hauler_young.ts';
import { enemyNibbler } from './enemies/nibbler.ts';
import { enemyPuffwing } from './enemies/puffwing.ts';
import { enemyBunchling } from './enemies/bunchling.ts';
import { enemyDigger } from './enemies/digger.ts';
import { enemyElder } from './enemies/elder.ts';
import { enemyChitterbloom } from './enemies/chitterbloom.ts';
import { enemyGerald } from './enemies/gerald.ts';
import { enemyYoungling } from './enemies/youngling.ts';
import { enemyZoomer } from './enemies/zoomer.ts';
import { fxBombletBurst } from './fx/bomblet_burst.ts';
import { fxExplosion } from './fx/explosion.ts';
import { fxSackBurst } from './fx/sack_burst.ts';
import { fxBurrowMound } from './fx/burrow_mound.ts';
import { fxGroundShadow } from './fx/ground_shadow.ts';
import { fxLinkTether } from './fx/link_tether.ts';
import { fxOrbitalReticle } from './fx/orbital_reticle.ts';
import { fxConfettiBurst } from './fx/confetti_burst.ts';
import { sceneRig9Feed } from './scenes/rig9_feed.ts';
import { fxShadow } from './fx/shadow.ts';
import { iconEnemyBroodHauler } from './icons/brood_hauler.ts';
import { iconEnemyChonk } from './icons/chonk.ts';
import { iconAbilityOrbitalStrike } from './icons/orbital_strike.ts';
import {
  iconCore,
  iconCredits,
  iconLock,
  iconTellArmored,
  iconTellBoss,
  iconTellBurrower,
  iconTellCarrier,
  iconTellFast,
  iconTellFlying,
  iconTellHuddle,
  iconTellSplitter,
} from './icons/glyphs.ts';
import { iconEnemyNibbler } from './icons/nibbler.ts';
import { iconEnemyBunchling } from './icons/bunchling.ts';
import { iconEnemyDigger } from './icons/digger.ts';
import { iconEnemyElder } from './icons/elder.ts';
import { iconEnemyChitterbloom } from './icons/chitterbloom.ts';
import { iconEnemyGerald } from './icons/gerald.ts';
import { iconEnemyPuffwing } from './icons/puffwing.ts';
import { iconTowerRivet } from './icons/rivet.ts';
import { iconAbilitySuppressingFire } from './icons/suppressing_fire.ts';
import { iconTowerSprinkler } from './icons/sprinkler.ts';
import { iconTowerThumper } from './icons/thumper.ts';
import { iconTowerSkyhook } from './icons/skyhook.ts';
import { iconAbilityClearanceSale } from './icons/clearance_sale.ts';
import { iconAbilityTimeDilation } from './icons/time_dilation.ts';
import { iconTowerZapcoil } from './icons/zapcoil.ts';
import { iconEnemyZoomer } from './icons/zoomer.ts';
import { projectileRivetTracer } from './projectiles/rivet_tracer.ts';
import { projectileThumperBomblet } from './projectiles/thumper_bomblet.ts';
import { projectileThumperShell } from './projectiles/thumper_shell.ts';
import { projectileSkyhookFlak } from './projectiles/skyhook_flak.ts';
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
import { propPeeker } from './props/peeker.ts';
import { propWreckage } from './props/wreckage.ts';
import { propSalvageDrone } from './props/salvage_drone.ts';
import { propMailbox } from './props/mailbox.ts';
import { propZibzabShop } from './props/zibzab_shop.ts';
import { propFountain } from './props/fountain.ts';
import { propPodium } from './props/podium.ts';
import { propPartyTent } from './props/party_tent.ts';
import { propConfettiCannon } from './props/confetti_cannon.ts';
import { propBunting } from './props/bunting.ts';
import { tileApron } from './tiles/apron.ts';
import { tileGrass } from './tiles/grass.ts';
import { tilePath } from './tiles/path.ts';
import { tilePad } from './tiles/pad.ts';
import { tileHighGround } from './tiles/high_ground.ts';
import { tilePowerNode } from './tiles/power_node.ts';
import { tileSpawn } from './tiles/spawn.ts';
import { tileVerge } from './tiles/verge.ts';
import { tileGrime } from './tiles/grime.ts';
import { tileCliff } from './tiles/cliff.ts';
import { towerRivet, towerRivetHead } from './towers/rivet.ts';
import { towerSprinkler, towerSprinklerHead } from './towers/sprinkler.ts';
import { towerThumper, towerThumperHead } from './towers/thumper.ts';
import { towerSkyhook, towerSkyhookHead } from './towers/skyhook.ts';
import { towerZapcoil, towerZapcoilHead } from './towers/zapcoil.ts';
import { portraitBricks } from './portraits/bricks.ts';
import { portraitGerald } from './portraits/gerald.ts';
import { portraitGoldie } from './portraits/goldie.ts';
import { portraitKip } from './portraits/kip.ts';
import { portraitPebble } from './portraits/pebble.ts';
import { portraitPlayer } from './portraits/player.ts';
import { portraitPrim } from './portraits/prim.ts';
import { portraitQuill } from './portraits/quill.ts';
import { portraitSterling } from './portraits/sterling.ts';
import { portraitVesthara } from './portraits/vesthara.ts';
import { portraitZibzab } from './portraits/zibzab.ts';
import {
  enemyGlassWitch,
  enemyGlimmer,
  enemyLightwing,
  enemyMote,
  enemyWeftWarden,
  iconAbilityScannerSweep,
  iconEnemyGlassWitch,
  iconEnemyGlimmer,
  iconEnemyLightwing,
  iconEnemyMote,
  iconEnemyWeftWarden,
  iconTellHollow,
  iconTellRegen,
  iconTellShielded,
  iconTellSkittish,
  iconTowerCrane,
  iconTowerHarpoon,
  iconTowerLookout,
  towerCrane,
  towerCraneHead,
  towerHarpoon,
  towerHarpoonHead,
  towerLookout,
  towerLookoutHead,
} from './placeholders/index.ts';

export const SPRITES = [
  tileGrass,
  tileVerge,
  tileGrime,
  tileCliff,
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
  propPeeker,
  propWreckage,
  propSalvageDrone,
  propMailbox,
  propZibzabShop,
  propFountain,
  propPodium,
  propPartyTent,
  propConfettiCannon,
  propBunting,
  towerRivet,
  towerRivetHead,
  towerThumper,
  towerThumperHead,
  towerSprinkler,
  towerSprinklerHead,
  towerSkyhook,
  towerSkyhookHead,
  towerZapcoil,
  towerZapcoilHead,
  // M4's towers, placeholders until T440b (placeholders/index.ts).
  towerLookout,
  towerLookoutHead,
  towerHarpoon,
  towerHarpoonHead,
  towerCrane,
  towerCraneHead,
  enemyNibbler,
  enemyZoomer,
  enemyChonk,
  enemyBroodHauler,
  enemyHaulerYoung,
  enemyYoungling,
  enemyPuffwing,
  enemyBunchling,
  enemyDigger,
  enemyElder,
  enemyChitterbloom,
  enemyGerald,
  // M4's units, placeholders until T440a and T440b (placeholders/index.ts).
  enemyMote,
  enemyGlimmer,
  enemyWeftWarden,
  enemyLightwing,
  enemyGlassWitch,
  allyBricks,
  projectileRivetTracer,
  projectileThumperShell,
  projectileThumperBomblet,
  projectileSkyhookFlak,
  fxShadow,
  fxGroundShadow,
  fxExplosion,
  fxBombletBurst,
  fxSackBurst,
  fxBurrowMound,
  fxLinkTether,
  fxOrbitalReticle,
  fxConfettiBurst,
  iconTowerRivet,
  iconTowerThumper,
  iconTowerSprinkler,
  iconEnemyNibbler,
  iconEnemyZoomer,
  iconEnemyChonk,
  iconEnemyBroodHauler,
  iconAbilityOrbitalStrike,
  iconAbilitySuppressingFire,
  iconTowerSkyhook,
  iconTowerZapcoil,
  iconEnemyPuffwing,
  iconEnemyBunchling,
  iconEnemyDigger,
  iconEnemyElder,
  iconEnemyChitterbloom,
  iconEnemyGerald,
  iconAbilityTimeDilation,
  iconAbilityClearanceSale,
  // M4's icons, placeholders until T440a and T440b (placeholders/index.ts).
  iconTowerLookout,
  iconTowerHarpoon,
  iconTowerCrane,
  iconEnemyMote,
  iconEnemyGlimmer,
  iconEnemyWeftWarden,
  iconEnemyLightwing,
  iconEnemyGlassWitch,
  iconAbilityScannerSweep,
  iconCredits,
  iconCore,
  iconLock,
  iconTellFast,
  iconTellArmored,
  iconTellCarrier,
  iconTellFlying,
  iconTellBurrower,
  iconTellSplitter,
  iconTellHuddle,
  iconTellBoss,
  // M4's tell glyphs, placeholders until T440a (placeholders/index.ts).
  iconTellShielded,
  iconTellRegen,
  iconTellHollow,
  iconTellSkittish,
  sceneRig9Feed,
  portraitPlayer,
  portraitBricks,
  portraitQuill,
  portraitSterling,
  portraitZibzab,
  portraitGoldie,
  portraitKip,
  portraitPrim,
  portraitGerald,
  portraitVesthara,
  portraitPebble,
] as const;

/** Every sprite id. */
export type SpriteId = (typeof SPRITES)[number]['id'];
