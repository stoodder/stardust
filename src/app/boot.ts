// Composition root: creates the Phaser game, mounts the DOM overlay, wires scaling and test hooks.
import * as Phaser from 'phaser';
import { computeScale, cssZoom, VIEW_H, VIEW_W } from '../render/scale.ts';
import { BootScene } from '../render/scenes/BootScene.ts';
import { mountUi } from '../ui/Overlay.tsx';
import { screen, speed } from '../ui/state.ts';
import { createTestHooks, installTestHooks } from './testHooks.ts';
import type { BootParams } from './testHookTypes.ts';

/** Parses boot parameters from a URL query string. */
export function parseBootParams(search: string): BootParams {
  const q = new URLSearchParams(search);
  const seedRaw = q.get('seed');
  const seed = seedRaw !== null && /^\d+$/.test(seedRaw) ? Number(seedRaw) : null;
  return {
    test: q.get('test') === '1',
    seed,
    map: q.get('map'),
    skipIntro: q.get('skipIntro') === '1',
  };
}

const noop = (): void => {};

function requireElement(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (el === null) throw new Error(`boot: missing #${id} in index.html`);
  return el;
}

/** Boots the game. Resolves once the first scene has rendered. */
export async function boot(): Promise<void> {
  const params = parseBootParams(window.location.search);
  const gameRoot = requireElement('game');
  const uiRoot = requireElement('ui');

  let resolveSceneReady: () => void = noop;
  const sceneReady = new Promise<void>((resolve) => {
    resolveSceneReady = resolve;
  });
  const ready = sceneReady.then(() => {
    screen.value = 'title';
  });

  if (params.test) {
    installTestHooks(
      createTestHooks({
        ready,
        setSpeed: (s) => {
          speed.value = s;
        },
        goto: (id) => {
          screen.value = id;
        },
        // Frame-to-frame delta; T112 replaces it with measured CPU time per frame.
        frameMs: () => game.loop.delta,
      }),
    );
  }

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
    scene: [new BootScene(resolveSceneReady)],
  });

  const applyScale = (): void => {
    const dpr = window.devicePixelRatio || 1;
    const zoom = cssZoom(computeScale(window.innerWidth, window.innerHeight, dpr), dpr);
    game.scale.setZoom(zoom);
    uiRoot.style.setProperty('--ui-scale', String(zoom));
  };
  game.events.once(Phaser.Core.Events.READY, applyScale);
  window.addEventListener('resize', applyScale);

  mountUi(uiRoot);
  // `map`, `seed`, and `skipIntro` take effect once BattleScene exists (T112).
  await ready;
}
