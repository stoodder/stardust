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
// every SHIMMER_MS (steady at the high step under reduced motion) in its white `selected` outline
// (T430a), so the outline shimmers brighter than the body; Revealed, it draws whole.
// Its health bar (art-direction §8; T328) shows over the body while it's damaged or hovered: HP
// and shield on an `ink.1` track (vfx/healthBar.ts), three pooled images cropped to width, so it
// allocates nothing per frame. A boss and a neutral unit have none (`setBar(0, 0)`; the boss has
// BossBarView); a burrowed or leaving unit hides it. The first of each type's tell glyph shows for
// 3 s of sim time (TELL_TICKS), so fast-forward shortens it and a pause holds it; every unit's
// shows while the pointer is on it (T332). Both hide while the unit stands within KEEP_CLEAR_TILES
// of an armed clickable or Pebble's lift, or they would reach over one on screen (D135;
// vfx/keepClear.ts), so nothing covers the rock.
// T430a's Act II looks (EnemyDress.ts places them; the rules are the *Look.ts files):
// - **The hush** (hushLook.ts): the Hollow unit in its tell freezes mid-reach, leans 1 px at its
//   victim, and flickers an acid rim; the held runner shakes inside a closing pale ring (sim
//   ticks, in `overlay`); a Heavy unit wears a 2 px pale rim over its charcoal tint (swollen).
// - **The Hollow's walk** (hollowLook.ts): it hitches and skips a frame, and now and then shows a
//   frame shoved sideways (none under reduced motion).
// - **Fleeing runners** (fleeLook.ts) scurry (a faster walk, faster still when bolting) and glance
//   back over their shoulders: in their fleeing body's `glance` frame where it has one (T440a,
//   spriteInfo.ts `enemyBody`), else in the facing that looks back.
// T440a's frames take over from the stand-ins where a sprite draws them: a Heavy unit with a
// `heavy` anim walks in it (swollen, pale-outlined, the victim inside) with no tint or rim, and a
// cloaked unit with a baked `cloak` variant draws that (a 50% checker body in a dashed white
// outline) at the dither's alphas instead of its `selected` outline at the faint ones.
// - **Shields** (shieldLook.ts): a faint hex bubble round a shielded body while its shield holds,
//   flashing on each hit (ShieldView rings the hit and scatters the shards when it breaks).
// - **Stasis** holds the frame, frosts the body, and rims it in crystal white; **a blink's tell**
//   holds still, shimmers white (the `puff` shimmer's 3 Hz), and rims the body in the ghost's
//   violet; **a shield pulser** rims itself in blue while it tells; a Revealed unit draws whole
//   inside a green target bracket.
// Its death (`die`) plays the act's tone (deathLook.ts): Act I's comic pop, Act II's quiet one (the
// pop without the confetti).
// T530a's M5 polish:
// - **Fray** (T501d; art-direction §4): an Aelari construct below two thirds of its HP walks in its
//   `fray1` frames, below a third in `fray2` (enemyPose.ts `frayBand`), picking up the walk on the
//   frame it was on, so the threads come loose mid-stride.
// - **Phased** shows the Rift Moth's `phase` pose (dithered and faint, phaseLook.ts), and a
//   shield-broken boss with its shield down marches `broken` (the Penitent).
// - **Unnerved** (mindLook.ts): the body jitters 1 px side to side; MindView's squiggle sits over it.
// - **Over an armed clickable** (D134 K2): a flyer whose body crosses the spot kept clear draws at
//   KEEP_CLEAR_FLYER_ALPHA (walkers already pass behind the rock), so it never hides the rock.
// - **Bunched bars:** health bars and tell glyphs sort like their bodies (front-most on top) inside
//   `overlay`, under the floaters (OVERHEAD_DEPTH), so a crowd's bars stack instead of tangling.
// `box` reports the body as drawn (unitAnchor.ts) for the views that mark it.
import * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
import { activeBlink, activePulse, blinkTelling, pulseTelling } from '../../sim/index.ts';
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
import { SHIMMER_MS, STEPPED_ALPHA, tellHigh } from '../vfx/fxTiming.ts';
import { KEEP_CLEAR_FLYER_ALPHA, type KeepClear } from '../vfx/keepClear.ts';
import { healthStripTexture } from '../vfx/overlayTextures.ts';
import {
  blankFacts,
  cloakAlpha,
  ENEMY_POSES,
  interruptsOneShot,
  isStride,
  ONE_SHOT_POSES,
  oneShotFor,
  POSE_INDEX,
  poseFacts,
  frayBand,
  statePose,
  strideFor,
  type EnemyPose,
  type PoseEnemy,
} from './enemyPose.ts';
import { unnervedJitterPx } from './mindLook.ts';
import type { UnitBox } from './unitAnchor.ts';
import type { DeathStyle } from './deathLook.ts';
import { QUIET_DEATH_FRAMES } from './deathLook.ts';
import { EnemyDress, type RimMode } from './EnemyDress.ts';
import { fleeTempo, glanceFacing, glancing } from './fleeLook.ts';
import { glitches, hollowGlitch, type HollowGlitch } from './hollowLook.ts';
import {
  HEAVY_TINT,
  HUSH_LEAN_PX,
  hushRingRadius,
  hushShakePx,
  isHeld,
  isHushing,
} from './hushLook.ts';
import { bubbleAlpha } from './shieldLook.ts';
import { isFrozen, STASIS_TINT } from './stasisLook.ts';
import { phaseAlpha, phaseDithered } from './phaseLook.ts';
import type { LeaveFx } from './LeaveFx.ts';
import { facingOf, hasAnim, isRunner, spriteId, unitGlyph, type Facing } from './spriteInfo.ts';
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
/** Each facing's slot in the anim-key and anchor arrays (keys: facing × 3 + look). */
const FACING_INDEX: Readonly<Record<Facing, number>> = { ne: 0, nw: 1, se: 2, sw: 3 };
/**
 * A tell glyph shows above a new enemy for 3 s (art-direction §8), counted in sim ticks: at 2× it
 * shows for 1.5 s of real time (still far past the 12-frame floor), and a pause holds it.
 */
export const TELL_TICKS = 3 * TICK_HZ;
/** The glyph's gap above the body's top (px): room for the health bar between them. */
const TELL_GAP_PX = HEALTH_BAR_ROOM_PX;
/**
 * The invulnerable shimmer (and a blink's tell, T430a): the anim swaps to its white-outlined
 * variant every SHIMMER_MS, a 3 Hz cycle (no flicker above the photosensitivity cap, art-direction
 * §8; D097). Its home is vfx/fxTiming.ts.
 */
export { SHIMMER_MS };
/** A rim's low step while it flickers (its tell's off half). */
const RIM_LOW_ALPHA = STEPPED_ALPHA[1];
/** The generic burrow mound (a unit without its own `under` anim). */
const MOUND_SPRITE = 'fx.burrow_mound';
/**
 * Health bars and tell glyphs sort among themselves in `overlay` by their body's screen y, in a
 * band over the overlay's unsorted pieces (depth 0) and under the floaters (TransientFx's depth 1).
 */
export const OVERHEAD_DEPTH = 0.5;
/** Screen y's share of the band (a playfield is under 10,000 px tall), and a uid's tie-break. */
const OVERHEAD_Y_STEP = 1e-5;
const OVERHEAD_UID_STEP = 1e-9;

/** The overhead's depth for a body whose ground point sits at screen y `y` (T501i). */
export function overheadDepth(y: number, uid: number): number {
  return OVERHEAD_DEPTH + Math.max(0, y) * OVERHEAD_Y_STEP + (uid % 1000) * OVERHEAD_UID_STEP;
}

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
/** Whether `e` is telling a shield pulse (it wears a blue rim meanwhile). */
function pulseTell(e: PoseEnemy): boolean {
  const pulse = activePulse(e);
  return pulse !== null && pulseTelling(e, pulse);
}

/** Scratch for a Hollow unit's glitch. */
const glitch: HollowGlitch = { hold: false, offsetPx: 0 };
/** Scratch for the health bar's fill. */
const fill: HealthBarFill = { hpPx: 0, shieldPx: 0 };

/** A body's look: plain, white-outlined (`selected`, the shimmers), or its baked `cloak`. */
const LOOK_PLAIN = 0;
const LOOK_SELECTED = 1;
const LOOK_CLOAK = 2;
const LOOKS = 3;

/**
 * A sprite's anims for every pose, facing, and look (keys[(pose × 4 + facing) × LOOKS + look],
 * null where the sprite has no such pose or look), their frame-0 anchors (pose × 4 + facing), and
 * its death anim. Built once per sprite id and shared by every view that shows it.
 */
interface AnimSet {
  readonly keys: (string | null)[];
  readonly anchors: ({ x: number; y: number } | null)[];
  readonly deathKey: string | null;
  /** The death anim's squash and pop alone (Act II's quiet death, deathLook.ts), or null. */
  readonly quietKey: string | null;
  readonly deathAnchor: { x: number; y: number };
  /** It bakes a `cloak` variant (T440a). */
  readonly cloak: boolean;
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
  const cloakVariant = `${DEFAULT_VARIANT}+cloak`;
  const cloak = scene.anims.exists(animKey(id, cloakVariant, 'walk_se'));
  for (const pose of ENEMY_POSES) {
    for (const f of FACINGS) {
      const anim = `${pose}_${f}`;
      const i = POSE_INDEX[pose] * 4 + FACING_INDEX[f];
      const has = hasAnim(id, anim);
      keys[i * LOOKS + LOOK_PLAIN] = has
        ? sprites.anim(id, anim, variantName(DEFAULT_VARIANT, false))
        : null;
      keys[i * LOOKS + LOOK_SELECTED] = has
        ? sprites.anim(id, anim, variantName(DEFAULT_VARIANT, true))
        : null;
      keys[i * LOOKS + LOOK_CLOAK] = has && cloak ? sprites.anim(id, anim, cloakVariant) : null;
      // Mirrored frames of an off-center sprite have their own anchor (tech-spec § Sprite anchoring).
      anchors[i] = has ? sprites.frameAnchor(id, `${anim}_0`) : null;
    }
  }
  const death = animKey(id, DEFAULT_VARIANT, 'death');
  const has = scene.anims.exists(death);
  // The quiet death: the comic pop's first frames, made once per sprite from the baked anim.
  const quiet = `${death}.quiet`;
  const full = has ? scene.anims.get(death) : undefined;
  if (full !== undefined && !scene.anims.exists(quiet)) {
    scene.anims.create({
      key: quiet,
      frames: full.frames
        .slice(0, QUIET_DEATH_FRAMES)
        .map((f) => ({ key: f.textureKey, frame: f.textureFrame })),
      frameRate: full.frameRate,
      repeat: 0,
    });
  }
  const set: AnimSet = {
    keys,
    anchors,
    deathKey: has ? death : null,
    quietKey: has ? quiet : null,
    deathAnchor: has ? sprites.frameAnchor(id, 'death_0') : { x: 0, y: 0 },
    cloak,
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
  /** The scene's keep-clear spots (null: none), and whether it stands near one now. */
  readonly #keepClear: KeepClear | null;
  #clear = false;
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
  /** Whether it draws its baked `cloak` look (cloaked, unrevealed, and the sprite has one). */
  #cloakOn = false;
  /** Burrowed under the generic mound (the body hidden). */
  #mounded = false;
  #leaving = false;
  /** The body's alpha now (1, a leaving unit's, or the cloak shimmer's step). */
  #alpha = 1;
  /** Heavy (the hush rule, hushLook.ts): tinted for the rest of its life. */
  #heavy = false;
  /** In Stasis (stasisLook.ts): its anim holds, its body tinted ice. */
  #frozen = false;
  /** The body's look offset now (px): a held runner's shake, a glitch, a hush lean. */
  #offX = 0;
  #offY = 0;
  readonly #facts = blankFacts();
  /** What the body wears beyond its sprite (T430a): rims, bubble, hush ring, bracket. */
  readonly #dress: EnemyDress;
  /** The unit whose fixed facts below were read (0: not yet; read on its first syncPose). */
  #factsUid = 0;
  /** Its faction glitches (the Hollow), it flees, it has a shield, it can cloak. */
  #hollow = false;
  #fleeing = false;
  #shielded = false;
  #cloakable = false;
  /** Its tell glyph (the first of its type shows it; any shows it on hover), or null. */
  #glyph: SpriteId | null = null;
  /** The body's frame size and anchor (meta, outlined px). */
  #metaW = 0;
  #metaH = 0;
  /** The sim tick last synced, and the tick a hush tell took hold of it (a held runner). */
  #tick = 0;
  #heldAt = -1;
  /** When its shield last took a hit (page ms; −Infinity: never), for the bubble's flash. */
  #bubbleHitAt = Number.NEGATIVE_INFINITY;
  /** The anim is held for a Hollow hitch (it skips a frame when the hold ends). */
  #hitch = false;
  /** Glancing back (a fleeing runner), and its walk's tempo multiplier. */
  #glance = false;
  #tempoMul = 1;
  /** Its fray band (0 whole, 1, 2; enemyPose.ts `frayBand`). */
  #fray: 0 | 1 | 2 = 0;
  /** A flyer over a spot kept clear, drawn faint. */
  #overClear = false;
  /** It has played a stride since it was shown (a new stride carries on from its frame). */
  #strode = false;

  /**
   * `exits` carries a leaving unit's sprite on past the map edge (null: it just vanishes);
   * `keepClear` is the scene's keep-clear spots (its overhead hides near one).
   */
  constructor(ctx: ViewContext, exits: LeaveFx | null = null, keepClear: KeepClear | null = null) {
    this.#ctx = ctx;
    this.#exits = exits;
    this.#keepClear = keepClear;
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
    this.#dress = new EnemyDress(ctx);
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

  /** The body's alpha now (the render-state hook's view of it). */
  get alpha(): number {
    return this.#alpha;
  }

  /** The tell glyph it wears (shown or not), or null (the render-state hook's view of it). */
  get glyph(): string | null {
    return this.#glyph;
  }

  /** Whether its tell glyph shows (the render-state hook's view of it). */
  get tellShown(): boolean {
    return this.#tell.visible;
  }

  /** What its body wears now (the render-state hook's view of it). */
  get dress(): {
    readonly rim: RimMode;
    readonly bubble: boolean;
    readonly hushRing: boolean;
    readonly bracket: boolean;
    readonly glance: boolean;
  } {
    const d = this.#dress;
    return {
      rim: d.rim,
      bubble: d.bubbleShown,
      hushRing: d.ringShown,
      bracket: d.bracketShown,
      glance: this.#glance,
    };
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

  /** The pointer is over it: its health bar and its tell glyph show (T332). */
  setHovered(hovered: boolean): void {
    if (hovered === this.#hovered) return;
    this.#hovered = hovered;
    this.#syncBar();
    this.#syncGlyph();
    this.#placeOverhead();
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
    this.#cloakOn = false;
    this.#mounded = false;
    this.#heavy = false;
    this.#frozen = false;
    this.#offX = 0;
    this.#offY = 0;
    this.#leaving = false;
    this.#alpha = 1;
    this.#factsUid = 0;
    this.#heldAt = -1;
    this.#bubbleHitAt = Number.NEGATIVE_INFINITY;
    this.#hitch = false;
    this.#glance = false;
    this.#tempoMul = 1;
    this.#fray = 0;
    this.#overClear = false;
    this.#strode = false;
    this.#stopFlash();
    const layer = flying ? this.#ctx.layers.air : this.#ctx.layers.world;
    layer.add(this.#body);
    this.#dress.setLayer(layer);
    this.#dress.hideAll();
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
    this.#metaW = meta.w;
    this.#metaH = meta.h;
    this.#barW = healthBarWidth(meta.w);
    this.#maxHp = 0;
    this.#maxShield = 0;
    this.#hovered = false;
    this.#clear = false;
    this.#barHpPx = -1;
    this.#barShieldPx = -1;
    this.#hideBar();
    this.#telling = tell !== null;
    this.#glyph = null;
    if (tell !== null) this.#setGlyph(tell);
    this.#tell.setVisible(false);
  }

  /** Gives the tell glyph its art. */
  #setGlyph(id: SpriteId): void {
    const g = this.#ctx.sprites.frame(id, 'icon');
    this.#tell.setTexture(g.texture, g.frame);
    this.#glyph = id;
  }

  /** The tell glyph shows for its first 3 s, or while hovered, unless the unit is underground. */
  #syncGlyph(): void {
    const up =
      this.#glyph !== null &&
      (this.#telling || this.#hovered) &&
      !this.#clear &&
      this.#body.visible &&
      !Number.isNaN(this.#x) &&
      !this.#burrowedLook();
    if (up !== this.#tell.visible) this.#tell.setVisible(up);
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
    this.#tick = tick;
    this.#syncFlash(e.hp);
    // A hit on the shield flashes its bubble (shieldLook.ts).
    if (e.shieldHp < this.#shieldHp) this.#bubbleHitAt = performance.now();
    this.#shieldHp = e.shieldHp;
    if (this.#telling && tick - e.spawnTick >= TELL_TICKS) {
      this.#telling = false;
      this.#syncGlyph();
    }
    if (e.x === this.#x && e.y === this.#y) {
      // A spot may have armed or cleared round a unit standing still.
      const cleared = this.#syncClear();
      if (cleared) this.#syncGlyph();
      if (hit || cleared) this.#syncBar();
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
    this.#placeBody();
    if (this.#flying) this.#syncBob();
    const depth = worldDepth(gy + oy, 'enemy', this.#uid);
    if (this.#body.depth !== depth) {
      this.#body.setDepth(depth);
      // The overhead sorts like the body: a front unit's bar over the one behind it (T501i).
      const od = overheadDepth(gy + oy, this.#uid);
      this.#barTrack.setDepth(od);
      this.#barHp.setDepth(od);
      this.#barShield.setDepth(od);
      this.#tell.setDepth(od);
    }
    this.#shadow.setPosition(gx + ox, gy + oy).setVisible(!this.#burrowedLook());
    this.#mound.setPosition(gx + ox, gy + oy).setDepth(depth);
    this.#syncClear();
    // A burrowed unit's glyph waits underground with it.
    this.#syncGlyph();
    this.#syncBar();
  }

  /**
   * Whether its overhead (the tell glyph and the health bar) must keep clear of an armed clickable
   * or a lift (D135; vfx/keepClear.ts): it stands within KEEP_CLEAR_TILES of one, or the overhead's
   * box would reach over one's on screen (a unit two tiles in front, its bar over the rock's
   * base). Updates `#clear`; returns whether it changed.
   */
  #syncClear(): boolean {
    const k = this.#keepClear;
    let clear = false;
    if (k !== null && k.size > 0 && !Number.isNaN(this.#x)) {
      clear = k.near(this.#x, this.#y);
      if (!clear) {
        const top = Math.round(this.#bodyY - this.#bob - this.#headroom);
        const glyphH = this.#glyph === null ? 0 : this.#tell.height;
        const glyphHalf = this.#glyph === null ? 0 : this.#tell.width / 2;
        const half = Math.max(this.#barW / 2 + HEALTH_BAR_FRAME_PX, glyphHalf);
        const bx = Math.round(this.#bodyX);
        const barTop = top - HEALTH_BAR_GAP_PX - 2 * HEALTH_BAR_FRAME_PX - HEALTH_BAR_H;
        clear = k.covers(
          bx - half,
          Math.min(barTop, top - TELL_GAP_PX - glyphH),
          bx + half,
          top - HEALTH_BAR_GAP_PX,
        );
      }
    }
    if (clear === this.#clear) return false;
    this.#clear = clear;
    return true;
  }

  /** Puts the body where it stands now (its bob and look offsets on top), and its overhead. */
  #placeBody(): void {
    this.#body.setPosition(this.#bodyX + this.#offX, this.#bodyY - this.#bob + this.#offY);
    this.#placeOverhead();
  }

  /**
   * Puts the tell glyph and the health bar over the body's top, where it stands (its bob, not its
   * shakes and glitches: the bar holds still while the body struggles).
   */
  #placeOverhead(): void {
    const bx = this.#bodyX;
    const top = this.#bodyY - this.#bob - this.#headroom;
    this.#tell.setPosition(bx, top - TELL_GAP_PX);
    const x = Math.round(bx) - this.#barW / 2;
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
      !this.#clear &&
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
    if (this.#factsUid !== this.#uid) this.#readFacts(e);
    const now = performance.now();
    const reduced = prefersReducedMotion();
    const next = statePose(poseFacts(e, this.#facts));
    let dirty = false;
    if (next !== this.#statePose) {
      const shot = oneShotFor(this.#statePose, next);
      this.#statePose = next;
      if (shot !== null && this.#has(shot)) this.#oneShot = shot;
      else if (this.#oneShot !== null && interruptsOneShot(next)) this.#oneShot = null;
      this.#syncGlyph();
      if (!Number.isNaN(this.#x)) this.#shadow.setVisible(next !== 'under');
      dirty = true;
    }
    // A blink's tell (T430a): the unit holds still and shimmers like a boss between phases.
    const blink = activeBlink(e);
    const blinkTell = blink !== null && blinkTelling(e, blink);
    const pose = this.#currentPose();
    // A cloak (T406, T430a) wears its white outline (the `selected` variant) on the faint body, so
    // the outline shimmers brighter than the body as its alpha steps.
    // A sprite with a baked `cloak` variant draws that instead (T440a).
    const cloaked = this.#cloakable && !e.leaving && e.revealedTicks <= 0;
    // Phasing (T503; phaseLook.ts): the tell flickers whole and dithered; Phased, a dithered ghost.
    const dithered = (cloaked || phaseDithered(e, reduced)) && this.#set?.cloak === true;
    const shimmer =
      (cloaked && !dithered) ||
      ((pose === 'puff' || blinkTell) && (reduced || Math.floor(now / SHIMMER_MS) % 2 === 0));
    if (shimmer !== this.#shimmerOn || dithered !== this.#cloakOn) {
      this.#shimmerOn = shimmer;
      this.#cloakOn = dithered;
      dirty = true;
    }
    // A fleeing runner glances back over its shoulder now and then (fleeLook.ts).
    const held = isHeld(e);
    const bolting = e.skittishTicks > 0;
    const glance =
      this.#fleeing &&
      !held &&
      !bolting &&
      !e.leaving &&
      this.#statePose === 'walk' &&
      this.#oneShot === null &&
      !Number.isNaN(this.#x) &&
      glancing(this.#uid, now);
    if (glance !== this.#glance) {
      this.#glance = glance;
      dirty = true;
    }
    // Fray (T501d): the walk frays by HP band.
    const band = e.def === null || e.def.boss !== null ? 0 : frayBand(e.hp, e.def.hp);
    if (band !== this.#fray) {
      this.#fray = band;
      dirty = true;
    }
    if (dirty) this.#play();
    // Scurrying: a fleeing runner's legs run faster than its pace, a bolting one's faster still.
    const tempo = fleeTempo(this.#fleeing, bolting);
    if (tempo !== this.#tempoMul) {
      this.#tempoMul = tempo;
      if (isStride(this.#shown))
        this.#body.anims.timeScale = walkTempo(this.#uid).timeScale * tempo;
    }
    if (e.leaving !== this.#leaving) {
      this.#leaving = e.leaving;
      dirty = true;
    }
    const high = reduced || Math.floor(now / SHIMMER_MS) % 2 === 0;
    this.#overClear = this.#flying && this.#overSpot();
    const alpha =
      cloakAlpha(e, this.#leaving, high, this.#cloakOn) *
      phaseAlpha(e, this.#set?.cloak === true, reduced) *
      (this.#overClear ? KEEP_CLEAR_FLYER_ALPHA : 1);
    if (alpha !== this.#alpha) {
      this.#alpha = alpha;
      this.#body.setAlpha(alpha);
      this.#shadow.setAlpha(alpha);
    }
    // The hush rule (T402; hushLook.ts): Heavy's tint (a hit flash ends back on it).
    if (e.heavy !== this.#heavy) {
      this.#heavy = e.heavy;
      if (this.#flashFrames === 0) this.#stopFlash();
    }
    // Stasis (T407a; stasisLook.ts): the anim holds its frame and the body goes icy.
    const frozen = isFrozen(e);
    if (frozen !== this.#frozen) {
      this.#frozen = frozen;
      if (this.#flashFrames === 0) this.#stopFlash();
    }
    // The Hollow's walk hitches (hollowLook.ts); a tell holds the frame (Stasis, the hush, a blink).
    const hushing = isHushing(e);
    const walking = isStride(this.#shown) && !e.leaving && !held;
    const glitching = this.#hollow && walking && !hushing;
    if (glitching) hollowGlitch(this.#uid, now, reduced, glitch);
    const hitch = glitching && glitch.hold;
    const hold = frozen || hushing || blinkTell || hitch;
    const anims = this.#body.anims;
    if (hold && anims.isPlaying) anims.pause();
    else if (!hold && anims.isPaused) {
      anims.resume();
      // A hitch ends a frame ahead of where it stopped: the skip.
      if (this.#hitch) anims.nextFrame();
    }
    this.#hitch = hitch;
    // The body's look offset: a held runner's struggle, a Hollow glitch, the Hollow unit's lean.
    let offX = hushShakePx(e, now, reduced);
    let offY = 0;
    if (glitching) offX += glitch.offsetPx;
    // Unnerved (T507, T530a): a 1 px jitter while the status holds (the squiggle is MindView's).
    if (e.unnervedTicks > 0 && !e.leaving && !e.phased && !e.burrowed && !frozen) {
      offX += unnervedJitterPx(this.#uid, now, reduced);
    }
    if (hushing) {
      const sx = this.#dirX - this.#dirY;
      const sy = this.#dirX + this.#dirY;
      if (Math.abs(sx) > 1e-9) offX += Math.sign(sx) * HUSH_LEAN_PX;
      else if (Math.abs(sy) > 1e-9) offY += Math.sign(sy) * HUSH_LEAN_PX;
    }
    if (offX !== this.#offX || offY !== this.#offY) {
      this.#offX = offX;
      this.#offY = offY;
      this.#placeBody();
    }
    this.#syncDress(e, now, reduced, frozen, blinkTell, hushing, held);
    // Burrowing, surfacing, or leaving hides or shows the health bar.
    if (dirty) this.#syncBar();
  }

  /** Reads the unit's fixed facts once (its faction, tags, shield, cloak, tell glyph). */
  #readFacts(e: PoseEnemy): void {
    this.#factsUid = this.#uid;
    const def = e.def;
    this.#hollow = def !== null && glitches(def.faction);
    this.#fleeing = def !== null && isRunner(def, e.tags);
    this.#shielded = def !== null && def.shield !== null;
    this.#cloakable = def !== null && def.cloaked;
    if (this.#glyph === null && def !== null) {
      // On hover a runner shows the Skittish glyph, as on its first showing (D134).
      const g = unitGlyph(def.tells, this.#fleeing);
      if (g !== null) this.#setGlyph(g);
    }
  }

  /** Places what the body wears this frame (EnemyDress.ts). */
  #syncDress(
    e: PoseEnemy,
    now: number,
    reduced: boolean,
    frozen: boolean,
    blinkTell: boolean,
    hushing: boolean,
    held: boolean,
  ): void {
    const d = this.#dress;
    const body = this.#body;
    if (!body.visible || Number.isNaN(this.#x)) {
      d.hideAll();
      return;
    }
    const ax = body.displayOriginX;
    const ay = body.displayOriginY;
    const cloaked = this.#cloakable && !e.leaving && e.revealedTicks <= 0;
    // The rim: one look at a time, the most urgent first.
    let rim: RimMode = 'none';
    let rimAlpha = 1;
    if (frozen) {
      rim = 'crystal';
    } else if (blinkTell) {
      rim = 'blink';
      if (!tellHigh(e.blinkTicks, reduced)) rimAlpha = RIM_LOW_ALPHA;
    } else if (hushing) {
      rim = 'hush';
      if (!tellHigh(e.hushTicks, reduced)) rimAlpha = RIM_LOW_ALPHA;
    } else if (pulseTell(e)) {
      rim = 'pulse';
      if (!tellHigh(e.pulseTicks, reduced)) rimAlpha = RIM_LOW_ALPHA;
    } else if (this.#heavy && !e.leaving && !this.#has('heavy')) {
      // A sprite that draws Heavy (T440a) has its 2 px pale outline already.
      rim = 'heavy';
    }
    d.rimOn(body, rim, rimAlpha);
    // The shield bubble, faint while the shield holds, flashing on a hit (hidden by a cloak).
    const bubble =
      this.#shielded && e.shieldHp > 0 && !e.leaving && !cloaked
        ? bubbleAlpha(now - this.#bubbleHitAt)
        : 0;
    d.bubbleOn(body, this.#metaW, this.#metaH, ax, ay, bubble);
    // The hush ring closes on the held runner over the tell (sim ticks).
    if (held) {
      if (this.#heldAt < 0) this.#heldAt = this.#tick;
      const ground = this.#flying ? FLY_LIFT_PX : 0;
      d.ringOn(this.#bodyX, this.#bodyY + ground, hushRingRadius(this.#tick - this.#heldAt));
    } else {
      this.#heldAt = -1;
      d.ringOn(0, 0, 0);
    }
    // A Revealed cloaked unit: the target bracket.
    d.bracketOn(
      this.#cloakable && e.revealedTicks > 0 && !e.leaving,
      body,
      this.#metaW,
      this.#metaH,
      ax,
      ay,
    );
  }

  /**
   * The body as drawn (unitAnchor.ts), into `out`: its centre line and frame top and bottom (lift
   * and bob included, not its shakes), its ground point, and half its width. False before it's
   * placed, or while it's hidden (burrowed under the mound).
   */
  box(out: UnitBox): boolean {
    if (Number.isNaN(this.#x) || !this.#body.visible) return false;
    const y = this.#bodyY - this.#bob;
    out.x = this.#bodyX;
    out.top = y - this.#headroom;
    out.bottom = y - this.#headroom + this.#metaH;
    out.groundY = this.#flying ? this.#bodyY + FLY_LIFT_PX : this.#bodyY;
    out.halfW = this.#metaW / 2;
    return true;
  }

  /** Whether it draws faint over a spot kept clear (a flyer over the armed rock; T501i). */
  get overClear(): boolean {
    return this.#overClear;
  }

  /** Whether its drawn frame overlaps a spot kept clear on screen (D134 K2). */
  #overSpot(): boolean {
    const k = this.#keepClear;
    if (k === null || k.size === 0 || Number.isNaN(this.#x)) return false;
    const left = this.#bodyX - this.#metaW / 2;
    const top = this.#bodyY - this.#bob - this.#headroom;
    return k.covers(left, top, left + this.#metaW, top + this.#metaH);
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
    this.#placeBody();
  }

  /**
   * Plays the unit's death where it stands, in the act's tone (deathLook.ts; call before
   * `release`): `comic` the sprite's whole `death` anim, `quiet` (and, until Act III's look lands,
   * `still`) its squash and pop without the confetti. Returns false when its sprite has no death
   * anim, or it was never placed, or the style draws no body (`shatter`, `unravel`, `burst`), so
   * the caller shows another effect.
   */
  die(style: DeathStyle = 'comic'): boolean {
    const set = this.#set;
    const key =
      set === null
        ? null
        : style === 'comic'
          ? set.deathKey
          : style === 'quiet' || style === 'still'
            ? set.quietKey
            : null;
    if (key === null || set === null || Number.isNaN(this.#x) || !this.#body.visible) {
      return false;
    }
    const c = this.#corpse;
    (this.#flying ? this.#ctx.layers.air : this.#ctx.layers.world).add(c);
    c.setPosition(this.#body.x, this.#body.y)
      .setDepth(this.#body.depth)
      .setDisplayOrigin(set.deathAnchor.x, set.deathAnchor.y)
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
    this.#frozen = false;
    this.#offX = 0;
    this.#offY = 0;
    this.#factsUid = 0;
    this.#glyph = null;
    this.#glance = false;
    this.#hitch = false;
    this.#fray = 0;
    this.#overClear = false;
    this.#dress.hideAll();
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
    if (this.#frozen) this.#body.setTint(STASIS_TINT).setTintMode(Phaser.TintModes.SCREEN);
    else if (this.#heavy && !this.#has('heavy'))
      this.#body.setTint(HEAVY_TINT).setTintMode(Phaser.TintModes.MULTIPLY);
    else this.#body.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
  }

  /** Whether the shown sprite has `pose` in the current facing. */
  #has(pose: EnemyPose): boolean {
    const i = POSE_INDEX[pose] * 4 + FACING_INDEX[this.#facing];
    return (this.#set?.keys[i * LOOKS] ?? null) !== null;
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
    // A hurt construct's walk frays (T501d), where its sprite draws the band.
    const frayed = strideFor(pose, this.#fray);
    if (frayed !== pose && this.#has(frayed)) pose = frayed;
    // A fleeing runner's glance back (fleeLook.ts): its `glance` frame where its body draws one
    // (T440a), else the facing that looks over its shoulder.
    let facing = this.#facing;
    if (this.#glance && pose === 'walk') {
      if (this.#has('glance')) pose = 'glance';
      else facing = glanceFacing(this.#facing);
    }
    const i = POSE_INDEX[pose] * 4 + FACING_INDEX[facing];
    const look = this.#cloakOn
      ? LOOK_CLOAK
      : this.#selected || this.#shimmerOn
        ? LOOK_SELECTED
        : LOOK_PLAIN;
    const key = set.keys[i * LOOKS + look];
    const a = set.anchors[i];
    if (key === null || key === undefined || a === null || a === undefined) return;
    const was = this.#shown;
    this.#shown = mound ? 'under' : pose;
    if (isStride(pose)) {
      const tempo = walkTempo(this.#uid);
      const frames = this.#ctx.scene.anims.get(key)?.frames.length ?? 1;
      // Stride to stride (a turn, a fray band, a glance) carries on from the frame it was on.
      const on = this.#body.anims.currentFrame;
      const start = this.#strode && isStride(was) && on !== null ? on.index - 1 : tempo.startFrame;
      this.#strode = true;
      this.#body.play({ key, startFrame: start % frames });
      this.#body.anims.timeScale = tempo.timeScale * this.#tempoMul;
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
