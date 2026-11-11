// The pooled transient effects (art-direction §7; T225 split from FxView.ts): every effect is a
// slot in a fixed array, made once and reused (the oldest of a kind is reused when its pool is
// full), so a busy wave allocates nothing. Cosmetic, on real time.
// - Hitscan tracers (Rivet, Bricks): the projectile.rivet_tracer streak flying from the muzzle to
//   the target in a few frames (the shot itself landed on the tick it fired); Suppressing Fire's
//   streaks are the same, drawn thick.
// - Effect rings: a Sprinkler's pulse, a leak at the core, a Thumper's splash, a build's dust, an
//   upgrade; each grows in quarter tiles or holds at its radius, and fades in steps.
// - Bursts: fx.explosion at a shell's impact (or a death); a Cluster Thumper's bomblets pop with
//   the small fx.bomblet_burst.
// - Ground decals (a strike's flash and scorch), floating numbers and callouts in the 3×5 pixel
//   font (none within KEEP_CLEAR_TILES of a clickable or a lift, D134: vfx/keepClear.ts), and
//   the camera shake (a strike's 2 px, a leak's 1 px; skipped under reduced motion).
// - Debris (T430a): pooled 1 and 2 px palette pixels with a velocity, gravity, and a stepped fade
//   (art-direction § Particles: at most 0.8 s each, far under the 512 cap): an Aelari unit's
//   shatter and a broken shield's shards, the stardust
//   fleck an Act II Skitterkin leaves (deathLook.ts), and a boss's shed spark to each shard (D139). Cosmetic RNG of its own, never the sim's.
// - Unravel motes (T630a): a Hollow unit comes apart into `fx.unravel_mote` sprites (a pool of
//   MAX_MOTES, its `drift` twinkle started a frame apart per mote; held on its `m0` cross under
//   reduced motion), drifting up and away, stepping down the alpha ladder over their life.
// - Splats (T730a; gloopLook.ts): a Gloop glob's green splash where it lands, over what it hit
//   (its own pool of SPLAT_POOL in `vfx`, made on the first splat; stepping out), its splash's
//   reach in a green ring, and green drops flung up (none under reduced motion).
// FxView adds the abilities' effects on top (the Orbital Strike, Suppressing Fire).
import type * as Phaser from 'phaser';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import {
  BOMBLET_BURST_MS,
  burstAlpha,
  BURST_MS,
  BURSTS_PER_TILE,
  fadeAlpha,
  floatRise,
  lobVelocity,
  FLOAT_MS,
  FLOAT_RISE_PX,
  LEAK_SHAKE_MS,
  leakShakeOffset,
  PULSE_MS,
  pulseRadius,
  SHAKE_MS,
  shakeOffset,
  TRACER_MS,
} from '../vfx/fxTiming.ts';
import {
  debrisTexture,
  effectRingTexture,
  floatTextTexture,
  PULSE_COLOR,
} from '../vfx/overlayTextures.ts';
import { FLOAT_ROW_PX, stackFloat, type FloatSlot } from '../vfx/floatStack.ts';
import type { KeepClear } from '../vfx/keepClear.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { SPLAT_DROP_COLORS, SPLAT_DROPS, SPLAT_MS, SPLAT_RING, splatImage } from './gloopLook.ts';
import type { ViewContext } from './ViewContext.ts';

/** Pool sizes: the oldest effect of a kind is reused when its pool is full. */
const MAX_TRACERS = 64;
const MAX_PULSES = 32;
const MAX_DECALS = 8;
const MAX_FLOATS = 16;
/** Floaters draw over the rest of the overlay layer (its other children stay at depth 0). */
const FLOAT_DEPTH = 1;
const MAX_BURSTS = 40;
/** Gloop splats on the ground at once (T730a; the oldest is reused), and their texture's key. */
const SPLAT_POOL = 12;
const SPLAT_KEY = 'fx.gloop_splat';
/** The splat's centre in its image (gloopLook.ts `splatImage`). */
const SPLAT_OX = 8;
const SPLAT_OY = 4;
const MAX_DEBRIS = 128;
/** Unravel motes in flight at once (a crowd of deaths reuses the oldest). */
const MAX_MOTES = 48;
const MOTE_SPRITE = 'fx.unravel_mote';
/** The drift anim's frames (a mote starts on frame `i % MOTE_FRAMES`). */
const MOTE_FRAMES = 4;

/** Suppressing Fire's streaks are 3 px thick and twice a Rivet's length (D059): heavy fire. */
const SUPPRESS_STREAK_SCALE = { x: 2, y: 3 } as const;
/** Where a tower's shot leaves its head, above the tile center (px). */
const MUZZLE_LIFT_PX = 10;
/** Where a shot meets its target, above the ground point (px); flyers draw 12 px higher. */
export const BODY_LIFT_PX = 4;
export const AIR_LIFT_PX = 12;

interface Tracer {
  active: boolean;
  /** A Suppressing Fire streak (drawn thick), not a Rivet's. */
  thick: boolean;
  ms: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  img: Phaser.GameObjects.Image;
}

/** An effect ring: grows (in quarter tiles) or holds at its radius, and fades in steps. */
interface Pulse {
  active: boolean;
  ms: number;
  durationMs: number;
  radiusTiles: number;
  grow: boolean;
  color: ColorName;
  img: Phaser.GameObjects.Image;
  shownRadius: number;
  shownColor: ColorName | null;
}

/** A ground decal (a strike's flash, a scorch) that fades in steps. */
interface Decal {
  active: boolean;
  ms: number;
  durationMs: number;
  img: Phaser.GameObjects.Image;
}

/** A floating number rising from a point. */
interface Float extends FloatSlot {
  active: boolean;
  /** A callout newer floaters don't take over while it's up (FIZZLED: jamLook.ts). */
  keep: boolean;
  ms: number;
  durationMs: number;
  x: number;
  y: number;
  /** Where it rose from on the grid (the keep-clear check's). */
  gx: number;
  gy: number;
  /** As drawn now (floatStack.ts reads them): its center, baseline, and width. */
  cx: number;
  baseY: number;
  w: number;
  img: Phaser.GameObjects.Image;
}

interface Burst {
  active: boolean;
  /** Negative while waiting for its delay. */
  ms: number;
  /** A bomblet's small pop (fx.bomblet_burst) instead of the shell's fx.explosion. */
  small: boolean;
  /** The tile it bursts on (the per-tile cap's; −1 for one placed by screen offset). */
  col: number;
  row: number;
  sprite: Phaser.GameObjects.Sprite;
}

/** A debris pixel: a shard, a mote, or a fleck, moving in screen px. */
interface Debris {
  active: boolean;
  ms: number;
  lifeMs: number;
  /** Screen position and velocity (px, px/ms), and gravity (px/ms²). */
  x: number;
  y: number;
  vx: number;
  vy: number;
  g: number;
  /** Holds 100% to the end rather than stepping out (a shed spark, which must land seen). */
  steady: boolean;
  /** Its pixel's size (the texture it shows). */
  size: 1 | 2;
  img: Phaser.GameObjects.Image;
}

/** An unravel mote: an `fx.unravel_mote` sprite drifting in screen px (px/ms). */
interface Mote {
  active: boolean;
  ms: number;
  lifeMs: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  sprite: Phaser.GameObjects.Sprite;
}

/** Shard and mote colours (art-direction §4): the Aelari's jewel tones, the unsung's cold violet. */
const SHATTER_COLORS: readonly ColorName[] = ['blue.4', 'teal.4', 'white.1', 'pink.4', 'blue.3'];
const SHIELD_SHARD_COLORS: readonly ColorName[] = ['blue.4', 'white.1', 'blue.3'];
/** A shed spark (D139 S4): its flight (ms), its lob's gravity (px/ms²: a 40 px arc, cresting over a
 * Penitent's hood against the dark before it falls to the shard), its pixels. */
export const SHED_MS = 400;
const SHED_G = 0.002;
const SHED_LAG_MS = 30;
const SHED_TRAIL: readonly { readonly size: 1 | 2; readonly color: ColorName }[] = [
  { size: 2, color: 'white.1' },
  { size: 1, color: 'teal.4' },
  { size: 1, color: 'blue.3' },
];

/** How each debris kind moves and lasts. */
const SHATTER = {
  count: 12,
  speed: [0.035, 0.07],
  lift: 0.06,
  g: 0.00028,
  ms: 560,
  sizes: [2, 2, 1],
} as const;
const SHIELD_SHARDS = {
  count: 7,
  speed: [0.04, 0.065],
  lift: 0.03,
  g: 0.00025,
  ms: 380,
  sizes: [2, 1, 1],
} as const;
const UNRAVEL = { count: 8, rise: [0.012, 0.024], drift: 0.012, ms: 780 } as const;
const FLECK_MS = 1400;

/** The two burst looks: the shell's explosion and a bomblet's pop, how long each plays, and its frames. */
const BURST_LOOKS = {
  big: { id: 'fx.explosion', ms: BURST_MS, frames: 4 },
  small: { id: 'fx.bomblet_burst', ms: BOMBLET_BURST_MS, frames: 3 },
} as const;

const pos: Vec2 = { x: 0, y: 0 };

/** A ground decal's texture: its key and display origin. */
export interface DecalTexture {
  readonly key: string;
  readonly ox: number;
  readonly oy: number;
}

export class TransientFx {
  protected readonly ctx: ViewContext;
  protected readonly reducedMotion: () => boolean;
  /**
   * One Graphics for effects drawn as shapes (FxView's strike beams), cleared each frame. Made
   * first, so it draws under the tracers and bursts in `vfx`.
   */
  protected readonly gfx: Phaser.GameObjects.Graphics;
  readonly #tracers: Tracer[] = [];
  readonly #pulses: Pulse[] = [];
  readonly #decals: Decal[] = [];
  readonly #floats: Float[] = [];
  readonly #bursts: Burst[] = [];
  readonly #debris: Debris[] = [];
  #nextDebris = 0;
  readonly #splats: Decal[] = [];
  #nextSplat = 0;
  readonly #motes: Mote[] = [];
  #nextMote = 0;
  /** The debris's cosmetic RNG state (xorshift32): its own, so the sim's never moves. */
  #rng = 0x9e3779b9;
  #nextTracer = 0;
  #nextPulse = 0;
  #nextBurst = 0;
  #nextDecal = 0;
  #nextFloat = 0;
  #shakeMs = -1;
  /** The spots floaters keep clear of (a clickable, a lift; the scene's), or none. */
  #keepClear: KeepClear | null = null;
  /** Which shake runs: the strike's 2 px or a leak's 1 px. */
  #shakeSmall = false;
  /** Shell bursts skipped by the per-tile cap since the view was made (the smoke flow's check). */
  burstsCapped = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean) {
    this.ctx = ctx;
    this.reducedMotion = reducedMotion;
    const { scene, layers, sprites } = ctx;
    this.gfx = scene.make.graphics({}, false);
    layers.vfx.add(this.gfx);
    const streak = sprites.frame('projectile.rivet_tracer', 'e');
    const streakAnchor = sprites.meta('projectile.rivet_tracer').anchor;
    for (let i = 0; i < MAX_TRACERS; i++) {
      const img = scene.make.image({}, false);
      img.setTexture(streak.texture, streak.frame).setDisplayOrigin(streakAnchor.x, streakAnchor.y);
      img.setVisible(false);
      layers.vfx.add(img);
      this.#tracers.push({ active: false, thick: false, ms: 0, x0: 0, y0: 0, x1: 0, y1: 0, img });
    }
    for (let i = 0; i < MAX_PULSES; i++) {
      const img = scene.make.image({}, false).setVisible(false);
      layers.decal.add(img);
      this.#pulses.push({
        active: false,
        ms: 0,
        durationMs: PULSE_MS,
        radiusTiles: 0,
        grow: true,
        color: PULSE_COLOR,
        img,
        shownRadius: 0,
        shownColor: null,
      });
    }
    for (let i = 0; i < MAX_DECALS; i++) {
      const img = scene.make.image({}, false).setVisible(false);
      layers.decal.add(img);
      this.#decals.push({ active: false, ms: 0, durationMs: 0, img });
    }
    for (let i = 0; i < MAX_FLOATS; i++) {
      // Over everything else in the overlay (health bars, tells, outlines), so a number reads.
      const img = scene.make.image({}, false).setVisible(false).setDepth(FLOAT_DEPTH);
      layers.overlay.add(img);
      this.#floats.push({
        active: false,
        keep: false,
        ms: 0,
        durationMs: FLOAT_MS,
        x: 0,
        y: 0,
        gx: 0,
        gy: 0,
        cx: 0,
        baseY: 0,
        w: 0,
        img,
      });
    }
    const boom = sprites.meta('fx.explosion').anchor;
    const boomFrame = sprites.frame('fx.explosion', 'f0');
    for (let i = 0; i < MAX_BURSTS; i++) {
      const sprite = scene.make.sprite({}, false);
      sprite.setTexture(boomFrame.texture, boomFrame.frame).setDisplayOrigin(boom.x, boom.y);
      sprite.setVisible(false);
      layers.vfx.add(sprite);
      this.#bursts.push({ active: false, ms: 0, small: false, col: -1, row: -1, sprite });
    }
    const moteAnchor = sprites.meta(MOTE_SPRITE).anchor;
    const moteFrame = sprites.frame(MOTE_SPRITE, 'm0');
    for (let i = 0; i < MAX_MOTES; i++) {
      const sprite = scene.make.sprite({}, false);
      sprite.setTexture(moteFrame.texture, moteFrame.frame);
      sprite.setDisplayOrigin(moteAnchor.x, moteAnchor.y).setVisible(false);
      layers.vfx.add(sprite);
      this.#motes.push({ active: false, ms: 0, lifeMs: 0, x: 0, y: 0, vx: 0, vy: 0, sprite });
    }
    const px1 = debrisTexture(scene, 1);
    for (let i = 0; i < MAX_DEBRIS; i++) {
      const img = scene.make.image({}, false).setTexture(px1).setOrigin(0, 0).setVisible(false);
      layers.vfx.add(img);
      this.#debris.push({
        active: false,
        ms: 0,
        lifeMs: 0,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        g: 0,
        steady: false,
        size: 1,
        img,
      });
    }
  }

  /**
   * A Gloop glob's splat at grid (x, y) (T730a; gloopLook.ts): the green splat on the ground, the
   * splash's reach `radiusTiles` in a green ring, and green drops flung up (none, reduced motion).
   */
  splat(x: number, y: number, radiusTiles: number): void {
    if (this.#splats.length === 0) this.#makeSplats();
    const s = this.#splats[this.#nextSplat]!; // index < SPLAT_POOL
    this.#nextSplat = (this.#nextSplat + 1) % SPLAT_POOL;
    gridToScreen(x, y, this.ctx.origin, pos);
    s.img
      .setPosition(Math.round(pos.x), Math.round(pos.y) - 2)
      .setAlpha(1)
      .setVisible(true);
    s.ms = 0;
    s.active = true;
    this.splatsShown++;
    if (radiusTiles > 0) this.ring(x, y, radiusTiles, SPLAT_RING, SPLAT_MS, false);
    if (!this.reducedMotion()) {
      this.#spray(pos.x, pos.y - 2, SPLAT_DROPS, SPLAT_DROP_COLORS, 2);
    }
  }

  /** Splats played since the view was made (the smoke flow's check). */
  splatsShown = 0;

  /** The splat pool, made on the first splat, in `vfx`: the splash lands over the units it hits. */
  #makeSplats(): void {
    const { scene, layers } = this.ctx;
    if (!scene.textures.exists(SPLAT_KEY)) {
      scene.textures.addCanvas(SPLAT_KEY, imageToCanvas(splatImage()));
    }
    for (let i = 0; i < SPLAT_POOL; i++) {
      const img = scene.make.image({}, false).setTexture(SPLAT_KEY);
      img.setDisplayOrigin(SPLAT_OX, SPLAT_OY).setVisible(false);
      layers.vfx.add(img);
      this.#splats.push({ active: false, ms: 0, durationMs: SPLAT_MS, img });
    }
  }

  /** Debris pixels in flight (the render-state hook's count). */
  get debrisLive(): number {
    let n = 0;
    for (const d of this.#debris) if (d.active) n++;
    for (const m of this.#motes) if (m.active) n++;
    return n;
  }

  /**
   * An Aelari unit shatters at grid (x, y), `liftPx` up (its body): jewel-toned shards fly out and
   * fall, with a small white flash (deathLook.ts `shatter`; the chime is audio's).
   */
  shatter(x: number, y: number, liftPx: number): void {
    gridToScreen(x, y, this.ctx.origin, pos);
    this.#spray(pos.x, pos.y - liftPx, SHATTER, SHATTER_COLORS, 0);
    this.ring(x, y, 0.5, 'white.1', 200, true, liftPx);
  }

  /** A broken shield's shards from its bubble round the body at grid (x, y), `liftPx` up. */
  shieldShards(x: number, y: number, liftPx: number): void {
    gridToScreen(x, y, this.ctx.origin, pos);
    this.#spray(pos.x, pos.y - liftPx, SHIELD_SHARDS, SHIELD_SHARD_COLORS, 6);
  }

  /** A Hollow unit unravels at grid (x, y): cold-violet motes drift up and away from its body. */
  unravel(x: number, y: number, liftPx: number): void {
    gridToScreen(x, y, this.ctx.origin, pos);
    const sx = pos.x;
    const sy = pos.y - liftPx;
    const still = this.reducedMotion();
    const anim = this.ctx.sprites.anim(MOTE_SPRITE, 'drift');
    for (let i = 0; i < UNRAVEL.count; i++) {
      const rise = UNRAVEL.rise[0] + this.#rand() * (UNRAVEL.rise[1] - UNRAVEL.rise[0]);
      const drift = (this.#rand() * 2 - 1) * UNRAVEL.drift;
      const ox = Math.round((this.#rand() * 2 - 1) * 5);
      const oy = -Math.round(this.#rand() * 9);
      const m = this.#motes[this.#nextMote]!; // index < MAX_MOTES
      this.#nextMote = (this.#nextMote + 1) % MAX_MOTES;
      m.active = true;
      m.ms = 0;
      m.lifeMs = UNRAVEL.ms;
      m.x = sx + ox;
      m.y = sy + oy;
      m.vx = drift;
      m.vy = -rise;
      m.sprite.setPosition(Math.round(m.x), Math.round(m.y)).setAlpha(1).setVisible(true);
      // Each twinkles a frame apart, so a cloud of them never blinks in unison; held still under
      // reduced motion on the brightest look.
      m.sprite.play({ key: anim, startFrame: i % MOTE_FRAMES });
      if (still) m.sprite.anims.pause(m.sprite.anims.currentAnim?.frames[0]);
    }
  }

  /** Unravel motes in flight (the render-state hook and the smoke flow's check). */
  get motesLive(): number {
    let n = 0;
    for (const m of this.#motes) if (m.active) n++;
    return n;
  }

  /** The small stardust fleck an Act II Skitterkin leaves where it fell, lingering on the ground. */
  fleck(x: number, y: number): void {
    gridToScreen(x, y, this.ctx.origin, pos);
    this.#spawn(pos.x, pos.y - 1, 0, 0, 0, FLECK_MS, 1, 'gold.4');
    this.#spawn(pos.x + 1, pos.y - 1, 0, 0, 0, FLECK_MS, 1, 'pink.3');
  }

  /**
   * A boss sheds a shard (D139 S4): a spark lobs from its heart at grid (x0, y0), `fromLiftPx` up,
   * high over its head and down to the shard's body at grid (x1, y1) in SHED_MS, a 2 px `white.1` head with a `teal.4` and a
   * `blue.3` pixel trailing, held whole so it lands seen. Under reduced motion nothing flies: the
   * spot itself glints for the same time.
   */
  shed(x0: number, y0: number, x1: number, y1: number, fromLiftPx: number): void {
    gridToScreen(x1, y1, this.ctx.origin, pos);
    const tx = pos.x;
    const ty = pos.y - BODY_LIFT_PX;
    if (this.reducedMotion()) {
      this.#spawn(tx, ty, 0, 0, 0, SHED_MS, 2, 'white.1', true);
      return;
    }
    gridToScreen(x0, y0, this.ctx.origin, pos);
    const sx = pos.x;
    const sy = pos.y - fromLiftPx;
    const vx = (tx - sx) / SHED_MS;
    const vy = lobVelocity(ty - sy, SHED_MS, SHED_G);
    for (let i = 0; i < SHED_TRAIL.length; i++) {
      const k = SHED_TRAIL[i]!; // i < length
      // Each trailing pixel leaves a little later on the same arc, so it follows the head.
      const lag = i * SHED_LAG_MS;
      const life = SHED_MS - lag;
      const bx = sx + vx * lag;
      const by = sy + vy * lag + 0.5 * SHED_G * lag * lag;
      this.#spawn(bx, by, vx, vy + SHED_G * lag, SHED_G, life, k.size, k.color, true);
    }
  }

  /** `kind.count` pixels flung out from (sx, sy) at random angles, starting `startPx` out. */
  #spray(
    sx: number,
    sy: number,
    kind: {
      readonly count: number;
      readonly speed: readonly [number, number];
      readonly lift: number;
      readonly g: number;
      readonly ms: number;
      readonly sizes: readonly (1 | 2)[];
    },
    colors: readonly ColorName[],
    startPx: number,
  ): void {
    for (let i = 0; i < kind.count; i++) {
      const a = ((i + this.#rand() * 0.8) / kind.count) * Math.PI * 2;
      const speed = kind.speed[0] + this.#rand() * (kind.speed[1] - kind.speed[0]);
      const cx = Math.cos(a);
      // Squashed 2:1, like the ground the iso camera sees.
      const cy = Math.sin(a) * 0.5;
      const color = colors[i % colors.length]!; // index < length
      this.#spawn(
        sx + cx * startPx,
        sy + cy * startPx,
        cx * speed,
        cy * speed - kind.lift,
        kind.g,
        kind.ms,
        kind.sizes[i % kind.sizes.length] ?? 1,
        color,
      );
    }
  }

  #spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    g: number,
    lifeMs: number,
    size: 1 | 2,
    color: ColorName,
    steady = false,
  ): void {
    const d = this.#debris[this.#nextDebris]!; // index < MAX_DEBRIS
    this.#nextDebris = (this.#nextDebris + 1) % MAX_DEBRIS;
    if (d.size !== size || !d.active) {
      d.img.setTexture(debrisTexture(this.ctx.scene, size));
      d.size = size;
    }
    d.x = x;
    d.y = y;
    d.vx = vx;
    d.vy = vy;
    d.g = g;
    d.ms = 0;
    d.lifeMs = lifeMs;
    d.steady = steady;
    d.active = true;
    d.img.setTint(tintOf(color)).setAlpha(1).setVisible(true);
    d.img.setPosition(Math.round(x), Math.round(y));
  }

  /** The next cosmetic random number in [0, 1). */
  #rand(): number {
    let r = this.#rng;
    r ^= r << 13;
    r ^= r >>> 17;
    r ^= r << 5;
    this.#rng = r >>> 0;
    return this.#rng / 4294967296;
  }

  /** A hitscan shot from a tower at grid (x0, y0) to a target at grid (x1, y1). */
  tracer(x0: number, y0: number, x1: number, y1: number, targetAir: boolean): void {
    gridToScreen(x0, y0, this.ctx.origin, pos);
    this.tracerFrom(pos.x, pos.y - MUZZLE_LIFT_PX, x1, y1, targetAir);
  }

  /** A hitscan shot from screen point (sx, sy) (an ally's muzzle) to a target at grid (x1, y1). */
  tracerFrom(sx: number, sy: number, x1: number, y1: number, targetAir: boolean): void {
    gridToScreen(x1, y1, this.ctx.origin, pos);
    this.streak(sx, sy, pos.x, pos.y - BODY_LIFT_PX - (targetAir ? AIR_LIFT_PX : 0));
  }

  /** A tracer streak between two screen points; `thick` for Suppressing Fire's. */
  streak(x0: number, y0: number, x1: number, y1: number, thick = false): void {
    const t = this.#tracers[this.#nextTracer]!; // index < MAX_TRACERS
    this.#nextTracer = (this.#nextTracer + 1) % MAX_TRACERS;
    if (thick !== t.thick) {
      t.img.setScale(thick ? SUPPRESS_STREAK_SCALE.x : 1, thick ? SUPPRESS_STREAK_SCALE.y : 1);
      t.thick = thick;
    }
    t.x0 = x0;
    t.y0 = y0;
    t.x1 = x1;
    t.y1 = y1;
    t.ms = 0;
    t.active = true;
    // The streak's head (its white end) points at the target.
    t.img.setRotation(Math.atan2(t.y1 - t.y0, t.x1 - t.x0));
    this.#drawTracer(t);
  }

  /** A Sprinkler pulse ring from a tower at grid (x, y) out to `radiusTiles`. */
  pulse(x: number, y: number, radiusTiles: number): void {
    this.ring(x, y, radiusTiles, PULSE_COLOR, PULSE_MS, true);
  }

  /**
   * An effect ring on the ground at grid (x, y): grows from a quarter tile to `radiusTiles` over
   * `ms` (`grow`), or holds at it, fading in steps either way. `liftPx` raises it onto a raised
   * tile's top face (a tower's upgrade ring on high ground, T221).
   */
  ring(
    x: number,
    y: number,
    radiusTiles: number,
    color: ColorName,
    ms: number,
    grow: boolean,
    liftPx = 0,
  ): void {
    if (radiusTiles <= 0) return;
    const p = this.#pulses[this.#nextPulse]!; // index < MAX_PULSES
    this.#nextPulse = (this.#nextPulse + 1) % MAX_PULSES;
    gridToScreen(x, y, this.ctx.origin, pos);
    p.img.setPosition(pos.x, pos.y - liftPx);
    p.radiusTiles = radiusTiles;
    p.durationMs = ms;
    p.grow = grow;
    p.color = color;
    p.shownRadius = 0;
    p.ms = 0;
    p.active = true;
    this.#syncPulse(p);
  }

  /** The spots floaters keep clear of (the scene refills it each frame). */
  setKeepClear(keepClear: KeepClear): void {
    this.#keepClear = keepClear;
  }

  /**
   * Whether a floater `w` wide at (cx, baseY), rising `risePx` more, would draw over a spot kept
   * clear (D134 K2).
   */
  #overClear(cx: number, baseY: number, w: number, risePx: number): boolean {
    const k = this.#keepClear;
    if (k === null || k.size === 0) return false;
    return k.covers(cx - w / 2, baseY - risePx - FLOAT_ROW_PX, cx + w / 2, baseY);
  }

  /** How many floaters are up (tests' view of them). */
  get floatsUp(): number {
    let n = 0;
    for (const f of this.#floats) if (f.active) n++;
    return n;
  }

  /**
   * A floating number or callout (the 3×5 font) rising from grid (x, y), `liftPx` above the
   * ground, for `ms` (a callout stays up longer, to be read). A `keep` one isn't taken over by a
   * newer floater while it's up (the oldest of the rest is), unless every slot is kept.
   */
  floatText(
    text: string,
    color: ColorName,
    x: number,
    y: number,
    liftPx: number,
    ms = FLOAT_MS,
    keep = false,
  ): void {
    // Nothing rises over what the player can reach (D134 K2).
    if (this.#keepClear?.near(x, y) === true) return;
    for (let k = 0; k < MAX_FLOATS; k++) {
      const q = this.#floats[this.#nextFloat]!; // index < MAX_FLOATS
      if (!q.active || !q.keep) break;
      this.#nextFloat = (this.#nextFloat + 1) % MAX_FLOATS;
    }
    const f = this.#floats[this.#nextFloat]!; // index < MAX_FLOATS
    gridToScreen(x, y, this.ctx.origin, pos);
    const key = floatTextTexture(this.ctx.scene, text, color);
    const w = this.ctx.scene.textures.getFrame(key)?.width ?? 0;
    // Clear of the floaters already up (T334), or dropped where they're stacked full (T332). The
    // oldest slot it takes over doesn't count.
    const wasActive = f.active;
    f.active = false;
    const cx = Math.round(pos.x);
    const baseY = stackFloat(this.#floats, cx, Math.round(pos.y - liftPx), w);
    if (baseY === null || this.#overClear(cx, baseY, w, FLOAT_RISE_PX)) {
      f.active = wasActive;
      return;
    }
    this.#nextFloat = (this.#nextFloat + 1) % MAX_FLOATS;
    f.img.setTexture(key);
    f.img.setOrigin(0.5, 1);
    f.x = cx;
    f.y = baseY;
    f.gx = x;
    f.gy = y;
    f.cx = cx;
    f.w = w;
    f.ms = 0;
    f.durationMs = ms;
    f.keep = keep;
    f.active = true;
    this.#syncFloat(f);
  }

  /** A 1 px camera shake for a leak (skipped under reduced motion; a strike's shake wins). */
  leakShake(): void {
    if (this.reducedMotion() || (this.#shakeMs >= 0 && !this.#shakeSmall)) return;
    this.#shakeSmall = true;
    this.#shakeMs = 0;
  }

  /**
   * An explosive burst on the ground at grid (x, y), after `delayMs`; `small` for a bomblet's pop
   * (fx.bomblet_burst); `liftPx` raises it into the air (a flak burst at a flyer's height).
   */
  burst(x: number, y: number, delayMs = 0, small = false, liftPx = 0): void {
    const b = this.#bursts[this.#nextBurst]!; // index < MAX_BURSTS
    b.col = Math.floor(x);
    b.row = Math.floor(y);
    this.#nextBurst = (this.#nextBurst + 1) % MAX_BURSTS;
    gridToScreen(x, y, this.ctx.origin, pos);
    if (small !== b.small) {
      const id = BURST_LOOKS[small ? 'small' : 'big'].id;
      const a = this.ctx.sprites.meta(id).anchor;
      const f = this.ctx.sprites.frame(id, 'f0');
      b.sprite.setTexture(f.texture, f.frame).setDisplayOrigin(a.x, a.y);
      b.small = small;
    }
    // The burst's anchor is its base, so lift it to sit centered on the ground point.
    b.sprite.setPosition(pos.x, pos.y + 4 - liftPx);
    b.sprite.stop().setVisible(false);
    b.ms = -delayMs;
    b.active = true;
  }

  /**
   * A shell's burst (a Thumper's, or a bomblet's pop) at grid (x, y), unless BURSTS_PER_TILE of its
   * size already play on that tile (review R14); true when it bursts.
   */
  shellBurst(x: number, y: number, small = false, liftPx = 0): boolean {
    const col = Math.floor(x);
    const row = Math.floor(y);
    let n = 0;
    for (const b of this.#bursts) {
      if (b.active && b.small === small && b.col === col && b.row === row) n++;
    }
    if (n >= BURSTS_PER_TILE[small ? 'small' : 'big']) {
      this.burstsCapped++;
      return false;
    }
    this.burst(x, y, 0, small, liftPx);
    return true;
  }

  /** Advances every pooled effect by a frame of `dt` ms (FxView's update, before the abilities). */
  protected advance(dt: number): void {
    this.gfx.clear();
    for (const t of this.#tracers) {
      if (!t.active) continue;
      t.ms += dt;
      if (t.ms >= TRACER_MS) {
        t.active = false;
        t.img.setVisible(false);
      } else {
        this.#drawTracer(t);
      }
    }
    for (const p of this.#pulses) {
      if (!p.active) continue;
      p.ms += dt;
      if (p.ms >= p.durationMs) {
        p.active = false;
        p.img.setVisible(false);
      } else {
        this.#syncPulse(p);
      }
    }
    for (const d of this.#decals) {
      if (!d.active) continue;
      d.ms += dt;
      if (d.ms >= d.durationMs) {
        d.active = false;
        d.img.setVisible(false);
      } else {
        d.img.setAlpha(fadeAlpha(d.ms / d.durationMs));
      }
    }
    for (const f of this.#floats) {
      if (!f.active) continue;
      f.ms += dt;
      // One already up when a spot near it arms goes at once (D134 K2).
      if (
        f.ms >= f.durationMs ||
        this.#keepClear?.near(f.gx, f.gy) === true ||
        this.#overClear(f.cx, f.baseY, f.w, 0)
      ) {
        f.active = false;
        f.img.setVisible(false);
      } else {
        this.#syncFloat(f);
      }
    }
    for (const s of this.#splats) {
      if (!s.active) continue;
      s.ms += dt;
      if (s.ms >= s.durationMs) {
        s.active = false;
        s.img.setVisible(false);
      } else {
        s.img.setAlpha(fadeAlpha(s.ms / s.durationMs));
      }
    }
    for (const b of this.#bursts) {
      if (!b.active) continue;
      b.ms += dt;
      // Starts once its delay is up (a burst with no delay starts on its first frame: −0 < 0 is
      // false, so the time alone can't say it hasn't started).
      const look = BURST_LOOKS[b.small ? 'small' : 'big'];
      if (!b.sprite.visible && b.ms >= 0) {
        b.sprite.setVisible(true).play(this.ctx.sprites.anim(look.id, 'burst'));
      }
      if (b.ms >= look.ms) {
        b.active = false;
        b.sprite.stop().setVisible(false);
      } else if (b.ms >= 0) {
        // Its smoke thins by alpha over the last frame.
        b.sprite.setAlpha(burstAlpha(b.ms, look.ms, look.frames));
      }
    }
    for (const d of this.#debris) {
      if (!d.active) continue;
      d.ms += dt;
      if (d.ms >= d.lifeMs) {
        d.active = false;
        d.img.setVisible(false);
        continue;
      }
      d.vy += d.g * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.img
        .setPosition(Math.round(d.x), Math.round(d.y))
        .setAlpha(d.steady ? 1 : fadeAlpha(d.ms / d.lifeMs));
    }
    for (const m of this.#motes) {
      if (!m.active) continue;
      m.ms += dt;
      if (m.ms >= m.lifeMs) {
        m.active = false;
        m.sprite.stop().setVisible(false);
        continue;
      }
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.sprite.setPosition(Math.round(m.x), Math.round(m.y)).setAlpha(fadeAlpha(m.ms / m.lifeMs));
    }
  }

  /** Starts the strike's 2 px camera shake (skipped under reduced motion). */
  protected strikeShake(): void {
    if (this.reducedMotion()) return;
    this.#shakeSmall = false;
    this.#shakeMs = 0;
  }

  /** Hides every pooled effect and resets the camera (the scene is shutting down). */
  protected resetTransient(): void {
    for (const t of this.#tracers) {
      t.active = false;
      t.img.setVisible(false);
    }
    for (const p of this.#pulses) {
      p.active = false;
      p.img.setVisible(false);
    }
    for (const d of this.#decals) {
      d.active = false;
      d.img.setVisible(false);
    }
    for (const f of this.#floats) {
      f.active = false;
      f.img.setVisible(false);
    }
    for (const b of this.#bursts) {
      b.active = false;
      b.sprite.stop().setVisible(false);
    }
    for (const d of this.#debris) {
      d.active = false;
      d.img.setVisible(false);
    }
    for (const s of this.#splats) {
      s.active = false;
      s.img.setVisible(false);
    }
    for (const m of this.#motes) {
      m.active = false;
      m.sprite.stop().setVisible(false);
    }
    this.gfx.clear();
    this.#shakeMs = -1;
    this.ctx.scene.cameras.main.setScroll(0, 0);
  }

  #syncPulse(p: Pulse): void {
    const t = p.ms / p.durationMs;
    const r = p.grow ? pulseRadius(p.radiusTiles, t) : p.radiusTiles;
    if (r !== p.shownRadius || p.color !== p.shownColor) {
      const tex = effectRingTexture(this.ctx.scene, r, p.color);
      p.img.setTexture(tex.key).setDisplayOrigin(tex.ox, tex.oy);
      p.shownRadius = r;
      p.shownColor = p.color;
    }
    p.img.setAlpha(fadeAlpha(t)).setVisible(true);
  }

  #syncFloat(f: Float): void {
    f.baseY = f.y - floatRise(Math.min(f.ms, FLOAT_MS));
    f.img
      .setPosition(f.x, f.baseY)
      .setAlpha(fadeAlpha(f.ms / f.durationMs))
      .setVisible(true);
  }

  /** A ground decal at grid (x, y) that fades over `ms`. */
  decal(x: number, y: number, tex: DecalTexture, ms: number): void {
    const d = this.#decals[this.#nextDecal]!; // index < MAX_DECALS
    this.#nextDecal = (this.#nextDecal + 1) % MAX_DECALS;
    gridToScreen(x, y, this.ctx.origin, pos);
    d.img
      .setTexture(tex.key)
      .setDisplayOrigin(tex.ox, tex.oy)
      .setPosition(pos.x, pos.y)
      .setAlpha(1)
      .setVisible(true);
    d.ms = 0;
    d.durationMs = ms;
    d.active = true;
  }

  /** Places the streak `ms / TRACER_MS` of the way from the muzzle to the target. */
  #drawTracer(t: Tracer): void {
    const k = Math.min(1, t.ms / TRACER_MS);
    t.img
      .setPosition(Math.round(t.x0 + (t.x1 - t.x0) * k), Math.round(t.y0 + (t.y1 - t.y0) * k))
      .setVisible(true);
  }

  /** Runs the camera shake (after the abilities, so a strike landing this frame shakes now). */
  protected updateShake(dt: number): void {
    if (this.#shakeMs < 0) return;
    const cam = this.ctx.scene.cameras.main;
    const [ox, oy] = this.#shakeSmall ? leakShakeOffset(this.#shakeMs) : shakeOffset(this.#shakeMs);
    cam.setScroll(ox, oy);
    this.#shakeMs += dt;
    if (this.#shakeMs >= (this.#shakeSmall ? LEAK_SHAKE_MS : SHAKE_MS)) {
      this.#shakeMs = -1;
      cam.setScroll(0, 0);
    }
  }
}

/** A palette colour as a Phaser tint (0xRRGGBB). */
function tintOf(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}
