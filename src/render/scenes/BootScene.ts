// T101 placeholder scene, now drawn with baked sprites (T104). BattleScene (T112) replaces it.
import * as Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../scale.ts';
import { CodeSpriteSource, SPRITE_SOURCE_KEY } from '../sprites/CodeSpriteSource.ts';

const TILE_W = 32;
const TILE_H = 16;
const GRID = 6;

/** First scene: bakes sprites, draws a small iso grid, and calls `onReady` after the first frame. */
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

    const originX = VIEW_W / 2;
    const originY = VIEW_H / 2 - (GRID * TILE_H) / 2;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const sx = originX + (x - y) * (TILE_W / 2);
        const sy = originY + (x + y) * (TILE_H / 2);
        const isPad = (x + y) % 4 === 1 && x % 2 === 0;
        const f = isPad
          ? sprites.frame('tile.pad', 'v0')
          : sprites.frame('tile.grass', `v${(x * 7 + y * 3) % 3}`);
        this.add.image(sx, sy, f.texture, f.frame).setDisplayOrigin(TILE_W / 2, 0);
      }
    }

    this.game.events.once(Phaser.Core.Events.POST_RENDER, () => {
      this.#onReady();
    });
  }
}
