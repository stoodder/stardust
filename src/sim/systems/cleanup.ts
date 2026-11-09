// System 9: cleanup, last in the tick. Books this tick's dead enemies (died or leaked) against
// their waves, releases dead slots back to their pools' free lists (last, so every system this
// tick could still see and name what died), resolves waves, and decides the map
// (design/core-loop.md § 2.1):
// - Defeat the instant core integrity hits 0, or a Protect map's asset meter does (T305a). It
//   wins over a victory on the same tick.
// - A killed splitter releases its children here, before resolution, into its wave
//   (enemyAbilities/split.ts), so a wave isn't cleared while the Bunchling's Nibblers run.
// - A killed Skitterkin sets the Skittish units within reach bolting (enemyAbilities/skittish.ts).
//   A hushed unit (enemyAbilities/hush.ts) left the fight: it books to its wave and nothing else.
// - A wave resolves when every enemy in it has died, leaked, or left (a driven-off boss and her
//   brood); its clear bonus (§ 2.3) pays then, leaks or not, tripled for a boss wave
//   (waveClearBonusFor). Waves overlap, so they can resolve out of order; one tick resolves in
//   wave order.
// - Victory when every wave has resolved (the last wave's enemies are all gone, and so is
//   everything before it) with integrity above 0.
// It also keeps the medals (sim/medals.ts): leaks book against Perfect Core, `passedMarker`
// conditions latch (sim/conditions.ts) while this tick's dead are still in their pools, a
// Challenge that can no longer hold is forfeited, and a loss or win settles every medal just
// before MapLost or MapWon. Optional objectives (sim/objectives.ts) settle beside the medals.
import type { CompiledWave } from '../../content/compiled.ts';
import { waveClearBonusFor } from '../../content/rules.ts';
import type { IdSpace } from '../../content/types.ts';
import { trackConditions } from '../conditions.ts';
import { earn } from '../economy.ts';
import { boltNear } from '../enemyAbilities/skittish.ts';
import { splitOnDeath, wasKilled } from '../enemyAbilities/split.ts';
import { bookLeak, leakedThisTick, settleLoss, settleWin, watchChallenge } from '../medals.ts';
import {
  isAssetLost,
  settleObjectivesLoss,
  settleObjectivesWin,
  watchObjectives,
} from '../objectives.ts';
import { poolReleaseDead } from '../pool.ts';
import { emit, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';

export function cleanup(state: SimState, ctx: TickContext): void {
  // A dead tower (sold or revoked) frees its tile before its slot can be reused.
  const towers = state.towers;
  for (let i = 0; i < towers.used; i++) {
    const t = towers.items[i]!; // i < used ≤ items.length
    if (!t.alive && t.uid !== 0) {
      const idx = t.row * ctx.map.cols + t.col;
      if (state.towerAtTile[idx] === t.slot) state.towerAtTile[idx] = -1;
    }
  }
  // Every enemy that died or leaked this tick is dead and not yet released: book it once.
  const enemies = state.enemies;
  const remaining = state.schedule.remaining;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (e.alive || e.uid === 0) continue;
    if (e.wave > 0) remaining[e.wave - 1]!--; // wave ≤ waves.length
    if (leakedThisTick(e)) bookLeak(state, e);
    else if (e.def !== null && e.def.split !== null) splitOnDeath(state, ctx, e, e.def.split);
    // A killed Skitterkin sets the runners around it bolting (Skittish; a hush does it in hush.ts).
    if (e.def !== null && e.def.faction === 'skitterkin' && wasKilled(e)) boltNear(state, e.x, e.y);
  }
  trackConditions(state, ctx.map);
  poolReleaseDead(towers);
  poolReleaseDead(enemies);
  poolReleaseDead(state.projectiles);
  poolReleaseDead(state.zones);
  poolReleaseDead(state.allies);

  if (state.integrity <= 0 || isAssetLost(state)) {
    state.outcome = 'lost';
    settleLoss(state, ctx.map);
    settleObjectivesLoss(state, ctx.map);
    emit(state, { type: 'MapLost' });
    return;
  }
  watchChallenge(state, ctx.map, ctx);
  watchObjectives(state, ctx.map, ctx);
  const s = state.schedule;
  let allResolved = true;
  for (let w = 0; w < remaining.length; w++) {
    if (s.resolved[w] === true) continue;
    if (s.startTick[w]! < 0 || remaining[w]! > 0) {
      allResolved = false;
      continue;
    }
    s.resolved[w] = true;
    const bonus = waveClearBonusFor(w + 1, isBossWave(ctx.map.waves[w]!)); // w < waves.length
    earn(state, bonus);
    emit(state, { type: 'WaveCleared', wave: w + 1, bonus });
  }
  if (allResolved) {
    state.outcome = 'won';
    settleWin(state, ctx.map, ctx);
    settleObjectivesWin(state, ctx.map, ctx);
    emit(state, { type: 'MapWon' });
  }
}

/** Whether a wave sends a boss (its clear bonus is tripled; enemies.md § 6). */
export function isBossWave(wave: CompiledWave<IdSpace>): boolean {
  const groups = wave.groups;
  for (let i = 0; i < groups.length; i++) {
    if (groups[i]!.enemy.boss !== null) return true; // i < length
  }
  return false;
}
