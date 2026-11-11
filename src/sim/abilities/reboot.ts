// System Reboot, QUILL's Technician patch (design/core-loop.md § 3.2; enemies.md § 4; T702): a
// `reboot` effect.
// - **No target, instant:** cast on the press, it lands on the cast's tick, after AbilityUsed (the
//   ability command applies before the links pass, so the freed towers' links and auras are back
//   that tick and they fire that tick).
// - **What it does:** every live Jammed tower's jam ends (sim/jam.ts `unjamTower`: TowerUnjammed),
//   and every live tower is jam-immune for `immuneTicks` (6 s, REBOOT_IMMUNITY_SEC), counting the
//   cast's tick, or keeps a longer immunity it already has. A tell under way on one of them spends
//   itself on nothing (its landing finds the tower immune). A tower built after the cast isn't
//   immune. Then Rebooted, with the towers it unjammed (empty when none were).
import type { CompiledAbilityEffect } from '../../content/compiled.ts';
import { unjamTower } from '../jam.ts';
import { emit, type SimState } from '../state.ts';

type RebootEffect = Extract<CompiledAbilityEffect, { kind: 'reboot' }>;

/** System Reboot's landing (see the header). Returns how many towers it unjammed. */
export function castReboot(state: SimState, e: RebootEffect): number {
  // The cast lands before this tick's jams pass, which counts every immunity down once (sim/
  // jam.ts), so one tick more makes it exactly `immuneTicks` of jammer passes, the cast's tick's
  // first (D150). (A jam's own end is set after that countdown, so it needs none.)
  const ticks = e.immuneTicks + 1;
  const pool = state.towers;
  const freed: number[] = [];
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (!t.alive) continue;
    if (t.jamTicks > 0) {
      unjamTower(state, t, ticks);
      freed.push(t.uid);
    } else if (ticks > t.jamImmuneTicks) {
      t.jamImmuneTicks = ticks;
    }
  }
  emit(state, { type: 'Rebooted', towers: freed });
  return freed.length;
}
