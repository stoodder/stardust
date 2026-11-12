// The world's glow (art-direction.md §7, *Glow and bloom* and *Darkness and lighting overlay*;
// vfx/glowPixels.ts; T530b): the light the world gives off, which props don't bake.
// - **Props** that give light (`PROP_GLOWS`: A2M6's wall lamps and Dome 3's window, A2M4's vats
//   and seams) wear their glow just in front of them in `world` (an actor in front still hides it),
//   additive, a little at dusk and fully in the dark. On a map with darkness, every other piece of
//   scenery with a baked `@glow` frame (a dome's window slits, the flora's glow) lights up with the
//   dark too (the core's heart at full strength: CoreView's red overlays still sit over it).
// - **Pads:** on a map with darkness, the buildable pads' teal brackets glow faintly in `decal`
//   (under the towers on them), so where a tower can go still reads at night.
// - **Lamp pools:** in the dark, warm light pools inside each lamp's lit disc (a beaming Prism's
//   cool), in `decal` under everything standing there, stepped bands that stop short of the
//   disc's edge, so the edge stays the sim's lit range exactly (D137).
// - **The Prism's crystal** glows its gem's `pink.4` while its beam lights the dark, in `vfx`.
// - **The moons** come back over the night sky (a map with a lighting schedule draws them).
// - **The Long Night** (Act III, `env` `act3`; vfx/nightGlow.ts, T630b): with no darkness, the
//   world glows as in a full night all the same (baked `@glow`s at NIGHT_GLOW, the moons steady
//   and full); the props that swap frames on a cue (`OWN_GLOW`) carry their own (frameGlow.ts).
//   Every other env reads exactly as before.
// - **A prop's glow follows its frame** (T730b): a sprite's frame is watched, and when it moves on
//   (its anim, or a view's cue: A3M6's Dome 1 frosting, A3M5's hangar opening, a wreck's beacon)
//   its glow re-points to that frame's (its `PROP_GLOWS` light over its anim's union, else its
//   baked `@glow`), each frame's texture made once a battle; a frame with none shows none.
// Render-only and cosmetic. Allocation-free per frame: textures are baked once, images pooled,
// and nothing is set that hasn't changed.
import * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
import { hasSprite } from '../../content/sprites/registry.ts';
import { isLightSource, type LightTowers } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { VIEW_H, VIEW_W } from '../scale.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';
import {
  emissiveGlow,
  glowAlpha,
  glowFrames,
  glowsOn,
  PAD_GLOW,
  poolImage,
  prismHaloImage,
  PROP_GLOWS,
  type PropGlow,
} from '../vfx/glowPixels.ts';
import { moonsImage } from '../vfx/lighting.ts';
import {
  bakesSceneryGlow,
  glowNight,
  hangsMoons,
  isLongNight,
  moonLevel,
  OWN_GLOW,
} from '../vfx/nightGlow.ts';
import type { DarknessView } from './DarknessView.ts';
import { isScenery } from './scenery.ts';
import type { ViewContext } from './ViewContext.ts';

/** Pools and crystal halos one frame can show. */
const MAX_POOLS = 16;
const MAX_CRYSTALS = 8;
/** The crystal's height over its tile (BeamView's muzzle), and its halo's radius. */
const CRYSTAL_PX = 14;
const CRYSTAL_HALO_PX = 6;
/** The Prism's crystal halo: its ruby-pink gem's own colour (the pool below is its light). */
const CRYSTAL_HALO = 'pink.4';
/** The pools' colors: lamplight, and the Prism's cold Aelari light. */
const LAMP_POOL = 'orange.4';
const PRISM_POOL = 'blue.4';
/** The Prism's pool is fainter: cold light over the warm ground washes it grey. */
const PRISM_POOL_STRENGTH = 0.5;
/** How bright the moons come back over the full night. */
const MOON_ALPHA = 0.85;
/** Just in front of its prop at the same footing (under the next tie-break step). */
const GLOW_DEPTH = 0.00005;
/** The sky's overhang (LightingView's), so the moons land on the sky's own. */
const OVERHANG_PX = 8;
/** A baked `@glow`'s strength in the full dark: the world's small lights, under the lamps'. */
const BAKED_PEAK = 0.6;
/**
 * Baked glows that shine at full strength in the dark: the core's heart (what you defend), A3M4's
 * generator's too (it is the core there, T730b).
 */
const FULL_BAKED: ReadonlySet<string> = new Set(['prop.core', 'prop.generator']);

interface PropLight {
  readonly prop: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  readonly img: Phaser.GameObjects.Image;
  /** Its dusk strength (0: it shines only in the dark), and its strength in the full dark. */
  dusk: number;
  peak: number;
  alpha: number;
  /**
   * A prop's glow follows its frame (T730b: Dome 1 frosting, the hangar opening, a wreck's beacon,
   * an anim's frames): the frame name it shows (`''` for a pad's, which never changes), and
   * whether that frame has no glow.
   */
  shown: string;
  none: boolean;
}

/** A glow texture, its padding, and how it shines (`peak` in the full dark). */
interface GlowTex {
  readonly key: string;
  readonly radius: number;
  readonly dusk: number;
  readonly peak: number;
}

const pos: Vec2 = { x: 0, y: 0 };

/** `<spriteId>#<variant>:<frame>` (bake.ts `frameKey`), split; null for anything else. */
function parseFrameKey(name: string): { id: SpriteId; variant: string; frame: string } | null {
  const hash = name.indexOf('#');
  const colon = name.indexOf(':', hash + 1);
  if (hash <= 0 || colon < 0) return null;
  const raw = name.slice(0, hash);
  if (!hasSprite(raw)) return null;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- checked against the registry
  const id = raw as SpriteId;
  return { id, variant: name.slice(hash + 1, colon), frame: name.slice(colon + 1) };
}

export class WorldGlowView {
  readonly #ctx: ViewContext;
  readonly #darkness: DarknessView;
  readonly #lamps: number;
  readonly #liftPx: (col: number, row: number) => number;
  readonly #props: PropLight[] = [];
  readonly #pools: Phaser.GameObjects.Image[] = [];
  /** Each pool slot's source as drawn: its squared radius and whether it's a lamp. */
  readonly #poolSq: number[] = [];
  readonly #poolLamp: boolean[] = [];
  readonly #crystals: Phaser.GameObjects.Image[] = [];
  readonly #moons: Phaser.GameObjects.Image | null = null;
  /** The map's env (the Long Night glows without darkness; nightGlow.ts). */
  readonly #env: string | undefined;
  /** Whether scenery's baked `@glow`s shine (with darkness, or in the Long Night). */
  readonly #bakes: boolean;
  /** Each prop frame's glow texture by its frame name (null: none), made once a battle. */
  readonly #tex = new Map<string, GlowTex | null>();
  #dark = -1;
  #pooled = 0;
  #lit = 0;

  constructor(
    ctx: ViewContext,
    darkness: DarknessView,
    map: {
      readonly lights: readonly unknown[];
      readonly lighting: readonly unknown[];
      readonly dark: boolean;
      readonly env?: string;
    },
    liftPx: (col: number, row: number) => number,
  ) {
    this.#ctx = ctx;
    this.#env = map.env;
    const longNight = isLongNight(map.env);
    this.#darkness = darkness;
    this.#lamps = map.lights.length;
    this.#liftPx = liftPx;
    this.#bakes = bakesSceneryGlow(map.env, map.dark);
    const { scene, layers } = ctx;
    for (const obj of layers.world.list) {
      if (!isScenery(obj)) continue;
      if (!(obj instanceof Phaser.GameObjects.Sprite || obj instanceof Phaser.GameObjects.Image)) {
        continue;
      }
      const key = parseFrameKey(obj.frame.name);
      if (key === null || (longNight && OWN_GLOW.has(key.id))) continue;
      // A sprite's frame can change (its anim, a view's cue), so it is watched even when the
      // frame it shows now has no glow; an image's never does.
      const watch = obj instanceof Phaser.GameObjects.Sprite;
      if (PROP_GLOWS[key.id] === undefined && !this.#bakes) continue;
      if (!watch && this.#glowTex(obj.frame.name) === null) continue;
      this.#addProp(obj);
    }
    if (!map.dark) {
      // The Long Night's moons (no lamps, pads, or pools without darkness).
      if (longNight) this.#moons = addMoons(scene, layers.lighting);
      return;
    }
    // The pads' brackets, in `decal` (over the night's ground, under the towers on them).
    for (const obj of layers.ground.list) {
      if (!(obj instanceof Phaser.GameObjects.Image)) continue;
      const key = parseFrameKey(obj.frame.name);
      if (key === null || key.id !== PAD_GLOW.sprite) continue;
      const tex = this.#propTexture(key.id, key.variant, key.frame, PAD_GLOW);
      if (tex === null) continue;
      const img = new Phaser.GameObjects.Image(
        scene,
        obj.x - tex.radius,
        obj.y - tex.radius,
        tex.key,
      );
      img.setOrigin(0, 0).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      layers.decal.add(img);
      this.#props.push({
        prop: obj,
        img,
        dusk: 0,
        peak: PAD_GLOW.peak,
        alpha: 0,
        shown: '',
        none: false,
      });
    }
    for (let i = 0; i < MAX_POOLS; i++) {
      const img = scene.make.image({}, false).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      layers.decal.add(img);
      this.#pools.push(img);
      this.#poolSq.push(-1);
      this.#poolLamp.push(false);
    }
    const halo = 'glow.crystal';
    if (!scene.textures.exists(halo)) {
      scene.textures.addCanvas(halo, imageToCanvas(prismHaloImage(CRYSTAL_HALO_PX, CRYSTAL_HALO)));
    }
    for (let i = 0; i < MAX_CRYSTALS; i++) {
      const img = scene.make.image({}, false).setTexture(halo).setBlendMode(Phaser.BlendModes.ADD);
      img.setVisible(false);
      layers.vfx.add(img);
      this.#crystals.push(img);
    }
    if (hangsMoons(map.env, map.lighting.length)) this.#moons = addMoons(scene, layers.lighting);
  }

  /** Props wearing a glow now. */
  get props(): number {
    let n = 0;
    for (const p of this.#props) if (p.img.visible) n++;
    return n;
  }

  /** Light pools showing now (one per lit disc). */
  get pools(): number {
    return this.#pooled;
  }

  /** Prism crystals glowing now. */
  get crystals(): number {
    return this.#lit;
  }

  /** Whether the moons are lit over the night. */
  get moons(): boolean {
    return this.#moons?.visible === true;
  }

  /** Follows the dark (the sim's `state.dark`) and the light sources standing now. */
  update(dark: number, towers: LightTowers): void {
    // The Long Night glows as a full night without darkness (nightGlow.ts); else `dark` itself.
    const night = glowNight(this.#env, dark);
    if (night !== this.#dark) {
      this.#dark = night;
      for (let i = 0; i < this.#props.length; i++) {
        const p = this.#props[i]!; // i < length
        p.alpha = p.peak * glowAlpha(p, night);
      }
      const moon = moonLevel(this.#env, dark);
      this.#moons?.setVisible(moon > 0).setAlpha(MOON_ALPHA * moon);
    }
    for (let i = 0; i < this.#props.length; i++) {
      const p = this.#props[i]!; // i < length
      // A prop's frame moved on: its glow follows (a pad's `shown` is '', never a frame's name).
      if (p.shown !== '' && p.prop.frame.name !== p.shown) this.#repoint(p);
      const on = p.alpha > 0 && !p.none && p.prop.visible;
      if (p.img.visible !== on) p.img.setVisible(on);
      if (on && p.img.alpha !== p.alpha * p.prop.alpha) p.img.setAlpha(p.alpha * p.prop.alpha);
    }
    this.#pool(dark);
    this.#crystal(dark, towers);
  }

  /** A pool of light in each lit disc (lamps first, then beaming towers), in the dark only. */
  #pool(dark: number): void {
    const pools = this.#pools;
    if (pools.length === 0) return;
    const shown = this.#darkness.dark > 0 ? Math.min(this.#darkness.lights, pools.length) : 0;
    const discs = this.#darkness.discs;
    for (let i = 0; i < shown; i++) {
      const d = discs[i]!; // i < lights ≤ discs.length
      const img = pools[i]!; // i < pools.length
      const lamp = i < this.#lamps;
      // A slot's texture changes only when its source does (no key string per frame).
      if (this.#poolSq[i] !== d.radiusSq || this.#poolLamp[i] !== lamp) {
        this.#poolSq[i] = d.radiusSq;
        this.#poolLamp[i] = lamp;
        const key = this.#poolTexture(d.radiusSq, lamp ? LAMP_POOL : PRISM_POOL);
        const a = this.#poolAnchor(key);
        img.setTexture(key).setDisplayOrigin(a.x, a.y);
      }
      gridToScreen(d.x, d.y, this.#ctx.origin, pos);
      img.setPosition(pos.x, pos.y);
      if (img.alpha !== dark) img.setAlpha(dark);
      if (!img.visible) img.setVisible(true);
    }
    for (let i = shown; i < this.#pooled; i++) pools[i]!.setVisible(false); // i < pooled ≤ length
    this.#pooled = shown;
  }

  /** A halo on each beaming Prism's crystal while the dark is down. */
  #crystal(dark: number, towers: LightTowers): void {
    const crystals = this.#crystals;
    if (crystals.length === 0) return;
    let n = 0;
    if (dark > 0) {
      for (let i = 0; i < towers.used && n < crystals.length; i++) {
        const t = towers.items[i]!; // i < used
        if (!isLightSource(t)) continue;
        const img = crystals[n++]!; // n < length
        gridToScreen(t.x, t.y, this.#ctx.origin, pos);
        img.setPosition(pos.x, pos.y - CRYSTAL_PX - this.#liftPx(Math.floor(t.x), Math.floor(t.y)));
        if (img.alpha !== dark) img.setAlpha(dark);
        if (!img.visible) img.setVisible(true);
      }
    }
    for (let i = n; i < this.#lit; i++) crystals[i]!.setVisible(false); // i < lit ≤ length
    this.#lit = n;
  }

  /** Adds a prop's glow, in `world` just in front of it, on the frame it shows now. */
  #addProp(prop: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image): void {
    const { scene, layers } = this.#ctx;
    const img = new Phaser.GameObjects.Image(scene, prop.x, prop.y, '__DEFAULT');
    img
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(prop.depth + GLOW_DEPTH)
      .setVisible(false);
    layers.world.add(img);
    const p: PropLight = { prop, img, dusk: 0, peak: 1, alpha: 0, shown: '', none: true };
    this.#props.push(p);
    this.#repoint(p);
  }

  /** Points a prop's glow at the frame its prop shows now (only when the frame changes). */
  #repoint(p: PropLight): void {
    const name = p.prop.frame.name;
    p.shown = name;
    const tex = this.#glowTex(name);
    p.none = tex === null;
    if (tex === null) return;
    p.img
      .setTexture(tex.key)
      .setDisplayOrigin(p.prop.displayOriginX + tex.radius, p.prop.displayOriginY + tex.radius);
    p.dusk = tex.dusk;
    p.peak = tex.peak;
    if (this.#dark >= 0) p.alpha = p.peak * glowAlpha(p, this.#dark);
  }

  /**
   * The glow of a prop frame (`<id>#<variant>:<frame>`; null: none): its `PROP_GLOWS` light when
   * that frame wears one (over its anim's union), else its baked `@glow` where scenery's shine.
   * Made once per frame name a battle.
   */
  #glowTex(name: string): GlowTex | null {
    const cached = this.#tex.get(name);
    if (cached !== undefined) return cached;
    const key = parseFrameKey(name);
    let tex: GlowTex | null = null;
    if (key !== null) {
      const glow = PROP_GLOWS[key.id];
      if (glow !== undefined && glowsOn(glow, key.frame)) {
        tex = this.#propTexture(key.id, key.variant, key.frame, glow);
      } else if (this.#bakes) {
        tex = this.#bakedTexture(key.id, key.variant, key.frame);
      }
    }
    this.#tex.set(name, tex);
    return tex;
  }

  /** A baked `@glow` frame's texture (it shines only in the dark), if the frame has one. */
  #bakedTexture(id: SpriteId, variant: string, frame: string): GlowTex | null {
    const ref = this.#ctx.sprites.glowFrame(id, frame, variant);
    if (ref === null) return null;
    const { scene, sprites } = this.#ctx;
    const g = scene.textures.getFrame(ref.texture, ref.frame);
    const body = sprites.frame(id, frame, variant);
    const radius = Math.round(
      (g.cutWidth - scene.textures.getFrame(body.texture, body.frame).cutWidth) / 2,
    );
    const key = `glow.baked.${id}.${variant}.${frame}`;
    if (!scene.textures.exists(key)) {
      const src = framePixels(scene, ref.texture, ref.frame);
      if (src === null) return null;
      scene.textures.addCanvas(key, imageToCanvas(src));
    }
    return { key, radius, dusk: 0, peak: FULL_BAKED.has(id) ? 1 : BAKED_PEAK };
  }

  /** The glow texture of a prop's frame (or its anim's union), baked once per battle's scene. */
  #propTexture(id: SpriteId, variant: string, frame: string, glow: PropGlow): GlowTex | null {
    const { scene, sprites } = this.#ctx;
    const names = glowFrames(glow, frame);
    const key = `glow.prop.${id}.${variant}.${names.join('+')}`;
    if (!scene.textures.exists(key)) {
      const frames: RgbaImage[] = [];
      for (const f of names) {
        const ref = sprites.frame(id, f, variant);
        const px = framePixels(scene, ref.texture, ref.frame);
        if (px !== null) frames.push(px);
      }
      if (frames.length === 0) return null;
      const img = emissiveGlow(frames, glow.colors, glow.radius, glow.halo ?? null);
      scene.textures.addCanvas(key, imageToCanvas(img));
    }
    return { key, radius: glow.radius, dusk: glow.dusk, peak: 1 };
  }

  #poolTexture(radiusSq: number, color: 'orange.4' | 'blue.4'): string {
    const key = `glow.pool.${color}.${radiusSq}`;
    const { scene } = this.#ctx;
    if (!scene.textures.exists(key)) {
      const strength = color === PRISM_POOL ? PRISM_POOL_STRENGTH : 1;
      const img = poolImage(Math.sqrt(radiusSq), color, strength).img;
      scene.textures.addCanvas(key, imageToCanvas(img));
    }
    return key;
  }

  /** A pool texture's centre (its source's ground point): the middle of its image. */
  #poolAnchor(key: string): Vec2 {
    const f = this.#ctx.scene.textures.getFrame(key);
    pos.x = f.cutWidth / 2;
    pos.y = f.cutHeight / 2;
    return pos;
  }

  reset(): void {
    this.#dark = -1;
    for (const p of this.#pools) p.setVisible(false);
    for (const c of this.#crystals) c.setVisible(false);
    this.#pooled = 0;
    this.#lit = 0;
  }
}

/** The moons over the night sky, in `lighting` (hidden until the night shows them). */
function addMoons(scene: Phaser.Scene, layer: Phaser.GameObjects.Layer): Phaser.GameObjects.Image {
  const moons = 'glow.moons';
  if (!scene.textures.exists(moons)) {
    const w = VIEW_W + 2 * OVERHANG_PX;
    const h = VIEW_H + 2 * OVERHANG_PX;
    scene.textures.addCanvas(moons, imageToCanvas(moonsImage(w, h)));
  }
  const img = new Phaser.GameObjects.Image(scene, -OVERHANG_PX, -OVERHANG_PX, moons);
  img.setOrigin(0, 0).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
  layer.add(img);
  return img;
}

/** A frame's pixels, read back from its atlas page (a canvas; CodeSpriteSource keeps them). */
function framePixels(scene: Phaser.Scene, texture: string, frame: string): RgbaImage | null {
  const f = scene.textures.getFrame(texture, frame);
  const src: unknown = f?.source.image;
  if (!(src instanceof HTMLCanvasElement)) return null;
  const c = src.getContext('2d');
  if (c === null) return null;
  const d = c.getImageData(f.cutX, f.cutY, f.cutWidth, f.cutHeight);
  return { w: d.width, h: d.height, data: d.data };
}
