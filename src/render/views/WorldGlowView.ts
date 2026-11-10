// The world's glow (art-direction.md §7, *Glow and bloom* and *Darkness and lighting overlay*;
// vfx/glowPixels.ts; T530b): the light the world gives off, which props don't bake.
// - **Props** that give light (`PROP_GLOWS`: A2M6's wall lamps and Dome 3's window, A2M4's vats
//   and seams) wear their glow just in front of them in `world` (an actor in front still hides it),
//   additive, a little at dusk and fully in the dark. On a map with darkness, every other piece of
//   scenery with a baked `@glow` frame (a dome's window slits, the flora's glow) lights up with the
//   dark too (the core's is CoreView's).
// - **Lamp pools:** in the dark, warm light pools inside each lamp's lit disc (a beaming Prism's
//   cool), in `decal` under everything standing there, stepped bands that stop short of the
//   disc's edge, so the edge stays the sim's lit range exactly (D137).
// - **The Prism's crystal** glows while its beam lights the dark, in `vfx`.
// - **The moons** come back over the night sky (a map with a lighting schedule draws them).
// Render-only and cosmetic. Allocation-free per frame: textures are baked once, images pooled,
// and nothing is set that hasn't changed.
import * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
import { isLightSource, type LightTowers } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { VIEW_H, VIEW_W } from '../scale.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import type { RgbaImage } from '../sprites/rasterize.ts';
import {
  emissiveGlow,
  glowAlpha,
  poolImage,
  prismHaloImage,
  PROP_GLOWS,
  type PropGlow,
} from '../vfx/glowPixels.ts';
import { moonsImage } from '../vfx/lighting.ts';
import type { DarknessView } from './DarknessView.ts';
import { isScenery } from './scenery.ts';
import type { ViewContext } from './ViewContext.ts';

/** Pools and crystal halos one frame can show. */
const MAX_POOLS = 16;
const MAX_CRYSTALS = 8;
/** The crystal's height over its tile (BeamView's muzzle), and its halo's radius. */
const CRYSTAL_PX = 14;
const CRYSTAL_HALO_PX = 6;
/** The pools' colors: lamplight, and the Prism's cold Aelari light. */
const LAMP_POOL = 'orange.4';
const PRISM_POOL = 'blue.4';
/** How bright the moons come back over the full night. */
const MOON_ALPHA = 0.85;
/** Just in front of its prop at the same footing (under the next tie-break step). */
const GLOW_DEPTH = 0.00005;
/** The sky's overhang (LightingView's), so the moons land on the sky's own. */
const OVERHANG_PX = 8;
/** Props whose glow another view draws. */
const OWN_GLOW: ReadonlySet<string> = new Set(['prop.core']);

interface PropLight {
  readonly prop: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  readonly img: Phaser.GameObjects.Image;
  /** Its dusk strength (0: it shines only in the dark). */
  readonly dusk: number;
  alpha: number;
}

const pos: Vec2 = { x: 0, y: 0 };

/** `<spriteId>#<variant>:<frame>` (bake.ts `frameKey`), split; null for anything else. */
function parseFrameKey(name: string): { id: string; variant: string; frame: string } | null {
  const hash = name.indexOf('#');
  const colon = name.indexOf(':', hash + 1);
  if (hash <= 0 || colon < 0) return null;
  return { id: name.slice(0, hash), variant: name.slice(hash + 1, colon), frame: name.slice(colon + 1) };
}

export class WorldGlowView {
  readonly #ctx: ViewContext;
  readonly #darkness: DarknessView;
  readonly #lamps: number;
  readonly #liftPx: (col: number, row: number) => number;
  readonly #props: PropLight[] = [];
  readonly #pools: Phaser.GameObjects.Image[] = [];
  readonly #crystals: Phaser.GameObjects.Image[] = [];
  readonly #moons: Phaser.GameObjects.Image | null = null;
  #dark = -1;
  #pooled = 0;
  #lit = 0;

  constructor(
    ctx: ViewContext,
    darkness: DarknessView,
    map: { readonly lights: readonly unknown[]; readonly lighting: readonly unknown[]; readonly dark: boolean },
    liftPx: (col: number, row: number) => number,
  ) {
    this.#ctx = ctx;
    this.#darkness = darkness;
    this.#lamps = map.lights.length;
    this.#liftPx = liftPx;
    const { scene, layers } = ctx;
    for (const obj of layers.world.list) {
      if (!isScenery(obj)) continue;
      if (!(obj instanceof Phaser.GameObjects.Sprite || obj instanceof Phaser.GameObjects.Image)) {
        continue;
      }
      const key = parseFrameKey(obj.frame.name);
      if (key === null || OWN_GLOW.has(key.id)) continue;
      const glow = PROP_GLOWS[key.id];
      if (glow !== undefined && (glow.frames === undefined || glow.frames.includes(key.frame))) {
        this.#addProp(obj, this.#propTexture(key.id as SpriteId, key.variant, key.frame, glow), glow);
      } else if (map.dark) {
        this.#addBaked(obj, key.id as SpriteId, key.variant, key.frame);
      }
    }
    if (!map.dark) return;
    for (let i = 0; i < MAX_POOLS; i++) {
      const img = scene.make.image({}, false).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      layers.decal.add(img);
      this.#pools.push(img);
    }
    const halo = 'glow.crystal';
    if (!scene.textures.exists(halo)) {
      scene.textures.addCanvas(halo, imageToCanvas(prismHaloImage(CRYSTAL_HALO_PX, 'blue.4')));
    }
    for (let i = 0; i < MAX_CRYSTALS; i++) {
      const img = scene.make.image({}, false).setTexture(halo).setBlendMode(Phaser.BlendModes.ADD);
      img.setVisible(false);
      layers.vfx.add(img);
      this.#crystals.push(img);
    }
    if (map.lighting.length > 0) {
      const moons = 'glow.moons';
      if (!scene.textures.exists(moons)) {
        const w = VIEW_W + 2 * OVERHANG_PX;
        const h = VIEW_H + 2 * OVERHANG_PX;
        scene.textures.addCanvas(moons, imageToCanvas(moonsImage(w, h)));
      }
      this.#moons = new Phaser.GameObjects.Image(scene, -OVERHANG_PX, -OVERHANG_PX, moons);
      this.#moons.setOrigin(0, 0).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      layers.lighting.add(this.#moons);
    }
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
    if (dark !== this.#dark) {
      this.#dark = dark;
      for (let i = 0; i < this.#props.length; i++) {
        const p = this.#props[i]!; // i < length
        p.alpha = glowAlpha(p, dark);
      }
      this.#moons?.setVisible(dark > 0).setAlpha(MOON_ALPHA * dark);
    }
    for (let i = 0; i < this.#props.length; i++) {
      const p = this.#props[i]!; // i < length
      const on = p.alpha > 0 && p.prop.visible;
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
      const key = this.#poolTexture(d.radiusSq, i < this.#lamps ? LAMP_POOL : PRISM_POOL);
      if (img.texture.key !== key) {
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

  #addProp(
    prop: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
    tex: { key: string; radius: number } | null,
    glow: { readonly dusk: number },
  ): void {
    if (tex === null) return;
    const { scene, layers } = this.#ctx;
    const img = new Phaser.GameObjects.Image(scene, prop.x, prop.y, tex.key);
    img
      .setDisplayOrigin(prop.displayOriginX + tex.radius, prop.displayOriginY + tex.radius)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(prop.depth + GLOW_DEPTH)
      .setVisible(false);
    layers.world.add(img);
    this.#props.push({ prop, img, dusk: glow.dusk, alpha: 0 });
  }

  /** A baked `@glow` frame (shines only in the dark), if the prop has one. */
  #addBaked(
    prop: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
    id: SpriteId,
    variant: string,
    frame: string,
  ): void {
    const ref = this.#ctx.sprites.glowFrame(id, frame, variant);
    if (ref === null) return;
    const { scene } = this.#ctx;
    const g = scene.textures.getFrame(ref.texture, ref.frame);
    const radius = Math.round((g.cutWidth - prop.frame.cutWidth) / 2);
    const key = `glow.baked.${id}.${variant}.${frame}`;
    if (!scene.textures.exists(key)) {
      const src = framePixels(scene, ref.texture, ref.frame);
      if (src === null) return;
      scene.textures.addCanvas(key, imageToCanvas(src));
    }
    this.#addProp(prop, { key, radius }, { dusk: 0 });
  }

  /** The glow texture of a prop's frame (or its anim's union), baked once per battle's scene. */
  #propTexture(
    id: SpriteId,
    variant: string,
    frame: string,
    glow: PropGlow,
  ): { key: string; radius: number } | null {
    const { scene, sprites } = this.#ctx;
    const names = glow.union ?? [frame];
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
    return { key, radius: glow.radius };
  }

  #poolTexture(radiusSq: number, color: 'orange.4' | 'blue.4'): string {
    const key = `glow.pool.${color}.${radiusSq}`;
    const { scene } = this.#ctx;
    if (!scene.textures.exists(key)) {
      scene.textures.addCanvas(key, imageToCanvas(poolImage(Math.sqrt(radiusSq), color).img));
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
