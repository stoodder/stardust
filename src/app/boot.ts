// Composition root: creates the Phaser game, mounts the DOM overlay, and wires scaling, routing,
// the keyboard, and the test hooks.
import * as Phaser from 'phaser';
import { computeScale, cssZoom, VIEW_H, VIEW_W } from '../render/scale.ts';
import { BootScene } from '../render/scenes/BootScene.ts';
import { mountUi } from '../ui/Overlay.tsx';
import { screen } from '../ui/state.ts';
import { issue, setSpeed } from './commands.ts';
import { installKeys } from './keys.ts';
import { meterFrames } from './perf.ts';
import { createRouter, type Router } from './router.ts';
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

/**
 * Boots the game. Resolves once the first screen has rendered: the title, or with `?map=<id>` or
 * `?skipIntro=1`, the battle's first frame.
 */
export async function boot(): Promise<void> {
  const params = parseBootParams(window.location.search);
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
    scene: [new BootScene(resolveSceneReady)],
  });
  const frames = meterFrames(game);
  const router: Router = createRouter(game, { mapId: params.map, seed: params.seed });
  const startInBattle = params.map !== null || params.skipIntro;
  const ready = sceneReady.then(() => router.goto(startInBattle ? 'battle' : 'title'));

  if (params.test) {
    installTestHooks(
      createTestHooks({
        ready,
        battle: () => router.battle,
        issue,
        setSpeed,
        goto: async (id) => {
          await sceneReady;
          await router.goto(id);
        },
        frameMs: () => frames.frameMs(),
        canvas: () => game.canvas,
        viewWidth: VIEW_W,
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
    isActive: () => screen.value === 'battle',
    // No modals until the HUD and menus exist (T106, T115).
    isModalOpen: () => false,
  });

  mountUi(uiRoot);
  await ready;
}
