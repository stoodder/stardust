// The Hum Choir on the field (T607's minimal view; choirLook.ts holds the rules and pixels):
// - **The song ring** round each live Choir at its aura's reach (dashed `gold.3`, its dashes
//   crawling on the hum's beat), and a Lullaby's own ring at its radius (dashed `blue.4`). In
//   `decal`, under the units, centred on the tower's tile.
// - **A note** over each Choir (`gold.4`), bobbing on the beat, in `overlay`.
// - **Lulled:** a `blue.4` note over the head of each Lulled unit (the sim's `Enemy.lulled`), beside
//   Unnerved's squiggle, over the body as EnemyView draws it (unitAnchor.ts), falling back to the
//   grid point without a view. No event drives any of it: it reads sim state, so it holds while
//   paused.
// Allocation-free per frame: rings and notes are pooled; each ring texture (colour, snapped
// radius, dash shift) is registered once.
import type * as Phaser from 'phaser';
import type { ColorName } from '../../content/palettes/master.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Enemy, Tower } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { ringImage, snapRingRadius } from '../vfx/overlayPixels.ts';
import {
  choirReach,
  LULL_RING_COLOR,
  LULLED_COLOR,
  LULLED_SIDE_PX,
  lullReach,
  NOTE_COLOR,
  NOTE_H,
  NOTE_LIFT_PX,
  NOTE_W,
  noteBobPx,
  noteImage,
  showsLulled,
  SONG_COLOR,
  SONG_UNDER,
  songDashShift,
} from './choirLook.ts';
import { UNNERVED_GAP_PX } from './mindLook.ts';
import { blankBox, NO_ANCHORS, type UnitAnchors } from './unitAnchor.ts';
import type { ViewContext } from './ViewContext.ts';

/** The pools as this view reads them. */
export interface ChoirPools {
  readonly towers: { readonly used: number; readonly items: readonly DeepReadonly<Tower>[] };
  readonly enemies: { readonly used: number; readonly items: readonly DeepReadonly<Enemy>[] };
}

const MAX_CHOIRS = 12;
const MAX_LULLED = 24;
const NOTE_KEY = 'fx.choir_note';
const LULLED_KEY = 'fx.lulled_note';
/** A flyer's body rides this far over its ground point (EnemyView's FLY_LIFT_PX). */
const FLY_LIFT_PX = 12;
/** A unit's head over its ground point when no view has drawn it (px). */
const FALLBACK_HEAD_PX = 14;

interface Ring {
  readonly img: Phaser.GameObjects.Image;
  /** What its texture shows now (snapped radius, colour, dash shift), so a frame rebuilds no key. */
  radius: number;
  color: ColorName | null;
  shift: number;
}

const pos: Vec2 = { x: 0, y: 0 };
const drawn = blankBox();

export class ChoirView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #anchors: UnitAnchors;
  readonly #rings: Ring[] = [];
  readonly #notes: Phaser.GameObjects.Image[] = [];
  readonly #lulled: Phaser.GameObjects.Image[] = [];
  readonly #frames = new Map<string, { ox: number; oy: number }>();
  #ringsShown = 0;
  #lullRings = 0;
  #notesShown = 0;
  #lulledShown = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean, anchors: UnitAnchors = NO_ANCHORS) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    this.#anchors = anchors;
    const scene = ctx.scene;
    if (!scene.textures.exists(NOTE_KEY)) {
      scene.textures.addCanvas(NOTE_KEY, imageToCanvas(noteImage(NOTE_COLOR)));
    }
    if (!scene.textures.exists(LULLED_KEY)) {
      scene.textures.addCanvas(LULLED_KEY, imageToCanvas(noteImage(LULLED_COLOR)));
    }
    for (let i = 0; i < 2 * MAX_CHOIRS; i++) {
      const img = scene.make.image({}, false).setVisible(false);
      ctx.layers.decal.add(img);
      this.#rings.push({ img, radius: 0, color: null, shift: 0 });
    }
    for (let i = 0; i < MAX_CHOIRS; i++) {
      const img = scene.make.image({}, false).setVisible(false);
      img.setTexture(NOTE_KEY).setDisplayOrigin((NOTE_W - 1) / 2, NOTE_H - 1);
      ctx.layers.overlay.add(img);
      this.#notes.push(img);
    }
    for (let i = 0; i < MAX_LULLED; i++) {
      const img = scene.make.image({}, false).setVisible(false);
      img.setTexture(LULLED_KEY).setDisplayOrigin((NOTE_W - 1) / 2, NOTE_H - 1);
      ctx.layers.overlay.add(img);
      this.#lulled.push(img);
    }
  }

  /** Song rings showing now (the smoke flow's check). */
  get rings(): number {
    return this.#ringsShown;
  }

  /** Lullaby rings showing now (the smoke flow's check). */
  get lullRings(): number {
    return this.#lullRings;
  }

  /** Choir notes showing now. */
  get notes(): number {
    return this.#notesShown;
  }

  /** Lulled units wearing the note now (the smoke flow's check). */
  get lulled(): number {
    return this.#lulledShown;
  }

  update(pools: ChoirPools, tick: number): void {
    const reduced = this.#reducedMotion();
    const shift = songDashShift(tick, reduced);
    let r = 0;
    let n = 0;
    let songs = 0;
    let lulls = 0;
    const towers = pools.towers;
    for (let i = 0; i < towers.used && n < MAX_CHOIRS; i++) {
      const t = towers.items[i]!; // i < used ≤ items.length
      const reach = choirReach(t);
      if (reach <= 0) continue;
      gridToScreen(t.x, t.y, this.#ctx.origin, pos);
      const x = Math.round(pos.x);
      const y = Math.round(pos.y);
      // The Lullaby's first, its dashes a step off the song's, so where the two coincide (Harmony
      // widens the song to the Lullaby's 2.5) they interleave gold and blue.
      const lull = lullReach(t);
      if (lull > 0) {
        this.#ring(r++, lull, LULL_RING_COLOR, shift === 0 ? 1 : 0, x, y);
        lulls++;
      }
      this.#ring(r++, reach, SONG_COLOR, shift, x, y);
      songs++;
      const note = this.#notes[n++]!; // n < MAX_CHOIRS
      note.setPosition(x, y - NOTE_LIFT_PX + noteBobPx(tick, t.uid, reduced)).setVisible(true);
    }
    this.#ringsShown = songs;
    this.#lullRings = lulls;
    this.#notesShown = n;
    for (; r < this.#rings.length; r++) {
      const ring = this.#rings[r]!; // r < length
      if (ring.img.visible) ring.img.setVisible(false);
    }
    for (; n < MAX_CHOIRS; n++) {
      const note = this.#notes[n]!; // n < MAX_CHOIRS
      if (note.visible) note.setVisible(false);
    }

    let l = 0;
    const enemies = pools.enemies;
    for (let i = 0; i < enemies.used && l < MAX_LULLED; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      if (e.def === null || !showsLulled(e)) continue;
      let x: number;
      let top: number;
      if (this.#anchors.box(e.uid, drawn)) {
        x = drawn.x;
        top = drawn.top;
      } else {
        gridToScreen(e.x, e.y, this.#ctx.origin, pos);
        x = pos.x;
        top = pos.y - (e.def.layer === 'air' ? FLY_LIFT_PX : 0) - FALLBACK_HEAD_PX;
      }
      const img = this.#lulled[l++]!; // l < MAX_LULLED
      img
        .setPosition(Math.round(x + LULLED_SIDE_PX), Math.round(top - UNNERVED_GAP_PX))
        .setVisible(true);
    }
    this.#lulledShown = l;
    for (; l < MAX_LULLED; l++) {
      const img = this.#lulled[l]!; // l < MAX_LULLED
      if (img.visible) img.setVisible(false);
    }
  }

  reset(): void {
    for (const ring of this.#rings) ring.img.setVisible(false);
    for (const note of this.#notes) note.setVisible(false);
    for (const img of this.#lulled) img.setVisible(false);
    this.#ringsShown = 0;
    this.#lullRings = 0;
    this.#notesShown = 0;
    this.#lulledShown = 0;
  }

  /** Shows ring `k` at screen (x, y): `radiusTiles` in `color`, its dashes at `shift`. */
  #ring(
    k: number,
    radiusTiles: number,
    color: ColorName,
    shift: 0 | 1,
    x: number,
    y: number,
  ): void {
    const ring = this.#rings[k]!; // k < 2 × MAX_CHOIRS: two per Choir at most
    const radius = snapRingRadius(radiusTiles);
    if (ring.radius !== radius || ring.color !== color || ring.shift !== shift) {
      const key = `fx.choir_ring.${color}.${radius}.${shift}`;
      let f = this.#frames.get(key);
      if (f === undefined) {
        const baked = ringImage(radius, color, true, SONG_UNDER, shift);
        if (!this.#ctx.scene.textures.exists(key)) {
          this.#ctx.scene.textures.addCanvas(key, imageToCanvas(baked.image));
        }
        f = { ox: baked.cx, oy: baked.cy };
        this.#frames.set(key, f);
      }
      ring.img.setTexture(key).setDisplayOrigin(f.ox, f.oy);
      ring.radius = radius;
      ring.color = color;
      ring.shift = shift;
    }
    ring.img.setPosition(x, y).setVisible(true);
  }
}
