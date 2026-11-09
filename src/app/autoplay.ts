// `__sd.autoplay(build)` (conventions.md § Browser smoke tests): plays one of the map's named builds
// through the host, with the same scripted-build executor the balance harness uses
// (sim/headless.ts createBuildExecutor), so a smoke test can play par in the browser and land on
// the real results screen.
import type { CompiledBuild, CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import { createBuildExecutor, type BuildExecutor } from '../sim/index.ts';
import type { Host } from './host.ts';

/**
 * The build a name picks on `map`: 'par', 'none' (no steps, no ability), 'alwaysCallEarly' (par
 * calling every wave the moment its countdown starts), an alt build's name, or a no-counter
 * build's category. These mirror the balance harness's policies (balance/policies.ts), which the
 * app may not import. Null for an unknown name.
 */
export function namedBuild(
  map: CompiledMapDef<IdSpace>,
  name: string,
): CompiledBuild<IdSpace> | null {
  const b = map.builds;
  switch (name) {
    case 'par':
      return b.parBuild;
    case 'none':
      return { ...b.parBuild, technicianAbility: null, callEarly: false, steps: [] };
    case 'alwaysCallEarly':
      return { ...b.parBuild, callEarly: true };
    default:
      if (Object.hasOwn(b.altBuilds, name)) return b.altBuilds[name] ?? null;
      return Object.entries(b.noCounterBuilds).find(([c]) => c === name)?.[1] ?? null;
  }
}

/** The names `namedBuild` knows on `map`. */
export function buildNames(map: CompiledMapDef<IdSpace>): string[] {
  return [
    'par',
    'none',
    'alwaysCallEarly',
    ...Object.keys(map.builds.altBuilds),
    ...Object.keys(map.builds.noCounterBuilds),
  ];
}

/** The build each host is playing now, so switching builds can release the one before. */
const playing = new WeakMap<Host<IdSpace>, BuildExecutor>();

/**
 * Starts playing `name` on the host's battle: from now on its steps are issued before each tick,
 * whatever the speed (frames and fastForward alike), until the battle ends. Steps already done by
 * hand fail as the sim rejects them, and the build carries on (as in the harness). The build
 * played before it lets go: a Hold Fire its `holdFireWhile` macro holds (Gerald's) is turned off,
 * so switching to 'none' mid-pass leaves the towers firing (T335). Throws on an unknown build
 * name.
 */
export function startAutoplay(host: Host<IdSpace>, name: string): BuildExecutor {
  const build = namedBuild(host.sim.map, name);
  if (build === null) {
    throw new RangeError(
      `autoplay: no build '${name}' on ${host.sim.map.id} (known: ${buildNames(host.sim.map).join(', ')})`,
    );
  }
  playing.get(host)?.release();
  const exec = createBuildExecutor(host.sim, build);
  playing.set(host, exec);
  host.setDriver(() => {
    exec.beforeTick();
  });
  return exec;
}
