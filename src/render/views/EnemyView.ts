// A pooled enemy: its anim for the facing it moves in, depth-sorted in `world` (ground units) or
// `air` (flyers, drawn 12 px up over a ground shadow; tech-spec § Sprite anchoring). It flashes
// white when its HP drops (art-direction §7, Impacts: 2 frames of white tint fill). Each one walks a
// little to the side of the path's center line, by uid (D026), so a tight clump reads as a crowd,
// not a centipede. Flyers bob 1 px at 2 Hz (art-direction §8 Flying: "drawn 12 px up with a bob";
// still under reduced motion), each on its own beat by uid. When it dies it plays its sprite's
// `death` anim (Act I's comic pop, T311c) where it stood, on a corpse sprite of its own, so the
// view can go back to the pool at once.
// The hush rule's minimal look (T402; hushLook.ts): a Heavy unit's tint, a held runner's shake.
// What it's doing picks the anim (T312b; enemyPose.ts has the rules): a Digger's `dig_<facing>`
// tell, Chitterbloom's sneeze tell and sneeze, her dig and `under` mound and surfacing, her phase-3
// panic, her invulnerable `puff` (shimmering: it alternates with its `default+selected` frame, a
// white outline, every SHIMMER_MS; steady white-outlined under reduced motion), and `flee`. A
// burrowed unit without an `under` anim (the Digger) hides and draws the generic `fx.burrow_mound`
// instead. A leaving unit (driven off with its boss) is untargetable, so it draws at 60%; when the
// sim lets it go at the map edge, it hands its sprite to LeaveFx, which carries it on past the edge
// as it fades. A cloaked unit nobody has Revealed (T406; enemies.md § 2.5: the player still sees a
// faint shimmer) draws faint, stepping between enemyPose.ts's CLOAK_ALPHA_LOW and CLOAK_ALPHA_HIGH
// every SHIMMER_MS (steady at the low step under reduced motion); Revealed, it draws whole.
// Its health bar (art-direction §8; T328) shows over the body while it's damaged or hovered: HP
// and shield on an `ink.1` track (vfx/healthBar.ts), three pooled images cropped to width, so it
// allocates nothing per frame. A boss and a neutral unit have none (`setBar(0, 0)`; the boss has
// BossBarView); a burrowed or leaving unit hides it. The first of each type's tell glyph shows for
// 3 s of sim time (TELL_TICKS), so fast-forward shortens it and a pause holds it.
import * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
import { groundShadowFor } from '../../content/sprites/shadows.ts';
import { TICK_HZ } from '../../shared/time.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { prefersReducedMotion } from '../motion.ts';
import { animKey, DEFAULT_VARIANT } from '../sprites/bake.ts';
import type { SpriteSource } from '../sprites/SpriteSource.ts';
import {
  HEALTH_BAR_FRAME_PX,
  HEALTH_BAR_GAP_PX,
  HEALTH_BAR_H,
  HEALTH_BAR_ROOM_PX,
  healthBarFill,
  healthBarShown,
  healthBarWidth,
  type HealthBarFill,
} from '../vfx/healthBar.ts';
import { healthStripTexture } from '../vfx/overlayTextures.ts';
import {
  blankFacts,
  cloakAlpha,
  ENEMY_POSES,
  interruptsOneShot,
  ONE_SHOT_POSES,
  oneShotFor,
  POSE_INDEX,
  poseFacts,
  statePose,
  type EnemyPose,
  type PoseEnemy,
} from './enemyPose.ts';
import { HEAVY_TINT, hushShakePx } from './hushLook.ts';
import type { LeaveFx } from './LeaveFx.ts';
import { facingOf, hasAnim, spriteId, type Facing } from './spriteInfo.ts';
import { walkTempo } from './walkTempo.ts';
import { variantName, type ViewContext } from './ViewContext.ts';
import type { PooledView } from './ViewPool.ts';

/** The enemy fields a view reads (a live sim Enemy satisfies it). */
export interface EnemyLike {
  readonly x: number;
  readonly y: number;
  readonly hp: number;
  readonly shieldHp: number;
  /** The sim tick it spawned on (its tell glyph's clock). */
  readonly spawnTick: number;
}

/** Flyers draw this far above their ground point. */
const FLY_LIFT_PX = 12;
/** A flyer's bob: 1 px up for half of every BOB_PERIOD_MS (2 Hz), offset per uid. */
const BOB_PERIOD_MS = 500;
const BOB_UID_STEP_MS = 137;
/** Moves shorter than this (in tiles) keep the current facing, so a pause doesn't flip it. */
const MIN_TURN_TILES = 1e-4;
/** Hit flash: this many rendered frames of white fill (art-direction §7, never longer). */
const HIT_FLASH_FRAMES = 2;
/** A brood's pop-in (a split child, a sneezed or surfaced young): a frame longer than a hit. */
const POP_FLASH_FRAMES = 3;
/** `white.1` (master palette). */
const HIT_FLASH_COLOR = 0xffffff;
/** Lateral offset step (px), perpendicular to the direction of travel: ((uid % 5) − 2) steps. */
const LANE_STEP_PX = 1.5;
const FACINGS: readonly Facing[] = ['ne', 'nw', 'se', 'sw'];
/** Each facing's slot in the anim-key and anchor arrays (keys: facing × 2 + selected). */
const FACING_INDEX: Readonly<Record<Facing, number>> = { ne: 0, nw: 1, se: 2, sw: 3 };
/**
 * A tell glyph shows above a new enemy for 3 s (art-direction §8), counted in sim ticks: at 2× it
 * shows for 1.5 s of real time (still far past the 12-frame floor), and a pause holds it.
 */
export const TELL_TICKS = 3 * TICK_HZ;
/** The glyph's gap above the body's top (px): room for the health bar between them. */
const TELL_GAP_PX = HEALTH_BAR_ROOM_PX;
/**
 * The invulnerable shimmer: the `puff` anim swaps to its white-outlined variant this often (ms),
 * a 3 Hz cycle (no flicker above the photosensitivity cap, art-direction §8; D097).
 */
export const SHIMMER_MS = 167;
/** The generic burrow mound (a unit without its own `under` anim). */
const MOUND_SPRITE = 'fx.burrow_mound';

/** The sideways direction before an enemy has moved, with no route to seed it (screen, unit). */
const SIDE_DEFAULT_X = -0.894;
const SIDE_DEFAULT_Y = 0.447;

/** The sideways offset (px) for an enemy uid: −3 to +3 in 1.5 px steps. */
export function laneOffsetPx(uid: number): number {
  return ((uid % 5) - 2) * LANE_STEP_PX;
}

const pos: Vec2 = { x: 0, y: 0 };

/** A route's polyline as EnemyView reads it (a CompiledRoute satisfies it). */
export interface RouteLike {
  readonly xs: readonly number[];
  readonly ys: readonly number[];
}

/**
 * The screen unit vector perpendicular to grid motion (dx, dy): the ground's sideways direction
 * for the lateral offset (iso: grid x → (+2, +1), grid y → (−2, +1)). Null for no motion.
 */
export function sideOf(dx: number, dy: number, out: Vec2): Vec2 | null {
  const qx = -dy;
  const qy = dx;
  const sx = (qx - qy) * 2;
  const sy = qx + qy;
  const len = Math.hypot(sx, sy);
  if (len <= 1e-9) return null;
  out.x = sx / len;
  out.y = sy / len;
  return out;
}

const side: Vec2 = { x: 0, y: 0 };
/** Scratch for the health bar's fill. */
const fill: HealthBarFill = { hpPx: 0, shieldPx: 0 };

/**
 * A sprite's anims for every pose, facing, and selection (keys[(pose × 4 + facing) × 2 +
 * selected], null where the sprite has no such pose), their frame-0 anchors (pose × 4 + facing),
 * and its death anim. Built once per sprite id and shared by every view that shows it.
 */
interface AnimSet {
  readonly keys: (string | null)[];
  readonly anchors: ({ x: number; y: number } | null)[];
  readonly deathKey: string | null;
  readonly deathAnchor: { x: number; y: number };
}

const ANIM_SETS = new WeakMap<SpriteSource, Map<SpriteId, AnimSet>>();

function animSetFor(sprites: SpriteSource, scene: Phaser.Scene, id: SpriteId): AnimSet {
  let byId = ANIM_SETS.get(sprites);
  if (byId === undefined) {
    byId = new Map();
    ANIM_SETS.set(sprites, byId);
  }
  const cached = byId.get(id);
  if (cached !== undefined) return cached;
  const keys: (string | null)[] = [];
  const anchors: ({ x: number; y: number } | null)[] = [];
  for (const pose of ENEMY_POSES) {
    for (const f of FACINGS) {
      const anim = `${pose}_${f}`;
      const i = POSE_INDEX[pose] * 4 + FACING_INDEX[f];
      const has = hasAnim(id, anim);
      keys[i * 2] = has ? sprites.anim(id, anim, variantName(DEFAULT_VARIANT, false)) : null;
      keys[i * 2 + 1] = has ? sprites.anim(id, anim, variantName(DEFAULT_VARIANT, true)) : null;
      // Mirrored frames of an off-center sprite have their own anchor (tech-spec § Sprite anchoring).
      anchors[i] = has ? sprites.frameAnchor(id, `${anim}_0`) : null;
    }
  }
  const death = animKey(id, DEFAULT_VARIANT, 'death');
  const has = scene.anims.exists(death);
  const set: AnimSet = {
    keys,
    anchors,
    deathKey: has ? death : null,
    deathAnchor: has ? sprites.frameAnchor(id, 'death_0') : { x: 0, y: 0 },
  };
  byId.set(id, set);
  return set;
}

export class EnemyView implements PooledView {
  stamp = 0;
  readonly #ctx: ViewContext;
  readonly #exits: LeaveFx | null;
  readonly #body: Phaser.GameObjects.Sprite;
  readonly #shadow: Phaser.GameObjects.Image;
  readonly #tell: Phaser.GameObjects.Image;
  /** The generic burrow mound, shown in place of a burrowed body with no `under` anim. */
  readonly #mound: Phaser.GameObjects.Sprite;
  /** Plays the death anim where the unit died; hides itself when the anim ends. */
  readonly #corpse: Phaser.GameObjects.Sprite;
  /** The health bar: its `ink.1` track, the HP fill, and the shield segments (each cropped). */
  readonly #barTrack: Phaser.GameObjects.Image;
  readonly #barHp: Phaser.GameObjects.Image;
  readonly #barShield: Phaser.GameObjects.Image;
  /** The bar's width (px) for this body, and the maxima it measures against (0 HP: no bar). */
  #barW = 0;
  #maxHp = 0;
  #maxShield = 0;
  #shieldHp = 0;
  /** What the bar shows (−1: not drawn yet), and whether it's up. */
  #barHpPx = -1;
  #barShieldPx = -1;
  #barShown = false;
  #hovered = false;
  #set: AnimSet | null = null;
  /** The tell glyph is up (until TELL_TICKS after the unit spawned). */
  #telling = false;
  /** The body's height above its anchor (px), for placing the tell glyph. */
  #headroom = 0;
  #id: SpriteId | null = null;
  #uid = 0;
  #flying = false;
  #selected = false;
  #facing: Facing = 'se';
  #x = Number.NaN;
  #y = Number.NaN;
  #hp = Number.NaN;
  #flashFrames = 0;
  /** The body's spot before the bob (px), so a still flyer keeps bobbing. */
  #bodyX = 0;
  #bodyY = 0;
  #bob = 0;
  /** Sideways offset (px), and the screen unit vector it runs along (the ground perpendicular to travel). */
  #lane = 0;
  #sideX = SIDE_DEFAULT_X;
  #sideY = SIDE_DEFAULT_Y;
  /** The last move's grid direction (a leaver carries on along it past the edge). */
  #dirX = 0;
  #dirY = 0;
  /** The pose the sim's state calls for, the one-shot playing over it (or null), and the drawn one. */
  #statePose: EnemyPose = 'walk';
  #oneShot: EnemyPose | null = null;
  #shown: EnemyPose = 'walk';
  /** Whether the shown look is the shimmer's white-outlined half. */
  #shimmerOn = false;
  /** Burrowed under the generic mound (the body hidden). */
  #mounded = false;
  #leaving = false;
  /** The body's alpha now (1, a leaving unit's, or the cloak shimmer's step). */
  #alpha = 1;
  /** Heavy (the hush rule, hushLook.ts): tinted for the rest of its life. */
  #heavy = false;
  /** A held runner's shake offset now (px). */
  #shake = 0;
  readonly #facts = blankFacts();

  /** `exits` carries a leaving unit's sprite on past the map edge (null: it just vanishes). */
  constructor(ctx: ViewContext, exits: LeaveFx | null = null) {
    this.#ctx = ctx;
    this.#exits = exits;
    this.#body = ctx.scene.make.sprite({}, false);
    this.#body.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      if (this.#oneShot === null) return;
      this.#oneShot = null;
      this.#play();
    });
    this.#shadow = ctx.scene.make.image({}, false);
    ctx.layers.decal.add(this.#shadow);
    this.#tell = ctx.scene.make.image({}, false).setOrigin(0.5, 1);
    ctx.layers.overlay.add(this.#tell);
    this.#mound = ctx.scene.make.sprite({}, false).setVisible(false);
    const ma = ctx.sprites.meta(MOUND_SPRITE).anchor;
    const mf = ctx.sprites.frame(MOUND_SPRITE, 'mound_0');
    this.#mound.setTexture(mf.texture, mf.frame).setDisplayOrigin(ma.x, ma.y);
    ctx.layers.world.add(this.#mound);
    this.#corpse = ctx.scene.make.sprite({}, false).setVisible(false);
    this.#corpse.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
      this.#corpse.setVisible(false);
    });
    const strip = (kind: 'track' | 'hp' | 'shield'): Phaser.GameObjects.Image => {
      const img = ctx.scene.make.image({}, false);
      img.setTexture(healthStripTexture(ctx.scene, kind)).setOrigin(0, 0).setVisible(false);
      ctx.layers.overlay.add(img);
      return img;
    };
    this.#barTrack = strip('track');
    this.#barHp = strip('hp');
    this.#barShield = strip('shield');
    this.release();
  }

  /** The last synced position, in grid units (towers aim at it). */
  get x(): number {
    return this.#x;
  }

  get y(): number {
    return this.#y;
  }

  /** The pose drawn now (the smoke flows' and tests' view of it). */
  get pose(): EnemyPose {
    return this.#shown;
  }

  /** Whether it's drawn as burrowed (its mound or `under` anim). */
  get burrowed(): boolean {
    return this.#statePose === 'under';
  }

  /** Whether its health bar shows (the smoke flows' and tests' view of it). */
  get barShown(): boolean {
    return this.#barShown;
  }

  /** The drawn body's depth (front-most wins a hover). */
  get depth(): number {
    return this.#body.depth;
  }

  /**
   * The bar's scale: `maxHp` and `maxShield` (its def's; 0 HP for none: a boss, which has
   * BossBarView, or a neutral unit, which is never hurt). Call after `show`.
   */
  setBar(maxHp: number, maxShield: number): void {
    this.#maxHp = maxHp;
    this.#maxShield = maxShield;
    this.#barHpPx = -1;
    this.#barShieldPx = -1;
    this.#syncBar();
  }

  /** The pointer is over it: its health bar shows even at full HP. */
  setHovered(hovered: boolean): void {
    if (hovered === this.#hovered) return;
    this.#hovered = hovered;
    this.#syncBar();
  }

  /** Whether screen point (px, py) is on its drawn body's frame (a hover). Allocation-free. */
  contains(px: number, py: number): boolean {
    const b = this.#body;
    if (!b.visible || Number.isNaN(this.#x)) return false;
    const x0 = b.x - b.displayOriginX;
    const y0 = b.y - b.displayOriginY;
    return px >= x0 && px < x0 + b.width && py >= y0 && py < y0 + b.height;
  }

  /**
   * Shows the view for a spawned enemy. `flying` picks the `air` layer. `tell`: the 8×8 tell glyph
   * to show above it for its first 3 s (null for none). `route`: the route it walks, whose first
   * segment seeds the sideways direction (a pooled view never keeps its last enemy's).
   */
  show(
    uid: number,
    body: string,
    flying: boolean,
    tell: SpriteId | null = null,
    route: RouteLike | null = null,
  ): void {
    this.#uid = uid;
    const dx = route === null ? 0 : (route.xs[1] ?? 0) - (route.xs[0] ?? 0);
    const dy = route === null ? 0 : (route.ys[1] ?? 0) - (route.ys[0] ?? 0);
    const s = sideOf(dx, dy, side);
    this.#sideX = s?.x ?? SIDE_DEFAULT_X;
    this.#sideY = s?.y ?? SIDE_DEFAULT_Y;
    this.#dirX = dx;
    this.#dirY = dy;
    this.#id = spriteId(body);
    this.#set = animSetFor(this.#ctx.sprites, this.#ctx.scene, this.#id);
    this.#flying = flying;
    this.#selected = false;
    this.#facing = 'se';
    this.#x = Number.NaN;
    this.#y = Number.NaN;
    this.#hp = Number.NaN;
    this.#lane = laneOffsetPx(uid);
    this.#statePose = 'walk';
    this.#oneShot = null;
    this.#shimmerOn = false;
    this.#mounded = false;
    this.#heavy = false;
    this.#shake = 0;
    this.#leaving = false;
    this.#alpha = 1;
    this.#stopFlash();
    (flying ? this.#ctx.layers.air : this.#ctx.layers.world).add(this.#body);
    this.#body.setVisible(true).setAlpha(1);
    this.#play();
    const { sprites } = this.#ctx;
    // Flyers cast the soft fx.shadow; ground units a contact shadow sized to the body.
    const sh = flying
      ? { sprite: 'fx.shadow' as const, frame: 'small', alpha: 1 }
      : groundShadowFor(this.#id);
    const f = sprites.frame(sh.sprite, sh.frame);
    const a = sprites.frameAnchor(sh.sprite, sh.frame);
    this.#shadow
      .setTexture(f.texture, f.frame)
      .setDisplayOrigin(a.x, a.y)
      .setAlpha(sh.alpha)
      .setVisible(false);
    const meta = sprites.meta(this.#id);
    this.#headroom = meta.anchor.y;
    this.#barW = healthBarWidth(meta.w);
    this.#maxHp = 0;
    this.#maxShield = 0;
    this.#hovered = false;
    this.#barHpPx = -1;
    this.#barShieldPx = -1;
    this.#hideBar();
    this.#telling = tell !== null;
    if (tell !== null) {
      const g = sprites.frame(tell, 'icon');
      this.#tell.setTexture(g.texture, g.frame);
    }
    this.#tell.setVisible(false);
  }

  setSelected(selected: boolean): void {
    if (selected === this.#selected) return;
    this.#selected = selected;
    this.#play();
  }

  /**
   * Positions the enemy from sim state (at sim tick `tick`, the tell glyph's clock), turns it to
   * face where it moved, and updates its health bar.
   */
  sync(e: EnemyLike, tick: number): void {
    const hit = e.hp !== this.#hp || e.shieldHp !== this.#shieldHp;
    this.#syncFlash(e.hp);
    this.#shieldHp = e.shieldHp;
    if (this.#telling && tick - e.spawnTick >= TELL_TICKS) {
      this.#telling = false;
      this.#tell.setVisible(false);
    }
    if (e.x === this.#x && e.y === this.#y) {
      if (hit) this.#syncBar();
      if (this.#flying) this.#syncBob();
      return;
    }
    if (!Number.isNaN(this.#x)) {
      const dx = e.x - this.#x;
      const dy = e.y - this.#y;
      if (dx * dx + dy * dy > MIN_TURN_TILES * MIN_TURN_TILES) {
        this.#dirX = dx;
        this.#dirY = dy;
        const facing = facingOf(dx, dy);
        if (facing !== this.#facing) {
          this.#facing = facing;
          this.#play();
        }
      }
    }
    const px = this.#x;
    const py = this.#y;
    this.#x = e.x;
    this.#y = e.y;
    gridToScreen(e.x, e.y, this.#ctx.origin, pos);
    const gx = pos.x;
    const gy = pos.y;
    if (!Number.isNaN(px) && sideOf(e.x - px, e.y - py, side) !== null) {
      this.#sideX = side.x;
      this.#sideY = side.y;
    }
    const ox = Math.round(this.#sideX * this.#lane);
    const oy = Math.round(this.#sideY * this.#lane);
    this.#bodyX = gx + ox;
    this.#bodyY = (this.#flying ? gy - FLY_LIFT_PX : gy) + oy;
    this.#bob = 0;
    this.#body.setPosition(this.#bodyX, this.#bodyY);
    if (this.#flying) this.#syncBob();
    const depth = worldDepth(gy + oy, 'enemy', this.#uid);
    if (this.#body.depth !== depth) this.#body.setDepth(depth);
    this.#shadow.setPosition(gx + ox, gy + oy).setVisible(!this.#burrowedLook());
    this.#mound.setPosition(gx + ox, gy + oy).setDepth(depth);
    if (this.#telling) {
      // A burrowed unit's glyph waits underground with it.
      this.#tell.setVisible(!this.#burrowedLook());
    }
    this.#placeOverhead();
    this.#syncBar();
  }

  /** Puts the tell glyph and the health bar over the body's top, where it's drawn now. */
  #placeOverhead(): void {
    const top = this.#body.y - this.#headroom;
    if (this.#telling) this.#tell.setPosition(this.#body.x, top - TELL_GAP_PX);
    const x = Math.round(this.#body.x) - this.#barW / 2;
    const y = Math.round(top) - HEALTH_BAR_GAP_PX - HEALTH_BAR_FRAME_PX - HEALTH_BAR_H;
    this.#barTrack.setPosition(x - HEALTH_BAR_FRAME_PX, y - HEALTH_BAR_FRAME_PX);
    this.#barHp.setPosition(x, y);
    this.#barShield.setPosition(x + Math.max(0, this.#barHpPx), y);
  }

  /**
   * Shows or hides the health bar (damaged or hovered, and not burrowed, leaving, or dead), and
   * recrops it when its HP or shield moved a pixel.
   */
  #syncBar(): void {
    const hp = this.#hp;
    const show =
      this.#body.visible &&
      !Number.isNaN(this.#x) &&
      !this.#leaving &&
      !this.#burrowedLook() &&
      healthBarShown(hp, this.#maxHp, this.#shieldHp, this.#maxShield, this.#hovered);
    if (!show) {
      if (this.#barShown) this.#hideBar();
      return;
    }
    healthBarFill(hp, this.#maxHp, this.#shieldHp, this.#maxShield, this.#barW, fill);
    if (fill.hpPx !== this.#barHpPx || fill.shieldPx !== this.#barShieldPx) {
      this.#barHpPx = fill.hpPx;
      this.#barShieldPx = fill.shieldPx;
      const frame = HEALTH_BAR_FRAME_PX * 2;
      this.#barTrack.setCrop(0, 0, this.#barW + frame, HEALTH_BAR_H + frame);
      this.#barHp.setCrop(0, 0, fill.hpPx, HEALTH_BAR_H);
      this.#barShield.setCrop(0, 0, fill.shieldPx, HEALTH_BAR_H);
      this.#barShield.x = this.#barHp.x + fill.hpPx;
    }
    if (!this.#barShown) {
      this.#barShown = true;
      this.#barTrack.setVisible(true);
      this.#barHp.setVisible(fill.hpPx > 0);
      this.#barShield.setVisible(fill.shieldPx > 0);
    } else {
      this.#barHp.visible = fill.hpPx > 0;
      this.#barShield.visible = fill.shieldPx > 0;
    }
  }

  #hideBar(): void {
    this.#barShown = false;
    this.#barTrack.setVisible(false);
    this.#barHp.setVisible(false);
    this.#barShield.setVisible(false);
  }

  /**
   * Picks the anim from what the unit is doing (enemyPose.ts): its tells, its burrow, a boss's
   * phase state, and leaving. Call after `sync`, every frame. Allocation-free.
   */
  syncPose(e: PoseEnemy): void {
    const next = statePose(poseFacts(e, this.#facts));
    let dirty = false;
    if (next !== this.#statePose) {
      const shot = oneShotFor(this.#statePose, next);
      this.#statePose = next;
      if (shot !== null && this.#has(shot)) this.#oneShot = shot;
      else if (this.#oneShot !== null && interruptsOneShot(next)) this.#oneShot = null;
      if (this.#telling) this.#tell.setVisible(next !== 'under');
      if (!Number.isNaN(this.#x)) this.#shadow.setVisible(next !== 'under');
      dirty = true;
    }
    const shimmer =
      this.#currentPose() === 'puff' &&
      (prefersReducedMotion() || Math.floor(performance.now() / SHIMMER_MS) % 2 === 0);
    if (shimmer !== this.#shimmerOn) {
      this.#shimmerOn = shimmer;
      dirty = true;
    }
    if (dirty) this.#play();
    if (e.leaving !== this.#leaving) {
      this.#leaving = e.leaving;
      dirty = true;
    }
    const high = !prefersReducedMotion() && Math.floor(performance.now() / SHIMMER_MS) % 2 === 0;
    const alpha = cloakAlpha(e, this.#leaving, high);
    if (alpha !== this.#alpha) {
      this.#alpha = alpha;
      this.#body.setAlpha(alpha);
      this.#shadow.setAlpha(alpha);
    }
    // The hush rule (T402; hushLook.ts): Heavy's tint (a hit flash ends back on it), a held
    // runner's shake.
    if (e.heavy !== this.#heavy) {
      this.#heavy = e.heavy;
      if (this.#flashFrames === 0) this.#stopFlash();
    }
    const shake = hushShakePx(e, performance.now(), prefersReducedMotion());
    if (shake !== this.#shake) {
      this.#shake = shake;
      this.#body.x = this.#bodyX + shake;
    }
    // Burrowing, surfacing, or leaving hides or shows the health bar.
    if (dirty) this.#syncBar();
  }

  /** A brood's arrival (split, sneezed, or surfaced): a short white pop over its first frames. */
  popIn(): void {
    this.#flash(POP_FLASH_FRAMES);
  }

  /** A boss's phase change: the body flashes white (the telegraph's first beat). */
  flash(): void {
    this.#flash(HIT_FLASH_FRAMES + 1);
  }

  /** Lifts a flyer 1 px for half of each bob period (page clock; still under reduced motion). */
  #syncBob(): void {
    const up =
      !prefersReducedMotion() &&
      (performance.now() + this.#uid * BOB_UID_STEP_MS) % BOB_PERIOD_MS < BOB_PERIOD_MS / 2
        ? 1
        : 0;
    if (up === this.#bob) return;
    this.#bob = up;
    this.#body.setPosition(this.#bodyX, this.#bodyY - up);
    this.#placeOverhead();
  }

  /**
   * Plays the unit's death anim where it stands, if its sprite has one (call before `release`).
   * Returns false when it has none, or was never placed, so the caller can show another effect.
   */
  die(): boolean {
    const key = this.#set?.deathKey ?? null;
    if (key === null || this.#set === null || Number.isNaN(this.#x) || !this.#body.visible) {
      return false;
    }
    const c = this.#corpse;
    (this.#flying ? this.#ctx.layers.air : this.#ctx.layers.world).add(c);
    c.setPosition(this.#body.x, this.#body.y)
      .setDepth(this.#body.depth)
      .setDisplayOrigin(this.#set.deathAnchor.x, this.#set.deathAnchor.y)
      .setVisible(true)
      .play(key);
    return true;
  }

  release(): void {
    // A leaver the sim let go at the map edge runs on past it, fading (no event marks it).
    if (this.#leaving && this.#exits !== null && this.#body.visible && !Number.isNaN(this.#x)) {
      const key = this.#body.anims.currentAnim?.key ?? null;
      this.#exits.start(this.#body, key, this.#flying, this.#dirX, this.#dirY);
    }
    this.#uid = 0;
    this.#id = null;
    this.#set = null;
    this.#leaving = false;
    this.#alpha = 1;
    this.#oneShot = null;
    this.#heavy = false;
    this.#shake = 0;
    this.#stopFlash();
    this.#body.stop();
    this.#body.setVisible(false).setAlpha(1);
    this.#shadow.setVisible(false).setAlpha(1);
    this.#tell.setVisible(false);
    this.#mound.stop().setVisible(false);
    this.#mounded = false;
    this.#telling = false;
    this.#hovered = false;
    this.#maxHp = 0;
    this.#hideBar();
  }

  /** Starts the flash when HP dropped since the last frame; ends it after HIT_FLASH_FRAMES. */
  #syncFlash(hp: number): void {
    const hit = hp < this.#hp; // false on the first frame (NaN)
    this.#hp = hp;
    if (hit) {
      this.#flash(HIT_FLASH_FRAMES);
    } else if (this.#flashFrames > 0 && --this.#flashFrames === 0) {
      this.#stopFlash();
    }
  }

  #flash(frames: number): void {
    this.#flashFrames = Math.max(this.#flashFrames, frames);
    this.#body.setTint(HIT_FLASH_COLOR).setTintMode(Phaser.TintModes.FILL);
  }

  #stopFlash(): void {
    this.#flashFrames = 0;
    if (this.#heavy) this.#body.setTint(HEAVY_TINT).setTintMode(Phaser.TintModes.MULTIPLY);
    else this.#body.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
  }

  /** Whether the shown sprite has `pose` in the current facing. */
  #has(pose: EnemyPose): boolean {
    const i = POSE_INDEX[pose] * 4 + FACING_INDEX[this.#facing];
    return (this.#set?.keys[i * 2] ?? null) !== null;
  }

  /** The pose to draw: a playing one-shot, else the state's. */
  #currentPose(): EnemyPose {
    return this.#oneShot ?? this.#statePose;
  }

  /** Burrowed with no `under` anim of its own: the generic mound stands in for the body. */
  #burrowedLook(): boolean {
    return this.#statePose === 'under';
  }

  #play(): void {
    const set = this.#set;
    if (set === null || this.#id === null) return;
    let pose = this.#currentPose();
    // A burrowed body without its own `under` hides under the generic mound.
    const mound = pose === 'under' && !this.#has('under');
    if (mound !== this.#mounded) {
      this.#mounded = mound;
      this.#body.setVisible(!mound);
      if (mound) {
        this.#mound.setVisible(true).play(this.#ctx.sprites.anim(MOUND_SPRITE, 'mound'));
      } else {
        this.#mound.stop().setVisible(false);
      }
    }
    if (!this.#has(pose)) pose = 'walk';
    const i = POSE_INDEX[pose] * 4 + FACING_INDEX[this.#facing];
    const selected = this.#selected || (pose === 'puff' && this.#shimmerOn);
    const key = set.keys[i * 2 + (selected ? 1 : 0)];
    const a = set.anchors[i];
    if (key === null || key === undefined || a === null || a === undefined) return;
    const was = this.#shown;
    this.#shown = mound ? 'under' : pose;
    if (pose === 'walk') {
      const tempo = walkTempo(this.#uid);
      const frames = this.#ctx.scene.anims.get(key)?.frames.length ?? 1;
      this.#body.play({ key, startFrame: tempo.startFrame % frames });
      this.#body.anims.timeScale = tempo.timeScale;
    } else if (pose === was && this.#body.anims.isPlaying) {
      // The same pose in a new facing or variant (the shimmer): carry on from the frame it was on,
      // so a turn mid-sneeze or mid-surfacing doesn't start the one-shot over.
      const frame = this.#body.anims.currentFrame?.index ?? 1;
      this.#body.play({ key, startFrame: frame - 1 });
      this.#body.anims.timeScale = 1;
    } else {
      this.#body.play(key);
      this.#body.anims.timeScale = 1;
    }
    this.#body.setDisplayOrigin(a.x, a.y);
    // A one-shot that can't play here (none authored) hands straight back to the state pose.
    if (ONE_SHOT_POSES.has(this.#currentPose()) && pose === 'walk') this.#oneShot = null;
  }
}
