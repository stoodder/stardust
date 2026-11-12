// Launching Endless (T863; design/maps.md § 8; T861's generator): a battle config on END_M01 runs
// its seed's whole generated run, `endlessContent(ENDLESS, content, seed)` with the config's own
// seed, so the sim plays an ordinary map and the run is the same for anyone with the seed. The
// run's blocks go to the HUD's Next line (app/postGameHooks.ts `endlessRun`). In the finale's lazy
// chunk (app/acts/postGame.ts registers it), so the generator never reaches the initial JS.
import { ENDLESS } from '../content/maps/end_m01/endless.ts';
import type { CompiledContent } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import { endlessContent, type EndlessPlan } from '../sim/endless.ts';
import type { SimConfig } from '../sim/index.ts';
import { COUNTER_LABELS } from './loadout.ts';
import type { EndlessBlockView, EndlessRunView } from './postGameHooks.ts';

/** A plan's blocks as the HUD names them. */
export function endlessBlocks(plan: Pick<EndlessPlan, 'blocks'>): EndlessBlockView[] {
  return plan.blocks.map((b) => ({
    first: b.firstWave,
    last: b.lastWave,
    counters: b.counters.map((c) => COUNTER_LABELS[c]),
    fresh: b.fresh.map((c) => COUNTER_LABELS[c]),
  }));
}

/**
 * `cfg` on Endless's map with its seed's generated run, and the run's blocks; null for another
 * map, or a config whose content doesn't hold the map (the authored warm-up plays then).
 */
export function endlessRunContent(
  cfg: SimConfig<IdSpace>,
): { readonly cfg: SimConfig<IdSpace>; readonly run: EndlessRunView } | null {
  if (cfg.mapId !== ENDLESS.map || !Object.hasOwn(cfg.content.maps, ENDLESS.map)) return null;
  // The live content set (the only one holding END_M01), typed as the config's id space.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- hasOwn above: the live set
  const live = cfg.content as unknown as CompiledContent;
  const { content, plan } = endlessContent(ENDLESS, live, cfg.seed);
  return {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the same set, waves swapped
    cfg: { ...cfg, content: content as unknown as CompiledContent<IdSpace> },
    run: { map: cfg.mapId, seed: cfg.seed, blocks: endlessBlocks(plan) },
  };
}
