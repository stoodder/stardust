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
  purchaseCost,
  purchasePriceInto,
  sellValue,
  sellValueInto,
  type PurchaseKind,
  type PurchasePrice,
  type PurchaseState,
  type SellValue,
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
  ANY_ENEMY,
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
  completedObjectiveIds,
  isLateSell,
  objectiveStatusById,
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
