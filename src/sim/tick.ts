// The tick: one 60 Hz step runs every system once, in a fixed order (architecture.md § Entity
// model). Systems are plain functions over (state, ctx); the order is data, so it's testable.
import type { CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import type { SimConfig } from './config.ts';
import type { Point } from './path.ts';
import type { SimState } from './state.ts';
import { abilities } from './systems/abilities.ts';
import { allies } from './systems/allies.ts';
import { applyCommands } from './systems/applyCommands.ts';
import { cleanup } from './systems/cleanup.ts';
import { links } from './systems/links.ts';
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
  /** A point for route predictions (lead targeting). */
  readonly point: Point;
  /** The damage source a tower's hits name, reused so firing doesn't allocate. */
  readonly towerSource: { readonly kind: 'tower'; uid: number };
}

/** Fresh scratch space for one sim. */
export function createScratch(): Scratch {
  return { slots: [], point: { x: 0, y: 0 }, towerSource: { kind: 'tower', uid: 0 } };
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
  | 'links'
  | 'abilities'
  | 'movement'
  | 'towers'
  | 'allies'
  | 'projectiles'
  | 'cleanup';

/** The system pipeline, in order. */
export const SYSTEMS: readonly { readonly name: SystemName; readonly run: System }[] =
  Object.freeze([
    { name: 'applyCommands', run: applyCommands },
    { name: 'waves', run: waves },
    { name: 'triggers', run: triggers },
    { name: 'status', run: status },
    { name: 'links', run: links },
    { name: 'abilities', run: abilities },
    { name: 'movement', run: movement },
    { name: 'towers', run: towers },
    { name: 'allies', run: allies },
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
