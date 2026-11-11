// The LICENSE REVOKED stamp (design/towers.md § 9; T606, polished by T630a). A tower of a revoked
// class stays on screen for STAMP_MS under the stamp (`icon.stamp.license_revoked`, T640b:
// "LICENSE" over "REVOKED" in `red.3` on `white.0` paper, art-direction §7), powered down (the sim
// has folded it away, so it no longer aims or fires): its view goes dark, its glows out and its
// head held on its last frame, and over the stamp's end it folds down into its base and the ground
// (TowerView `powerDown`, towerLook.ts; a stepped fade under reduced motion). Then its view is
// released. The stamp lands with a slam (twice its size, then its own, over SLAM_MS: whole-pixel
// scales only; reduced motion places it at once) and fades over its last FADE_MS. The Orbital
// Strike's UPLINK REVOKED is the HUD's (app/revoked.ts; `icon.stamp.uplink_revoked`).
// Allocation-free per frame: a small fixed pool of stamp images.
import type * as Phaser from 'phaser';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { POWER_DOWN_MS } from './towerLook.ts';
import type { ViewContext } from './ViewContext.ts';

/** How long a revoked tower stays under its stamp before it folds away (towers.md § 9: 1 s). */
export const STAMP_MS = POWER_DOWN_MS;
/** The stamp's landing, from SLAM_SCALE down to 1. */
export const SLAM_MS = 120;
const SLAM_SCALE = 1.6;
/** The stamp's fade at the end. */
export const FADE_MS = 250;
/** How far above the tower's ground point the plate's centre sits (px). */
const STAMP_LIFT_PX = 18;
/** Stamps up at once (a class rarely has more towers than this; extras skip the plate). */
const MAX_STAMPS = 12;
/** The stamp's sprite (icons/revoked.ts). */
const STAMP_SPRITE = 'icon.stamp.license_revoked';

/** The towers' views as the stamp holds them (BattleScene's ViewPool<TowerView>). */
export interface HeldTowers {
  get(
    uid: number,
  ): { stamp: number; powerDown(ms: number, reducedMotion: boolean): void } | undefined;
}

interface Stamp {
  active: boolean;
  uid: number;
  x: number;
  y: number;
  liftPx: number;
  ms: number;
  readonly img: Phaser.GameObjects.Image;
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
  readonly #reducedMotion: () => boolean;
  readonly #stamps: Stamp[] = [];
  /** Stamps up this frame (the smoke flow's check). */
  shown = 0;
  /** Stamps played since the battle began. */
  played = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean = () => false) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    const f = ctx.sprites.frame(STAMP_SPRITE, 'icon');
    for (let i = 0; i < MAX_STAMPS; i++) {
      const img = ctx.scene.make
        .image({}, false)
        .setTexture(f.texture, f.frame)
        .setOrigin(0.5, 0.5);
      img.setVisible(false);
      ctx.layers.overlay.add(img);
      this.#stamps.push({ active: false, uid: 0, x: 0, y: 0, liftPx: 0, ms: 0, img });
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
   * Keeps each stamped tower's view on screen through its stamp, powered down and folding
   * (BattleScene calls it with the sync pass's stamp, before the sweep): its view is released the
   * frame after the stamp ends.
   */
  hold(towers: HeldTowers, syncStamp: number): void {
    const reduced = this.#reducedMotion();
    for (const s of this.#stamps) {
      if (!s.active) continue;
      const v = towers.get(s.uid);
      if (v === undefined) continue;
      v.stamp = syncStamp;
      v.powerDown(s.ms, reduced);
    }
  }

  /** Advances the stamps by `dt` ms and draws them. */
  update(dt: number): void {
    this.shown = 0;
    const reduced = this.#reducedMotion();
    for (const s of this.#stamps) {
      if (!s.active) continue;
      s.ms += dt;
      if (s.ms >= STAMP_MS) {
        s.active = false;
        s.img.setVisible(false);
        continue;
      }
      this.shown++;
      // Whole-pixel scales only (no mixels): 2× while the slam is above 1.5, then 1×.
      const scale = Math.round(stampScale(s.ms, reduced));
      gridToScreen(s.x, s.y, this.#ctx.origin, pos);
      const cx = Math.round(pos.x);
      const cy = Math.round(pos.y - s.liftPx - STAMP_LIFT_PX);
      s.img.setPosition(cx, cy).setScale(scale).setAlpha(stampAlpha(s.ms)).setVisible(true);
    }
  }

  reset(): void {
    for (const s of this.#stamps) {
      s.active = false;
      s.img.setVisible(false);
    }
    this.shown = 0;
  }
}
