// The healer aura and C4 Purge's open panels (T703; design/enemies.md § 3 `healer_aura`, § 5.3;
// the looks are healLook.ts's). Each frame: under every unit projecting a healer aura (the sim's
// `projectedHeal`), a solid `green.3` ring at its radius and, once a second, a `green.4` pulse
// ring expanding out to it (in `decal`, under the units, centred on the body as EnemyView draws
// it; unitAnchor.ts); a ✚ over every unit an aura is mending now (the sim's `healRate`); and an
// open maintenance hatch on the flank of every unit whose def has `openPanel` (C4 Purge's armor
// modifier; both in `overlay`, so the dark never hides them). No event drives it: it reads sim
// state, like ShieldAuraView. Allocation-free per frame: every image is pooled, each radius's ring
// and pulse frames are registered once, and the sources' slots go in a fixed scratch array.
import type * as Phaser from 'phaser';
import { healRate, projectedHeal, type HealUnits } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { ringImage, snapRingRadius } from '../vfx/overlayPixels.ts';
import {
  HEAL_COLOR,
  HEAL_PULSE_COLOR,
  HEAL_RING_ALPHA,
  HEAL_UNDER,
  PLUS_SIZE,
  panelImage,
  panelSpark,
  plusImage,
  plusLifted,
  pulseAlpha,
  pulseRadius,
  pulseStep,
} from './healLook.ts';
import { blankBox, NO_ANCHORS, type UnitAnchors } from './unitAnchor.ts';
import type { ViewContext } from './ViewContext.ts';

const MAX_RINGS = 8;
const MAX_PLUSES = 24;
const MAX_PANELS = 32;
/** Aura sources considered at most (more than the rings ever show). */
const MAX_SOURCES = 32;
const PLUS_KEY = 'fx.heal_plus';
const PANEL_KEYS = ['fx.open_panel.0', 'fx.open_panel.1'] as const;
/** The ✚ sits in from the body's left edge and down from its top (px). */
const PLUS_IN_PX = 2;
const PLUS_DOWN_PX = 3;
/** The panel hangs off the body's right edge, this far down from its top (px). */
const PANEL_DOWN_PX = 6;

interface Frame {
  readonly key: string;
  readonly ox: number;
  readonly oy: number;
}

interface Ring {
  readonly ring: Phaser.GameObjects.Image;
  readonly pulse: Phaser.GameObjects.Image;
  radius: number;
  step: number;
}

const pos: Vec2 = { x: 0, y: 0 };
const body = blankBox();

export class HealAuraView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #anchors: UnitAnchors;
  readonly #rings: Ring[] = [];
  readonly #pluses: Phaser.GameObjects.Image[] = [];
  readonly #panels: Phaser.GameObjects.Image[] = [];
  readonly #frames = new Map<string, Frame>();
  readonly #sources = new Int32Array(MAX_SOURCES);
  #plusShown = 0;
  #panelShown = 0;
  #pulseShown = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean, anchors: UnitAnchors = NO_ANCHORS) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    this.#anchors = anchors;
    const make = (): Phaser.GameObjects.Image => ctx.scene.make.image({}, false).setVisible(false);
    for (let i = 0; i < MAX_RINGS; i++) {
      const pulse = make();
      const ring = make().setAlpha(HEAL_RING_ALPHA);
      ctx.layers.decal.add(pulse);
      ctx.layers.decal.add(ring);
      this.#rings.push({ ring, pulse, radius: 0, step: -2 });
    }
    const textures = ctx.scene.textures;
    if (!textures.exists(PLUS_KEY)) textures.addCanvas(PLUS_KEY, imageToCanvas(plusImage()));
    for (const [k, key] of PANEL_KEYS.entries()) {
      if (!textures.exists(key))
        textures.addCanvas(key, imageToCanvas(panelImage(k === 0 ? 0 : 1)));
    }
    const half = (PLUS_SIZE - 1) / 2;
    for (let i = 0; i < MAX_PLUSES; i++) {
      const img = make().setTexture(PLUS_KEY).setDisplayOrigin(half, half);
      ctx.layers.overlay.add(img);
      this.#pluses.push(img);
    }
    for (let i = 0; i < MAX_PANELS; i++) {
      const img = make().setTexture(PANEL_KEYS[0]).setDisplayOrigin(0, 0);
      ctx.layers.overlay.add(img);
      this.#panels.push(img);
    }
  }

  /** What shows now (the smoke flow's and renderState's check). */
  get shown(): {
    readonly rings: number;
    readonly pulses: number;
    readonly pluses: number;
    readonly panels: number;
  } {
    let rings = 0;
    for (const r of this.#rings) if (r.ring.visible) rings++;
    return {
      rings,
      pulses: this.#pulseShown,
      pluses: this.#plusShown,
      panels: this.#panelShown,
    };
  }

  update(enemies: HealUnits, tick: number): void {
    const reduced = this.#reducedMotion();
    let r = 0;
    let n = 0;
    let pulses = 0;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      const aura = projectedHeal(e);
      if (aura === null) continue;
      if (n < MAX_SOURCES) this.#sources[n++] = i;
      if (r >= MAX_RINGS) continue;
      const slot = this.#rings[r++]!; // r < MAX_RINGS
      this.#place(e, pos);
      const x = Math.round(pos.x);
      const y = Math.round(pos.y);
      if (slot.radius !== aura.radiusTiles) {
        const f = this.#frame(aura.radiusTiles, HEAL_COLOR, true);
        slot.ring.setTexture(f.key).setDisplayOrigin(f.ox, f.oy);
        slot.radius = aura.radiusTiles;
        slot.step = -2;
      }
      slot.ring.setPosition(x, y).setVisible(true);
      const step = pulseStep(tick, e.uid, reduced);
      if (step < 0) {
        if (slot.pulse.visible) slot.pulse.setVisible(false);
        continue;
      }
      if (slot.step !== step) {
        const f = this.#frame(pulseRadius(aura.radiusTiles, step), HEAL_PULSE_COLOR, false);
        slot.pulse.setTexture(f.key).setDisplayOrigin(f.ox, f.oy).setAlpha(pulseAlpha(step));
        slot.step = step;
      }
      slot.pulse.setPosition(x, y).setVisible(true);
      pulses++;
    }
    for (; r < MAX_RINGS; r++) {
      const slot = this.#rings[r]!; // r < MAX_RINGS
      if (slot.ring.visible) slot.ring.setVisible(false);
      if (slot.pulse.visible) slot.pulse.setVisible(false);
    }
    this.#pulseShown = pulses;
    this.#syncMarks(enemies, n, tick, reduced);
  }

  /** The ✚ on every unit being mended and the hatch on every open panel, over its drawn body. */
  #syncMarks(enemies: HealUnits, sources: number, tick: number, reduced: boolean): void {
    let p = 0;
    let q = 0;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      if (!e.alive || e.def === null) continue;
      const mended =
        sources > 0 && p < MAX_PLUSES && healRate(enemies, i, this.#sources, sources) > 0;
      const panel = e.def.openPanel && q < MAX_PANELS;
      if (!mended && !panel) continue;
      if (!this.#anchors.box(e.uid, body)) continue; // no view placed: nothing to mark
      if (mended) {
        const lift = plusLifted(tick, e.uid, reduced) ? 1 : 0;
        const img = this.#pluses[p++]!; // p < MAX_PLUSES
        img.setPosition(
          Math.round(body.x - body.halfW + PLUS_IN_PX),
          Math.round(body.top + PLUS_DOWN_PX - lift),
        );
        img.setVisible(true);
      }
      if (panel) {
        const img = this.#panels[q++]!; // q < MAX_PANELS
        const key = PANEL_KEYS[panelSpark(tick, e.uid, reduced) ? 1 : 0];
        if (img.texture.key !== key) img.setTexture(key);
        img
          .setPosition(Math.round(body.x + body.halfW - 2), Math.round(body.top + PANEL_DOWN_PX))
          .setVisible(true);
      }
    }
    this.#plusShown = p;
    this.#panelShown = q;
    for (; p < MAX_PLUSES; p++) {
      const img = this.#pluses[p]!; // p < MAX_PLUSES
      if (img.visible) img.setVisible(false);
    }
    for (; q < MAX_PANELS; q++) {
      const img = this.#panels[q]!; // q < MAX_PANELS
      if (img.visible) img.setVisible(false);
    }
  }

  reset(): void {
    for (const r of this.#rings) {
      r.ring.setVisible(false);
      r.pulse.setVisible(false);
    }
    for (const img of this.#pluses) img.setVisible(false);
    for (const img of this.#panels) img.setVisible(false);
    this.#plusShown = 0;
    this.#panelShown = 0;
    this.#pulseShown = 0;
  }

  /** Where a unit's rings sit: its drawn ground point, else its grid point. */
  #place(e: HealUnits['items'][number], out: Vec2): void {
    if (this.#anchors.box(e.uid, body)) {
      out.x = body.x;
      out.y = body.groundY;
    } else {
      gridToScreen(e.x, e.y, this.#ctx.origin, out);
    }
  }

  /** A ring frame (solid; with the `ink.0` under-stroke for the standing ring), registered once. */
  #frame(radiusTiles: number, color: typeof HEAL_COLOR, under: boolean): Frame {
    const r = snapRingRadius(radiusTiles);
    const key = `fx.heal.${color}.${r}.${under ? 'u' : 'p'}`;
    const cached = this.#frames.get(key);
    if (cached !== undefined) return cached;
    const ring = ringImage(r, color, false, under ? HEAL_UNDER : null);
    const textures = this.#ctx.scene.textures;
    if (!textures.exists(key)) textures.addCanvas(key, imageToCanvas(ring.image));
    const frame: Frame = { key, ox: ring.cx, oy: ring.cy };
    this.#frames.set(key, frame);
    return frame;
  }
}
