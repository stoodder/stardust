// Composition root: creates the Phaser game, mounts the DOM overlay, and wires scaling, routing,
// the keyboard, and the test hooks.
import * as Phaser from 'phaser';
import { computeScale, cssZoom, VIEW_H, VIEW_W } from '../render/scale.ts';
import { BackdropScene } from '../render/scenes/BackdropScene.ts';
import { BootScene } from '../render/scenes/BootScene.ts';
import { mountUi } from '../ui/Overlay.tsx';
import { hud, screen } from '../ui/state.ts';
import { startAutoplay } from './autoplay.ts';
import { dismissBriefing, issue, setSpeed } from './commands.ts';
import { installKeys } from './keys.ts';
import { logError } from './log.ts';
import { setNavigator } from './navigation.ts';
import { meterFrames } from './perf.ts';
import { createRouter, type Router } from './router.ts';
import { setRadioEnabled } from './radio.ts';
import { audioTestHooks, installAudio } from './audio.ts';
import { activeSave, browserKeyValueStore, initSaves, loadDevSave } from './save.ts';
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
    radio: !test || q.get('radio') === '1',
    audio: !test || q.get('audio') === '1',
    seed,
    map: q.get('map'),
    skipIntro: q.get('skipIntro') === '1',
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
  setRadioEnabled(params.radio);
  initSettings();
  installAudio(params.audio);
  initSaves(browserKeyValueStore());
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
  const router: Router = createRouter(game, { mapId: params.map, seed: params.seed });
  setNavigator(router);
  const startInBattle = params.map !== null || params.skipIntro;
  // A dev save (`?test=1&save=<id>`) opens on its Shift board.
  const first = startInBattle ? 'battle' : devSave ? 'campaign' : 'title';
  const ready = sceneReady.then(() => router.goto(first));

  if (params.test) {
    installTestHooks(
      createTestHooks({
        ready,
        battle: () => router.battle,
        issue,
        autoplay: (build) => {
          const b = router.battle;
          if (b === null) throw new Error('__sd.autoplay: no battle is running');
          dismissBriefing();
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
        save: () => {
          const save = activeSave();
          return save === null ? null : structuredClone(save);
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
    // The Title and Results screens and the briefing turn game hotkeys off.
    // So does the end of the map, while the frozen battle waits for Results (D028).
    isActive: () =>
      screen.value === 'battle' && hud.briefing.value === null && hud.outcome.value === 'playing',
    // No modals over a live battle until dialogue and settings exist.
    isModalOpen: () => false,
    // The briefing is a blocking modal: Esc closes it wherever the focus is.
    dismissModal: () => {
      if (screen.value !== 'battle' || hud.briefing.value === null) return false;
      dismissBriefing();
      return true;
    },
  });

  mountUi(uiRoot);
  await ready;
}
