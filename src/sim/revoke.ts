// Story-driven revocation and QUILL's lockout (design/towers.md § 9, core-loop.md § 2.2 and
// § 2.11; T606). Map-script actions, run by the triggers system (systems/triggers.ts):
// - **`revokeTowerClass`** selects one class (`mostInvested`: of the loadout's classes of the
//   action's faction, or of every class without one, not already revoked: the most credits
//   invested in its live towers, then the most towers placed, then the earliest loadout slot; with
//   none placed that is the faction's first loadout class). Every live tower of it folds away at
//   once (`TowerRevoked`, its tile free on the same tick so the player can rebuild) and refunds
//   `refundPct` (100) of what was paid for it (`Tower.invested`: builds, upgrades, and a spec at the
//   price charged, so a Clearance Sale's saving isn't paid back), booked as a refund. Then the class
//   joins `state.revoked.towers`, `stats.revocations` counts it, and `ClassRevoked` carries the
//   total. A loadout with no class of the faction loses nothing mid-map (meta revokes the first
//   such class owned at map end; towers.md § 9). The harness's per-class story variants force the
//   class (`SimConfig.revokeClass`).
// - **`revokeAbility`** adds the ability to `state.revoked.abilities` (counted in
//   `stats.revocations`) and emits `AbilityRevoked` with the slot that held it (null if neither).
//   A strike already cast still lands; only new casts are refused.
// - **`setModifier`** turns a script modifier on or off (`ModifierChanged`, only on a change):
//   `quillLockout` hides the wave preview and disables the companion ability that names it as its
//   `lockedOutBy` (QUILL's Time Dilation), in slot 2 while its companion is the map's (the data
//   names the slot, not the sim); `previewHidden` hides the preview alone.
// - **The input edges (D141):** a command for a revoked class (a build of it, an upgrade, spec,
//   sell, targeting, or fire-control command naming one of its folded towers) or a cast from a
//   revoked slot is rejected `revoked` (systems/applyCommands.ts). The app cancels a placement or
//   aim of it as the event arrives (app/revoked.ts). A checkpoint replay re-runs the cue from the
//   command log, so its refund is paid once, in the replayed state.
// Revocations persist only through meta, on the run that first wins the map (meta-runtime.md
// § Run end, step 3).
import type { CompiledScriptAction } from '../content/compiled.ts';
import type { IdSpace, TowerFaction } from '../content/types.ts';
import { assertNever } from '../shared/types.ts';
import type { Command, RejectReason } from './commands.ts';
import type { SimConfig } from './config.ts';
import { tileIndex } from './grid.ts';
import { poolKill } from './pool.ts';
import { emit, type SimState } from './state.ts';
import type { TickContext } from './tick.ts';

type RevokeClassAction = Extract<CompiledScriptAction<IdSpace>, { revokeTowerClass: unknown }>;

/** A script modifier (`setModifier`). */
export type ScriptModifier = keyof SimState['scriptModifiers'];

/**
 * The class a `revokeTowerClass` takes now (towers.md § 9's `mostInvested`), or null when the
 * loadout holds no class it could take: of the loadout's classes of `faction` (every class when
 * null) not yet revoked, the most credits invested in live towers, then the most live towers, then
 * the earliest loadout slot.
 */
export function selectRevokedClass(
  state: {
    readonly towers: {
      readonly used: number;
      readonly items: readonly {
        readonly alive: boolean;
        readonly def: { readonly id: string } | null;
        readonly invested: number;
      }[];
    };
    readonly revoked: { readonly towers: readonly string[] };
  },
  ctx: Pick<TickContext, 'content' | 'config'>,
  faction: TowerFaction | null,
): string | null {
  let best: string | null = null;
  let bestInvested = -1;
  let bestCount = -1;
  for (const id of ctx.config.loadout) {
    const def = ctx.content.towers[id];
    if (def === undefined || (faction !== null && def.faction !== faction)) continue;
    if (state.revoked.towers.includes(id)) continue;
    let invested = 0;
    let count = 0;
    const pool = state.towers;
    for (let i = 0; i < pool.used; i++) {
      const t = pool.items[i]!; // i < used ≤ items.length
      if (!t.alive || t.def?.id !== id) continue;
      invested += t.invested;
      count++;
    }
    // Strictly more wins, so a tie keeps the earlier slot.
    if (invested > bestInvested || (invested === bestInvested && count > bestCount)) {
      best = id;
      bestInvested = invested;
      bestCount = count;
    }
  }
  return best;
}

/** The `revokeTowerClass` script action (see the header). */
export function revokeTowerClass(
  state: SimState,
  ctx: TickContext,
  action: RevokeClassAction,
): void {
  const forced = ctx.config.revokeClass;
  const tower =
    forced !== undefined
      ? state.revoked.towers.includes(forced)
        ? null
        : forced
      : selectRevokedClass(state, ctx, action.revokeTowerClass.faction ?? null);
  if (tower === null) return;
  const pct = action.refundPct;
  let total = 0;
  const pool = state.towers;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (!t.alive || t.def?.id !== tower) continue;
    const refund = Math.floor((t.invested * pct) / 100);
    poolKill(pool, t);
    const idx = tileIndex(ctx.map, t.col, t.row);
    if (state.towerAtTile[idx] === t.slot) state.towerAtTile[idx] = -1;
    state.credits += refund;
    state.stats.creditsRefunded += refund;
    state.revoked.uids.push(t.uid);
    total += refund;
    emit(state, { type: 'TowerRevoked', uid: t.uid, tower, refund });
  }
  state.linksDirty = true;
  state.revoked.towers.push(tower);
  state.stats.revocations++;
  emit(state, { type: 'ClassRevoked', tower, refund: total });
}

/** The `revokeAbility` script action: no new casts of `ability` for the rest of the map. */
export function revokeAbility(state: SimState, config: SimConfig<IdSpace>, ability: string): void {
  if (state.revoked.abilities.includes(ability)) return;
  state.revoked.abilities.push(ability);
  state.stats.revocations++;
  const a = config.abilities;
  const slot = a.slot1 === ability ? 1 : a.slot2 === ability ? 2 : null;
  emit(state, { type: 'AbilityRevoked', ability, slot });
}

/** The `setModifier` script action: `ModifierChanged` when it changes anything. */
export function setScriptModifier(state: SimState, modifier: ScriptModifier, on: boolean): void {
  if (state.scriptModifiers[modifier] === on) return;
  state.scriptModifiers[modifier] = on;
  emit(state, { type: 'ModifierChanged', modifier, on });
}

/** Whether the wave preview is hidden now ("ACCESS RESTRICTED"): QUILL's lockout, or `previewHidden`. */
export function previewHidden(state: {
  readonly scriptModifiers: Readonly<SimState['scriptModifiers']>;
}): boolean {
  return state.scriptModifiers.quillLockout || state.scriptModifiers.previewHidden;
}

/**
 * Whether ability slot `slot` is dark: its ability was revoked, or it is the companion slot and its
 * ability (the map's companion's) is locked out by a script modifier that is on (`lockedOutBy`:
 * QUILL's lockout). An empty slot isn't revoked.
 */
export function slotRevoked(
  state: {
    readonly revoked: { readonly abilities: readonly string[] };
    readonly scriptModifiers: Readonly<SimState['scriptModifiers']>;
  },
  config: Pick<SimConfig<IdSpace>, 'abilities' | 'companion' | 'content'>,
  slot: 1 | 2,
): boolean {
  const a = config.abilities;
  const id = slot === 1 ? a.slot1 : a.slot2;
  if (id === null) return false;
  if (state.revoked.abilities.includes(id)) return true;
  if (slot !== 2) return false;
  const def = Object.hasOwn(config.content.abilities, id)
    ? config.content.abilities[id]
    : undefined;
  if (def === undefined || def.lockedOutBy === null) return false;
  return def.companion === config.companion && state.scriptModifiers[def.lockedOutBy];
}

/**
 * `revoked` for a command the revocations refuse (see the header), else null. Checked before the
 * command's own rules, so a late upgrade of a folded tower says why it's gone.
 */
export function revokedReason(
  state: SimState,
  config: SimConfig<IdSpace>,
  cmd: Command<IdSpace>,
): RejectReason | null {
  const r = state.revoked;
  switch (cmd.type) {
    case 'build':
      return r.towers.includes(cmd.tower) ? 'revoked' : null;
    case 'upgrade':
    case 'specialize':
    case 'sell':
    case 'targeting':
      return r.uids.includes(cmd.towerUid) ? 'revoked' : null;
    case 'holdFire':
    case 'spareRunners':
      return cmd.target !== 'all' && r.uids.includes(cmd.target) ? 'revoked' : null;
    case 'ability':
      return slotRevoked(state, config, cmd.slot) ? 'revoked' : null;
    case 'callWave':
    case 'clear':
    case 'interact':
    case 'scriptInput':
      return null;
    default:
      return assertNever(cmd);
  }
}
