// T101 placeholder: proves the Phaser pipeline renders (the title label is DOM, in ui/). T104 adds sprite baking, T112 the battle.
import * as Phaser from 'phaser';
import { VIEW_H, VIEW_W } from '../scale.ts';

const TILE_W = 32;
const TILE_H = 16;
const GRID = 6;
const TILE_FILL = 0x16303a;
const TILE_EDGE = 0x2fd6c4;

/** First scene: draws a small iso grid and calls `onReady` once the first frame is on screen. */
export class BootScene extends Phaser.Scene {
  readonly #onReady: () => void;

  constructor(onReady: () => void) {
    super('Boot');
    this.#onReady = onReady;
  }

  create(): void {
    const g = this.add.graphics();
    const originX = VIEW_W / 2;
    const originY = VIEW_H / 2 - (GRID * TILE_H) / 2;
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        const cx = originX + (x - y) * (TILE_W / 2);
        const cy = originY + (x + y) * (TILE_H / 2);
        const points = [
          new Phaser.Math.Vector2(cx, cy),
          new Phaser.Math.Vector2(cx + TILE_W / 2, cy + TILE_H / 2),
          new Phaser.Math.Vector2(cx, cy + TILE_H),
          new Phaser.Math.Vector2(cx - TILE_W / 2, cy + TILE_H / 2),
        ];
        g.fillStyle(TILE_FILL, 1);
        g.fillPoints(points, true);
        g.lineStyle(1, TILE_EDGE, 0.6);
        g.strokePoints(points, true);
      }
    }

    this.game.events.once(Phaser.Core.Events.POST_RENDER, () => {
      this.#onReady();
    });
  }
}
