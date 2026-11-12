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
import { campaign, menuNotice, runResult, type RunResult } from '../ui/screens/state.ts';
import { screen } from '../ui/state.ts';
import { startBattle, type Battle } from './battle.ts';
import { battleConfig, DEFAULT_MAP_ID, randomSeed } from './battleSetup.ts';
import {
  attemptKills,
  checkpointPlace,
  resumeOf,
  usableCheckpoint,
  type Resume,
} from './checkpoints.ts';
import { trackCountdown, type CountdownTracker } from './countdown.ts';
import {
  pendingResume,
  pendingRunOf,
  persistsCheckpoints,
  reloadedNotice,
  RESUME_REFUSED,
  withPendingRun,
} from './resume.ts';
import { cancel, setSpeed } from './commands.ts';
import { showNotice } from './hud.ts';
import { logError } from './log.ts';
import type { IdSpace } from '../content/types.ts';
import type { SimConfig } from '../sim/index.ts';
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
  endRunStory,
  holdLines,
  metaRunEndOf,
  offeredMedals,
  runResultOf,
  type RunEndInput,
} from './runResult.ts';
import { flowScenes, playInOrder, setAfterResults } from './runFlow.ts';
import {
  grantBriefingGifts,
  memorialAtEnd,
  revokedAtEnd,
  briefingChangedBattle,
  openCrateAtBriefing,
} from './storyMeta.ts';
import { hud } from '../ui/state.ts';
import { heldRewards } from '../ui/screens/state.ts';
import { withResultsChoice } from './resultsFlow.ts';
import { bearersAtEnd, escortAtEnd } from './resultsStory.ts';
import type { RunOutcome, ScreenId } from './testHookTypes.ts';
import { resetCrate, takenPick } from '../ui/screens/crate.ts'; // T714
import { veteranMedalOffered } from './veteran.ts'; // T860
import { veteranModsOf } from '../meta/veteran.ts'; // T860

/** The campaign screen's notice when a checkpoint retry couldn't replay to its checkpoint. */
export const RETRY_FAILED =
  "That checkpoint couldn't be restored. The shift is safe to play again from wave 1.";

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
   * Results → "Retry from wave N" (core-loop.md § 2.12): resumes the lost run from its latest
   * usable checkpoint (`usableCheckpoint`: taken before the run's final tick), paused in that wave's countdown with the towers, credits, meters, cooldowns, and
   * timers it had then (app/checkpoints.ts). Rejects when the last run has no checkpoint to offer.
   */
  retryFromCheckpoint(): Promise<void>;
  /**
   * Title → "Resume the Long Walk" (D154; app/resume.ts): replays the save in play's pending
   * finale run to its checkpoint, paused there, as the same run. A save that now builds another
   * config drops it and shows the Shift board with RESUME_REFUSED. Rejects without a pending run.
   */
  resumePending(): Promise<void>;
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

/**
 * The notice a checkpoint retry opens with, paused in wave `wave`'s countdown, or at a labelled
 * checkpoint's `place` ("the Halls").
 */
export function resumedNotice(wave: number, place?: string): string {
  // "Before": the wave panel still counts the waves behind it (D134 U3), and the tracker's dimmed
  // medals get their reason.
  const where = place === undefined ? `before wave ${wave}` : `at ${place}`;
  return (
    `Resumed ${where}. Unpause when ready. ` +
    'Perfect Core and the Challenge need a shift from wave 1.'
  );
}

/** A checkpoint's place for the resumed notice: a labelled one's ("the Halls"), else none. */
function labelPlace(c: { readonly label?: string; readonly wave: number }): string | undefined {
  return c.label === undefined ? undefined : checkpointPlace(c);
}

/** How long the resumed notice stays up: long enough to read its two sentences (ms). */
export const RESUMED_NOTICE_MS = 6000;

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
  /** The finale's Phase 2 countdown for the battle (app/countdown.ts), and the lifetime it read. */
  let countdown: CountdownTracker | null = null;
  let lifetimeAtStart = 0;

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
    countdown?.off();
    countdown = null;
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
    // A fresh start with no loadout screen before it: the map's briefing gifts arrive now (D141).
    if (briefing) grantBriefingGifts(mapId);
    let cfg: ReturnType<typeof battleConfig>;
    try {
      cfg = battleConfig(mapId, seed, activeSave());
    } catch (err) {
      menuNotice.value = BATTLE_FAILED;
      const shown = screen.value === 'campaign' || screen.value === 'loadout';
      const back = shown ? Promise.resolve() : showFailed();
      return back.then(() => Promise.reject(err instanceof Error ? err : new Error(String(err))));
    }
    return launch(request, cfg, briefing, null);
  };

  /**
   * Starts a battle on `cfg` (built by openBattle, or a lost run's own for a checkpoint retry,
   * `resume`). The router's listeners subscribe before a resumed run's replay, so its waves,
   * met enemies, and first leak count as they did in the attempt that reached the checkpoint.
   */
  const launch = (
    request: BattleRequest,
    cfg: SimConfig<IdSpace>,
    briefing: boolean,
    resume: Resume<IdSpace> | null,
  ): Promise<void> => {
    const mapId = cfg.mapId;
    stopBattle();
    lifetimeAtStart = activeSave()?.stats.pestsProcessed ?? 0;
    // A fresh start of the finale drops a run left pending (D154): this one is the walk now.
    const finale = persistsCheckpoints(cfg.content.maps[mapId] ?? { id: mapId, act: null });
    if (finale && resume === null && activeSave()?.pendingRun !== undefined) {
      updateActiveSave((s) => withPendingRun(s, null));
    }
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
    let next: Battle | null = null;
    const listen = (host: Battle['host']): void => {
      const { bus } = host;
      // The finale's countdown (bound before a resume's replay, so its N comes back the same).
      countdown = trackCountdown(host);
      // The finale persists its latest checkpoint to the save (D154; app/resume.ts). A replay
      // re-reaches the ones already persisted, so only fresh ones write.
      if (finale && activeSave() !== null) {
        bus.on('CheckpointReached', () => {
          const latest = host.checkpoints[host.checkpoints.length - 1];
          if (host.replaying || latest === undefined || next !== battle || ended) return;
          const run = pendingRunOf(
            host.sim.config,
            latest,
            host.sim.state.commandLog,
            host.killsBefore,
            host.resumedFrom,
          );
          if (run === null) return;
          const w = updateActiveSave((s) => withPendingRun(s, run));
          if (!w.ok) logError(`resume: ${w.message}`);
        });
      }
      bus.on('WaveCleared', () => {
        wavesCleared++;
      });
      // Met means spawned (D097): quitting before a wave never spends its NEW badge or codex entry.
      const seen = met;
      bus.on('EnemySpawned', (e) => {
        if (!seen.includes(e.enemy)) seen.push(e.enemy);
      });
      // The first leak, for the results card's first-leak line (app/runResult.ts; D028). A
      // replayed one is long ago in sim ticks, so it never reads as fresh.
      bus.on('EnemyLeaked', () => {
        firstLeakAt ??= { ms: performance.now(), tick: host.sim.state.tick };
      });
      // The map ended: freeze the battle now, show Results after the delay.
      const onEnd = (outcome: RunOutcome) => () => {
        if (next === null || battle !== next || ended || pending !== null) return;
        const b = next;
        endedAt = { ms: performance.now(), tick: host.sim.state.tick };
        setSpeed(0);
        cancel();
        // A won map's debrief may land first, on the radio (D098: Bricks's C1 reaction on A1M5);
        // else a win lets the lines cued before it finish (T413: A2M2's retreat line).
        const { sim } = host;
        const lines = holdLines(
          { mapId: sim.map.id, stats: sim.state.stats, ...debriefStoryOf(activeSave()) },
          outcome,
        );
        pending = {
          outcome,
          timer: setTimeout(
            () => {
              pending = null;
              if (battle === b) void router.endRun(outcome);
            },
            resultsHoldMs(playMapEndLines(lines, outcome)),
          ),
        };
      };
      bus.on('MapWon', onEnd('won'));
      bus.on('MapLost', onEnd('lost'));
    };
    try {
      next = startBattle(
        game,
        cfg,
        { briefing },
        resume === null ? { listen } : { listen, resume },
      );
    } catch (err) {
      // A checkpoint whose replay ends the run or diverges never strands the player (D134).
      menuNotice.value = resume === null ? BATTLE_FAILED : RETRY_FAILED;
      return showFailed().then(() =>
        Promise.reject(err instanceof Error ? err : new Error(String(err))),
      );
    }
    menuNotice.value = null;
    battle = next;
    // The briefing's Change loadout: only where the loadout screen came before it.
    loadoutChangeable.value = briefing && loadoutOffered(mapId);
    if (briefing) {
      resetCrate(); // T714: a fresh briefing asks about the crate afresh.
      restartOnBriefingFlags(request, cfg, next);
    }
    screen.value = 'battle';
    if (resume !== null) {
      // A checkpoint retry waits, paused, in the wave's countdown: the player looks, rebuilds,
      // and unpauses when ready (core-loop.md § 2.12). A reload of the finale's pending run says
      // where the walk picks up (and, if it was a retry, why the medals stay dim).
      setSpeed(0);
      const c = resume.checkpoint;
      const retried = next.host.resumedFrom;
      showNotice(
        resume.retriedFrom === undefined
          ? resumedNotice(c.wave, labelPlace(c))
          : reloadedNotice(checkpointPlace(c), retried !== null),
        RESUMED_NOTICE_MS,
        true,
      );
    }
    return next.firstFrame;
  };

  /**
   * As `b`'s briefing closes: Zibzab's crate opens on A3M6 (`openCrateAtBriefing`); then, when the
   * briefing committed a story flag the sim reads (C3's `door_choice` in A3M3's briefing) or the
   * crate changed the modifiers (app/storyMeta.ts `briefingChangedBattle`), the battle, built
   * before, restarts on the same seed with no briefing. It is still on its first tick (the
   * briefing holds it), so nothing is lost.
   */
  const restartOnBriefingFlags = (
    request: BattleRequest,
    cfg: SimConfig<IdSpace>,
    b: Battle,
  ): void => {
    let off: (() => void) | null = null;
    const closed = (): void => {
      off?.();
      // After the dialogue's own close (which commits the briefing's effects to the save).
      queueMicrotask(() => {
        if (battle !== b || ended) return;
        // T714: with the protocol picked on the crate's card, when it asked for one.
        openCrateAtBriefing(cfg.mapId, takenPick());
        resetCrate();
        if (!briefingChangedBattle(cfg, activeSave())) return;
        // A config the sim refuses after the crate wrote its tune-ups is a failed launch, never
        // a battle left running on the stale config (D150): the notice, the Shift board, the log.
        let next: SimConfig<IdSpace>;
        try {
          next = battleConfig(cfg.mapId, cfg.seed, activeSave());
        } catch (err) {
          menuNotice.value = BATTLE_FAILED;
          logError('briefing: restart failed', err);
          void showFailed();
          return;
        }
        launch(request, next, false, null).catch((err: unknown) => {
          logError('briefing: restart failed', err);
        });
      });
    };
    off = hud.briefing.subscribe((v) => {
      if (v === null && off !== null) closed();
    });
    if (hud.briefing.value === null) closed();
  };

  /** After a battle failed to start: the Shift board, where the notice shows (the Title without a save). */
  const showFailed = (): Promise<void> =>
    activeSave() === null ? showMenu('title') : showMenu('campaign');

  /**
   * Shows a menu over the backdrop, ending any battle. The star map's chart covers the backdrop,
   * so the backdrop stops while it shows (T301b) and starts again on leaving.
   */
  const showMenu = (id: MenuId | 'settings' | 'loadout' | 'intake'): Promise<void> => {
    stopBattle();
    if (id !== 'loadout') closeLoadout();
    showBackdrop(!(id === 'campaign' && campaign.value?.mode === 'starMap'));
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
    const resumed = b.host.resumedFrom;
    const usable = usableCheckpoint(b.host.checkpoints, s.tick);
    const remembered = countdown?.start(lifetimeAtStart);
    const input: RunEndInput = {
      mapId: sim.map.id,
      act: sim.map.act,
      waveCount: sim.map.waves.length,
      maxIntegrity: s.maxIntegrity,
      integrity: s.integrity,
      ...(sim.map.asset === null
        ? {}
        : { asset: { name: sim.map.asset.name, value: s.asset, max: s.maxAsset } }),
      ...escortAtEnd(sim),
      // A choir map's Voices (the finale; T804's choir): Results lists them, not the core.
      ...(s.choir.singers > 0 ? { voices: { n: s.choir.voices, total: s.choir.singers } } : {}),
      ...bearersAtEnd(sim),
      // This attempt's kills: a checkpoint retry's replayed ones were filed by the attempt before.
      skitterkinKilled: attemptKills(b.host),
      wavesCleared,
      firstLeakAgo:
        firstLeakAt === null
          ? null
          : { ms: end.ms - firstLeakAt.ms, ticks: end.tick - firstLeakAt.tick },
      stardust: sim.map.stardust,
      // The Veteran medal joins the row when the run's modifiers reach +100% (T860).
      medals: [...offeredMedals(sim.map), ...veteranMedalOffered(sim.config)],
      earnedMedals: earnedMedalIds(s, sim.map),
      objectives: sim.map.objectives.map((o, i) => ({
        id: o.id,
        name: o.name,
        intel: o.intel,
        status: s.objectives[i] ?? 'open',
      })),
      stats: s.stats,
      met,
      resumedFromWave: resumed?.wave ?? null,
      resumedFromLabel: resumed?.label ?? null,
      checkpointWave: usable?.wave ?? null,
      checkpointLabel: usable?.label ?? null,
      // The story's script state as the run ended (T809: the finale's speakers through C5).
      script: { phase: s.phase, resolved: [...s.forcedResolved] },
      // The finale's REMEMBERED: {n}, the count its countdown started from (app/countdown.ts).
      ...(remembered === null || remembered === undefined ? {} : { remembered }),
      // Act III part one (T610): what the script revoked, and the turret under the {name} plate.
      revoked: revokedAtEnd(s.revoked, sim.map.events, s.scriptFired),
      memorialTower: memorialAtEnd(sim, hud.nameTag.value),
      veteran: veteranModsOf(sim.config), // T860: the replay's veteran modifiers
    };
    const summary = recordRun(metaRunEndOf(input, outcome));
    // The finale's run ended (won, lost, or abandoned): nothing is pending any more (D154).
    if (persistsCheckpoints(sim.map) && activeSave()?.pendingRun !== undefined) {
      updateActiveSave((save) => withPendingRun(save, null));
    }
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
            return Promise.reject(new Error('router: the campaign screen needs a loaded save'));
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
          // The map's briefing gifts arrive as its loadout first opens (D141: A3M1's Scuttle Den).
          grantBriefingGifts(mapOf(request));
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
      // Gifts first: a gift can be the fifth tower that makes the loadout screen a choice.
      grantBriefingGifts(mapOf(request));
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
    retryFromCheckpoint() {
      const b = battle;
      const checkpoint =
        b === null ? null : usableCheckpoint(b.host.checkpoints, b.host.sim.state.tick);
      if (b === null || checkpoint === null || !ended) {
        return Promise.reject(new Error('router: the last run has no checkpoint to retry from'));
      }
      // The lost run's own config (same seed, loadout, and modifiers), so the replay reproduces it.
      const { sim } = b.host;
      return launch(lastRequest, sim.config, false, resumeOf(sim.state.commandLog, checkpoint));
    },
    resumePending() {
      const save = activeSave();
      const waiting = save === null ? null : pendingResume(save);
      if (save === null || waiting === null) {
        return Promise.reject(new Error('router: no pending run to resume'));
      }
      if (waiting === 'changed') {
        // The save builds another run now: drop it, and say so on the Shift board.
        updateActiveSave((s) => withPendingRun(s, null));
        return showMenu('campaign').then(() => {
          menuNotice.value = RESUME_REFUSED;
        });
      }
      const { cfg, resume } = waiting;
      return launch({ mapId: cfg.mapId, seed: cfg.seed }, cfg, false, resume);
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
      // The debrief reads the save as the run left it (its flags, seen list, and profile), and
      // offers its story choice (C2) before its own effects are applied (app/resultsFlow.ts).
      const story = { ...input.input, ...debriefStoryOf(activeSave()) };
      const result = withResultsChoice(
        runResultOf(story, outcome, input.summary),
        story,
        outcome,
        activeSave(),
      );
      // Then a won debrief's effects reach the save (A2M2's Thorn), and the scenes around Results
      // read this run (T413).
      endRunStory(input.input, outcome);
      // A card that holds its rewards back (A3M3) leaves them for the base to show.
      heldRewards.value =
        result.heldRewards && result.rewards !== null
          ? { mapId: result.mapId, rewards: result.rewards }
          : null;
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
        playInOrder(
          before,
          () => {
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
          },
          record,
        );
      });
    },
  };
  return router;
}
