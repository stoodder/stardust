// A cluster-aware human caster for the map balance tests (D151: "A3M5 must reach a human, not just
// a timer"). It plays par's builds with their scripted casts taken out (`castsStripped`). Each tick
// it casts instead, reading only what a player sees on screen:
// - **System Reboot** the moment any jammer is telling: a Silencer's tendril or an Auditor's ring
//   reaching for a tower. That is the tell a player is taught to watch for (A3M4's QUILL line).
// - **Every targeted ability** (Stillness, Suppressing Fire) goes on a boss while one is on the
//   map. Otherwise it goes on the biggest knot of enemies: `CLUSTER_MIN` or more within
//   `CLUSTER_TILES` of one of them, aimed at that one's tile.
// - With `heed` (a player who listens to the radio: A3M5's w13 line, "Save what you have. Freeze
//   them at the old intake."), every targeted ability is held from each of `heed.waves`'
//   countdowns until that wave resolves. It is cast at `heed.at` once a unit of `heed.enemy` on
//   `heed.route` comes within `heed.radius` tiles of it.
// - Nothing else. No live jam map's par carries Time Dilation or Clearance Sale in a slot.
//
// Round 2's probe (the reviewer's react.ts, BIG=1 TELL=1) had two faults this caster fixes:
// - It cast only outside countdowns. A wave's countdown opens once the wave finishes spawning, so
//   it never answered the units still on the map, such as W13's hunt and its Silencers.
// - It rounded targets (`Math.round(x)`). A unit at a tile's centre (x.5) was aimed at the next
//   tile, so every Suppressing Fire was refused as `invalidTarget`. A unit's tile is its floor.
import type { CompiledBuild, CompiledContent } from '../../content/compiled.ts';
import type { GridPos } from '../../content/types.ts';
import { ringTelling } from '../../sim/enemyAbilities/jamRing.ts';
import { tendrilTelling } from '../../sim/enemyAbilities/jamTendril.ts';
import type { Sim } from '../../sim/index.ts';

/** How many enemies make a knot worth a cast… */
export const CLUSTER_MIN = 6;
/** …standing within this many tiles of one of them. */
export const CLUSTER_TILES = 2;

/** What a player who heeds the radio saves their targeted casts for (see the header). */
export interface Heed {
  readonly waves: readonly number[];
  readonly route: string;
  readonly enemy: string;
  readonly at: GridPos;
  readonly radius: number;
}

/** `build` with every ability cast taken out (the caster casts instead). */
export function castsStripped(build: CompiledBuild): CompiledBuild {
  return { ...build, steps: build.steps.filter((s) => s.kind !== 'ability') };
}

/** A per-tick caster for `sim`: call it after the build executor, before each `step()`. */
export function clusterCaster(sim: Sim, content: CompiledContent, heed?: Heed): () => void {
  const st = sim.state;
  const { slot1, slot2 } = sim.config.abilities;
  const kindOf = (id: typeof slot1 | null): string | null =>
    id === null ? null : content.abilities[id].effect.kind;
  const slots = [
    { slot: 1 as const, kind: kindOf(slot1) },
    { slot: 2 as const, kind: kindOf(slot2) },
  ];
  /** Whether a heeded wave is between its countdown and its resolution. */
  const holding = (): boolean =>
    heed !== undefined &&
    heed.waves.some((w) => st.schedule.countdownWave >= w && !st.schedule.resolved[w - 1]);
  return () => {
    let alive = 0;
    let telling = 0;
    let boss: { readonly x: number; readonly y: number; readonly dist: number } | null = null;
    for (let i = 0; i < st.enemies.used; i++) {
      const e = st.enemies.items[i]!;
      if (!e.alive) continue;
      alive++;
      if (tendrilTelling(e) || ringTelling(e)) telling++;
      if (e.bossPhase > 0 && (boss === null || e.dist > boss.dist)) boss = e;
    }
    if (alive === 0) return;
    for (const { slot, kind } of slots) {
      if (kind === null) continue;
      if (st.abilityCooldownTicks[slot - 1]! > 0 || st.abilityCooldownWaves[slot - 1]! > 0) {
        continue;
      }
      if (kind === 'reboot') {
        if (telling > 0) sim.enqueue({ type: 'ability', slot });
        continue;
      }
      if (kind !== 'stasisArea' && kind !== 'segment') continue;
      if (heed !== undefined && holding()) {
        if (heedArrived(sim, heed)) {
          sim.enqueue({ type: 'ability', slot, target: [heed.at[0], heed.at[1]] });
        }
        continue;
      }
      const target = boss ?? biggestKnot(sim);
      if (target !== null) {
        sim.enqueue({
          type: 'ability',
          slot,
          target: [Math.floor(target.x), Math.floor(target.y)],
        });
      }
    }
  };
}

/** Whether a unit of `heed.enemy` on `heed.route` is within `heed.radius` of `heed.at`'s centre. */
function heedArrived(sim: Sim, heed: Heed): boolean {
  const st = sim.state;
  const cx = heed.at[0] + 0.5;
  const cy = heed.at[1] + 0.5;
  for (let i = 0; i < st.enemies.used; i++) {
    const e = st.enemies.items[i]!;
    if (!e.alive || e.def?.id !== heed.enemy || e.route?.id !== heed.route) continue;
    if ((e.x - cx) ** 2 + (e.y - cy) ** 2 < heed.radius ** 2) return true;
  }
  return false;
}

/** The live enemy with the most others within CLUSTER_TILES (CLUSTER_MIN at least), or null. */
function biggestKnot(sim: Sim): { readonly x: number; readonly y: number } | null {
  const st = sim.state;
  const r2 = CLUSTER_TILES * CLUSTER_TILES;
  let best: { readonly x: number; readonly y: number } | null = null;
  let most = CLUSTER_MIN - 1;
  for (let i = 0; i < st.enemies.used; i++) {
    const a = st.enemies.items[i]!;
    if (!a.alive) continue;
    let n = 0;
    for (let j = 0; j < st.enemies.used; j++) {
      const e = st.enemies.items[j]!;
      if (e.alive && (e.x - a.x) ** 2 + (e.y - a.y) ** 2 < r2) n++;
    }
    if (n > most) {
      most = n;
      best = a;
    }
  }
  return best;
}
