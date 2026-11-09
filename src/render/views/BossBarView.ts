// The boss bar (art-direction §8, the `boss` tell; design/enemies.md § 6; T312b): while a boss is
// on the map, its name in the 3×5 font (`gold.4`) over a 160×4 bar at the top of the screen,
// between the notices and the wave banner, in `overlay` and fixed to the screen (the camera shake
// doesn't move it). The bar is a 1 px `ink.0` frame round an `ink.2` track; the HP is `gold.3`
// under a lit `gold.4` top row, with a `white.0` chip behind it that drains after each hit, and a
// `white.1` 1 px marker at each phase threshold standing 2 px proud of the bar (Chitterbloom's 60%
// and 25%; the next one is the stop no burst skips). A phase change flashes the whole bar white;
// while the boss is invulnerable after it, the fill shimmers `white.1` ↔ `gold.4` (steady white
// under reduced motion). Once its ending starts (`BossEnded`: driven off), the bar holds a moment
// and steps out. Allocation-free per frame: the Graphics redraws only when what it shows changes.
import type * as Phaser from 'phaser';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { Enemy } from '../../sim/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { VIEW_W } from '../scale.ts';
import {
  barFadeAlpha,
  barFillPx,
  BOSS_BAR_H,
  BOSS_BAR_W,
  BOSS_BAR_Y,
  BOSS_LABEL_Y,
  bossLabel,
  chipPx,
  MARK_OVERHANG_PX,
  PHASE_FLASH_MS,
  phaseMarksPx,
} from '../vfx/bossBar.ts';
import { canDraw } from '../vfx/pixelFont.ts';
import { floatTextTexture } from '../vfx/overlayTextures.ts';
import { SHIMMER_MS } from './EnemyView.ts';
import type { ViewContext } from './ViewContext.ts';

/** The enemy pool as the bar reads it. */
export interface BossPool {
  readonly used: number;
  readonly items: readonly DeepReadonly<Enemy>[];
}

function hex(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}

const C = {
  frame: hex('ink.0'),
  track: hex('ink.2'),
  fill: hex('gold.3'),
  lit: hex('gold.4'),
  chip: hex('white.0'),
  mark: hex('white.1'),
  flash: hex('white.1'),
};

/** The bar's left edge (inside the frame), centered on the 640 px view. */
const BAR_X = Math.round((VIEW_W - BOSS_BAR_W) / 2);

export class BossBarView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #gfx: Phaser.GameObjects.Graphics;
  readonly #label: Phaser.GameObjects.Image;
  /** The boss shown (0: none), its phase marks, and its max HP. */
  #uid = 0;
  #marks: number[] = [];
  #maxHp = 0;
  #fill = -1;
  #chip = 0;
  #flashMs = 0;
  /** ms since its ending began (−1: still fighting). */
  #endedMs = -1;
  /** What the Graphics shows (its values packed in a number), so it redraws only on a change. */
  #key = -1;
  #shimmer = false;
  #alpha = 1;

  constructor(ctx: ViewContext, reducedMotion: () => boolean) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    const { scene, layers } = ctx;
    this.#gfx = scene.make.graphics({}, false).setScrollFactor(0).setVisible(false);
    layers.overlay.add(this.#gfx);
    this.#label = scene.make
      .image({}, false)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setPosition(Math.round(VIEW_W / 2), BOSS_LABEL_Y)
      .setVisible(false);
    layers.overlay.add(this.#label);
  }

  /** Whether the bar shows (the smoke flow's check), and the fill it shows (px). */
  get showing(): boolean {
    return this.#gfx.visible;
  }

  get fillPx(): number {
    return this.#fill;
  }

  /** A boss entered a phase after its first: the bar flashes white. */
  phase(uid: number, phase: number): void {
    if (uid === this.#uid && phase > 1) this.#flashMs = PHASE_FLASH_MS;
  }

  /** A boss's ending began (driven off): the bar holds, then steps out. */
  ended(uid: number): void {
    if (uid === this.#uid && this.#endedMs < 0) this.#endedMs = 0;
  }

  /** One frame: finds the boss on the map, and draws its bar. */
  update(dt: number, enemies: BossPool): void {
    const boss = this.#find(enemies);
    if (boss === null && this.#uid !== 0 && this.#endedMs < 0) this.#endedMs = 0; // gone
    if (boss !== null && boss.uid !== this.#uid) this.#open(boss);
    if (this.#uid === 0) return;
    if (this.#endedMs >= 0) {
      this.#endedMs += dt;
      const a = barFadeAlpha(this.#endedMs);
      if (a <= 0) {
        this.#close();
        return;
      }
      if (a !== this.#alpha) {
        this.#alpha = a;
        this.#gfx.setAlpha(a);
        this.#label.setAlpha(a);
      }
    }
    const max = this.#maxHp;
    const fill = boss === null ? 0 : barFillPx(boss.hp, max);
    if (fill !== this.#fill) this.#fill = fill;
    this.#chip = chipPx(this.#chip, fill, dt);
    if (this.#flashMs > 0) this.#flashMs = Math.max(0, this.#flashMs - dt);
    const invulnerable = boss !== null && boss.invulnerableTicks > 0;
    this.#shimmer =
      invulnerable &&
      (this.#reducedMotion() || Math.floor(performance.now() / SHIMMER_MS) % 2 === 0);
    this.#draw(invulnerable);
  }

  /** Hides the bar (the scene is shutting down). */
  reset(): void {
    this.#close();
  }

  /** The live boss to show: the one shown, else the first on the map. */
  #find(enemies: BossPool): DeepReadonly<Enemy> | null {
    let first: DeepReadonly<Enemy> | null = null;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      if (!e.alive || e.def === null || e.def.boss === null) continue;
      if (e.uid === this.#uid) return e;
      first ??= e;
    }
    return first;
  }

  #open(boss: DeepReadonly<Enemy>): void {
    const def = boss.def!; // #find only returns bosses with a def
    this.#uid = boss.uid;
    this.#maxHp = def.hp;
    this.#marks = phaseMarksPx(def.boss?.phases ?? []);
    this.#fill = barFillPx(boss.hp, def.hp);
    this.#chip = this.#fill;
    this.#flashMs = 0;
    this.#endedMs = boss.leaving ? 0 : -1;
    this.#key = -1;
    this.#alpha = 1;
    this.#gfx.setAlpha(1).setVisible(true);
    const text = bossLabel(def.name);
    if (canDraw(text)) {
      this.#label
        .setTexture(floatTextTexture(this.#ctx.scene, text, 'gold.4'))
        .setAlpha(1)
        .setVisible(true);
    } else {
      this.#label.setVisible(false);
    }
  }

  #close(): void {
    this.#uid = 0;
    this.#endedMs = -1;
    this.#fill = -1;
    this.#key = -1;
    this.#gfx.clear().setVisible(false);
    this.#label.setVisible(false);
  }

  #draw(invulnerable: boolean): void {
    const chip = Math.round(this.#chip);
    const flash = this.#flashMs > 0;
    // A cheap change key: the drawn values (ints and flags), no string building unless it changed.
    const k = this.#fill * 1e6 + chip * 1e3 + (flash ? 4 : 0) + (invulnerable ? 2 : 0) +
      (this.#shimmer ? 1 : 0);
    if (k === this.#key) return;
    this.#key = k;
    const g = this.#gfx;
    g.clear();
    const x = BAR_X;
    const y = BOSS_BAR_Y;
    const w = BOSS_BAR_W;
    const h = BOSS_BAR_H;
    g.fillStyle(flash ? C.flash : C.frame, 1);
    g.fillRect(x - 1, y - 1, w + 2, h + 2);
    g.fillStyle(C.track, 1);
    g.fillRect(x, y, w, h);
    if (chip > this.#fill) {
      g.fillStyle(C.chip, 1);
      g.fillRect(x + this.#fill, y, chip - this.#fill, h);
    }
    if (this.#fill > 0) {
      const body = invulnerable ? (this.#shimmer ? C.flash : C.lit) : flash ? C.flash : C.fill;
      g.fillStyle(body, 1);
      g.fillRect(x, y, this.#fill, h);
      g.fillStyle(invulnerable || flash ? C.flash : C.lit, 1);
      g.fillRect(x, y, this.#fill, 1);
    }
    // Phase markers: a white tick through the bar, standing proud of it, edged in ink.
    for (const m of this.#marks) {
      g.fillStyle(C.frame, 1);
      g.fillRect(x + m - 1, y - MARK_OVERHANG_PX - 1, 3, h + 2 * MARK_OVERHANG_PX + 2);
      g.fillStyle(C.mark, 1);
      g.fillRect(x + m, y - MARK_OVERHANG_PX, 1, h + 2 * MARK_OVERHANG_PX);
    }
  }
}
