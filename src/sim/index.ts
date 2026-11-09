// The sim's public API. render/, ui/, audio/, and app/ import the sim only through this file.
export { createSim, type Sim } from './sim.ts';
export {
  MAX_LOADOUT,
  type DifficultyId,
  type EconomyStat,
  type EnemyStat,
  type Modifier,
  type ModifierSource,
  type ScriptFlags,
  type SimConfig,
} from './config.ts';
export type { Command, CommandLogEntry, CommandType, RejectReason } from './commands.ts';
export type { SimEvent, SimEventType } from './events.ts';
export type { Ally, Enemy, Projectile, Tower, Zone } from './entities.ts';
export type { Pool, PoolEntity } from './pool.ts';
export type { Outcome, SimRngs, SimState, SimStats } from './state.ts';
export { SYSTEMS, type SystemName } from './tick.ts';
