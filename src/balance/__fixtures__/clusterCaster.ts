// A cluster-aware human caster for the map balance tests (D151: "A3M5 must reach a human, not just
// a timer"). Par's builds with their scripted casts taken out, and each tick of the run this
// policy casts instead, reading only what a player sees on screen:
// - **System Reboot** the moment any jammer is telling (a Silencer's tendril or an Auditor's ring
//   reaching for a tower: the tell a player is taught to watch for; A3M4's QUILL line).
// - **Every targeted ability** (Stillness, Suppressing Fire, …) on a boss while one is on the map,
//   else on the biggest knot of enemies, when at least `CLUSTER_MIN` stand within `CLUSTER_TILES`
//   of one of them, aimed at that one's tile.
// - Nothing else: no Time Dilation, no Clearance Sale (no live map with jam carries them in par).
//
// It casts whenever an enemy is on the map, whatever the wave's phase: a player casts on the last
// units of a wave while the next countdown runs (round 2's probe waited out each countdown, so it
// never answered a hunt's Silencers once their wave had finished spawning).
import type { CompiledBuild, CompiledContent } from '../../content/compiled.ts';
import type { Sim } from '../../sim/index.ts';
import { ringTelling } from '../../sim/enemyAbilities/jamRing.ts';
import { tendrilTelling } from '../../sim/enemyAbilities/jamTendril.ts';

/** How many enemies make a knot worth a cast… */
export const CLUSTER_MIN = 6;
/** …standing within this many tiles of one of them. */
export const CLUSTER_TILES = 2;

/** `build` with every ability cast taken out (the caster below casts instead). */
export function castsStripped(build: CompiledBuild): CompiledBuild {
  return { ...build, steps: build.steps.filter((s) => s.kind !== 'ability') };
}

/** A per-tick caster for `sim`: call it after the build executor, before each `step()`. */
export function clusterCaster(sim: Sim, content: CompiledContent, heed?: { waves: readonly number[]; route: string; at: readonly [number, number] }): () => void {
  const st = sim.state;
  const { slot1, slot2 } = sim.config.abilities;
  const kindOf = (id: string | null): string | null =>
    id === null ? null : (content.abilities[id]?.effect.kind ?? null);
  const slots = [
    { slot: 1 as const, kind: kindOf(slot1) },
    { slot: 2 as const, kind: kindOf(slot2) },
  ];
  return () => {
    let alive = 0;
    let telling = 0;
    let boss: (typeof st.enemies.items)[number] | null = null;
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
      const MODE = process.env.HEEDMODE ?? 'sil';
      const SLOTS = (process.env.HEEDSLOTS ?? '2').split(',').map(Number);
      if (heed !== undefined && SLOTS.includes(slot) && heed.waves.some((w) => st.schedule.countdownWave >= w && !st.schedule.resolved[w - 1])) {
        let tgt: { x: number; y: number } | null = null;
        let n = 0;
        let sil = false;
        const R = Number(process.env.HEEDR ?? 1.5);
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (!e.alive || e.route?.id !== heed.route) continue;
          const cx = heed.at[0] + 0.5, cy = heed.at[1] + 0.5;
          if ((e.x - cx) ** 2 + (e.y - cy) ** 2 < R * R) { n++; if (e.def?.id === 'silencer' || (e as any).enemy === 'silencer') sil = true; tgt ??= e; }
        }
        const go = MODE === 'sil' ? sil : n >= Number(process.env.HEEDN ?? 4);
        if (go && tgt !== null) sim.enqueue({ type: 'ability', slot, target: [heed.at[0], heed.at[1]] });
        continue;
      }
      let teller: { x: number; y: number } | null = null;
      const rebootReady = slots.some((o) => o.kind === 'reboot' && st.abilityCooldownTicks[o.slot - 1]! <= 0);
      if (process.env.TELLSTILL && kind === 'stasisArea' && !rebootReady) {
        for (let i = 0; i < st.enemies.used; i++) {
          const e = st.enemies.items[i]!;
          if (tendrilTelling(e) || ringTelling(e)) { teller = e; break; }
        }
      }
      const target = boss ?? teller ?? biggestKnot(sim);
      if (target !== null) {
        sim.enqueue({ type: 'ability', slot, target: [Math.floor(target.x), Math.floor(target.y)] });
      }
    }
  };
}

/** The live enemy with the most others within CLUSTER_TILES (CLUSTER_MIN at least), or null. */
function biggestKnot(sim: Sim): { readonly x: number; readonly y: number } | null {
  const st = sim.state;
  const r2 = CLUSTER_TILES * CLUSTER_TILES;
  let best: { x: number; y: number } | null = null;
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
