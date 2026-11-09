// Screen routing (architecture.md § Rendering, "Screens and run end"): which screen the overlay
// shows, whether a battle is running, and run end. The menus (Title, Campaign, Base, Settings) show
// the animated backdrop; Battle runs a session; when the sim emits MapWon or MapLost, the battle
// freezes where it stands, and RESULTS_DELAY_MS later (the last radio line and the leak feedback
// play out; D028) Results shows over it. Every run in a campaign ends in the save in play (meta's
// run end: Pests Processed, medals, rewards). A campaign map opens through `play`: the loadout
// screen first when the save has a choice to make (meta/loadout.ts, the skip rule), then the
// battle with its briefing, which offers Change loadout back to the screen. The intake
// (character creation, app/profile.ts) is a menu too: navigation.ts opens it before a new
// campaign's first map and before the Shift board of a save with no profile.
import type * as Phaser from 'phaser';
import { BACKDROP_SCENE_KEY } from '../render/scenes/BackdropScene.ts';
import { assertNever } from '../shared/types.ts';
import { loadoutChangeable } from '../ui/screens/loadoutView.ts';
import { menuNotice, runResult } from '../ui/screens/state.ts';
import { screen } from '../ui/state.ts';
import { startBattle, type Battle } from './battle.ts';
import { battleConfig, DEFAULT_MAP_ID, randomSeed } from './battleSetup.ts';
import { cancel, setSpeed } from './commands.ts';
import { earnedMedalIds } from '../sim/index.ts';
import { closeLoadout, openLoadout } from './loadout.ts';
import { activeSave, closeSession, loadoutOffered, recordRun, systemOpen } from './save.ts';
import { holdNewGame, intakeMode } from './profile.ts';
import {
  debriefStoryOf,
  metaRunEndOf,
  offeredMedals,
  runResultOf,
  type RunEndInput,
} from './runResult.ts';
import type { RunOutcome, ScreenId } from './testHookTypes.ts';

/** The menu notice when a battle can't start (the error itself is logged by navigation). */
export const BATTLE_FAILED =
  "That shift couldn't start: Records found a problem with this save. It's safe; export a code " +
  'from Settings, and try another shift.';

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
  /**
   * Opens a map from the Shift board: the loadout screen when it's offered for the save in play
   * (the system is open and there's a choice to make), else the battle and its briefing.
   */
  play(request: BattleRequest): Promise<void>;
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
    loadoutChangeable.value = false;
  };
  const mapOf = (request: BattleRequest): string =>
    request.mapId ?? defaults.mapId ?? DEFAULT_MAP_ID;

  /**
   * Starts a battle; `briefing` opens the map's briefing over it (a fresh start, not a retry). Its
   * config is built first: if that throws (a save the sim refuses), a menu that shows the notice
   * (the Shift board, the loadout screen) stays up with it instead of a blank screen; from
   * anywhere else (Results → Retry) the Shift board shows it. If the battle itself fails to
   * start, the Shift board shows too.
   */
  const openBattle = (request: BattleRequest, briefing: boolean): Promise<void> => {
    // The URL's seed (`?seed=`) seeds every battle it doesn't override, so smoke runs repeat.
    const mapId = mapOf(request);
    const seed = request.seed ?? defaults.seed ?? randomSeed();
    let cfg: ReturnType<typeof battleConfig>;
    try {
      cfg = battleConfig(mapId, seed, activeSave());
    } catch (err) {
      menuNotice.value = BATTLE_FAILED;
      const shown = screen.value === 'campaign' || screen.value === 'loadout';
      const back = shown ? Promise.resolve() : showFailed();
      return back.then(() => Promise.reject(err instanceof Error ? err : new Error(String(err))));
    }
    stopBattle();
    showBackdrop(false);
    closeLoadout();
    lastRequest = request;
    setSpeed(1);
    runResult.value = null;
    ended = false;
    wavesCleared = 0;
    firstLeakAt = null;
    endedAt = null;
    let next: Battle;
    try {
      next = startBattle(game, cfg, { briefing });
    } catch (err) {
      menuNotice.value = BATTLE_FAILED;
      return showFailed().then(() =>
        Promise.reject(err instanceof Error ? err : new Error(String(err))),
      );
    }
    menuNotice.value = null;
    battle = next;
    const { bus } = next.host;
    bus.on('WaveCleared', () => {
      wavesCleared++;
    });
    // The first leak, for the results card's first-leak line (app/runResult.ts; D028).
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
    // The briefing's Change loadout: only where the loadout screen came before it.
    loadoutChangeable.value = briefing && loadoutOffered(mapId);
    screen.value = 'battle';
    return next.firstFrame;
  };

  /** After a battle failed to start: the Shift board, where the notice shows (the Title without a save). */
  const showFailed = (): Promise<void> =>
    activeSave() === null ? showMenu('title') : showMenu('campaign');

  /** Shows a menu over the backdrop, ending any battle. */
  const showMenu = (id: MenuId | 'settings' | 'loadout' | 'intake'): Promise<void> => {
    stopBattle();
    if (id !== 'loadout') closeLoadout();
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
          holdNewGame(null);
          return showMenu('title');
        case 'intake':
          // Character creation (T306): a held new game, or the save in play (app/profile.ts).
          if (intakeMode() === null) {
            return Promise.reject(
              new Error('router: the intake needs a new game or a loaded save'),
            );
          }
          return showMenu('intake');
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
        case 'loadout':
          if (activeSave() === null) {
            return Promise.reject(new Error('router: the loadout screen needs a loaded save'));
          }
          if (!openLoadout(mapOf(request))) {
            return Promise.reject(new Error(`router: no loadout for map '${mapOf(request)}'`));
          }
          return showMenu('loadout');
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
    play(request) {
      return router.goto(loadoutOffered(mapOf(request)) ? 'loadout' : 'battle', request);
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
        maxIntegrity: s.maxIntegrity,
        integrity: s.integrity,
        skitterkinKilled: s.stats.skitterkinKilled,
        wavesCleared,
        firstLeakAgo:
          firstLeakAt === null
            ? null
            : { ms: end.ms - firstLeakAt.ms, ticks: end.tick - firstLeakAt.tick },
        stardust: sim.map.stardust,
        medals: offeredMedals(sim.map),
        earnedMedals: earnedMedalIds(s, sim.map),
        stats: s.stats,
      };
      // Run end (meta-runtime.md § Run end): Pests Processed, medals, and rewards into the save
      // in play, then the results card shows what it paid.
      const summary = recordRun(metaRunEndOf(input, outcome));
      // The debrief reads the save as the run left it (its flags, seen list, and profile).
      runResult.value = runResultOf(
        { ...input, ...debriefStoryOf(activeSave()) },
        outcome,
        summary,
      );
      // The battle freezes where it ended and stays drawn behind the results.
      setSpeed(0);
      cancel();
      return router.goto('results');
    },
  };
  return router;
}
