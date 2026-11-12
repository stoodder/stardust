// The gate in front of the router (architecture.md § 5, *Bundle*; T802): no screen shows before
// the lazy content it can reach has loaded, so nothing pops in and no line is blank. A menu needs
// the acts through the save in play's frontier (the Shift board, the codex, the inbox, the base
// show what the save has reached); a battle, its loadout screen, and a run's Results need the acts
// through the one after its map's (a run's end can deliver the next act's opening: its memo, its
// codex versions), and the battle renderer (app/battleRenderer.ts). When all of it is in, a call
// goes straight through, synchronously; otherwise it waits for the chunks, then goes through. After
// each call the next act and the battle renderer load in idle time, ahead of need.
import { actAtRank, actOfMapId, actRank } from '../content/acts/index.ts';
import type { StoryAct } from '../content/dialogue/types.ts';
import { frontierOf, type SaveData } from '../meta/index.ts';
import { actsLoaded, ensureActs, preloadActs, whenIdle } from './actContent.ts';
import { battleRendererLoaded, loadBattleRenderer } from './battleRenderer.ts';
import { DEFAULT_MAP_ID } from './battleSetup.ts';
import { logError } from './log.ts';
import type { BattleRequest, Router } from './router.ts';
import { activeSave } from './save.ts';

/** The act the save has reached: its frontier's (the finale once it is won); Act I without one. */
export function savedAct(save: SaveData | null): StoryAct {
  if (save === null) return 1;
  const frontier = frontierOf(save);
  return frontier === null ? 'finale' : (actOfMapId(frontier) ?? 1);
}

/**
 * The acts a battle on `mapId` needs, with the save in play: through the one after the later of
 * the save's act and the map's; every act for a map outside the campaign (the dev battles).
 */
export function battleActs(save: SaveData | null, mapId: string): StoryAct {
  const act = actOfMapId(mapId);
  if (act === null) return 'finale';
  return actAtRank(Math.max(actRank(savedAct(save)), actRank(act)) + 1);
}

const reportLoadError = (err: unknown): void => {
  logError('content: a lazy chunk failed to load', err);
};

/** Loads the battle renderer in idle time (dropped on failure: a battle's gate retries it). */
function preloadRenderer(): void {
  if (battleRendererLoaded()) return;
  whenIdle(() => {
    loadBattleRenderer().catch(reportLoadError);
  });
}

/**
 * Runs `go` once the acts through `acts` (and, for a battle, the renderer) have loaded: at once,
 * synchronously, when they already have. Then preloads the next act and the renderer.
 */
function gated<T>(acts: StoryAct, battle: boolean, go: () => Promise<T>): Promise<T> {
  const after = (): void => {
    preloadActs(actAtRank(actRank(acts) + 1), reportLoadError);
    preloadRenderer();
  };
  if (actsLoaded(acts) && (!battle || battleRendererLoaded())) {
    const out = go();
    after();
    return out;
  }
  return Promise.all([ensureActs(acts), battle ? loadBattleRenderer() : null]).then(() => {
    const out = go();
    after();
    return out;
  });
}

/**
 * `router` behind the content gate. `defaults` are the router's own (the URL's `?map=`), so a
 * request that names no map resolves to the map the router will open.
 */
export function gateRouter(router: Router, defaults: BattleRequest = {}): Router {
  const mapOf = (request: BattleRequest): string =>
    request.mapId ?? defaults.mapId ?? DEFAULT_MAP_ID;
  const menuActs = (): StoryAct => savedAct(activeSave());
  const runningMap = (): string | null => router.battle?.host.sim.map.id ?? null;
  const battleOrMenu = (): StoryAct => {
    const map = runningMap();
    return map === null ? menuActs() : battleActs(activeSave(), map);
  };
  return {
    get battle() {
      return router.battle;
    },
    goto(id, request = defaults) {
      switch (id) {
        case 'battle':
          return gated(battleActs(activeSave(), mapOf(request)), true, () =>
            router.goto(id, request),
          );
        case 'loadout':
          return gated(battleActs(activeSave(), mapOf(request)), false, () =>
            router.goto(id, request),
          );
        case 'results':
          return gated(battleOrMenu(), false, () => router.goto(id, request));
        default:
          return gated(menuActs(), false, () => router.goto(id, request));
      }
    },
    play(request) {
      return gated(battleActs(activeSave(), mapOf(request)), true, () => router.play(request));
    },
    retry() {
      const map = runningMap();
      const acts = map === null ? menuActs() : battleActs(activeSave(), map);
      return gated(acts, true, () => router.retry());
    },
    retryFromCheckpoint() {
      return gated(battleOrMenu(), true, () => router.retryFromCheckpoint());
    },
    resumePending() {
      const map = activeSave()?.pendingRun?.map;
      const acts = map === undefined ? menuActs() : battleActs(activeSave(), map);
      return gated(acts, true, () => router.resumePending());
    },
    endRun(outcome) {
      return router.endRun(outcome);
    },
    flushResults() {
      return router.flushResults();
    },
    abandon() {
      router.abandon();
    },
    presentResults(result, flow, opts) {
      return gated(battleActs(activeSave(), result.mapId), false, () =>
        router.presentResults(result, flow, opts),
      );
    },
    closeSettings() {
      return gated(menuActs(), false, () => router.closeSettings());
    },
  };
}
