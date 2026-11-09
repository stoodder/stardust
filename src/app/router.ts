// Screen routing (architecture.md § Rendering, "Screens and run end"): which screen the overlay
// shows, whether a battle is running, and run end. The menus (Title, Campaign, Base, Settings) show
// the animated backdrop; Battle runs a session; when the sim emits MapWon or MapLost, the battle
// freezes where it stands, and RESULTS_DELAY_MS later (the last radio line and the leak feedback
// play out; D028) Results shows over it. Every run in a campaign ends in the save in play (meta's
// run end: Pests Processed, medals, rewards).
import type * as Phaser from 'phaser';
import { BACKDROP_SCENE_KEY } from '../render/scenes/BackdropScene.ts';
import { assertNever } from '../shared/types.ts';
import { radioLines } from '../content/radio/index.ts';
import { runResult } from '../ui/screens/state.ts';
import { screen } from '../ui/state.ts';
import { startBattle, type Battle } from './battle.ts';
import { battleConfig, DEFAULT_MAP_ID, randomSeed } from './battleSetup.ts';
import { cancel, setSpeed } from './commands.ts';
import { earnedMedalIds } from '../sim/index.ts';
import { activeSave, closeSession, recordRun, systemOpen } from './save.ts';
import { metaRunEndOf, offeredMedals, runResultOf, type RunEndInput } from './runResult.ts';
import type { RunOutcome, ScreenId } from './testHookTypes.ts';

/** How long the frozen battle shows after the map ends, before Results (ms of real time; D028). */
export const RESULTS_DELAY_MS = 1500;

export interface BattleRequest {
  /** Default: the router defaults' (the URL's `?map=`), else DEFAULT_MAP_ID. */
  readonly mapId?: string | null;
  /** Default: the router defaults' (the URL's `?seed=`), else a random seed. */
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
   * Ends the running battle with `outcome` and shows Results now. The sim's MapWon / MapLost call
   * it after RESULTS_DELAY_MS. Rejects outside a battle; a second call is a no-op.
   */
  endRun(outcome: RunOutcome): Promise<void>;
  /** Shows a pending Results now (skips the rest of RESULTS_DELAY_MS); no-op when none waits. */
  flushResults(): Promise<void>;
  /** Settings → Back: the menu Settings was opened from (the Title when none). */
  closeSettings(): Promise<void>;
}

/** Menus Settings can return to. */
type MenuId = 'title' | 'campaign' | 'base';

/** Creates the router over a booted game (the backdrop scene must be registered). */
export function createRouter(game: Phaser.Game, defaults: BattleRequest = {}): Router {
  let battle: Battle | null = null;
  let ended = false;
  let wavesCleared = 0;
  /** performance.now() and the sim tick at the battle's first leak, and at the map's end. */
  let firstLeakAt: { ms: number; tick: number } | null = null;
  let endedAt: { ms: number; tick: number } | null = null;
  /** The map ended and Results waits out RESULTS_DELAY_MS. */
  let pending: { outcome: RunOutcome; timer: ReturnType<typeof setTimeout> } | null = null;
  let lastRequest: BattleRequest = defaults;
  let settingsFrom: MenuId = 'title';

  const showBackdrop = (on: boolean): void => {
    const running = game.scene.isActive(BACKDROP_SCENE_KEY);
    if (on && !running) game.scene.start(BACKDROP_SCENE_KEY);
    else if (!on && running) game.scene.stop(BACKDROP_SCENE_KEY);
  };
  const clearPending = (): void => {
    if (pending !== null) clearTimeout(pending.timer);
    pending = null;
  };
  const stopBattle = (): void => {
    clearPending();
    battle?.stop();
    battle = null;
  };

  /** Starts a battle; `briefing` opens the map's briefing over it (a fresh start, not a retry). */
  const openBattle = (request: BattleRequest, briefing: boolean): Promise<void> => {
    stopBattle();
    showBackdrop(false);
    lastRequest = request;
    // The URL's seed (`?seed=`) seeds every battle it doesn't override, so smoke runs repeat.
    const mapId = request.mapId ?? defaults.mapId ?? DEFAULT_MAP_ID;
    const seed = request.seed ?? defaults.seed ?? randomSeed();
    setSpeed(1);
    runResult.value = null;
    ended = false;
    wavesCleared = 0;
    firstLeakAt = null;
    endedAt = null;
    const next = startBattle(game, battleConfig(mapId, seed, activeSave()), { briefing });
    battle = next;
    const { bus } = next.host;
    bus.on('WaveCleared', () => {
      wavesCleared++;
    });
    // The radio's first-leak trigger: the battle's first EnemyLeaked (app/radio.ts).
    bus.on('EnemyLeaked', () => {
      firstLeakAt ??= { ms: performance.now(), tick: next.host.sim.state.tick };
    });
    // The map ended: freeze the battle now, show Results after the delay.
    const onEnd = (outcome: RunOutcome) => () => {
      if (battle !== next || ended || pending !== null) return;
      endedAt = { ms: performance.now(), tick: next.host.sim.state.tick };
      setSpeed(0);
      cancel();
      pending = {
        outcome,
        timer: setTimeout(() => {
          pending = null;
          if (battle === next) void router.endRun(outcome);
        }, RESULTS_DELAY_MS),
      };
    };
    bus.on('MapWon', onEnd('won'));
    bus.on('MapLost', onEnd('lost'));
    screen.value = 'battle';
    return next.firstFrame;
  };

  /** Shows a menu over the backdrop, ending any battle. */
  const showMenu = (id: MenuId | 'settings'): Promise<void> => {
    stopBattle();
    showBackdrop(true);
    screen.value = id;
    return Promise.resolve();
  };

  const router: Router = {
    get battle() {
      return battle;
    },
    goto(id, request = defaults) {
      switch (id) {
        case 'title':
          // The Title lists the slots; Continue or Load opens one again.
          closeSession();
          return showMenu('title');
        case 'campaign':
          if (activeSave() === null) {
            return Promise.reject(new Error('router: the Shift board needs a loaded save'));
          }
          return showMenu('campaign');
        case 'base':
          if (!systemOpen('base')) {
            return Promise.reject(new Error('router: the base is locked for this save'));
          }
          return showMenu('base');
        case 'settings': {
          const from = screen.value;
          settingsFrom = from === 'campaign' || from === 'base' ? from : 'title';
          return showMenu('settings');
        }
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
    closeSettings() {
      const back = settingsFrom === 'title' || activeSave() !== null ? settingsFrom : 'title';
      return back === 'title' ? showMenu('title') : router.goto(back);
    },
    retry() {
      // A retry skips the briefing: the player read it moments ago.
      return openBattle(lastRequest, false);
    },
    flushResults() {
      if (pending === null) return Promise.resolve();
      const { outcome } = pending;
      clearPending();
      return router.endRun(outcome);
    },
    endRun(outcome) {
      if (battle === null) return Promise.reject(new Error('router: no battle to end'));
      if (ended) return Promise.resolve();
      clearPending();
      ended = true;
      const { sim } = battle.host;
      const s = sim.state;
      const end = endedAt ?? { ms: performance.now(), tick: s.tick };
      const input: RunEndInput = {
        mapId: sim.map.id,
        waveCount: sim.map.waves.length,
        maxIntegrity: sim.map.coreIntegrity,
        integrity: s.integrity,
        skitterkinKilled: s.stats.skitterkinKilled,
        wavesCleared,
        radio: radioLines(sim.map.id),
        firstLeakAgo:
          firstLeakAt === null
            ? null
            : { ms: end.ms - firstLeakAt.ms, ticks: end.tick - firstLeakAt.tick },
        stardust: sim.map.stardust,
        medals: offeredMedals(sim.map),
        earnedMedals: earnedMedalIds(s, sim.map),
      };
      // Run end (meta-runtime.md § Run end): Pests Processed, medals, and rewards into the save
      // in play, then the results card shows what it paid.
      const summary = recordRun(metaRunEndOf(input, outcome));
      runResult.value = runResultOf(input, outcome, summary);
      // The battle freezes where it ended and stays drawn behind the results.
      setSpeed(0);
      cancel();
      return router.goto('results');
    },
  };
  return router;
}
