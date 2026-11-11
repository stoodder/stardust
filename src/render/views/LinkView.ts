// Synergy-link tethers (design/towers.md § 6.1 Readability; art-direction §8): while two towers
// are linked, an animated `fx.link_tether` arc joins them, solid orange for Crossfire, dashed
// blue for Sitting Ducks, and zigzag teal for Conductive (shape and color both name the link).
// BattleScene feeds it the sim's LinkFormed and LinkBroken events with the two towers' tiles; a
// tether is placed once, since towers never move. The frame set comes from `tetherDir`: the direction, and which tower it's
// drawn from, so every tether runs left to right (or top to bottom). A tower on high ground lifts
// its tether with it (between a flat and a raised tower, to their mean height: `tetherLift`). Tethers draw in `vfx`, lifted TETHER_LIFT_PX so the arc joins the
// heads, above the bases (D059), and pulse 100% ↔ 60% on the page's 1 Hz clock, a quick 3 Hz
// shimmer for their first second. Under reduced motion the beads hold still and nothing pulses.
import type * as Phaser from 'phaser';
import type { ColorName } from '../../content/palettes/master.ts';
import type { CounterStyle } from '../../content/presentation.ts';
import { tetherDir } from '../../content/sprites/fx/link_tether.ts';
import { exclamationsSpent } from '../../story/presentation.ts';
import { gridToScreen, HALF_H, type Vec2 } from '../iso.ts';
import { GLYPH_H } from '../vfx/pixelFont.ts';
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
/** 3 Hz: no flicker above the photosensitivity cap (art-direction §8; D097). */
const SHIMMER_PERIOD_MS = 334;

/**
 * A tether's alpha `ms` after it formed, at page time `now` (ms): a 3 Hz shimmer for its first
 * second, then the shared 1 Hz pulse; steady under reduced motion.
 */
export function tetherAlpha(ms: number, now: number, reduced: boolean): number {
  if (reduced) return 1;
  if (ms < SHIMMER_MS) return ms % SHIMMER_PERIOD_MS < SHIMMER_PERIOD_MS / 2 ? 1 : DIM_ALPHA;
  return now % PULSE_PERIOD_MS < PULSE_PERIOD_MS / 2 ? 1 : DIM_ALPHA;
}

/**
 * How far up a tether between ends `liftA` and `liftB` px up draws (T221). The arc is one sprite
 * drawn level, so between a flat tower and one on high ground it can't meet both heads: it rides
 * at their mean height, each end within half a terrace step (4 px) of its head, where lifting it
 * from one end left the other a full step (8 px) off.
 */
export function tetherLift(liftA: number, liftB: number): number {
  return Math.round((liftA + liftB) / 2) + TETHER_LIFT_PX;
}

/** A link's callout look (D059): its ring and text colors, the tether's own (art-direction §7). */
export const LINK_CALLOUT: Readonly<Record<string, { ring: ColorName; text: ColorName }>> = {
  crossfire: { ring: 'orange.3', text: 'orange.4' },
  sitting_ducks: { ring: 'blue.3', text: 'blue.4' },
  // Conductive (T304b): water carrying a spark; its tether is a zigzag teal line (T312a).
  conductive: { ring: 'teal.3', text: 'teal.4' },
  // M4's links (T400a first pass; T430a may restyle them).
  overwatch: { ring: 'gold.3', text: 'gold.4' },
  skywatch: { ring: 'violet.3', text: 'violet.4' },
  reel_it_in: { ring: 'green.3', text: 'green.4' },
  // M5's links (T500a first pass; T530a may restyle them).
  resonance: { ring: 'blue.3', text: 'teal.4' },
  lightsong: { ring: 'pink.3', text: 'pink.4' },
  // M6's (T630a): each gift's own colour names the text, its partner's the ring. The Den's
  // links speak in its moss (`green.4`) over the Sprinkler's water and the Crane's salvage gold;
  // the Choir's in its song's gold over the Mindspike's violet; the Bloom's in its ice-white over
  // the Harpoon's steel-blue rope and the Mindspike's violet.
  splash_zone: { ring: 'blue.3', text: 'green.4' },
  finders_keepers: { ring: 'gold.3', text: 'green.4' },
  harmony: { ring: 'violet.3', text: 'gold.4' },
  pinned_down: { ring: 'blue.3', text: 'white.1' },
  stillmind: { ring: 'violet.3', text: 'white.1' },
};

/**
 * A link's callout text: its name in capitals, with feeling in Acts I–II ("CROSSFIRE!"), and
 * without the "!" from Act III on (`counter`, the map's presentation dial), where the system's
 * cheer has run out (story/presentation.ts `exclamationsSpent`; T630a).
 */
export function calloutText(name: string, counter: CounterStyle = 'starred'): string {
  return exclamationsSpent(counter) ? name.toUpperCase() : `${name.toUpperCase()}!`;
}

/** A floating number's height in the 3×5 font with its 1 px outline, and the gap kept over it (px). */
const FLOAT_TEXT_H = GLYPH_H + 2;
const CALLOUT_CLEAR_PX = 2;

/**
 * How far up a link's callout floats (px) when one of its towers was built this same frame, whose
 * `−cost` floater rises from that tower's tile at the same moment (T329): at least `liftPx`, and
 * high enough that the callout's bottom clears the floater's top by CALLOUT_CLEAR_PX. `mid` is the
 * callout's grid point (between the towers), `end` the built tower's tile center, `floatLiftPx`
 * its floater's lift. Both rise at the same rate, so clearing them at the start clears them
 * throughout.
 */
export function calloutLiftOver(
  liftPx: number,
  mid: Readonly<Vec2>,
  end: Readonly<Vec2>,
  floatLiftPx: number,
): number {
  // Screen y grows HALF_H per grid step along x + y; a lift raises a point by its px.
  const dy = (mid.x + mid.y - (end.x + end.y)) * HALF_H;
  const clear = Math.ceil(dy + floatLiftPx + FLOAT_TEXT_H + CALLOUT_CLEAR_PX);
  return clear > liftPx ? clear : liftPx;
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
    s.setPosition(pos.x, pos.y - tetherLift(a.liftPx, b.liftPx))
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
