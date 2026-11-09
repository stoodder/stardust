// Built-in policies (conventions.md § Balance sims): builds generated from a map rather than
// authored. Each returns a plain CompiledBuild, so the executor runs it like any other.
import type { CompiledBuild, CompiledBuildStep, CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace, LiveIds, PolicyId } from '../content/types.ts';
import { isBuildableTile } from '../sim/index.ts';
import { assertNever } from '../shared/types.ts';

/** The build a policy plays on `map`. Tower costs come from `towers` (the compiled content). */
export function policyBuild<K extends IdSpace = LiveIds>(
  policy: PolicyId,
  map: CompiledMapDef<K>,
  towers: Readonly<Record<string, { readonly tiers: readonly { readonly cost: number }[] }>>,
): CompiledBuild<K> {
  const par = map.builds.parBuild;
  switch (policy) {
    case 'none':
      // No towers and no abilities.
      return { ...par, technicianAbility: null, callEarly: false, steps: [] };
    case 'alwaysCallEarly':
      return { ...par, callEarly: true };
    case 'spareFleeing': {
      const spare: CompiledBuildStep<K> = {
        wave: 1,
        kind: 'spareRunners',
        target: 'all',
        on: true,
      };
      return { ...par, steps: [spare, ...par.steps] };
    }
    case 'spamCheapest': {
      const cheapest = cheapestTower(par.loadout, towers);
      if (cheapest === null) return { ...par, steps: [] };
      const steps: CompiledBuildStep<K>[] = [];
      for (let row = 0; row < map.rows; row++) {
        for (let col = 0; col < map.cols; col++) {
          const t = map.tiles[row * map.cols + col];
          if (t !== undefined && isBuildableTile(t)) {
            steps.push({ wave: 1, kind: 'build', tower: cheapest, tile: [col, row] });
          }
        }
      }
      return { ...par, steps };
    }
    default:
      return assertNever(policy);
  }
}

/**
 * `build` with its commander-ability casts removed (the "par without abilities" check: the casts
 * must matter, conventions.md § Balance sims). Everything else, the slot included, stays.
 */
export function withoutAbilityCasts<K extends IdSpace>(build: CompiledBuild<K>): CompiledBuild<K> {
  return { ...build, steps: build.steps.filter((s) => s.kind !== 'ability') };
}

/** The loadout tower with the lowest tier-1 cost (the first on a tie), or null for none. */
function cheapestTower<T extends string>(
  loadout: readonly T[],
  towers: Readonly<Record<string, { readonly tiers: readonly { readonly cost: number }[] }>>,
): T | null {
  let best: T | null = null;
  let bestCost = Infinity;
  for (const id of loadout) {
    const cost = towers[id]?.tiers[0]?.cost ?? Infinity;
    if (cost < bestCost) {
      best = id;
      bestCost = cost;
    }
  }
  return best;
}
