// A driven-off unit running on past the map edge (design/enemies.md § 6.1 `driveOff`; T312b). The
// sim lets a leaving unit go the moment it reaches the edge, with no event (enemyAbilities/
// leave.ts), so EnemyView hands its sprite's look here as its view is released: a pooled copy keeps
// playing the same anim (Chitterbloom's `flee`, her brood's scurry) and carries on along its last
// heading for EXIT_TILES over EXIT_MS, stepping down from the leaving 60% to 35% and 15% as it goes,
// then hides. Cosmetic, on real time, allocation-free per frame.
import type * as Phaser from 'phaser';
import { worldDepth } from '../depth.ts';
import { TILE_W, HALF_H } from '../iso.ts';
import type { ViewContext } from './ViewContext.ts';

/** How long, and how far (tiles), a leaver runs on past the edge. */
export const EXIT_MS = 600;
export const EXIT_TILES = 1.25;
const MAX_EXITS = 24;

interface Exit {
  active: boolean;
  ms: number;
  x0: number;
  y0: number;
  /** Screen px per ms. */
  vx: number;
  vy: number;
  readonly sprite: Phaser.GameObjects.Sprite;
}

/** The stepped alpha (art-direction §7) at `t` (0–1) of the run past the edge: 60, 35, 15%. */
export function exitAlpha(t: number): number {
  return t < 1 / 3 ? 0.6 : t < 2 / 3 ? 0.35 : 0.15;
}

export class LeaveFx {
  readonly #ctx: ViewContext;
  readonly #exits: Exit[] = [];
  #next = 0;

  constructor(ctx: ViewContext) {
    this.#ctx = ctx;
    for (let i = 0; i < MAX_EXITS; i++) {
      const sprite = ctx.scene.make.sprite({}, false).setVisible(false);
      this.#exits.push({ active: false, ms: 0, x0: 0, y0: 0, vx: 0, vy: 0, sprite });
    }
  }

  /**
   * Carries `body`'s look (its texture, origin, depth, and anim `key`) on from where it stands,
   * along grid direction (dx, dy). `flying` keeps it in the `air` layer.
   */
  start(
    body: Phaser.GameObjects.Sprite,
    key: string | null,
    flying: boolean,
    dx: number,
    dy: number,
  ): void {
    const e = this.#exits[this.#next]!; // index < MAX_EXITS
    this.#next = (this.#next + 1) % MAX_EXITS;
    const s = e.sprite;
    (flying ? this.#ctx.layers.air : this.#ctx.layers.world).add(s);
    s.stop()
      .setTexture(body.texture.key, body.frame.name)
      .setDisplayOrigin(body.displayOriginX, body.displayOriginY)
      .setPosition(body.x, body.y)
      .setDepth(body.depth)
      .setAlpha(exitAlpha(0))
      .setVisible(true);
    if (key !== null) s.play(key);
    // Grid (dx, dy) on screen: x grows with dx − dy, y with dx + dy (iso.ts).
    const sx = (dx - dy) * (TILE_W / 2);
    const sy = (dx + dy) * HALF_H;
    const len = Math.hypot(sx, sy);
    const tilePx = Math.hypot(TILE_W / 2, HALF_H); // one tile along a grid axis, on screen
    const speed = (EXIT_TILES * tilePx) / EXIT_MS;
    e.vx = len > 1e-9 ? (sx / len) * speed : 0;
    e.vy = len > 1e-9 ? (sy / len) * speed : 0;
    e.x0 = body.x;
    e.y0 = body.y;
    e.ms = 0;
    e.active = true;
  }

  update(dt: number): void {
    for (const e of this.#exits) {
      if (!e.active) continue;
      e.ms += dt;
      if (e.ms >= EXIT_MS) {
        e.active = false;
        e.sprite.stop().setVisible(false);
        continue;
      }
      const x = Math.round(e.x0 + e.vx * e.ms);
      const y = Math.round(e.y0 + e.vy * e.ms);
      e.sprite.setPosition(x, y).setAlpha(exitAlpha(e.ms / EXIT_MS));
      e.sprite.setDepth(worldDepth(y, 'enemy', 0));
    }
  }

  /** How many leavers are still running on (the smoke flow's check). */
  get running(): number {
    let n = 0;
    for (const e of this.#exits) if (e.active) n++;
    return n;
  }

  reset(): void {
    for (const e of this.#exits) {
      e.active = false;
      e.sprite.stop().setVisible(false);
    }
  }
}
