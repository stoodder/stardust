// Sprite registry: every sprite definition, in gallery order.
import { allyBricks } from './allies/bricks.ts';
import { allyPebble } from './allies/pebble.ts';
import { allyRefugee } from './allies/refugee.ts';
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
import { enemyMote } from './enemies/mote.ts';
import { enemyGlimmer } from './enemies/glimmer.ts';
import { enemyWeftWarden } from './enemies/weft_warden.ts';
import { enemyLightwing } from './enemies/lightwing.ts';
import { enemyRiftmoth } from './enemies/riftmoth.ts';
import { enemyFractureShard } from './enemies/fracture_shard.ts';
import { enemyFracture } from './enemies/fracture.ts';
import { enemyGlimmerShard } from './enemies/glimmer_shard.ts';
import { enemyCantor } from './enemies/cantor.ts';
import { enemyVeilwalker } from './enemies/veilwalker.ts';
import { enemyBlinkstrider } from './enemies/blinkstrider.ts';
import {
  enemyBroodHaulerFleeing,
  enemyBunchlingFleeing,
  enemyDiggerFleeing,
  enemyElderFleeing,
  enemyNibblerFleeing,
  enemyPuffwingFleeing,
  enemyYounglingFleeing,
  enemyZoomerFleeing,
} from './enemies/fleeing.ts';
import {
  iconEnemyGlimmer,
  iconEnemyLightwing,
  iconEnemyMote,
  iconEnemyWeftWarden,
} from './icons/act2_enemies.ts';
import { fxBombletBurst } from './fx/bomblet_burst.ts';
import { fxExplosion } from './fx/explosion.ts';
import { fxSackBurst } from './fx/sack_burst.ts';
import { fxBurrowMound } from './fx/burrow_mound.ts';
import { fxGroundShadow } from './fx/ground_shadow.ts';
import { fxLinkTether } from './fx/link_tether.ts';
import { fxOrbitalReticle } from './fx/orbital_reticle.ts';
import { fxConfettiBurst } from './fx/confetti_burst.ts';
import { sceneRig9Feed } from './scenes/rig9_feed.ts';
import { uiStarMarker, uiStarNode, uiStarPips } from './starmap/star.ts';
import { fxShadow } from './fx/shadow.ts';
import { iconEnemyBroodHauler, iconEnemyBroodHaulerFleeing } from './icons/brood_hauler.ts';
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
  iconTellShielded,
  iconTellRegen,
  iconTellHollow,
  iconTellSkittish,
} from './icons/glyphs.ts';
import { iconAssetRig, iconAssetRigCritical } from './icons/asset.ts';
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
import { projectileSkyhookSeeker } from './projectiles/skyhook_seeker.ts';
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
// Act II's props and tiles (T440c).
import { propTidybot } from './props/tidybot.ts';
import { propRigs } from './props/rigs.ts';
import { propCrewHut } from './props/crew_hut.ts';
import { propWarren } from './props/warren.ts';
import { propSpoil } from './props/spoil.ts';
// M5's props and tiles for A2M4–A2M6 (T540c).
import { propVat } from './props/vat.ts';
import { propIntake } from './props/intake.ts';
import { propSeam } from './props/seam.ts';
import { propWall } from './props/wall.ts';
import { tileHush } from './tiles/hush.ts';
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
import { iconEnemyGlassWitch } from './icons/glass_witch.ts';
import {
  iconEnemyVeilwalker,
  iconEnemyBlinkstrider,
  iconEnemyCantor,
  iconEnemyGlimmerShard,
  iconEnemyFracture,
  iconEnemyFractureShard,
  iconEnemyRiftmoth,
} from './icons/m5_enemies.ts';
import { iconAbilityScannerSweep } from './icons/scanner_sweep.ts';
import { iconTowerCrane, iconTowerHarpoon, iconTowerLookout } from './icons/vrell_towers.ts';
import { enemyGlassWitch } from './enemies/glass_witch.ts';
import { towerCrane, towerCraneHead } from './towers/crane.ts';
import { towerHarpoon, towerHarpoonHead } from './towers/harpoon.ts';
import { towerLookout, towerLookoutHead } from './towers/lookout.ts';
// M5's Penitent, Aelari towers, beam fx, and icons (T540b).
import { enemySunderglassPenitent } from './enemies/sunderglass_penitent.ts';
import { fxBeamKnot } from './fx/beam_knot.ts';
import { iconTowerLantern, iconTowerMindspike, iconTowerPrism } from './icons/aelari_towers.ts';
import {
  iconTellBlink,
  iconTellHeavy,
  iconTellPhasing,
  iconTellShieldAura,
  iconTellStealth,
} from './icons/m5_glyphs.ts';
import { iconAbilityStillness } from './icons/stillness.ts';
import { iconEnemySunderglassPenitent } from './icons/sunderglass_penitent.ts';
import { towerLantern, towerLanternHead } from './towers/lantern.ts';
import { towerMindspike, towerMindspikeHead } from './towers/mindspike.ts';
import { towerPrism, towerPrismHead } from './towers/prism.ts';

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
  // Act II's props and tiles (T440c).
  propTidybot,
  propRigs,
  propCrewHut,
  propWarren,
  propSpoil,
  // M5's props for A2M4–A2M6 (T540c).
  propVat,
  propIntake,
  propSeam,
  propWall,
  tileHush,
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
  // M4's towers (Vrell scrap, T440b).
  towerLookout,
  towerLookoutHead,
  towerHarpoon,
  towerHarpoonHead,
  towerCrane,
  towerCraneHead,
  // M5's Aelari towers (T540b).
  towerPrism,
  towerPrismHead,
  towerMindspike,
  towerMindspikeHead,
  towerLantern,
  towerLanternHead,
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
  // Act II's fleeing runners (enemies/flee.ts).
  enemyNibblerFleeing,
  enemyZoomerFleeing,
  enemyYounglingFleeing,
  enemyDiggerFleeing,
  enemyPuffwingFleeing,
  enemyBunchlingFleeing,
  enemyElderFleeing,
  enemyBroodHaulerFleeing,
  // M4's units: the Hollow's first, the Aelari constructs, and the Glass Witch.
  enemyMote,
  enemyGlimmer,
  enemyWeftWarden,
  enemyLightwing,
  enemyGlassWitch,
  // M5's units (T540a; the Penitent T540b).
  enemyVeilwalker,
  enemyBlinkstrider,
  enemyCantor,
  enemySunderglassPenitent,
  enemyGlimmerShard,
  enemyFracture,
  enemyFractureShard,
  enemyRiftmoth,
  allyBricks,
  // M5's escort: the refugees and Pebble among them (T540a).
  allyRefugee,
  allyPebble,
  projectileRivetTracer,
  projectileThumperShell,
  projectileThumperBomblet,
  projectileSkyhookFlak,
  projectileSkyhookSeeker,
  fxShadow,
  fxGroundShadow,
  fxExplosion,
  fxBombletBurst,
  fxSackBurst,
  fxBurrowMound,
  fxLinkTether,
  fxBeamKnot,
  fxOrbitalReticle,
  fxConfettiBurst,
  iconTowerRivet,
  iconTowerThumper,
  iconTowerSprinkler,
  iconEnemyNibbler,
  iconEnemyZoomer,
  iconEnemyChonk,
  iconEnemyBroodHauler,
  iconEnemyBroodHaulerFleeing,
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
  // M4's icons.
  iconTowerLookout,
  iconTowerHarpoon,
  iconTowerCrane,
  iconEnemyMote,
  iconEnemyGlimmer,
  iconEnemyWeftWarden,
  iconEnemyLightwing,
  iconEnemyGlassWitch,
  iconAbilityScannerSweep,
  // M5's icons (the units' T540a; the towers', the Penitent's, and Stillness's T540b).
  iconTowerPrism,
  iconTowerMindspike,
  iconTowerLantern,
  iconEnemyVeilwalker,
  iconEnemyBlinkstrider,
  iconEnemyCantor,
  iconEnemySunderglassPenitent,
  iconEnemyGlimmerShard,
  iconEnemyFracture,
  iconEnemyFractureShard,
  iconEnemyRiftmoth,
  iconAbilityStillness,
  iconCredits,
  iconCore,
  iconLock,
  iconAssetRig,
  iconAssetRigCritical,
  iconTellFast,
  iconTellArmored,
  iconTellCarrier,
  iconTellFlying,
  iconTellBurrower,
  iconTellSplitter,
  iconTellHuddle,
  iconTellBoss,
  // M4's tell glyphs.
  iconTellShielded,
  iconTellRegen,
  iconTellHollow,
  iconTellSkittish,
  // M5's tell glyphs (T540b; T501k).
  iconTellStealth,
  iconTellBlink,
  iconTellShieldAura,
  iconTellPhasing,
  iconTellHeavy,
  sceneRig9Feed,
  // The star map's glyphs (T301b).
  uiStarNode,
  uiStarPips,
  uiStarMarker,
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
