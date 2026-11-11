// A blocker's view (design/maps.md § 5.4: Bricks at the Gap; T605, minimal: T630a polishes it). For
// each live blocker ally (`Ally.blockCapacity` > 0): a small health bar over his head in `overlay`
// (a 1 px `ink.0` frame round an `ink.2` track, the health in `green.3`, `gold.3` at or below half,
// `red.3` at or below a quarter), easing towards `Ally.health` over BAR_EASE_MS (the sim already
// eases him along the timeline; this smooths what a frame shows, and reduced motion snaps it), and
// a short `white.1` bracket under each unit he holds (`Enemy.blockerUid`), so the hold reads. His
// health never moves with what he holds (D141), and the bar has no number on it.
// Allocation-free per frame: one Graphics, redrawn each frame while something shows.
import type * as Phaser from 'phaser';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { Ally, Enemy } from '../../sim/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import type { ViewContext } from './ViewContext.ts';

/** The pools as the view reads them. */
export interface BlockerPools {
  readonly allies: { readonly used: number; readonly items: readonly DeepReadonly<Ally>[] };
  readonly enemies: { readonly used: number; readonly items: readonly DeepReadonly<Enemy>[] };
}

/** The bar's size and lift over his ground point, in game px. */
export const BAR_W = 16;
export const BAR_H = 2;
const BAR_LIFT = 34;
/** How long the shown health takes to catch up with the sim's (ms). */
export const BAR_EASE_MS = 600;

/** The bar's fill colour at `health` (a fraction of full). */
export function blockerBarColor(health: number): 'green.3' | 'gold.3' | 'red.3' {
  if (health <= 0.25) return 'red.3';
  if (health <= 0.5) return 'gold.3';
  return 'green.3';
}

/** `shown` eased towards `target` over `dtMs` (BAR_EASE_MS to close the whole gap; snaps if `snap`). */
export function easeBar(shown: number, target: number, dtMs: number, snap: boolean): number {
  if (snap || Number.isNaN(shown)) return target;
  const step = dtMs / BAR_EASE_MS;
  const gap = target - shown;
  return Math.abs(gap) <= step ? target : shown + Math.sign(gap) * step;
}

const pos: Vec2 = { x: 0, y: 0 };

/** A master colour as a Phaser fill number. */
function hex(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}
const C = {
  frame: hex('ink.0'),
  track: hex('ink.2'),
  held: hex('white.1'),
  'green.3': hex('green.3'),
  'gold.3': hex('gold.3'),
  'red.3': hex('red.3'),
} as const;

export class BlockerView {
  readonly #ctx: ViewContext;
  readonly #g: Phaser.GameObjects.Graphics;
  readonly #reducedMotion: () => boolean;
  #shownHealth = Number.NaN;
  #uid = 0;
  /** Bars drawn this frame (the smoke flow's check). */
  shown = 0;
  /** Units drawn as held this frame. */
  holding = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean = () => false) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    this.#g = ctx.scene.make.graphics({}, false);
    ctx.layers.overlay.add(this.#g);
  }

  /** The health the bar shows now (NaN before a blocker shows). */
  get health(): number {
    return this.#shownHealth;
  }

  reset(): void {
    this.#shownHealth = Number.NaN;
    this.#uid = 0;
    this.shown = 0;
    this.holding = 0;
    this.#g.clear();
  }

  update(dtMs: number, pools: BlockerPools): void {
    const g = this.#g;
    g.clear();
    this.shown = 0;
    this.holding = 0;
    const allies = pools.allies;
    for (let i = 0; i < allies.used; i++) {
      const a = allies.items[i]!; // i < used ≤ items.length
      if (!a.alive || a.blockCapacity <= 0) continue;
      if (a.uid !== this.#uid) {
        this.#uid = a.uid;
        this.#shownHealth = Number.NaN;
      }
      this.#shownHealth = easeBar(this.#shownHealth, a.health, dtMs, this.#reducedMotion());
      this.#bar(a.x, a.y, this.#shownHealth);
      this.shown++;
      this.#held(a.uid, pools.enemies);
      break; // one blocker a map (Bricks)
    }
  }

  #bar(x: number, y: number, health: number): void {
    const g = this.#g;
    gridToScreen(x, y, this.#ctx.origin, pos);
    const left = Math.round(pos.x - BAR_W / 2);
    const top = Math.round(pos.y - BAR_LIFT);
    g.fillStyle(C.frame, 1);
    g.fillRect(left - 1, top - 1, BAR_W + 2, BAR_H + 2);
    g.fillStyle(C.track, 1);
    g.fillRect(left, top, BAR_W, BAR_H);
    const fill = Math.max(1, Math.round(BAR_W * health));
    g.fillStyle(C[blockerBarColor(health)], 1);
    g.fillRect(left, top, fill, BAR_H);
  }

  #held(uid: number, enemies: BlockerPools['enemies']): void {
    const g = this.#g;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      if (!e.alive || e.blockerUid !== uid) continue;
      gridToScreen(e.x, e.y, this.#ctx.origin, pos);
      g.fillStyle(C.held, 1);
      const x = Math.round(pos.x);
      const y = Math.round(pos.y) + 2;
      g.fillRect(x - 4, y, 3, 1);
      g.fillRect(x + 2, y, 3, 1);
      this.holding++;
    }
  }
}
