// The LICENSE REVOKED stamp (design/towers.md § 9; T606, minimal: T640b draws the stamp icons and
// T630a polishes the fold). A tower of a revoked class stays on screen, powered down (it no longer
// aims or fires: the sim has folded it away), for STAMP_MS under a stamp plate ("LICENSE" over
// "REVOKED" in the 3×5 font, `red.3` on an `ink.0` plate with a `red.3` rim, a 1 px drop
// shadow), then folds away: its view is released. The plate lands with a slam (it drops from
// larger over SLAM_MS; reduced motion places it at once) and fades over its last FADE_MS. The
// Orbital Strike's UPLINK REVOKED is the HUD's (app/revoked.ts).
// Allocation-free per frame: one Graphics and a small fixed pool of text images.
import type * as Phaser from 'phaser';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { floatTextTexture } from '../vfx/overlayTextures.ts';
import type { ViewContext } from './ViewContext.ts';

/** How long a revoked tower stays under its stamp before it folds away (towers.md § 9: 1 s). */
export const STAMP_MS = 1000;
/** The stamp's landing, from SLAM_SCALE down to 1. */
export const SLAM_MS = 120;
const SLAM_SCALE = 1.6;
/** The stamp's fade at the end. */
export const FADE_MS = 250;
/** How far above the tower's ground point the plate's centre sits (px). */
const STAMP_LIFT_PX = 18;
/** Stamps up at once (a class rarely has more towers than this; extras skip the plate). */
const MAX_STAMPS = 12;
const LINES = ['LICENSE', 'REVOKED'] as const;
const INK: ColorName = 'red.3';

/** A master colour as a Phaser fill number. */
function hex(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}
const C = { plate: hex('ink.0'), rim: hex(INK), shadow: hex('ink.1') } as const;

/** The towers' views as the stamp holds them (BattleScene's ViewPool<TowerView>). */
export interface HeldTowers {
  get(uid: number): { stamp: number } | undefined;
}

interface Stamp {
  active: boolean;
  uid: number;
  x: number;
  y: number;
  liftPx: number;
  ms: number;
  readonly lines: Phaser.GameObjects.Image[];
}

/** The stamp's scale at `ms` into it (the slam), 1 under reduced motion. */
export function stampScale(ms: number, reduced: boolean): number {
  if (reduced || ms >= SLAM_MS) return 1;
  return SLAM_SCALE - ((SLAM_SCALE - 1) * Math.max(0, ms)) / SLAM_MS;
}

/** The stamp's alpha at `ms` into it (the fade over its last FADE_MS). */
export function stampAlpha(ms: number): number {
  const left = STAMP_MS - ms;
  if (left >= FADE_MS) return 1;
  return Math.max(0, left / FADE_MS);
}

const pos: Vec2 = { x: 0, y: 0 };

export class RevokedView {
  readonly #ctx: ViewContext;
  readonly #g: Phaser.GameObjects.Graphics;
  readonly #reducedMotion: () => boolean;
  readonly #stamps: Stamp[] = [];
  #lineKeys: string[] = [];
  /** Stamps up this frame (the smoke flow's check). */
  shown = 0;
  /** Stamps played since the battle began. */
  played = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean = () => false) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    this.#g = ctx.scene.make.graphics({}, false);
    ctx.layers.overlay.add(this.#g);
    this.#lineKeys = LINES.map((t) => floatTextTexture(ctx.scene, t, INK));
    for (let i = 0; i < MAX_STAMPS; i++) {
      const lines = this.#lineKeys.map((key) => {
        const img = ctx.scene.make.image({}, false).setTexture(key).setOrigin(0.5, 0.5);
        img.setVisible(false);
        ctx.layers.overlay.add(img);
        return img;
      });
      this.#stamps.push({ active: false, uid: 0, x: 0, y: 0, liftPx: 0, ms: 0, lines });
    }
  }

  /** A tower `uid` at grid (x, y), `liftPx` up its tile, was revoked: stamp it (TowerRevoked). */
  stamp(uid: number, x: number, y: number, liftPx: number): void {
    const s = this.#stamps.find((t) => !t.active);
    if (s === undefined) return;
    s.active = true;
    s.uid = uid;
    s.x = x;
    s.y = y;
    s.liftPx = liftPx;
    s.ms = 0;
    this.played++;
  }

  /**
   * Keeps each stamped tower's view on screen through its stamp (BattleScene calls it with the
   * sync pass's stamp, before the sweep): its view is released the frame after the stamp ends.
   */
  hold(towers: HeldTowers, syncStamp: number): void {
    for (const s of this.#stamps) {
      if (!s.active) continue;
      const v = towers.get(s.uid);
      if (v !== undefined) v.stamp = syncStamp;
    }
  }

  /** Advances the stamps by `dt` ms and draws them. */
  update(dt: number): void {
    const g = this.#g;
    g.clear();
    this.shown = 0;
    const reduced = this.#reducedMotion();
    for (const s of this.#stamps) {
      if (!s.active) continue;
      s.ms += dt;
      if (s.ms >= STAMP_MS) {
        s.active = false;
        for (const l of s.lines) l.setVisible(false);
        continue;
      }
      this.shown++;
      const scale = stampScale(s.ms, reduced);
      const alpha = stampAlpha(s.ms);
      gridToScreen(s.x, s.y, this.#ctx.origin, pos);
      const cx = Math.round(pos.x);
      const cy = Math.round(pos.y - s.liftPx - STAMP_LIFT_PX);
      const w = Math.round(32 * scale);
      const h = Math.round(16 * scale);
      const x0 = cx - Math.floor(w / 2);
      const y0 = cy - Math.floor(h / 2);
      g.fillStyle(C.shadow, alpha).fillRect(x0 + 1, y0 + 1, w, h);
      g.fillStyle(C.rim, alpha).fillRect(x0, y0, w, h);
      g.fillStyle(C.plate, alpha).fillRect(x0 + 1, y0 + 1, w - 2, h - 2);
      const [top, bottom] = s.lines;
      top?.setPosition(cx, cy - Math.round(3 * scale)).setScale(Math.round(scale * 4) / 4);
      bottom?.setPosition(cx, cy + Math.round(4 * scale)).setScale(Math.round(scale * 4) / 4);
      for (const l of s.lines) l.setAlpha(alpha).setVisible(true);
    }
  }

  reset(): void {
    this.#g.clear();
    for (const s of this.#stamps) {
      s.active = false;
      for (const l of s.lines) l.setVisible(false);
    }
    this.shown = 0;
  }
}
