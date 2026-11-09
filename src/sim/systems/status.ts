// System 4: status. Ticks enemy status timers and shield regeneration (design/enemies.md §2.3–2.4;
// M1: Chilled, Soaked, Corroded, Marked, shields), in ascending slot order. Runs before movement,
// so a Chilled of N ticks slows exactly N movement ticks: it's applied by a tower after movement,
// counts down on the next N status passes, and clears on the one after.
//
// Soaked (enemies.md § 2.4; minimal since T304b): the damage pipeline reads `soakedTicks`
// (combat/damage.ts: +25% Energy, Kinetic and Explosive strip shields at ×0.8), a new Soak
// refreshes to the longer duration, and this pass counts it down. Its one live source is the
// Conductive link (`applyLinkStatuses`); the Sprinkler's own tier-3 Soak and Cloudburst's come
// with the Sprinkler's data and specs (M4).
import type { Enemy, Tower } from '../entities.ts';
import type { SimState } from '../state.ts';

/**
 * The statuses a tower's links add to its hits (Conductive: the Sprinkler Soaks from tier 1),
 * applied after the hit's damage like its tier's own effects. Soaked refreshes to the longer of
 * the remaining and the new duration (combat/damage.ts `applyEffects`' rule).
 */
export function applyLinkStatuses(t: Tower, e: Enemy): void {
  const soak = t.linkSoakedTicks;
  if (soak > e.soakedTicks && e.alive) e.soakedTicks = soak;
}

export function status(state: SimState): void {
  const enemies = state.enemies;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!e.alive || e.def === null) continue;

    if (e.chillPct > 0) {
      if (e.chillTicks > 0) {
        e.chillTicks--;
      } else {
        e.chillPct = 0;
        e.chillMul = 1;
      }
    }
    if (e.soakedTicks > 0) e.soakedTicks--;
    if (e.corrodedTicks > 0 && --e.corrodedTicks === 0) e.corrodedStacks = 0;
    if (e.markTicks > 0 && --e.markTicks === 0) e.markPct = 0;

    // Shields regenerate after the delay without damage (applyDamage resets the delay), unless
    // the enemy's data gives no regen.
    const shield = e.def.shield;
    if (shield !== null && e.shieldHp < shield.hp) {
      if (e.shieldRegenDelayTicks > 0) {
        e.shieldRegenDelayTicks--;
      } else {
        const next = e.shieldHp + shield.regenPerTick;
        e.shieldHp = next < shield.hp ? next : shield.hp;
      }
    }
  }
}
