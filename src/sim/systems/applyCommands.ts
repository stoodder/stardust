// System 1: applyCommands. Validates and applies queued commands FIFO; each rejection emits
// CommandRejected. Every applied command (accepted or not) is logged with the current tick, so
// the log plus the seed replays the run. Also run alone by applyPending() while paused.
import { MAX_TIER_BEFORE_SPEC, TOWER_DEPLOY_SEC } from '../../content/rules.ts';
import type { IdSpace } from '../../content/types.ts';
import { secToTicks } from '../../shared/time.ts';
import { assertNever } from '../../shared/types.ts';
import type { Command, RejectReason } from '../commands.ts';
import { TOWER_BLANK } from '../entities.ts';
import { isBuildableTile, tileIndex } from '../grid.ts';
import { interact } from '../clickables.ts';
import { pressForcedInput } from '../forcedInput.ts';
import { revokedReason } from '../revoke.ts'; // T606
import { pay, sellValue } from '../economy.ts';
import { isLateSell } from '../objectives.ts';
import { poolAlloc, poolFind, poolKill } from '../pool.ts';
import { emit, takeUid, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { applyHoldFire, applySpareRunners, inheritFireControl } from '../fireControl.ts';
import { applySpecialize } from '../specialize.ts';
import { applyAbilityCommand } from './abilities.ts';
import { callWave } from './waves.ts';
import { applyClearCommand, liveTileAt } from './wreckage.ts';

/**
 * The deploy delay (core-loop.md § 2.5) as a starting cooldown. The towers system runs later on
 * the build tick and decrements before it checks, so the extra tick makes the first possible shot
 * land exactly DEPLOY_TICKS after the build tick (the same spacing as a cooldown after a shot).
 * A build applied while paused runs at the next tick's start, so it's the same.
 */
export const DEPLOY_TICKS = secToTicks(TOWER_DEPLOY_SEC);

export function applyCommands(state: SimState, ctx: TickContext): void {
  const queue = state.pending;
  if (queue.length === 0) return;
  for (let i = 0; i < queue.length; i++) {
    const cmd = queue[i]!; // i < length
    state.commandLog.push({ tick: state.tick, cmd });
    const reason = state.outcome === 'playing' ? applyCommand(state, ctx, cmd) : 'mapEnded';
    if (reason !== null) emit(state, { type: 'CommandRejected', cmd, reason });
  }
  queue.length = 0;
}

/** Applies one command; returns null on success, else why it was rejected. */
function applyCommand(
  state: SimState,
  ctx: TickContext,
  cmd: Command<IdSpace>,
): RejectReason | null {
  // A forced input (T605; sim/forcedInput.ts): only its `scriptInput` applies until it's pressed.
  if (state.pendingInput !== null && cmd.type !== 'scriptInput') return 'forcedInput';
  // A revoked class or ability slot (T606; sim/revoke.ts): `revoked`, before its own rules.
  const revoked = revokedReason(state, ctx.config, cmd);
  if (revoked !== null) return revoked;
  switch (cmd.type) {
    case 'build':
      return build(state, ctx, cmd);
    case 'upgrade':
      return upgrade(state, ctx, cmd.towerUid);
    case 'specialize':
      return applySpecialize(state, ctx, cmd);
    case 'holdFire':
      return applyHoldFire(state, ctx, cmd);
    case 'spareRunners':
      return applySpareRunners(state, ctx, cmd);
    case 'targeting': {
      const tower = poolFind(state.towers, cmd.towerUid);
      if (tower === null) return 'noSuchTower';
      if (tower.priority === null) return 'noTargeting';
      tower.priority = cmd.mode;
      return null;
    }
    case 'sell':
      return sell(state, ctx, cmd.towerUid);
    case 'callWave':
      return callWave(state, ctx);
    case 'ability':
      return applyAbilityCommand(state, ctx, cmd);
    case 'clear':
      return applyClearCommand(state, ctx, cmd);
    case 'interact':
      // A clickable world object (T409): `notClickable` unless a script has made it clickable.
      return interact(state, cmd.marker, false);
    case 'scriptInput':
      // The forced input (A3M3's SEAL; T605): presses the pending one, else `forcedInput`.
      return pressForcedInput(state, cmd.id);
    default:
      return assertNever(cmd);
  }
}

function build(
  state: SimState,
  ctx: TickContext,
  cmd: Extract<Command<IdSpace>, { type: 'build' }>,
): RejectReason | null {
  if (!ctx.config.loadout.includes(cmd.tower)) return 'notInLoadout';
  if (state.lockedTowers.includes(cmd.tower)) return 'towerLocked';
  const [col, row] = cmd.tile;
  const idx = tileIndex(ctx.map, col, row);
  if (idx < 0) return 'invalidTile';
  // Cleared wreckage builds as the tile under it (systems/wreckage.ts).
  if (!isBuildableTile(liveTileAt(ctx.map, state.wreckage, idx))) return 'notBuildable';
  if (state.towerAtTile[idx] !== -1) return 'tileOccupied';
  const def = ctx.content.towers[cmd.tower]!; // validateConfig checked every loadout id
  const tier = def.tiers[0];
  // Tune-ups, Rapid Deploy, and Clearance Sale (economy.ts purchasePriceInto).
  const cost = pay(state, ctx.config.modifiers, def.id, tier.cost, 'build', ctx.scratch.price);
  if (cost < 0) return 'cantAfford';

  state.stats.towersBuilt++;
  const tower = poolAlloc(state.towers, TOWER_BLANK, takeUid(state));
  tower.def = def;
  tower.tier = 1;
  tower.tierDef = tier;
  tower.col = col;
  tower.row = row;
  tower.x = col + 0.5;
  tower.y = row + 0.5;
  tower.priority = tier.defaultPriority;
  tower.invested = cost;
  tower.builtTick = state.tick;
  tower.cooldownTicks = DEPLOY_TICKS + 1;
  state.towerAtTile[idx] = tower.slot;
  inheritFireControl(state, tower);
  state.linksDirty = true;
  emit(state, {
    type: 'TowerBuilt',
    uid: tower.uid,
    tower: def.id,
    tile: [col, row],
    cost,
  });
  return null;
}

function upgrade(state: SimState, ctx: TickContext, towerUid: number): RejectReason | null {
  const tower = poolFind(state.towers, towerUid);
  if (tower === null || tower.def === null) return 'noSuchTower';
  // Tier 4 is a specialization (`specialize`, T202), not an upgrade.
  if (tower.tier >= MAX_TIER_BEFORE_SPEC) return 'maxTier';
  const next = tower.def.tiers[tower.tier]!; // tier < MAX_TIER_BEFORE_SPEC = tiers.length
  const cost = pay(
    state,
    ctx.config.modifiers,
    tower.def.id,
    next.cost,
    'upgrade',
    ctx.scratch.price,
  );
  if (cost < 0) return 'cantAfford';
  tower.tier++;
  tower.tierDef = next;
  tower.invested += cost;
  state.linksDirty = true;
  emit(state, { type: 'TowerUpgraded', uid: tower.uid, tier: tower.tier, cost });
  return null;
}

/**
 * Sells a tower (design/core-loop.md § 2.3): refunds `sellValue` (everything inside the misclick
 * grace, else 70% rounded down, or Resale Value's raised fraction). The tower dies now, so nothing fires from it this tick, and its
 * tile is free at once (a sell and a rebuild can share a tick, or a pause); cleanup releases its
 * slot. Shells already in flight still land (they carry their own stats).
 */
function sell(state: SimState, ctx: TickContext, towerUid: number): RejectReason | null {
  const tower = poolFind(state.towers, towerUid);
  if (tower === null) return 'noSuchTower';
  const { value } = sellValue(tower, state.tick, state.economy.sellRefundPct);
  if (isLateSell(tower, state)) state.stats.lateSells++;
  poolKill(state.towers, tower);
  const idx = tileIndex(ctx.map, tower.col, tower.row);
  if (state.towerAtTile[idx] === tower.slot) state.towerAtTile[idx] = -1;
  state.credits += value;
  state.stats.creditsRefunded += value;
  state.linksDirty = true;
  emit(state, { type: 'TowerSold', uid: tower.uid, refund: value });
  return null;
}
