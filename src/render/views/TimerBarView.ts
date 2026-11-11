// The secondary timers' minimal bar (design/maps.md § 5.1, *Secondary timer*: the finale's Deep
// Bore; T806, a placeholder T831/T832 replace with the Bore rig's glow and the HUD's Bore bar):
// once a timer has started, a 96×3 bar at the top of the screen under the boss bar, in `overlay`
// and fixed to the screen. A 1 px `ink.0` frame round an `ink.2` track; the fill is the unsung
// violet (`violet.3`, `stardust.unsung`'s hue: the Bore glows unsung, art-direction.md § Finale),
// lit `violet.4` along its top row; full (the breakthrough), the whole fill burns `violet.4`. A map
// with two timers stacks them 6 px apart. It reads sim state alone (`state.timers`), so it holds
// while paused and stands right after a checkpoint replay. Allocation-free per frame: the Graphics
// redraws only when a bar's shown pixels change.
import type * as Phaser from 'phaser';
import type { CompiledTimer } from '../../content/compiled.ts';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { TimerState } from '../../sim/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { VIEW_W } from '../scale.ts';
import { BOSS_BAR_Y } from '../vfx/bossBar.ts';
import type { ViewContext } from './ViewContext.ts';

export const TIMER_BAR_W = 96;
export const TIMER_BAR_H = 3;
/** Under the boss bar (its 4 px bar and the 3 px flags under it), clear of its marks. */
export const TIMER_BAR_Y = BOSS_BAR_Y + 12;
const STACK_PX = 6;

function hex(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}

const C = {
  frame: hex('ink.0'),
  track: hex('ink.2'),
  fill: hex('violet.3'),
  lit: hex('violet.4'),
};

/** The fill a timer shows, in whole px of the bar's inner width (−1 before it starts: hidden). */
export function timerBarPx(
  t: Pick<TimerState, 'filled' | 'running'>,
  def: Pick<CompiledTimer, 'fillTicks'>,
): number {
  if (!t.running || def.fillTicks <= 0) return -1;
  return Math.round(TIMER_BAR_W * Math.min(1, t.filled / def.fillTicks));
}

export class TimerBarView {
  readonly #gfx: Phaser.GameObjects.Graphics;
  readonly #defs: readonly CompiledTimer[];
  /** Each timer's shown fill (px; −1 hidden) and whether it showed full. */
  readonly #px: number[];
  readonly #full: boolean[];

  constructor(ctx: ViewContext, timers: readonly CompiledTimer[]) {
    this.#defs = timers;
    this.#px = timers.map(() => -1);
    this.#full = timers.map(() => false);
    this.#gfx = ctx.scene.make.graphics({}, false).setScrollFactor(0).setVisible(false);
    ctx.layers.overlay.add(this.#gfx);
  }

  /** Each timer's shown fill in px (−1: not started), for the smoke flow. */
  get shown(): readonly number[] {
    return this.#px;
  }

  update(timers: readonly DeepReadonly<TimerState>[]): void {
    let changed = false;
    for (let i = 0; i < this.#defs.length; i++) {
      const t = timers[i];
      const px = t === undefined ? -1 : timerBarPx(t, this.#defs[i]!); // i < length
      const full = t?.full === true;
      if (px !== this.#px[i] || full !== this.#full[i]) changed = true;
      this.#px[i] = px;
      this.#full[i] = full;
    }
    if (changed) this.#draw();
  }

  #draw(): void {
    const g = this.#gfx.clear();
    const x = Math.round((VIEW_W - TIMER_BAR_W) / 2);
    let any = false;
    for (let i = 0; i < this.#px.length; i++) {
      const px = this.#px[i]!; // i < length
      if (px < 0) continue;
      any = true;
      const y = TIMER_BAR_Y + i * STACK_PX;
      g.fillStyle(C.frame).fillRect(x - 1, y - 1, TIMER_BAR_W + 2, TIMER_BAR_H + 2);
      g.fillStyle(C.track).fillRect(x, y, TIMER_BAR_W, TIMER_BAR_H);
      if (px === 0) continue;
      const full = this.#full[i] === true;
      g.fillStyle(full ? C.lit : C.fill).fillRect(x, y, px, TIMER_BAR_H);
      g.fillStyle(C.lit).fillRect(x, y, px, 1);
    }
    this.#gfx.setVisible(any);
  }

  reset(): void {
    this.#px.fill(-2); // redraw on the next update
  }
}
