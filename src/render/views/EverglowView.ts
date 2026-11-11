// Everglow Security on the field (T603, polished by T630a; everglowLook.ts holds the rules and
// pixels):
// - **The Expediter's haste ring:** each frame, under every unit projecting a haste aura (the
//   sim's `projectedHaste`: alive, not leaving, burrowed or Phased), a solid `orange.3` ring at the
//   aura's radius over an `ink.0` under-stroke, beating bright and dim on the metronome, and on each
//   beat its `orange.4` swell ticking out past it. In `decal`, under the units, centred on the
//   source's body as EnemyView draws it (unitAnchor.ts).
// - **Speed marks** (a double chevron) behind the source and every unit a ring is hasting now
//   (`Enemy.auraHastePct` > 0; art-direction §8's `haste_aura` row), pointing the way it walks on
//   screen (read from its route just ahead of it), in `overlay` so the dark never hides them. No
//   event drives either: they read sim state.
// - **The shutdown** (deathLook.ts `shutdown`): on an `EnemyDied` whose unit shuts down, the
//   power-off line at its body and the price tag dropping to the ground, on real time. Both are
//   sprites (T640a): `fx.power_off`'s `w6`…`w1` and `dot` as the line collapses (`powerOffFrame`),
//   and `fx.price_tag`'s `hang`, `flutter_0`/`flutter_1` as it drops, `lie` on the ground
//   (`tagFrame`).
// Allocation-free per frame: rings, swells, marks, and shutdowns are pooled; each radius's ring
// texture (bright and dim are one texture at two alphas) and its two swells are registered once.
import type * as Phaser from 'phaser';
import type { CompiledEnemyDef } from '../../content/compiled.ts';
import type { ColorName } from '../../content/palettes/master.ts';
import type { SkitterkinDeath } from '../../content/presentation.ts';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { pointAt, projectedHaste, type Enemy, type Point, type SimEvent } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import type { SpriteSource } from '../sprites/SpriteSource.ts';
import { ringImage, snapRingRadius } from '../vfx/overlayPixels.ts';
import {
  HASTE_UNDER,
  hasteRingLook,
  screenHeading,
  SHUTDOWN_MS,
  shutdownLine,
  SPEED_MARKS_H,
  SPEED_MARKS_W,
  speedLinesFrame,
  speedMarksImage,
  SWELL_ALPHA,
  swellPx,
  swellRingImage,
  TAG_FALL_MS,
  TAG_HANG_PX,
  TAG_MS,
  tagDrop,
} from './everglowLook.ts';
import { deathStyle } from './deathLook.ts';
import { AIR_LIFT_PX } from './TransientFx.ts';
import { blankBox, NO_ANCHORS, type UnitAnchors } from './unitAnchor.ts';
import type { ViewContext } from './ViewContext.ts';

/** The enemy pool as the view reads it. */
export interface HastePool {
  readonly used: number;
  readonly items: readonly DeepReadonly<Enemy>[];
}

const MAX_RINGS = 8;
const MAX_LINES = 24;
const MAX_SHUTDOWNS = 8;
/** The speed marks' middle row (their display origin's y). */
const MARK_MID = (SPEED_MARKS_H - 1) / 2;
/** The speed marks' textures: [frame 0, frame 1] walking right, then walking left. */
const MARK_KEYS = [
  ['fx.haste_marks.0.r', 'fx.haste_marks.1.r'],
  ['fx.haste_marks.0.l', 'fx.haste_marks.1.l'],
] as const;
/** How far ahead along its route a unit's heading is read (tiles). */
const HEADING_AHEAD_TILES = 0.1;
const TAG_SPRITE = 'fx.price_tag';
const LINE_SPRITE = 'fx.power_off';
/** The tag flutters a frame each this many ms as it drops. */
const FLUTTER_MS = 75;

/** The price tag's frame `ms` after the death: hung, fluttering down, then lying on the ground. */
export function tagFrame(ms: number, reducedMotion: boolean): string {
  if (reducedMotion) return 'hang';
  if (ms >= TAG_FALL_MS) return 'lie';
  if (ms < FLUTTER_MS) return 'hang';
  return Math.floor(ms / FLUTTER_MS) % 2 === 0 ? 'flutter_0' : 'flutter_1';
}

/** The power-off line's frame for a half-width (px): `w6`…`w1`, or the `dot` at 0. */
export function powerOffFrame(halfW: number): string {
  return halfW <= 0 ? 'dot' : `w${Math.min(6, Math.round(halfW))}`;
}
/** The speed marks sit this far behind the body's edge (px), at this share of its height. */
const LINES_GAP_PX = 1;
const LINES_AT = 0.55;
/** A dying body's centre over its ground point (px): battleEvents.ts's DEATH_BODY_PX. */
const SHUTDOWN_BODY_PX = 6;

interface Ring {
  readonly img: Phaser.GameObjects.Image;
  /** The swell's echo ring, shown on the beat. */
  readonly swell: Phaser.GameObjects.Image;
  radius: number;
  color: ColorName | null;
  /** The swell texture it shows now (px out, snapped radius), so a frame rebuilds no key. */
  swellPx: number;
  swellR: number;
}

interface Mark {
  readonly img: Phaser.GameObjects.Image;
  /** Its unit's last screen heading (1 right, −1 left), kept while it walks straight up or down. */
  uid: number;
  heading: 1 | -1;
}

interface Shutdown {
  readonly tag: Phaser.GameObjects.Image;
  readonly line: Phaser.GameObjects.Image;
  /** The frames it shows now (set only on a change). */
  tagLook: string;
  lineLook: string;
  active: boolean;
  ms: number;
  /** Screen px: the body's centre (the line, and the tag hangs over it). */
  x: number;
  y: number;
  /** How far the tag falls to lie on the ground (px). */
  fallPx: number;
}

const pos: Vec2 = { x: 0, y: 0 };
const ahead: Point = { x: 0, y: 0 };
const body = blankBox();

export class EverglowView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #anchors: UnitAnchors;
  readonly #rings: Ring[] = [];
  readonly #frames = new Map<string, { key: string; ox: number; oy: number }>();
  /** Night rings (Act III, the finale: nightRings.ts): whole, beating brighter. */
  readonly #night: boolean;
  readonly #swells = new Map<string, { key: string; ox: number; oy: number }>();
  readonly #lines: Mark[] = [];
  readonly #shutdowns: Shutdown[] = [];
  #next = 0;
  #lining = 0;
  #tagH = 0;
  #tagAy = 0;
  /** Shutdowns played since the battle began (the smoke flow's check). */
  shutdownsPlayed = 0;

  constructor(
    ctx: ViewContext,
    reducedMotion: () => boolean,
    anchors: UnitAnchors = NO_ANCHORS,
    night = false,
  ) {
    this.#ctx = ctx;
    this.#night = night;
    this.#reducedMotion = reducedMotion;
    this.#anchors = anchors;
    const textures = ctx.scene.textures;
    for (const [h, keys] of MARK_KEYS.entries()) {
      for (const [k, key] of keys.entries()) {
        if (!textures.exists(key)) {
          const img = speedMarksImage(k === 0 ? 0 : 1, h === 0 ? 1 : -1);
          textures.addCanvas(key, imageToCanvas(img));
        }
      }
    }
    this.#tagH = ctx.sprites.meta(TAG_SPRITE).h;
    this.#tagAy = ctx.sprites.frameAnchor(TAG_SPRITE, 'hang').y;
    for (let i = 0; i < MAX_RINGS; i++) {
      const img = ctx.scene.make.image({}, false).setVisible(false);
      const swell = ctx.scene.make.image({}, false).setVisible(false);
      ctx.layers.decal.add(swell);
      ctx.layers.decal.add(img);
      this.#rings.push({ img, swell, radius: 0, color: null, swellPx: 0, swellR: 0 });
    }
    for (let i = 0; i < MAX_LINES; i++) {
      const img = ctx.scene.make.image({}, false).setVisible(false);
      img.setTexture(MARK_KEYS[0][0]).setDisplayOrigin(SPEED_MARKS_W - 1, MARK_MID);
      ctx.layers.overlay.add(img);
      this.#lines.push({ img, uid: 0, heading: 1 });
    }
    for (let i = 0; i < MAX_SHUTDOWNS; i++) {
      const line = ctx.scene.make.image({}, false).setVisible(false);
      const img = ctx.scene.make.image({}, false).setVisible(false);
      ctx.layers.vfx.add(line);
      ctx.layers.vfx.add(img);
      const s: Shutdown = {
        tag: img,
        line,
        tagLook: '',
        lineLook: '',
        active: false,
        ms: 0,
        x: 0,
        y: 0,
        fallPx: 0,
      };
      setLook(ctx.sprites, img, TAG_SPRITE, 'hang');
      setLook(ctx.sprites, line, LINE_SPRITE, 'w6');
      this.#shutdowns.push(s);
    }
  }

  /** How many haste rings show (the smoke flow's check). */
  get rings(): number {
    let n = 0;
    for (const r of this.#rings) if (r.img.visible) n++;
    return n;
  }

  /** How many units (sources and hasted units) trail speed lines now (the smoke flow's check). */
  get lines(): number {
    return this.#lining;
  }

  /** How many shutdowns are playing now (the smoke flow's check). */
  get shutdowns(): number {
    let n = 0;
    for (const s of this.#shutdowns) if (s.active) n++;
    return n;
  }

  /**
   * Plays the shutdown for every `EnemyDied` whose unit dies that way on this map (deathLook.ts
   * `shutdown` by the map's Skitterkin dial and the unit's faction), its body lifted as the death
   * effects lift theirs (a flyer's in the air).
   */
  bind(
    bus: Bus<SimEvent<IdSpace>>,
    enemies: { readonly [id: string]: Pick<CompiledEnemyDef, 'faction' | 'layer'> | undefined },
    skitterkin: SkitterkinDeath,
  ): () => void {
    return bus.on('EnemyDied', (e) => {
      const def = Object.hasOwn(enemies, e.enemy) ? enemies[e.enemy] : undefined;
      if (def === undefined || deathStyle(skitterkin, def.faction) !== 'shutdown') return;
      this.shutdown(e.x, e.y, SHUTDOWN_BODY_PX + (def.layer === 'air' ? AIR_LIFT_PX : 0));
    });
  }

  /** A unit shuts down at grid (x, y), its body `liftPx` up: the power-off and the price tag. */
  shutdown(x: number, y: number, liftPx: number): void {
    const s = this.#shutdowns[this.#next]!; // #next < MAX_SHUTDOWNS
    this.#next = (this.#next + 1) % MAX_SHUTDOWNS;
    gridToScreen(x, y, this.#ctx.origin, pos);
    s.x = Math.round(pos.x);
    s.y = Math.round(pos.y - liftPx);
    // Its string's top hangs TAG_HANG_PX over the body's centre; it comes to rest with its canvas's
    // foot on the ground.
    const foot = s.y - TAG_HANG_PX - this.#tagAy + this.#tagH - 1;
    s.fallPx = Math.max(0, Math.round(pos.y) - foot);
    s.ms = 0;
    s.active = true;
    this.shutdownsPlayed++;
    this.#syncShutdown(s);
  }

  update(enemies: HastePool, tick: number, dtMs: number): void {
    const reduced = this.#reducedMotion();
    const look = hasteRingLook(tick, reduced, this.#night);
    const alpha = look.alpha;
    const swell = swellPx(tick, reduced);
    let r = 0;
    let l = 0;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      if (!e.alive) continue;
      const aura = projectedHaste(e);
      const placed = (aura !== null || e.auraHastePct > 0) && this.#anchors.box(e.uid, body);
      if (aura !== null && r < MAX_RINGS) {
        const ring = this.#rings[r++]!; // r < MAX_RINGS
        if (ring.radius !== aura.radiusTiles || ring.color !== look.color) {
          const f = this.#frameFor(aura.radiusTiles, look.color);
          ring.img.setTexture(f.key).setDisplayOrigin(f.ox, f.oy);
          ring.radius = aura.radiusTiles;
          ring.color = look.color;
        }
        if (placed) {
          pos.x = body.x;
          pos.y = body.groundY;
        } else {
          gridToScreen(e.x, e.y, this.#ctx.origin, pos);
        }
        const x = Math.round(pos.x);
        const y = Math.round(pos.y);
        ring.img.setPosition(x, y).setAlpha(alpha).setVisible(true);
        this.#swell(ring, aura.radiusTiles, swell, x, y);
      }
      if ((aura !== null || e.auraHastePct > 0) && placed && l < MAX_LINES) {
        const mark = this.#lines[l++]!; // l < MAX_LINES
        if (mark.uid !== e.uid) {
          mark.uid = e.uid;
          mark.heading = 1;
        }
        const h = this.#heading(e);
        if (h !== 0) mark.heading = h;
        const right = mark.heading === 1;
        const key = MARK_KEYS[right ? 0 : 1][speedLinesFrame(tick, e.uid, reduced)];
        if (mark.img.texture.key !== key) {
          // Behind the body: its tip on the body's trailing edge.
          mark.img.setTexture(key).setDisplayOrigin(right ? SPEED_MARKS_W - 1 : 0, MARK_MID);
        }
        const edge = right
          ? body.x - body.halfW - LINES_GAP_PX
          : body.x + body.halfW + LINES_GAP_PX;
        mark.img
          .setPosition(Math.round(edge), Math.round(body.top + (body.bottom - body.top) * LINES_AT))
          .setVisible(true);
      }
    }
    for (; r < MAX_RINGS; r++) {
      const ring = this.#rings[r]!; // r < MAX_RINGS
      if (ring.img.visible) ring.img.setVisible(false);
      if (ring.swell.visible) ring.swell.setVisible(false);
    }
    this.#lining = l;
    for (; l < MAX_LINES; l++) {
      const mark = this.#lines[l]!; // l < MAX_LINES
      mark.uid = 0;
      if (mark.img.visible) mark.img.setVisible(false);
    }
    this.#advance(Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0);
  }

  /** How many swells show now (the smoke flow's check: the metronome keeps time). */
  get swells(): number {
    let n = 0;
    for (const r of this.#rings) if (r.swell.visible) n++;
    return n;
  }

  reset(): void {
    for (const r of this.#rings) {
      r.img.setVisible(false);
      r.swell.setVisible(false);
    }
    for (const m of this.#lines) {
      m.uid = 0;
      m.img.setVisible(false);
    }
    for (const s of this.#shutdowns) {
      s.active = false;
      s.tag.setVisible(false);
      s.line.setVisible(false);
    }
    this.#lining = 0;
  }

  /** Advances the shutdowns by `dt` ms and redraws their power-off lines. */
  #advance(dt: number): void {
    for (const s of this.#shutdowns) {
      if (!s.active) continue;
      s.ms += dt;
      if (s.ms >= Math.max(SHUTDOWN_MS, TAG_MS)) {
        s.active = false;
        s.tag.setVisible(false);
        s.line.setVisible(false);
        continue;
      }
      this.#syncShutdown(s);
    }
  }

  #syncShutdown(s: Shutdown): void {
    const line = shutdownLine(s.ms);
    if (line.alpha > 0) {
      const f = powerOffFrame(line.halfW);
      if (f !== s.lineLook) {
        setLook(this.#ctx.sprites, s.line, LINE_SPRITE, f);
        s.lineLook = f;
      }
      s.line.setPosition(s.x, s.y).setAlpha(line.alpha).setVisible(true);
    } else if (s.line.visible) {
      s.line.setVisible(false);
    }
    const reduced = this.#reducedMotion();
    const tf = tagFrame(s.ms, reduced);
    if (tf !== s.tagLook) {
      setLook(this.#ctx.sprites, s.tag, TAG_SPRITE, tf);
      s.tagLook = tf;
    }
    const tag = tagDrop(s.ms, s.fallPx, reduced);
    if (tag.alpha <= 0) {
      s.tag.setVisible(false);
      return;
    }
    s.tag
      .setPosition(s.x, s.y - TAG_HANG_PX + tag.dy)
      .setAlpha(tag.alpha)
      .setVisible(true);
  }

  /**
   * Which way unit `e` walks on screen now (1 right, −1 left, 0 straight up or down): its route
   * just ahead of where it stands against where it stands.
   */
  #heading(e: DeepReadonly<Enemy>): -1 | 0 | 1 {
    const route = e.route;
    if (route === null) return 0;
    pointAt(route, e.dist + HEADING_AHEAD_TILES, ahead);
    return screenHeading(ahead.x - e.x, ahead.y - e.y);
  }

  /** Shows `ring`'s swell `px` out (0: hidden) round screen (x, y), baking its texture once. */
  #swell(ring: Ring, radiusTiles: number, px: number, x: number, y: number): void {
    if (px <= 0) {
      if (ring.swell.visible) ring.swell.setVisible(false);
      return;
    }
    const r = snapRingRadius(radiusTiles);
    if (ring.swellPx !== px || ring.swellR !== r) {
      const id = `${r}.${px}`;
      let f = this.#swells.get(id);
      if (f === undefined) {
        const key = `fx.haste_swell.${id}`;
        const baked = swellRingImage(r, px);
        if (!this.#ctx.scene.textures.exists(key)) {
          this.#ctx.scene.textures.addCanvas(key, imageToCanvas(baked.image));
        }
        f = { key, ox: baked.cx, oy: baked.cy };
        this.#swells.set(id, f);
      }
      ring.swell.setTexture(f.key).setDisplayOrigin(f.ox, f.oy);
      ring.swellPx = px;
      ring.swellR = r;
    }
    ring.swell.setPosition(x, y).setAlpha(SWELL_ALPHA).setVisible(true);
  }

  /** The ring texture for a radius and colour, registered on first use (on a change only). */
  #frameFor(radiusTiles: number, color: ColorName): { key: string; ox: number; oy: number } {
    const r = snapRingRadius(radiusTiles);
    const key = `fx.haste_ring.${color}.${r}`;
    const cached = this.#frames.get(key);
    if (cached !== undefined) return cached;
    const ring = ringImage(r, color, false, HASTE_UNDER);
    if (!this.#ctx.scene.textures.exists(key)) {
      this.#ctx.scene.textures.addCanvas(key, imageToCanvas(ring.image));
    }
    const f = { key, ox: ring.cx, oy: ring.cy };
    this.#frames.set(key, f);
    return f;
  }
}

/** Points `img` at a sprite frame, its display origin on the frame's anchor. */
function setLook(
  sprites: SpriteSource,
  img: Phaser.GameObjects.Image,
  id: 'fx.price_tag' | 'fx.power_off',
  frame: string,
): void {
  const f = sprites.frame(id, frame);
  const a = sprites.frameAnchor(id, frame);
  img.setTexture(f.texture, f.frame).setDisplayOrigin(a.x, a.y);
}
