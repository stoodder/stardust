// The sim's public API. render/, ui/, audio/, and app/ import the sim only through this file.
export { createSim, type Sim } from './sim.ts';
export {
  MAX_LOADOUT,
  type AbilityStat,
  type BonusTile,
  type DifficultyId,
  type EconomyStat,
  type EnemyStat,
  type Modifier,
  type ModifierKind,
  type ModifierSource,
  type ScriptFlags,
  type SimConfig,
  type SupportStat,
} from './config.ts';
export { FEATURE_GATES, modifierFeature, type Feature, type GateOwner } from './gates.ts';
export { companionAbility, companionSlot, type CompanionSlot } from './companion.ts';
export {
  SEGMENT_TICK_TICKS,
  abilityInSlot,
  abilityReady,
  abilityStats,
  freeCastReady,
  segmentSpan,
  type AbilityStats,
  type SegmentSpan,
} from './systems/abilities.ts';
export { allyMayTarget } from './systems/allies.ts';
export { isBossWave } from './systems/cleanup.ts';
// What render reads of enemy abilities (T312b): the tells and what a boss does next.
export { bossNextAbility, bossTelling, type BossAbility } from './enemyAbilities/boss.ts';
export { burrowTelling } from './enemyAbilities/burrow.ts';
export { activePulse, pulseTelling } from './enemyAbilities/pulse.ts';
export { activeBlink, blinkLanding, blinkTelling } from './enemyAbilities/blink.ts';
export { phaseTelling } from './enemyAbilities/phase.ts';
export { projectedAura } from './enemyAbilities/shieldAura.ts';
export { projectedHaste } from './enemyAbilities/hasteAura.ts';
export { healRate, projectedHeal, type HealUnits } from './enemyAbilities/healAura.ts'; // T703
export { ringGrowth, ringTelling } from './enemyAbilities/jamRing.ts'; // T707
export { hangarTelling } from './enemyAbilities/hangar.ts'; // T707
export { takeoverTelling } from './enemyAbilities/takeover.ts'; // T707
export { openedTile } from './openTile.ts'; // T707
export { gatherMaxHp, gatherScale, gatherTelling } from './enemyAbilities/gather.ts';
export { canGather, gatherOf } from './enemyAbilities/gather.ts'; // T708
export {
  isMergedBoss,
  isSplitPart,
  mergeTelling,
  MERGE_TELL_TICKS,
} from './enemyAbilities/bossMerge.ts'; // T708
export { SPLIT_SPREAD_TILES, splitHp } from './enemyAbilities/bossSplit.ts'; // T708; D151 (render's gmawLook)
export { riftStatus, type RiftStatus } from './rifts.ts';
export {
  escortMaxLost,
  escortTotal,
  gatedFlagDefaults,
  refugeesRemaining, // T706
} from './escort.ts'; // T605, T612; R7
export { bearersCarried, bearerTotal, postManned } from './bearers.ts'; // T706
export { blockable, blockerLevel, BLOCK_FRONT_TILES } from './blocker.ts'; // T605
export { previewHidden, selectRevokedClass, slotRevoked, type ScriptModifier } from './revoke.ts'; // T606
// Detection (T406): whether a cloaked unit is hidden now (render's shimmer), and a detector's ring.
export { cloakedOut } from './enemyAbilities/cloak.ts';
// A Capacitor Bank's full charge under its bonuses (T407b): render's orb grows against it.
export { bonusChargeTicks } from './attacks/charge.ts';
export { detectRadiusTiles, supportPct } from './systems/detection.ts';
export { fieldPulseTicks, fieldReachTiles } from './systems/fields.ts'; // T608: the Bloom's field
export type {
  Command,
  CommandLogEntry,
  CommandType,
  RejectReason,
  SpecChoice,
} from './commands.ts';
export type { DamageSource, MedalKind, SimEvent, SimEventType } from './events.ts';
export type {
  Ally,
  AllyMode,
  AllyVulnerability,
  Enemy,
  Projectile,
  Tower,
  Zone,
  ZoneKind,
} from './entities.ts';
export type { Pool, PoolEntity } from './pool.ts';
export type {
  MedalStatus,
  ObjectiveStatus,
  Outcome,
  RunEconomy,
  SchedulePhase,
  SimRngs,
  SimState,
  SimStats,
  TagCounts,
  WaveSchedule,
} from './state.ts';
export {
  MISCLICK_GRACE_TICKS,
  bountyFor,
  callWaveBonus,
  costFor,
  nextWaveNoCall,
  purchaseCost,
  purchasePriceInto,
  sellValue,
  sellValueInto,
  type PurchaseKind,
  type PurchasePrice,
  type PurchaseState,
  type SellValue,
  type WaveTagsView,
} from './economy.ts';
export {
  NO_BONUSES,
  bonusDamage,
  bonusDamageVs,
  bonusPeriodTicks,
  bonusRangeTiles,
  type TowerBonuses,
} from './bonuses.ts';
export { isLinkActive, tileAndLinkRules } from './systems/links.ts';
export {
  DARK_EASE_TICKS,
  darkDims,
  darkRangeMul,
  hasDarkness,
  isLightSource,
  isLitAt,
  type LightTower,
  type LightTowers,
} from './darkness.ts';
export {
  ANY_ENEMY,
  clearedInTime, // T706
  evaluateCondition,
  isMedalExempt,
  markerPassedTick,
  settledCondition,
  type ConditionContext,
} from './conditions.ts';
export {
  MEDAL_KINDS,
  PERFECT_CORE_MEDAL_ID,
  VICTORY_MEDAL_ID,
  earnedMedalIds,
  mapMedalIds,
  medalId,
} from './medals.ts';
export {
  ASSET_CRITICAL_SHARE,
  assetDamage,
  completedObjectiveIds,
  isAssetLost,
  isLateSell,
  objectiveStatusById,
  type AssetDamage,
} from './objectives.ts';
export { SYSTEMS, type SystemName } from './tick.ts';
export {
  towerStats,
  type TierStatDelta,
  type TierStats,
  type TowerStatLine,
} from './towerStats.ts';
export {
  isBuildable,
  isBuildableTile,
  isInBounds,
  isWalkableTile,
  tileAt,
  tileElevation,
  tileIndex,
  type MapGrid,
} from './grid.ts';
export {
  WRECKAGE_CLEAR_TICKS,
  clearCommand,
  clearTicksFor,
  liveTile,
  liveTileAt,
  salvageFor,
  wreckageStatus,
  type WreckageMap,
  type WreckageStatus,
  type WreckageView,
} from './systems/wreckage.ts';
export { pointAt, remainingDist, segmentAt, type Point, type RouteFollower } from './path.ts';
export {
  DEFAULT_MAX_TICKS,
  assertRunnableBuild,
  createBuildExecutor,
  runHeadless,
  type BuildExecutor,
  type HeadlessOptions,
  type HeadlessResult,
  type RunSummary,
  type StepRecord,
  type TowerSummary,
  type WaveSummary,
} from './headless.ts';
