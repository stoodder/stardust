// Synergy-link tethers (design/towers.md § 6.1 Readability; art-direction §8): while two towers
// are linked, an animated `fx.link_tether` arc joins them, solid orange for Crossfire and dashed
// blue for Sitting Ducks (shape and color both name the link). BattleScene feeds it the sim's
// LinkFormed and LinkBroken events with the two towers' tiles; a tether is placed once, since
// towers never move. The frame set comes from `tetherDir`: the direction, and which tower it's
// drawn from, so every tether runs left to right (or top to bottom). A tower on high ground lifts
// its tether's anchor with it. Tethers draw in `vfx`, lifted TETHER_LIFT_PX so the arc joins the
// heads, above the bases (D059), and pulse 100% ↔ 60% on the page's 1 Hz clock, a quick 4 Hz
// shimmer for their first second. Under reduced motion the beads hold still and nothing pulses.
import type * as Phaser from 'phaser';
import type { ColorName } from '../../content/palettes/master.ts';
import { tetherDir } from '../../content/sprites/fx/link_tether.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { PULSE_PERIOD_MS } from '../motion.ts';
import { hasAnim, spriteId } from './spriteInfo.ts';
import type { ViewContext } from './ViewContext.ts';

const TETHER = spriteId('fx.link_tether');
/** How far up the tether's ends sit (px): at the heads' mounts, above the bases (D059). */
export const TETHER_LIFT_PX = 9;
/** The pulse's dim step (the stepped-alpha 60%, art-direction §7). */
const DIM_ALPHA = 0.6;
/** A new tether shimmers this long (ms) at SHIMMER_HZ before settling into the 1 Hz pulse. */
const SHIMMER_MS = 1000;
const SHIMMER_PERIOD_MS = 250;

/**
 * A tether's alpha `ms` after it formed, at page time `now` (ms): a 4 Hz shimmer for its first
 * second, then the shared 1 Hz pulse; steady under reduced motion.
 */
export function tetherAlpha(ms: number, now: number, reduced: boolean): number {
  if (reduced) return 1;
  if (ms < SHIMMER_MS) return ms % SHIMMER_PERIOD_MS < SHIMMER_PERIOD_MS / 2 ? 1 : DIM_ALPHA;
  return now % PULSE_PERIOD_MS < PULSE_PERIOD_MS / 2 ? 1 : DIM_ALPHA;
}

/** A link's callout look (D059): its ring and text colors, the tether's own (art-direction §7). */
export const LINK_CALLOUT: Readonly<Record<string, { ring: ColorName; text: ColorName }>> = {
  crossfire: { ring: 'orange.3', text: 'orange.4' },
  sitting_ducks: { ring: 'blue.3', text: 'blue.4' },
  // Conductive (T304b): water carrying a spark. Its tether art is T312a's; until then it shows
  // only this callout (`form` draws nothing for a link with no tether frames).
  conductive: { ring: 'teal.3', text: 'teal.4' },
};

/** A link's callout text: its name in capitals, with feeling ("CROSSFIRE!"). */
export function calloutText(name: string): string {
  return `${name.toUpperCase()}!`;
}

interface Tether {
  readonly sprite: Phaser.GameObjects.Sprite;
  /** When it formed (page ms). */
  readonly at: number;
}

/** One end of a link: the tower's uid, tile, and how far up it stands (px; ELEV_H on high ground). */
export interface LinkEnd {
  readonly uid: number;
  readonly col: number;
  readonly row: number;
  readonly liftPx: number;
}

const pos: Vec2 = { x: 0, y: 0 };

/** The key of a link between towers `a` and `b` (either order). */
function key(link: string, a: number, b: number): string {
  return a < b ? `${link}:${a}:${b}` : `${link}:${b}:${a}`;
}

export class LinkView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #live = new Map<string, Tether>();
  /** Released sprites, reused before new ones are made. */
  readonly #free: Phaser.GameObjects.Sprite[] = [];
  /** The live tethers in an array too, so `update` walks them with an index (no iterator). */
  readonly #list: Tether[] = [];

  constructor(ctx: ViewContext, reducedMotion: () => boolean) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
  }

  /** How many tethers show (for tests and the smoke hooks). */
  get count(): number {
    return this.#live.size;
  }

  /**
   * Shows the tether of `link` between two towers. A link with no tether art, or towers that
   * aren't 8-adjacent, draw nothing. Forming a link that already shows is a no-op.
   */
  form(link: string, a: LinkEnd, b: LinkEnd): void {
    const k = key(link, a.uid, b.uid);
    if (this.#live.has(k)) return;
    const d = tetherDir(b.col - a.col, b.row - a.row);
    const anim = d === null ? '' : `${link}_${d.dir}`;
    if (d === null || !hasAnim(TETHER, anim)) return;
    const from = d.fromB ? b : a;
    const { sprites, scene, layers, origin } = this.#ctx;
    let s = this.#free.pop();
    if (s === undefined) {
      s = scene.make.sprite({}, false);
      layers.vfx.add(s);
    }
    const anchor = sprites.meta(TETHER).anchor;
    gridToScreen(from.col + 0.5, from.row + 0.5, origin, pos);
    s.setPosition(pos.x, pos.y - from.liftPx - TETHER_LIFT_PX)
      .setAlpha(1)
      .setVisible(true);
    if (this.#reducedMotion()) {
      const f = sprites.frame(TETHER, `${anim}_0`);
      s.stop().setTexture(f.texture, f.frame);
    } else {
      s.play(sprites.anim(TETHER, anim));
    }
    s.setDisplayOrigin(anchor.x, anchor.y);
    const t: Tether = { sprite: s, at: performance.now() };
    this.#live.set(k, t);
    this.#list.push(t);
  }

  /** Pulses every tether (once per rendered frame). */
  update(): void {
    const list = this.#list;
    if (list.length === 0) return;
    const now = performance.now();
    const reduced = this.#reducedMotion();
    for (let i = 0; i < list.length; i++) {
      const t = list[i]!; // i < length
      const a = tetherAlpha(now - t.at, now, reduced);
      if (t.sprite.alpha !== a) t.sprite.setAlpha(a);
    }
  }

  /** Removes the tether of `link` between towers `a` and `b` (uids), if it shows. */
  break(link: string, a: number, b: number): void {
    const k = key(link, a, b);
    const t = this.#live.get(k);
    if (t === undefined) return;
    t.sprite.stop().setVisible(false);
    this.#live.delete(k);
    const i = this.#list.indexOf(t);
    if (i >= 0) this.#list.splice(i, 1);
    this.#free.push(t.sprite);
  }

  /** Removes every tether (the scene is shutting down). */
  reset(): void {
    for (const t of this.#list) {
      t.sprite.stop().setVisible(false);
      this.#free.push(t.sprite);
    }
    this.#live.clear();
    this.#list.length = 0;
  }
}
