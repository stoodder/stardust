// Synergy-link tethers (design/towers.md § 6.1 Readability; art-direction §8): while two towers
// are linked, an animated `fx.link_tether` arc joins them, solid orange for Crossfire and dashed
// blue for Sitting Ducks (shape and color both name the link). BattleScene feeds it the sim's
// LinkFormed and LinkBroken events with the two towers' tiles; a tether is placed once, since
// towers never move. The frame set comes from `tetherDir`: the direction, and which tower it's
// drawn from, so every tether runs left to right (or top to bottom). A tower on high ground lifts
// its tether's anchor with it. Tethers draw in `vfx`, above the heads they join. Under reduced
// motion the beads hold still.
import type * as Phaser from 'phaser';
import { tetherDir } from '../../content/sprites/fx/link_tether.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { hasAnim, spriteId } from './spriteInfo.ts';
import type { ViewContext } from './ViewContext.ts';

const TETHER = spriteId('fx.link_tether');

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
  readonly #live = new Map<string, Phaser.GameObjects.Sprite>();
  /** Released sprites, reused before new ones are made. */
  readonly #free: Phaser.GameObjects.Sprite[] = [];

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
    s.setPosition(pos.x, pos.y - from.liftPx).setVisible(true);
    if (this.#reducedMotion()) {
      const f = sprites.frame(TETHER, `${anim}_0`);
      s.stop().setTexture(f.texture, f.frame);
    } else {
      s.play(sprites.anim(TETHER, anim));
    }
    s.setDisplayOrigin(anchor.x, anchor.y);
    this.#live.set(k, s);
  }

  /** Removes the tether of `link` between towers `a` and `b` (uids), if it shows. */
  break(link: string, a: number, b: number): void {
    const k = key(link, a, b);
    const s = this.#live.get(k);
    if (s === undefined) return;
    s.stop().setVisible(false);
    this.#live.delete(k);
    this.#free.push(s);
  }

  /** Removes every tether (the scene is shutting down). */
  reset(): void {
    for (const s of this.#live.values()) {
      s.stop().setVisible(false);
      this.#free.push(s);
    }
    this.#live.clear();
  }
}
