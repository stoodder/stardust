// A boss's shield-broken phase and its shards (design/enemies.md § 6, the Sunderglass Penitent;
// D137; T506). Run from the boss's step (boss.ts), once a tick, before its phase abilities:
// - **The break.** The first tick a boss with a shield-broken phase ahead (`onShieldBroken`) is
//   found with its shield at 0, that phase begins (BossPhase; no invulnerability: the shattered
//   shield is its telegraph, and the window is the player's), and it releases its `shards` at its
//   position, into its wave (brood.ts), each carrying the boss's uid (`Enemy.ownerUid`).
// - **The re-form.** Each time its shield is found at 0 in that phase while any of its shards is
//   alive, the re-form clock starts (`Enemy.reformTicks`, the shards' `reformTicks`: 4 s). When it
//   runs out with a shard still alive, the shield comes back to full (ShieldReformed) under fire or
//   not; if every shard is dead by then, nothing happens, and from then on the shield only
//   regenerates by its own rule (after its delay without damage). The clock runs through
//   everything (D137: "4 s after breaking"), and shards that leak or stand down are dead too.
// The break is checked here, the tick after the hit that broke the shield (a hit resets the
// shield's regen delay, so it can't have regenerated meanwhile); the re-form then lands exactly
// `reformTicks` after that hit's tick.
import type { CompiledBoss } from '../../content/compiled.ts';
import type { Enemy } from '../entities.ts';
import { emit, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { enterBossPhase } from './bossPhases.ts';
import { spawnBrood } from './brood.ts';

/** The number (1-based) of the boss's first shield-broken phase after its current one, or 0. */
function pendingShieldBroken(boss: Enemy, def: CompiledBoss): number {
  for (let i = boss.bossPhase; i < def.phases.length; i++) {
    if (def.phases[i]!.onShieldBroken) return i + 1; // i < length
  }
  return 0;
}

/** Whether any of `boss`'s shards is alive (and not standing down). */
export function shardsAlive(state: SimState, boss: Enemy): boolean {
  const pool = state.enemies;
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    if (e.alive && !e.leaving && e.ownerUid === boss.uid) return true;
  }
  return false;
}

/** One tick of a live, non-leaving boss's shield-broken rules (see the header). */
export function shieldBrokenStep(
  state: SimState,
  ctx: TickContext,
  boss: Enemy,
  def: CompiledBoss,
): void {
  const shield = boss.def!.shield; // bossStep's caller checked def
  if (shield === null) return;
  const pending = pendingShieldBroken(boss, def);
  if (pending > 0) {
    if (boss.shieldHp > 0) return;
    enterBossPhase(state, boss, def, pending, false);
    const shards = def.phases[pending - 1]!.shards; // pending ≤ phases.length
    if (shards === null) return;
    spawnBrood(state, ctx, shards.enemy, shards.count, boss, boss.uid);
    boss.reformTicks = shards.reformTicks - 1; // counted from the breaking hit's tick
    return;
  }
  const shards = def.phases[boss.bossPhase - 1]?.shards ?? null;
  if (shards === null) return;
  if (boss.reformTicks > 0) {
    if (--boss.reformTicks > 0) return;
    if (!shardsAlive(state, boss)) return;
    boss.shieldHp = shield.hp;
    emit(state, {
      type: 'ShieldReformed',
      uid: boss.uid,
      enemy: boss.def!.id,
      x: boss.x,
      y: boss.y,
    });
  } else if (boss.shieldHp <= 0 && shardsAlive(state, boss)) {
    boss.reformTicks = shards.reformTicks - 1;
  }
}
