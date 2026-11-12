// The battle's renderer (render/scenes/BattleScene.ts and every view it draws: about a third of
// the game's own code) is a lazy chunk (architecture.md § 5, *Bundle*; T802): the Title, the
// menus, and the star map never need it. app/contentGate.ts loads it before a battle starts, and
// boot preloads it in idle time; startBattle (app/battle.ts) takes it from here.
import type * as BattleSceneModule from '../render/scenes/BattleScene.ts';

type Renderer = typeof BattleSceneModule;

let renderer: Renderer | null = null;
let pending: Promise<void> | null = null;

/** Whether the battle renderer has loaded. */
export function battleRendererLoaded(): boolean {
  return renderer !== null;
}

/** Loads the battle renderer's chunk, once (a failed fetch may be retried by the next call). */
export function loadBattleRenderer(): Promise<void> {
  if (renderer !== null) return Promise.resolve();
  pending ??= import('../render/scenes/BattleScene.ts').then(
    (m) => {
      renderer = m;
    },
    (err: unknown) => {
      pending = null;
      throw err;
    },
  );
  return pending;
}

/** The loaded battle renderer. Throws before `loadBattleRenderer` has resolved. */
export function battleRenderer(): Renderer {
  if (renderer === null)
    throw new Error('battle: the renderer has not loaded (loadBattleRenderer)');
  return renderer;
}
