// The jettison (design/enemies.md § 6; D146; T707): "Shareholder Value"'s phase 3
// (BossPhaseDef.jettison), run from boss.ts in the boss's phase step.
// - **As the phase begins** (the first abilities pass in it: the hit that crossed 33% began it in
//   the damage pipeline), the boss sheds its plating once (`Enemy.jettisoned`): its armor drops to
//   0 for the rest of the fight, overriding every armor modifier (C4 Purge's −2 included: the def
//   it fights on is its run's scaled def with armor 0, `openPanel` kept), Jettisoned, then each of
//   its `plates` lands on that marker (`openTile` to wreckage `x`, in order: TileOpened; the
//   crash site). [jettison] keeps every plate marker on decor ('.') of each map that sends it, so
//   never on a pad, a path, or a built tower's tile (validateM7.ts); a plate isn't salvage
//   (sim/openTile.ts).
// - **Haste** `hastePct` (under HASTE_CAP) every tick of the phase, its 1.5 s of invulnerability
//   included (as a phase's `hastePct`): the platform lurches forward lighter.
// - The phase's bars and cues are the boss's (`bossPhase: 3`; story binds Sterling's line there).
import type { CompiledBossPhase, CompiledEnemyDef } from '../../content/compiled.ts';
import { HASTE_CAP } from '../../content/rules.ts';
import type { Enemy } from '../entities.ts';
import { openTile } from '../openTile.ts';
import { emit, type SimState } from '../state.ts';

type CompiledJettison = NonNullable<CompiledBossPhase['jettison']>;

/** `def` without its plating: armor 0, everything else as it was (a frozen copy, once a fight). */
export function plateless(def: CompiledEnemyDef): CompiledEnemyDef {
  return def.armor === 0 ? def : Object.freeze({ ...def, armor: 0 });
}

/** One tick of a boss in a jettison phase (see the header). */
export function jettisonStep(state: SimState, boss: Enemy, j: CompiledJettison): void {
  if (!boss.jettisoned) {
    boss.jettisoned = true;
    boss.def = plateless(boss.def!); // only a boss with a def comes here
    emit(state, { type: 'Jettisoned', uid: boss.uid });
    for (let i = 0; i < j.plates.length; i++) openTile(state, j.plates[i]!, 'x'); // i < length
  }
  boss.paceMul *= 1 + (j.hastePct < HASTE_CAP ? j.hastePct : HASTE_CAP);
}
