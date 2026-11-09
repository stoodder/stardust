// Screen routing (architecture.md § Rendering, "Battles"): which screen the overlay shows, whether a
// battle is running, and run end. Title shows the animated backdrop; Battle runs a session; when
// the sim emits MapWon or MapLost, the battle pauses where it stands and Results shows over it.
import type * as Phaser from 'phaser';
import { BACKDROP_SCENE_KEY } from '../render/scenes/BackdropScene.ts';
import { assertNever } from '../shared/types.ts';
import { runResult } from '../ui/screens/state.ts';
import { screen } from '../ui/state.ts';
import { startBattle, type Battle } from './battle.ts';
import { battleConfig, DEFAULT_MAP_ID, randomSeed } from './battleSetup.ts';
import { cancel, setSpeed } from './commands.ts';
import { runResultOf } from './runResult.ts';
import type { RunOutcome, ScreenId } from './testHookTypes.ts';

export interface BattleRequest {
  /** Default: DEFAULT_MAP_ID. */
  readonly mapId?: string | null;
  /** Default: a random seed. */
  readonly seed?: number | null;
}

export interface Router {
  /** The running battle (also while its results show), or null. */
  readonly battle: Battle | null;
  /**
   * Shows a screen. Resolves once it has rendered (a battle: its first frame). `results` shows the
   * last finished run and rejects if no run has ended.
   */
  goto(id: ScreenId, request?: BattleRequest): Promise<void>;
  /** Replays the last battle's map (Results → Retry), with the same request, minus the briefing. */
  retry(): Promise<void>;
  /**
   * Ends the running battle with `outcome` and shows Results. The sim's MapWon / MapLost call it.
   * Rejects outside a battle; a second call is a no-op.
   */
  endRun(outcome: RunOutcome): Promise<void>;
}

/** Creates the router over a booted game (the backdrop scene must be registered). */
export function createRouter(game: Phaser.Game, defaults: BattleRequest = {}): Router {
  let battle: Battle | null = null;
  let ended = false;
  let wavesCleared = 0;
  let lastRequest: BattleRequest = defaults;

  const showBackdrop = (on: boolean): void => {
    const running = game.scene.isActive(BACKDROP_SCENE_KEY);
    if (on && !running) game.scene.start(BACKDROP_SCENE_KEY);
    else if (!on && running) game.scene.stop(BACKDROP_SCENE_KEY);
  };
  const stopBattle = (): void => {
    battle?.stop();
    battle = null;
  };

  /** Starts a battle; `briefing` opens the map's briefing over it (a fresh start, not a retry). */
  const openBattle = (request: BattleRequest, briefing: boolean): Promise<void> => {
    stopBattle();
    showBackdrop(false);
    lastRequest = request;
    const mapId = request.mapId ?? DEFAULT_MAP_ID;
    const seed = request.seed ?? randomSeed();
    setSpeed(1);
    runResult.value = null;
    ended = false;
    wavesCleared = 0;
    const next = startBattle(game, battleConfig(mapId, seed), { briefing });
    battle = next;
    const { bus } = next.host;
    bus.on('WaveCleared', () => {
      wavesCleared++;
    });
    const onEnd = (outcome: RunOutcome) => () => {
      if (battle === next) void router.endRun(outcome);
    };
    bus.on('MapWon', onEnd('won'));
    bus.on('MapLost', onEnd('lost'));
    screen.value = 'battle';
    return next.firstFrame;
  };

  const router: Router = {
    get battle() {
      return battle;
    },
    goto(id, request = defaults) {
      switch (id) {
        case 'title':
          stopBattle();
          showBackdrop(true);
          screen.value = 'title';
          return Promise.resolve();
        case 'battle':
          return openBattle(request, true);
        case 'results':
          if (runResult.value === null) {
            return Promise.reject(new Error('router: no finished run to show results for'));
          }
          showBackdrop(battle === null);
          screen.value = 'results';
          return Promise.resolve();
        default:
          return assertNever(id);
      }
    },
    retry() {
      // A retry skips the briefing: the player read it moments ago.
      return openBattle(lastRequest, false);
    },
    endRun(outcome) {
      if (battle === null) return Promise.reject(new Error('router: no battle to end'));
      if (ended) return Promise.resolve();
      ended = true;
      const { sim } = battle.host;
      const s = sim.state;
      runResult.value = runResultOf(
        {
          mapId: sim.map.id,
          waveCount: sim.map.waves.length,
          maxIntegrity: sim.map.coreIntegrity,
          integrity: s.integrity,
          skitterkinKilled: s.stats.skitterkinKilled,
          wavesCleared,
        },
        outcome,
      );
      // The battle freezes where it ended and stays drawn behind the results.
      setSpeed(0);
      cancel();
      return router.goto('results');
    },
  };
  return router;
}
