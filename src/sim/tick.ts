// The tick: one 60 Hz step runs every system once, in a fixed order (architecture.md § Entity
// model). Systems are plain functions over (state, ctx); the order is data, so it's testable.
import type { CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import type { SimConfig } from './config.ts';
import type { PurchasePrice } from './economy.ts';
import type { Point } from './path.ts';
import type { SimState } from './state.ts';
import { traps } from './abilities/underfoot.ts';
import { bearers } from './bearers.ts';
import { blockers } from './blocker.ts';
import { darkness } from './darkness.ts';
import { createGatherScratch, type GatherScratch } from './enemyAbilities/gather.ts';
import { enemyAbilities } from './enemyAbilities/index.ts';
import { forcedInput } from './forcedInput.ts';
import { jams } from './jam.ts';
import { leapers } from './leapers.ts';
import { puddles } from './puddles.ts';
import { rifts } from './rifts.ts';
import { swarmlings } from './swarmlings.ts';
import { abilities } from './systems/abilities.ts';
import { allies } from './systems/allies.ts';
import { applyCommands } from './systems/applyCommands.ts';
import { cleanup } from './systems/cleanup.ts';
import { detection } from './systems/detection.ts';
import { fields } from './systems/fields.ts';
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
  /** A shot's extra targets, slot and uid pairs (Harmony; attacks/extraTargets.ts, T607). */
  readonly extraTargets: number[];
  /** Gathering's matching (enemyAbilities/gather.ts; R15). */
  readonly gather: GatherScratch;
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
    extraTargets: [],
    gather: createGatherScratch(),
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
  | 'rifts'
  | 'triggers'
  | 'forcedInput'
  | 'status'
  | 'fields'
  | 'links'
  | 'enemyAbilities'
  | 'jams'
  | 'blockers'
  | 'abilities'
  | 'movement'
  | 'traps'
  | 'puddles'
  | 'detection'
  | 'towers'
  | 'darkness'
  | 'swarmlings'
  | 'leapers'
  | 'allies'
  | 'bearers'
  | 'projectiles'
  | 'cleanup';

/**
 * The system pipeline, in order (architecture.md § Entity model's table). M6's systems each live
 * in their own file: rifts (sim/rifts.ts), forcedInput and blockers (sim/forcedInput.ts,
 * sim/blocker.ts), fields (systems/fields.ts), traps (abilities/underfoot.ts) and swarmlings
 * (sim/swarmlings.ts); gathering and haste auras run inside enemyAbilities, and the aura rule and
 * Lulled inside links and status (systems/auras.ts, systems/status.ts `lullPass`). M7's slots
 * (T700a): jams (sim/jam.ts, T702), puddles (sim/puddles.ts, T705), leapers (sim/leapers.ts,
 * T704), and bearers (sim/bearers.ts, T706); the healer aura and the M7 boss phases run inside
 * enemyAbilities.
 */
export const SYSTEMS: readonly { readonly name: SystemName; readonly run: System }[] =
  Object.freeze([
    { name: 'applyCommands', run: applyCommands },
    { name: 'wreckage', run: wreckage },
    { name: 'waves', run: waves },
    { name: 'rifts', run: rifts }, // T602: a wave's countdown and start are this tick's
    { name: 'triggers', run: triggers },
    { name: 'forcedInput', run: forcedInput }, // T605: a forceInput action freezes this tick
    { name: 'status', run: status },
    { name: 'fields', run: fields }, // T608: the Bloom's chill and pulse, before the tells
    { name: 'links', run: links },
    { name: 'enemyAbilities', run: enemyAbilities },
    { name: 'jams', run: jams }, // T702: after the jammers' tells, before the towers fire
    { name: 'blockers', run: blockers }, // T605: a held unit doesn't step this tick
    { name: 'abilities', run: abilities },
    { name: 'movement', run: movement },
    { name: 'traps', run: traps }, // T604: Underfoot judges this tick's crossings
    { name: 'puddles', run: puddles }, // T705: Big Glorp's puddles, where units stand now
    { name: 'detection', run: detection },
    { name: 'towers', run: towers },
    { name: 'darkness', run: darkness }, // Sundown (T505): after the towers, as render draws it
    { name: 'swarmlings', run: swarmlings }, // T604: after the towers (a sold Den's call home)
    { name: 'leapers', run: leapers }, // T704: the Sproing Pad's leapers, after the towers
    { name: 'allies', run: allies },
    { name: 'bearers', run: bearers }, // T706: after the allies walk them
    { name: 'projectiles', run: projectiles },
    { name: 'cleanup', run: cleanup },
  ]);

/** The systems that still run while a forced input is pending (T605; sim/forcedInput.ts). */
const WHILE_FORCED: ReadonlySet<System> = new Set([applyCommands]);

/**
 * Runs one tick: every system in order, then advances `state.tick`. While a forced input is
 * pending (`state.pendingInput`; sim/forcedInput.ts, T605) only the WHILE_FORCED systems run (only
 * commands apply), so a `forceInput` action freezes the rest of its tick; and once the map has
 * ended mid-tick (a Holdout's `endMap`, sim/objectives.ts) the systems after it don't run.
 */
export function runTick(
  state: SimState,
  ctx: TickContext,
  systems: readonly { readonly run: System }[] = SYSTEMS,
): void {
  for (let i = 0; i < systems.length; i++) {
    const run = systems[i]!.run; // i < length
    if (state.pendingInput !== null && !WHILE_FORCED.has(run)) continue;
    run(state, ctx);
    if (state.outcome !== 'playing') break;
  }
  state.tick++;
}
