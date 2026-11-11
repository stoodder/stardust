// Shield pulses (design/enemies.md § 3 `shield_aura`, § 5.2, § 6; D101), the one module behind a
// unit's own pulse (`def.pulse`: M5's Aegis Cantor) and a boss phase's (the Glass Witch's phases,
// the Sunderglass Penitent's later). The abilities system hands each unit its active pulse (its
// boss phase's, else its own; enemyAbilities/index.ts). A state machine on `Enemy.pulseTicks`:
// - The first tick it's alive the timer starts at `everyTicks`, so the first pulse comes one
//   period after it spawns (the sneeze's rule). The last `tellTicks` of each period are the tell
//   (ShieldPulse 'tell' as it begins; `pulseTelling` for render).
// - When the timer runs out it fires (ShieldPulse 'fired') and restarts: every live unit of its
//   faction with a shield, itself included, within `radiusTiles` (centres, any layer; not one
//   that's leaving, burrowed, or Phased: nothing reaches those) gets `shield` back, never past its own max.
//   `restored` counts the units that gained any; a unit under Corrosive Kiss's Corroded gains the
//   amount times its `corrodedShieldMul` (T562). The regen delay is untouched: a pulse refills,
//   it doesn't restart anyone's regeneration.
// - A boss's timer waits while it's invulnerable between phases, like its other ability timers
//   (enemies.md § 6); the timer carries across a phase change.
// - The interrupt (§ 2.4): while a unit is in Stasis, a tell can't start or go on: the pulse is
//   cancelled, even mid-tell (ShieldPulse 'interrupted' if its tell had begun), and its cooldown
//   restarts from zero. A boss never enters Stasis (it converts to Chilled 50%, which doesn't
//   interrupt; D101). Unnerved joins with its status (M5). The test is the shared interrupt hook,
//   systems/status.ts `isInterrupted`.
// Story difficulty's −30% shields scales the amount with the shield (systems/waves.ts
// `scaledEnemy`), so a pulse restores the same share of a weaker shield.
import type { CompiledPulse } from '../../content/compiled.ts';
import type { Enemy } from '../entities.ts';
import { outOfReach } from './layers.ts';
import { emit, type SimState } from '../state.ts';
import { cooldownHeld, isInterrupted } from '../systems/status.ts';
import type { TickContext } from '../tick.ts';

/** The pulse `e` runs now (its boss phase's, else its own), or null. */
export function activePulse(e: Readonly<Enemy>): CompiledPulse | null {
  const def = e.def;
  if (def === null) return null;
  const phase = def.boss === null ? null : (def.boss.phases[e.bossPhase - 1] ?? null);
  return phase?.pulse ?? def.pulse;
}

/** Whether `e` is showing a pulse's tell this tick (render reads it). */
export function pulseTelling(e: Readonly<Enemy>, pulse: CompiledPulse): boolean {
  return (
    e.alive &&
    !e.leaving &&
    e.invulnerableTicks === 0 &&
    e.pulseTicks > 0 &&
    e.pulseTicks <= pulse.tellTicks
  );
}

/** One tick of a unit's shield pulse: count down, tell, fire, or be interrupted. */
export function pulseStep(
  state: SimState,
  _ctx: TickContext,
  e: Enemy,
  pulse: CompiledPulse,
): void {
  if (e.invulnerableTicks > 0) return; // a boss between phases: its timers wait
  if (e.pulseTicks <= 0) {
    e.pulseTicks = pulse.everyTicks; // first tick alive
    return;
  }
  if (e.pulseTicks > pulse.tellTicks && cooldownHeld(e)) return; // Lulled (T607): its beat
  const wasTelling = e.pulseTicks <= pulse.tellTicks;
  const left = --e.pulseTicks;
  if (left <= pulse.tellTicks && isInterrupted(e)) {
    e.pulseTicks = pulse.everyTicks;
    if (wasTelling) pulseEvent(state, e, pulse, 'interrupted', 0);
    return;
  }
  if (left === pulse.tellTicks && left > 0) pulseEvent(state, e, pulse, 'tell', 0);
  if (left > 0) return;
  e.pulseTicks = pulse.everyTicks;
  pulseEvent(state, e, pulse, 'fired', restoreShields(state, e, pulse));
}

/**
 * Restores `pulse.shield` to every shielded unit of `source`'s faction within the radius, itself
 * included, up to each one's max. Returns how many gained any.
 */
export function restoreShields(state: SimState, source: Enemy, pulse: CompiledPulse): number {
  const faction = source.def!.faction; // abilities only run on units with a def
  const pool = state.enemies;
  let restored = 0;
  for (let i = 0; i < pool.used; i++) {
    const a = pool.items[i]!; // i < used ≤ items.length
    const d = a.def;
    if (!a.alive || d === null || d.shield === null || d.faction !== faction || d.neutral) continue;
    if (outOfReach(a)) continue; // leaving, burrowed, or Phased (layers.ts)
    const max = d.shield.hp;
    if (a.shieldHp >= max) continue;
    const dx = a.x - source.x;
    const dy = a.y - source.y;
    if (dx * dx + dy * dy > pulse.radiusSq) continue;
    const next = a.shieldHp + pulse.shield * a.corrodedShieldMul; // Corrosive Kiss (T562)
    a.shieldHp = next < max ? next : max;
    restored++;
  }
  return restored;
}

function pulseEvent(
  state: SimState,
  e: Enemy,
  pulse: CompiledPulse,
  phase: 'tell' | 'fired' | 'interrupted',
  restored: number,
): void {
  emit(state, {
    type: 'ShieldPulse',
    uid: e.uid,
    enemy: e.def!.id, // abilities only run on units with a def
    phase,
    x: e.x,
    y: e.y,
    radiusTiles: pulse.radiusTiles,
    restored,
  });
}
