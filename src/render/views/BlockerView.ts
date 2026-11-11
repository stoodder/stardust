// A blocker's view (design/maps.md § 5.4: Bricks at the Gap; T605, polished by T630a). For each
// live blocker ally (`Ally.blockCapacity` > 0): a small health bar just over his head in `overlay`
// (a 1 px `ink.0` frame round an `ink.2` track, the health in `green.3`, `gold.3` at or below half,
// `red.3` at or below a quarter), easing towards `Ally.health` over BAR_EASE_MS (the sim already
// eases him along the timeline; this smooths what a frame shows, and reduced motion snaps it):
// as it falls, the part it is losing shows as a `white.0` chip that the fill drains into
// (`barLayout`), so the loss reads without a number. His Tumble IV stone sits at the bar's left
// end (`STONE_PIP`: a `pink.3` stone lit `gold.4`, in an `ink.0` rim), so the bar reads as his,
// never as an enemy's. Under each unit he holds (`Enemy.blockerUid`) a pair of `white.1` corner
// brackets close on its feet over an `ink.0` shadow, so the hold reads on Act III's dark road.
// His health never moves with what he holds (D141), and the bar has no number on it. His stance
// (`blockerPose`) is AllyView's: braced, straining, down on one knee.
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
/** The bar's top over his ground point: two pixels over his head as he stands braced (px). */
export const BAR_LIFT = 29;
/** A hold bracket's half-width round a held unit's ground point (px). */
const HOLD_HALF_PX = 6;
/** How long the shown health takes to catch up with the sim's (ms). */
export const BAR_EASE_MS = 600;

/** The bar's fill colour at `health` (a fraction of full). */
export function blockerBarColor(health: number): 'green.3' | 'gold.3' | 'red.3' {
  if (health <= 0.25) return 'red.3';
  if (health <= 0.5) return 'gold.3';
  return 'green.3';
}

/** A blocker's stance: braced, straining, or down on one knee (the `ally.bricks` anims). */
export type BlockerStance = 'block' | 'strain' | 'last';

/**
 * The stance a blocker shows at his sim health (no easing: the pose changes as the level does), or
 * null for an ally that doesn't block. The same thresholds as the bar's colours.
 */
export function blockerPose(a: {
  readonly blockCapacity?: number;
  readonly health?: number;
}): BlockerStance | null {
  if ((a.blockCapacity ?? 0) <= 0) return null;
  const h = a.health ?? 1;
  if (h <= 0.25) return 'last';
  return h <= 0.5 ? 'strain' : 'block';
}

/** `shown` eased towards `target` over `dtMs` (BAR_EASE_MS to close the whole gap; snaps if `snap`). */
export function easeBar(shown: number, target: number, dtMs: number, snap: boolean): number {
  if (snap || Number.isNaN(shown)) return target;
  const step = dtMs / BAR_EASE_MS;
  const gap = target - shown;
  return Math.abs(gap) <= step ? target : shown + Math.sign(gap) * step;
}

/** What the bar draws: the fill's width, the chip's past it (px), and the fill's colour. */
export interface BarLayout {
  fillPx: number;
  chipPx: number;
  color: 'green.3' | 'gold.3' | 'red.3';
}

/**
 * The bar for the sim's `health` and the eased `shown`: the fill to the lower of the two (at least
 * a pixel while he stands), the chip from there to `shown` while it is still falling, coloured by
 * the sim's level (so the colour changes as the level does, not as the ease catches up).
 */
export function barLayout(health: number, shown: number, out: BarLayout): BarLayout {
  const low = Math.min(health, shown);
  out.fillPx = Math.max(1, Math.round(BAR_W * low));
  out.chipPx = Math.max(0, Math.round(BAR_W * shown) - out.fillPx);
  out.color = blockerBarColor(health);
  return out;
}

/** His stone at the bar's left end: [dx, dy, colour] from the bar's top-left (5×5 with its rim). */
export const STONE_PIP: readonly (readonly [number, number, 'ink.0' | 'pink.3' | 'gold.4'])[] = [
  [-4, -1, 'ink.0'],
  [-5, 0, 'ink.0'],
  [-3, 0, 'ink.0'],
  [-6, 1, 'ink.0'],
  [-2, 1, 'ink.0'],
  [-5, 2, 'ink.0'],
  [-3, 2, 'ink.0'],
  [-4, 3, 'ink.0'],
  [-4, 0, 'gold.4'],
  [-5, 1, 'pink.3'],
  [-4, 1, 'pink.3'],
  [-3, 1, 'pink.3'],
  [-4, 2, 'pink.3'],
];

const pos: Vec2 = { x: 0, y: 0 };
const layout: BarLayout = { fillPx: 0, chipPx: 0, color: 'green.3' };

/** A master colour as a Phaser fill number. */
function hex(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}
const C = {
  frame: hex('ink.0'),
  track: hex('ink.2'),
  held: hex('white.1'),
  chip: hex('white.0'),
  'ink.0': hex('ink.0'),
  'pink.3': hex('pink.3'),
  'gold.4': hex('gold.4'),
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
      this.#bar(a.x, a.y, a.health, this.#shownHealth);
      this.shown++;
      this.#held(a.uid, pools.enemies);
      break; // one blocker a map (Bricks)
    }
  }

  #bar(x: number, y: number, health: number, shown: number): void {
    const g = this.#g;
    gridToScreen(x, y, this.#ctx.origin, pos);
    const left = Math.round(pos.x - BAR_W / 2);
    const top = Math.round(pos.y - BAR_LIFT);
    g.fillStyle(C.frame, 1);
    g.fillRect(left - 1, top - 1, BAR_W + 2, BAR_H + 2);
    g.fillStyle(C.track, 1);
    g.fillRect(left, top, BAR_W, BAR_H);
    barLayout(health, shown, layout);
    g.fillStyle(C[layout.color], 1);
    g.fillRect(left, top, layout.fillPx, BAR_H);
    if (layout.chipPx > 0) {
      g.fillStyle(C.chip, 1);
      g.fillRect(left + layout.fillPx, top, layout.chipPx, BAR_H);
    }
    for (const [dx, dy, c] of STONE_PIP) {
      g.fillStyle(C[c], 1);
      g.fillRect(left + dx, top + dy, 1, 1);
    }
  }

  #held(uid: number, enemies: BlockerPools['enemies']): void {
    const g = this.#g;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      if (!e.alive || e.blockerUid !== uid) continue;
      gridToScreen(e.x, e.y, this.#ctx.origin, pos);
      const x = Math.round(pos.x);
      const y = Math.round(pos.y) + 1;
      // Corner brackets closing on its feet: [ ], each over its `ink.0` shadow a pixel down.
      for (const [c, oy] of [
        [C.frame, 1],
        [C.held, 0],
      ] as const) {
        g.fillStyle(c, 1);
        g.fillRect(x - HOLD_HALF_PX, y + oy - 2, 1, 3);
        g.fillRect(x - HOLD_HALF_PX, y + oy, 2, 1);
        g.fillRect(x + HOLD_HALF_PX, y + oy - 2, 1, 3);
        g.fillRect(x + HOLD_HALF_PX - 1, y + oy, 2, 1);
      }
      this.holding++;
    }
  }
}
