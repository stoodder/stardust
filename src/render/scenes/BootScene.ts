// First scene: bakes every sprite (T104) and registers the source for later scenes. The router
// (app/router.ts) then shows the title or starts a BattleScene.
import * as Phaser from 'phaser';
import { CodeSpriteSource, SPRITE_SOURCE_KEY } from '../sprites/CodeSpriteSource.ts';

/** Bakes sprites, then calls `onReady` after the first rendered frame. */
export class BootScene extends Phaser.Scene {
  readonly #onReady: () => void;

  constructor(onReady: () => void) {
    super('Boot');
    this.#onReady = onReady;
  }

  create(): void {
    const sprites = new CodeSpriteSource();
    sprites.register(this);
    this.registry.set(SPRITE_SOURCE_KEY, sprites);
    this.game.events.once(Phaser.Core.Events.POST_RENDER, () => {
      this.#onReady();
    });
  }
}
