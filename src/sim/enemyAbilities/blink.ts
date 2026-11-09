// Blink (design/enemies.md § 3, § 6; D101; T404), the one module behind a unit's own blink
// (`def.blink`: M5's Blinkstrider) and a boss phase's (the Glass Witch's phase 2). The abilities
// system hands each unit its active blink (its boss phase's, else its own; enemyAbilities/index.ts).
// A state machine on `Enemy.blinkTicks`, the shield pulse's shape (pulse.ts):
// - **The first blink.** A unit's own: one period after it spawns (the pulse's and the sneeze's
//   rule). A boss phase's: its tell starts as soon as the phase does (after the phase change's
//   invulnerability), so the new move shows itself at once; the Witch blinks 3 s, 10 s, and 17 s
//   after crossing 70% unless she's driven to retreat first. The timer carries across a phase change
//   that keeps the blink.
// - **The tell** is the last `tellTicks` of each period (BlinkTell as it begins, with the landing
//   point; `blinkTelling` for render). The unit **holds still** through it (`paceMul` 0, as the hush
//   tell does), so the landing point it shows is where it will appear: `tiles` further along its
//   route, clamped to the route's end (`blinkLanding`). A blink onto the end leaks as movement runs
//   (a boss's drains whatever it reaches: the core, or a Protect map's asset).
// - **The blink.** When the timer runs out the unit moves `tiles` along its route (its `dist`,
//   `seg`, and position; Blinked from where it stood to where it lands: the afterimage) and the
//   timer restarts. A boss's blinks count in `stats.bossBlinks` (Glass Half Empty: force the
//   Witch's retreat before her third).
// - **Waits:** a boss's timer waits while it's invulnerable between phases (its other timers' rule).
//   A leaving unit never blinks (the abilities system only moves it), so a retreat cancels a tell.
// - **The interrupt** (§ 2.4): while `isInterrupted` (systems/status.ts: Stasis on a non-boss
//   today, Unnerved in M5) a tell can't start or go on: the blink is cancelled, even mid-tell
//   (BlinkInterrupted if its tell had begun), and its cooldown restarts from zero. A boss's Stasis
//   converts to Chilled 50%, which interrupts nothing (D101).
// Story difficulty changes no blink number (systems/waves.ts `scaledEnemy` keeps it).
import type { CompiledBlink } from '../../content/compiled.ts';
import type { Enemy } from '../entities.ts';
import { pointAt, type Point } from '../path.ts';
import { emit, type SimState } from '../state.ts';
import { isInterrupted } from '../systems/status.ts';
import type { TickContext } from '../tick.ts';

/** The blink `e` runs now (its boss phase's, else its own), or null. */
export function activeBlink(e: Readonly<Enemy>): CompiledBlink | null {
  const def = e.def;
  if (def === null) return null;
  const phase = def.boss === null ? null : (def.boss.phases[e.bossPhase - 1] ?? null);
  return phase?.blink ?? def.blink;
}

/** Whether `e` is showing a blink's tell this tick (render reads it). */
export function blinkTelling(e: Readonly<Enemy>, blink: CompiledBlink): boolean {
  return (
    e.alive &&
    !e.leaving &&
    e.invulnerableTicks === 0 &&
    e.blinkTicks > 0 &&
    e.blinkTicks <= blink.tellTicks
  );
}

/**
 * Where `e` lands if it blinks now: writes the point into `out` and returns the route distance
 * (`tiles` past its own, clamped to the route's end). Allocation-free; render draws the tell there.
 */
export function blinkLanding(e: Readonly<Enemy>, blink: CompiledBlink, out: Point): number {
  const route = e.route;
  if (route === null) {
    out.x = e.x;
    out.y = e.y;
    return e.dist;
  }
  const to = e.dist + blink.tiles;
  const dist = to < route.lengthTiles ? to : route.lengthTiles;
  pointAt(route, dist, out, e.seg);
  return dist;
}

const landing: Point = { x: 0, y: 0 };

/** One tick of a unit's blink: count down, tell (holding still), blink, or be interrupted. */
export function blinkStep(
  state: SimState,
  _ctx: TickContext,
  e: Enemy,
  blink: CompiledBlink,
): void {
  if (e.invulnerableTicks > 0) return; // a boss between phases: its timers wait
  if (e.blinkTicks <= 0) {
    // First tick it blinks: a boss phase tells at once, a unit waits a period. (Abilities only
    // run on units with a def.)
    e.blinkTicks = e.def!.boss !== null ? blink.tellTicks + 1 : blink.everyTicks;
    return;
  }
  const wasTelling = e.blinkTicks <= blink.tellTicks;
  const left = --e.blinkTicks;
  if (left <= blink.tellTicks && isInterrupted(e)) {
    e.blinkTicks = blink.everyTicks;
    if (wasTelling) emit(state, { type: 'BlinkInterrupted', uid: e.uid });
    return;
  }
  if (left > 0) {
    if (left > blink.tellTicks) return;
    e.paceMul = 0; // it holds still through the tell
    if (left === blink.tellTicks) {
      blinkLanding(e, blink, landing);
      emit(state, {
        type: 'BlinkTell',
        uid: e.uid,
        enemy: e.def!.id,
        x: e.x,
        y: e.y,
        toX: landing.x,
        toY: landing.y,
      });
    }
    return;
  }
  e.blinkTicks = blink.everyTicks;
  const x = e.x;
  const y = e.y;
  const route = e.route;
  if (route !== null) {
    e.dist = blinkLanding(e, blink, landing);
    e.seg = pointAt(route, e.dist, e, e.seg);
  }
  if (e.def!.boss !== null) state.stats.bossBlinks++;
  emit(state, {
    type: 'Blinked',
    uid: e.uid,
    enemy: e.def!.id,
    x,
    y,
    toX: e.x,
    toY: e.y,
  });
}
