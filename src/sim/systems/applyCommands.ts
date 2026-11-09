// System 1: applyCommands. Validates and applies queued commands FIFO; each rejection emits
// CommandRejected. Every applied command (accepted or not) is logged with the current tick, so
// the log plus the seed replays the run. Also run alone by applyPending() while paused.
import type { IdSpace } from '../../content/types.ts';
import { assertNever } from '../../shared/types.ts';
import type { Command, RejectReason } from '../commands.ts';
import { TOWER_BLANK } from '../entities.ts';
import { isBuildableTile, tileIndex } from '../grid.ts';
import { poolAlloc, poolFind } from '../pool.ts';
import { emit, takeUid, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

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
  switch (cmd.type) {
    case 'build':
      return build(state, ctx, cmd);
    case 'upgrade':
      return upgrade(state, cmd.towerUid);
    case 'targeting': {
      const tower = poolFind(state.towers, cmd.towerUid);
      if (tower === null) return 'noSuchTower';
      if (tower.priority === null) return 'noTargeting';
      tower.priority = cmd.mode;
      return null;
    }
    // TODO(T105b): sell (refund rule and misclick grace) and callWave (start W1, early-call bonus).
    case 'sell':
    case 'callWave':
      return 'notImplemented';
    // TODO(T113): Orbital Strike (cooldown, reticle zone, AbilityUsed).
    case 'ability':
      return 'notImplemented';
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
  if (!isBuildableTile(ctx.map.tiles[idx]!)) return 'notBuildable'; // idx is in range
  if (state.towerAtTile[idx] !== -1) return 'tileOccupied';
  const def = ctx.content.towers[cmd.tower]!; // validateConfig checked every loadout id
  const tier = def.tiers[0];
  if (state.credits < tier.cost) return 'cantAfford';

  // TODO(T105b): cost modifiers (shop discounts, Clearance Sale) when they land.
  state.credits -= tier.cost;
  state.stats.creditsSpent += tier.cost;
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
  tower.invested = tier.cost;
  tower.builtTick = state.tick;
  state.towerAtTile[idx] = tower.slot;
  emit(state, {
    type: 'TowerBuilt',
    uid: tower.uid,
    tower: def.id,
    tile: [col, row],
    cost: tier.cost,
  });
  return null;
}

function upgrade(state: SimState, towerUid: number): RejectReason | null {
  const tower = poolFind(state.towers, towerUid);
  if (tower === null || tower.def === null) return 'noSuchTower';
  // Tier 4 is a specialization (`specialize`, T202), not an upgrade.
  if (tower.tier >= 3) return 'maxTier';
  const next = tower.def.tiers[tower.tier]!; // tier is 1 or 2 here, so the index is 1 or 2
  if (state.credits < next.cost) return 'cantAfford';
  state.credits -= next.cost;
  state.stats.creditsSpent += next.cost;
  tower.tier++;
  tower.tierDef = next;
  tower.invested += next.cost;
  emit(state, { type: 'TowerUpgraded', uid: tower.uid, tier: tower.tier, cost: next.cost });
  return null;
}
