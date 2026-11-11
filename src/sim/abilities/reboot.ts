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
  const pool = state.towers;
  const freed: number[] = [];
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (!t.alive) continue;
    if (t.jamTicks > 0) {
      unjamTower(state, t, e.immuneTicks);
      freed.push(t.uid);
    } else if (e.immuneTicks > t.jamImmuneTicks) {
      t.jamImmuneTicks = e.immuneTicks;
    }
  }
  emit(state, { type: 'Rebooted', towers: freed });
  return freed.length;
}
