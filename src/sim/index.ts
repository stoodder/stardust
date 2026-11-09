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
export { FEATURE_GATES, type Feature, type GateOwner } from './gates.ts';
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
  Outcome,
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
  sellValue,
  type SellValue,
} from './economy.ts';
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
