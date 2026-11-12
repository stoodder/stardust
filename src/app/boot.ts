// Composition root: creates the Phaser game, mounts the DOM overlay, and wires scaling, routing,
// the keyboard, and the test hooks.
import * as Phaser from 'phaser';
import { computeScale, cssZoom, VIEW_H, VIEW_W } from '../render/scale.ts';
import { BackdropScene } from '../render/scenes/BackdropScene.ts';
import { BootScene } from '../render/scenes/BootScene.ts';
import { mountUi } from '../ui/Overlay.tsx';
import { dialogue as dialogueView, sceneBlocks } from '../ui/dialogue/state.ts';
import { DEV_BARKS, DEV_SCENES } from '../ui/dialogue/dev.ts';
import { setFastText } from '../ui/dialogue/text.ts';
import { hud, screen } from '../ui/state.ts';
import { startAutoplay } from './autoplay.ts';
import { dismissBriefing, issue, setSpeed } from './commands.ts';
import { installKeys } from './keys.ts';
import { fixtureResult, fixtureScenes } from './resultsFixture.ts';
import { logError } from './log.ts';
import { setNavigator } from './navigation.ts';
import { meterFrames } from './perf.ts';
import { createRouter, type Router } from './router.ts';
import { setIntakeEnabled } from './profile.ts';
import { dialogueTestHooks, setDevDialogue, setDialogueEnabled, skipScene } from './dialogue.ts';
import { audioTestHooks, installAudio, playJingle } from './audio.ts';
import { setJinglePlayer } from './runFlow.ts';
import { activeSave, browserKeyValueStore, initSaves, loadDevSave } from './save.ts';
import { hasBattleMap } from './battleSetup.ts';
import { loadDevFixtures } from './devRegistry.ts';
import { ensureAllActs } from './actContent.ts';
import { loadFinaleScreens } from './finaleScreens.ts';
import { gateRouter } from './contentGate.ts';
import { loadBattleRenderer } from './battleRenderer.ts';
import { initSettings } from './settings.ts';
import { createTestHooks, installTestHooks } from './testHooks.ts';
import type { BootParams } from './testHookTypes.ts';

/** Parses boot parameters from a URL query string. */
export function parseBootParams(search: string): BootParams {
  const q = new URLSearchParams(search);
  const seedRaw = q.get('seed');
  const seed = seedRaw !== null && /^\d+$/.test(seedRaw) ? Number(seedRaw) : null;
  const test = q.get('test') === '1';
  return {
    test,
    // `&radio=1` is the M2 name for `&dialogue=1`.
    dialogue: !test || q.get('dialogue') === '1' || q.get('radio') === '1',
    audio: !test || q.get('audio') === '1',
    seed,
    map: q.get('map'),
    skipIntro: q.get('skipIntro') === '1',
    intake: !test || q.get('intake') === '1',
    fastText: test && q.get('fasttext') === '1',
    // Dev saves load only under ?test=1 (D031): a player URL can't open gated systems.
    save: test ? q.get('save') : null,
  };
}

const noop = (): void => {};

function requireElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (el === null) throw new Error(`boot: missing #${id} in index.html`);
  return el;
}

/**
 * Boots the game. Resolves once the first screen has rendered: the title; with `?map=<id>` or
 * `?skipIntro=1`, the battle's first frame; with `?test=1&save=<id>`, that dev save's Shift board.
 */
export async function boot(): Promise<void> {
  const params = parseBootParams(window.location.search);
  setDialogueEnabled(params.dialogue);
  setFastText(params.fastText);
  setIntakeEnabled(params.intake);
  initSettings();
  installAudio(params.audio);
  setJinglePlayer(playJingle);
  initSaves(browserKeyValueStore());
  // The story's later acts are lazy chunks (app/actContent.ts; T802), each loaded before a screen
  // that needs it (the router's gate, app/contentGate.ts). A dev server validates all the content
  // (it needs every act), and a test boot holds them all up front, since its hooks reach any of it
  // (an audio render, a results fixture, a scene by id); `&lazy=1` loads as a player's game does.
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- undefined outside Vite
  const devServer = import.meta.env === undefined || import.meta.env.DEV;
  const lazy = new URLSearchParams(window.location.search).get('lazy') === '1';
  // A test boot also loads the battle renderer up front, so no idle fetch is left in flight when a
  // flow navigates away (a failed request fails a smoke flow).
  const upFront = devServer || (params.test && !lazy);
  // The dev fixtures (the dev battles and saves) stay out of the initial JS: a dev URL (`?test=1`,
  // or `?map=` naming no live map) loads their chunk first (devRegistry.ts; D150).
  const devFixtures = params.test || (params.map !== null && !hasBattleMap(params.map));
  // The three chunks load side by side.
  await Promise.all([
    upFront ? ensureAllActs() : null,
    upFront ? loadBattleRenderer() : null,
    upFront ? loadFinaleScreens() : null, // T810
    devFixtures ? loadDevFixtures() : null,
  ]);
  const devSave = params.save !== null && loadDevSave(params.save);
  if (params.save !== null && !devSave) logError(`boot: unknown dev save '${params.save}'`);
  const gameRoot = requireElement('game');
  const uiRoot = requireElement('ui');

  let resolveSceneReady: () => void = noop;
  const sceneReady = new Promise<void>((resolve) => {
    resolveSceneReady = resolve;
  });

  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: gameRoot,
    width: VIEW_W,
    height: VIEW_H,
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    backgroundColor: '#05030a',
    scale: { mode: Phaser.Scale.NONE },
    banner: false,
    // Only the first scene starts on its own; the router starts the backdrop and battles.
    scene: [new BootScene(resolveSceneReady), new BackdropScene()],
  });
  const frames = meterFrames(game);
  const defaults = { mapId: params.map, seed: params.seed };
  const router: Router = gateRouter(createRouter(game, defaults), defaults);
  setNavigator(router);
  const startInBattle = params.map !== null || params.skipIntro;
  // A dev save (`?test=1&save=<id>`) opens on its Shift board.
  const first = startInBattle ? 'battle' : devSave ? 'campaign' : 'title';
  const ready = sceneReady.then(() => router.goto(first));

  if (params.test) {
    setDevDialogue(DEV_SCENES, DEV_BARKS);
    installTestHooks(
      createTestHooks({
        ready,
        battle: () => router.battle,
        issue,
        autoplay: (build) => {
          const b = router.battle;
          if (b === null) throw new Error('__sd.autoplay: no battle is running');
          dismissBriefing(true);
          startAutoplay(b.host, build);
        },
        setSpeed,
        goto: async (id) => {
          await sceneReady;
          await router.goto(id);
        },
        flushResults: () => void router.flushResults(),
        frameMs: () => frames.frameMs(),
        canvas: () => game.canvas,
        viewWidth: VIEW_W,
        audio: audioTestHooks(),
        dialogue: dialogueTestHooks(),
        save: () => {
          const save = activeSave();
          return save === null ? null : structuredClone(save);
        },
        results: async (fixture) => {
          await sceneReady;
          if (router.battle !== null) throw new Error('__sd.results: not during a battle');
          const result = fixtureResult(fixture, activeSave());
          // A made-up run: Results shows it, and nothing reaches the save (C-L2).
          await router.presentResults(result, fixtureScenes(fixture), { record: false });
        },
      }),
    );
  }

  const applyScale = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const zoom = cssZoom(computeScale(window.innerWidth, window.innerHeight, dpr), dpr);
    game.scale.setZoom(zoom);
    uiRoot.style.setProperty('--ui-scale', String(zoom));
  };
  game.events.once(Phaser.Core.Events.READY, applyScale);
  window.addEventListener('resize', applyScale);
  installKeys({
    // The Title and Results screens, the briefing, and a scene holding input turn game hotkeys
    // off. So does the end of the map, while the frozen battle waits for Results (D028).
    isActive: () =>
      screen.value === 'battle' &&
      hud.briefing.value === null &&
      !sceneBlocks.value &&
      hud.outcome.value === 'playing',
    // A scene holding input (app/dialogue.ts) is the one modal over a live battle.
    isModalOpen: () => dialogueView.scene.value !== null,
    // Blocking modals take Esc wherever the focus is: a scene skips to its next choice or its
    // end, and the briefing clocks in.
    dismissModal: () => {
      if (skipScene()) return true;
      if (screen.value !== 'battle' || hud.briefing.value === null) return false;
      dismissBriefing();
      return true;
    },
  });

  mountUi(uiRoot);
  await ready;
}
