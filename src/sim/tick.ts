// The tick: one 60 Hz step runs every system once, in a fixed order (architecture.md § Entity
// model). Systems are plain functions over (state, ctx); the order is data, so it's testable.
import type { CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import type { SimConfig } from './config.ts';
import type { PurchasePrice } from './economy.ts';
import type { Point } from './path.ts';
import type { SimState } from './state.ts';
import { enemyAbilities } from './enemyAbilities/index.ts';
import { abilities } from './systems/abilities.ts';
import { allies } from './systems/allies.ts';
import { applyCommands } from './systems/applyCommands.ts';
import { cleanup } from './systems/cleanup.ts';
import { detection } from './systems/detection.ts';
import { links } from './systems/links.ts';
import { movement } from './systems/movement.ts';
import { projectiles } from './systems/projectiles.ts';
import { status } from './systems/status.ts';
import { towers } from './systems/towers.ts';
import { triggers } from './systems/triggers.ts';
import { waves } from './systems/waves.ts';
import { wreckage } from './systems/wreckage.ts';

/** Reusable per-tick scratch space: pure modules have no module-level state (conventions.md). */
export interface Scratch {
  /** General-purpose slot or uid list; clear it (`length = 0`) before use. */
  readonly slots: number[];
  /** A point for route predictions (lead targeting, a blink's landing). */
  readonly point: Point;
  /** The damage source a tower's hits name, reused so firing doesn't allocate. */
  readonly towerSource: { readonly kind: 'tower'; uid: number };
  /** A tower's range after its bonuses (sim/bonuses.ts), for the targeting calls. */
  readonly range: { rangeSq: number; minRangeSq: number };
  /** A purchase's price as the sim pays it (economy.ts `pay`). */
  readonly price: PurchasePrice;
  /** The best Crane salvage bonus over the drone's tile (towerEconomy.ts `craneSalvageAt`). */
  readonly crane: { speedPct: number; salvagePct: number };
}

/** Fresh scratch space for one sim. */
export function createScratch(): Scratch {
  return {
    slots: [],
    point: { x: 0, y: 0 },
    towerSource: { kind: 'tower', uid: 0 },
    range: { rangeSq: 0, minRangeSq: 0 },
    price: { cost: 0, discounted: false },
    crane: { speedPct: 0, salvagePct: 0 },
  };
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
  | 'wreckage'
  | 'waves'
  | 'triggers'
  | 'status'
  | 'links'
  | 'enemyAbilities'
  | 'abilities'
  | 'movement'
  | 'detection'
  | 'towers'
  | 'allies'
  | 'projectiles'
  | 'cleanup';

/** The system pipeline, in order. */
export const SYSTEMS: readonly { readonly name: SystemName; readonly run: System }[] =
  Object.freeze([
    { name: 'applyCommands', run: applyCommands },
    { name: 'wreckage', run: wreckage },
    { name: 'waves', run: waves },
    { name: 'triggers', run: triggers },
    { name: 'status', run: status },
    { name: 'links', run: links },
    { name: 'enemyAbilities', run: enemyAbilities },
    { name: 'abilities', run: abilities },
    { name: 'movement', run: movement },
    { name: 'detection', run: detection },
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
