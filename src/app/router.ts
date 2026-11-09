// Screen routing (architecture.md § Rendering, "Screens and run end"): which screen the overlay
// shows, whether a battle is running, and run end. The menus (Title, Campaign, Base, Settings) show
// the animated backdrop; Battle runs a session; when the sim emits MapWon or MapLost, the battle
// freezes where it stands, and RESULTS_DELAY_MS later (the last radio line and the leak feedback
// play out; D028) Results shows over it, after a win's before-Results scenes (app/runFlow.ts;
// A1M5's party). Every run in a campaign ends in the save in play (meta's run end: Pests Processed,
// medals, rewards), an abandoned one too (the pause menu's Retry and Quit: a loss, no Results). A campaign map opens through `play`: the loadout
// screen first when the save has a choice to make (meta/loadout.ts, the skip rule), then the
// battle with its briefing, which offers Change loadout back to the screen. The intake
// (character creation, app/profile.ts) is a menu too: navigation.ts opens it before a new
// campaign's first map and before the Shift board of a save with no profile.
import type * as Phaser from 'phaser';
import { BACKDROP_SCENE_KEY } from '../render/scenes/BackdropScene.ts';
import { assertNever } from '../shared/types.ts';
import { loadoutChangeable } from '../ui/screens/loadoutView.ts';
import type { Scene } from '../content/dialogue/index.ts';
import { pauseMenu } from '../ui/pause/state.ts';
import { menuNotice, runResult, type RunResult } from '../ui/screens/state.ts';
import { screen } from '../ui/state.ts';
import { startBattle, type Battle } from './battle.ts';
import { battleConfig, DEFAULT_MAP_ID, randomSeed } from './battleSetup.ts';
import { cancel, setSpeed } from './commands.ts';
import { playMapEndLines } from './dialogue.ts';
import { earnedMedalIds } from '../sim/index.ts';
import { closeLoadout, openLoadout } from './loadout.ts';
import {
  activeSave,
  closeSession,
  loadoutOffered,
  recordRun,
  systemOpen,
  updateActiveSave,
} from './save.ts';
import { FIRST_PAYDAY_SEEN_ID } from '../meta/index.ts';
import { holdNewGame, intakeMode } from './profile.ts';
import {
  debriefStoryOf,
  holdLines,
  metaRunEndOf,
  offeredMedals,
  runResultOf,
  type RunEndInput,
} from './runResult.ts';
import { flowScenes, playInOrder, setAfterResults } from './runFlow.ts';
import type { RunOutcome, ScreenId } from './testHookTypes.ts';

/** The menu notice when a battle can't start (the error itself is logged by navigation). */
export const BATTLE_FAILED =
  "That shift couldn't start: Records found a problem with this save. It's safe; export a code " +
  'from Settings, and try another shift.';

/** How long the frozen battle shows after the map ends, before Results (ms of real time; D028). */
export const RESULTS_DELAY_MS = 1500;
/** The longest the hold waits for the map-end lines on the comms panel (D098). */
export const RESULTS_HOLD_MAX_MS = 5000;

/**
 * How long the frozen battle holds before Results: RESULTS_DELAY_MS, or long enough for the
 * map-end lines on the comms panel (`linesMs`; A1M5's C1 reaction), up to RESULTS_HOLD_MAX_MS.
 */
export function resultsHoldMs(linesMs: number): number {
  return Math.min(RESULTS_HOLD_MAX_MS, Math.max(RESULTS_DELAY_MS, linesMs));
}

export interface BattleRequest {
  /** Default: the router defaults' (the URL's `?map=`), else DEFAULT_MAP_ID. */
  readonly mapId?: string | null;
  /** Default: the router defaults' (the URL's `?seed=`), else a random seed. */
  readonly seed?: number | null;
}

/** The scenes around a results card: before it shows, and after it's dismissed. */
export interface ResultsScenes {
  readonly before: readonly Scene[];
  readonly after: readonly Scene[];
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
  /**
   * Abandons the running battle (the pause menu's Retry or Quit): the run ends in the save in play
   * as a loss (meta-runtime.md § Run end: on retry or quit too), with no Results. No-op once the
   * map has ended or outside a battle. The caller then goes on (`retry`, `goto`).
   */
  abandon(): void;
  /**
   * Shows `result` as the finished run: a win's before-Results scenes first (A1M5's party), then
   * Results, whose dismissal plays the after-Results scenes (app/runFlow.ts). `flow` replaces the
   * map's own scenes (the test hooks' results fixture). `record: false` (the fixture) writes
   * nothing to the save: the first payday stays unspent and the scenes aren't marked seen.
   */
  presentResults(
    result: RunResult,
    flow?: ResultsScenes,
    opts?: { readonly record?: boolean },
  ): Promise<void>;
  /** Settings → Back: the menu Settings was opened from (the Title when none). */
  closeSettings(): Promise<void>;
}

/** Adds FIRST_PAYDAY_SEEN_ID to the save in play's `story.seen` (once; no save, no-op). */
function markFirstPaydayShown(): void {
  const save = activeSave();
  if (save === null || save.story.seen.includes(FIRST_PAYDAY_SEEN_ID)) return;
  updateActiveSave((s) => ({
    ...s,
    story: { ...s.story, seen: [...s.story.seen, FIRST_PAYDAY_SEEN_ID] },
  }));
}

/** Menus Settings can return to. */
type MenuId = 'title' | 'campaign' | 'base';

/** Creates the router over a booted game (the backdrop scene must be registered). */
export function createRouter(game: Phaser.Game, defaults: BattleRequest = {}): Router {
  let battle: Battle | null = null;
  let ended = false;
  let wavesCleared = 0;
  /** The enemy types that spawned this battle, in order: what the run "met" (D097). */
  let met: string[] = [];
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
    pauseMenu.value = false;
    setAfterResults([]);
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
    met = [];
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
    // Met means spawned (D097): quitting before a wave never spends its NEW badge or codex entry.
    const seen = met;
    bus.on('EnemySpawned', (e) => {
      if (!seen.includes(e.enemy)) seen.push(e.enemy);
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
      // A won map's debrief may land first, on the radio (D098: Bricks's C1 reaction on A1M5).
      const { sim } = next.host;
      const lines = holdLines(
        { mapId: sim.map.id, stats: sim.state.stats, ...debriefStoryOf(activeSave()) },
        outcome,
      );
      pending = {
        outcome,
        timer: setTimeout(
          () => {
            pending = null;
            if (battle === next) void router.endRun(outcome);
          },
          resultsHoldMs(playMapEndLines(lines)),
        ),
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

  /**
   * Ends the battle's run in the save in play (meta-runtime.md § Run end: Pests Processed, medals,
   * rewards) and freezes it where it stands. Once per battle.
   */
  const recordEnd = (
    b: Battle,
    outcome: RunOutcome,
  ): { input: RunEndInput; summary: ReturnType<typeof recordRun> } => {
    clearPending();
    ended = true;
    const { sim } = b.host;
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
      objectives: sim.map.objectives.map((o, i) => ({
        id: o.id,
        name: o.name,
        intel: o.intel,
        status: s.objectives[i] ?? 'open',
      })),
      stats: s.stats,
      met,
    };
    const summary = recordRun(metaRunEndOf(input, outcome));
    // The battle freezes where it ended and stays drawn behind the results.
    setSpeed(0);
    cancel();
    return { input, summary };
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
      const input = recordEnd(battle, outcome);
      // The debrief reads the save as the run left it (its flags, seen list, and profile).
      const result = runResultOf(
        { ...input.input, ...debriefStoryOf(activeSave()) },
        outcome,
        input.summary,
      );
      return router.presentResults(result);
    },
    abandon() {
      if (battle === null || ended || pending !== null) return;
      recordEnd(battle, 'lost');
    },
    presentResults(result, flow, opts = {}) {
      const record = opts.record ?? true;
      runResult.value = result;
      const shown = battle;
      const before = flow?.before ?? flowScenes(result.mapId, result.outcome, 'before');
      const after = flow?.after ?? flowScenes(result.mapId, result.outcome, 'after');
      return new Promise<void>((resolve, reject) => {
        playInOrder(before, () => {
          // A battle stopped meanwhile (a menu took over) has no Results to show.
          if (battle !== shown) {
            resolve();
            return;
          }
          setAfterResults(after, record);
          // The first payday is spent by being shown (D097), never by an abandoned run or the
          // results fixture.
          if (record && result.rewards?.firstPayday === true) markFirstPaydayShown();
          router.goto('results').then(resolve, reject);
        }, record);
      });
    },
  };
  return router;
}
