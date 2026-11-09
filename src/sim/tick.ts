// The tick: one 60 Hz step runs every system once, in a fixed order (architecture.md § Entity
// model). Systems are plain functions over (state, ctx); the order is data, so it's testable.
import type { CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import type { SimConfig } from './config.ts';
import type { SimState } from './state.ts';
import { abilities } from './systems/abilities.ts';
import { applyCommands } from './systems/applyCommands.ts';
import { cleanup } from './systems/cleanup.ts';
import { movement } from './systems/movement.ts';
import { projectiles } from './systems/projectiles.ts';
import { status } from './systems/status.ts';
import { towers } from './systems/towers.ts';
import { triggers } from './systems/triggers.ts';
import { waves } from './systems/waves.ts';

/** Reusable per-tick scratch space: pure modules have no module-level state (conventions.md). */
export interface Scratch {
  /** General-purpose slot or uid list; clear it (`length = 0`) before use. */
  readonly slots: number[];
}

/** A run's immutable inputs, plus scratch. Never hashed: it's the same for every tick. */
export interface TickContext {
  readonly content: CompiledContent<IdSpace>;
  readonly map: CompiledMapDef<IdSpace>;
  readonly config: SimConfig<IdSpace>;
  readonly scratch: Scratch;
}

export type System = (state: SimState, ctx: TickContext) => void;

export type SystemName =
  | 'applyCommands'
  | 'waves'
  | 'triggers'
  | 'status'
  | 'abilities'
  | 'movement'
  | 'towers'
  | 'projectiles'
  | 'cleanup';

/** The system pipeline, in order. */
export const SYSTEMS: readonly { readonly name: SystemName; readonly run: System }[] =
  Object.freeze([
    { name: 'applyCommands', run: applyCommands },
    { name: 'waves', run: waves },
    { name: 'triggers', run: triggers },
    { name: 'status', run: status },
    { name: 'abilities', run: abilities },
    { name: 'movement', run: movement },
    { name: 'towers', run: towers },
    { name: 'projectiles', run: projectiles },
    { name: 'cleanup', run: cleanup },
  ]);

/** Runs one tick: every system in order, then advances `state.tick`. */
export function runTick(
  state: SimState,
  ctx: TickContext,
  systems: readonly { readonly run: System }[] = SYSTEMS,
): void {
  for (let i = 0; i < systems.length; i++) {
    systems[i]!.run(state, ctx); // i < length
  }
  state.tick++;
}
