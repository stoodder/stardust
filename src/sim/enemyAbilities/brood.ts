// Units born on the route mid-wave (design/enemies.md § 5.1, § 6): a splitter's children (the
// Bunchling's 3 Nibblers) and a boss's young (Chitterbloom's sneezed Nibblers, the Bunchling she
// surfaces with). They join the parent's wave, so the wave resolves only once they're gone too,
// carry its wave tags, follow its route, and spawn with full HP from the run's scaled def (the
// `enemyStat` modifiers: Story difficulty, Hardened Hides), exactly as the wave spawner's units do.
// The first lands at the parent's route distance and each next one BROOD_SPREAD_TILES behind it,
// so they read as a burst rather than one stacked sprite.
import type { CompiledEnemyDef, CompiledRoute } from '../../content/compiled.ts';
import { BROOD_SPREAD_TILES } from '../../content/rules.ts';
import type { WaveTag } from '../../content/types.ts';
import { ENEMY_BLANK } from '../entities.ts';
import { countTags } from '../fireControl.ts';
import { placeOnRoute } from '../path.ts';
import { poolAlloc } from '../pool.ts';
import { emit, takeUid, type SimState } from '../state.ts';
import { runWaveModifiers } from '../systems/waves.ts';
import type { TickContext } from '../tick.ts';

/** Where a brood is born: the parent's wave, tags, route, and route distance. */
export interface BroodParent {
  readonly wave: number;
  readonly tags: readonly WaveTag[];
  readonly route: CompiledRoute | null;
  readonly dist: number;
}

/** The def a unit of `id` spawns with this run (scaled by `enemyStat` modifiers, if any). */
export function broodDef(ctx: TickContext, id: string): CompiledEnemyDef {
  const scaled = runWaveModifiers(ctx.config).enemies;
  const def = scaled.size === 0 ? undefined : scaled.get(id);
  if (def !== undefined) return def;
  const base: CompiledEnemyDef | undefined = ctx.content.enemies[id];
  if (base === undefined) throw new Error(`brood: unknown enemy '${id}' (validate() checks it)`);
  return base;
}

/** Spawns `count` of enemy `id` on the parent's route, in its wave (EnemySpawned for each). */
export function spawnBrood(
  state: SimState,
  ctx: TickContext,
  id: string,
  count: number,
  parent: BroodParent,
): void {
  const route = parent.route;
  if (route === null || count <= 0) return;
  const def = broodDef(ctx, id);
  for (let i = 0; i < count; i++) {
    const e = poolAlloc(state.enemies, ENEMY_BLANK, takeUid(state));
    e.def = def;
    e.wave = parent.wave;
    e.tags = parent.tags;
    countTags(state.stats.tagSpawned, parent.tags);
    e.hp = def.hp;
    e.shieldHp = def.shield === null ? 0 : def.shield.hp;
    e.spawnTick = state.tick;
    const back = parent.dist - i * BROOD_SPREAD_TILES;
    placeOnRoute(e, route, back > 0 ? back : 0);
    if (parent.wave > 0) state.schedule.remaining[parent.wave - 1]!++; // wave ≤ waves.length
    emit(state, { type: 'EnemySpawned', uid: e.uid, enemy: def.id, route: route.id, wave: e.wave });
  }
}
