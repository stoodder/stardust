// Sprite gallery dev page (gallery.html, T104): every sprite, variant, and frame at 1× and an
// integer zoom on dark and light backgrounds, plus small dioramas that exercise anchors, tile
// seams, head mounts, and environment palette swaps. Deterministic, so its screenshot can be
// compared milestone to milestone. Smoke reads the data-* counters on <body>.
import { ENV_PALETTE_IDS, ENV_PALETTES, ENV_SKY } from '../content/palettes/env.ts';
import { rgbOf } from '../content/palettes/master.ts';
import { PALETTES } from '../content/palettes/index.ts';
import { SPRITES, type SpriteId } from '../content/sprites/index.ts';
import { tetherDir } from '../content/sprites/fx/link_tether.ts';
import { groundShadowFor } from '../content/sprites/shadows.ts';
import type { EnvPaletteId } from '../content/sprites/types.ts';
import {
  bakeAll,
  DEFAULT_VARIANT,
  frameKey,
  glowKey,
  mountOf,
  type BakedFrame,
  type BakedSprite,
} from '../render/sprites/bake.ts';
import { imageToCanvas } from '../render/sprites/canvas.ts';
import type { RgbaImage } from '../render/sprites/rasterize.ts';
import { APRON_RINGS } from '../content/sprites/tiles/apron.ts';
import type { TileChar } from '../content/types.ts';
import {
  apronCells,
  dressTile,
  envVariant,
  propVariant,
  type GroundGrid,
  type TileDressing,
} from '../render/views/groundTiles.ts';
import { logError } from './log.ts';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls !== undefined) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function hasOpaque(img: RgbaImage): boolean {
  for (let i = 3; i < img.data.length; i += 4) if ((img.data[i] ?? 0) > 0) return true;
  return false;
}

/** An integer zoom that keeps frames readable without making big ones huge. */
/**
 * Derived variants (`+selected`, `+jammed`) are shown for the default palette only: they are the
 * same recolor on every palette, and showing them all makes the page too tall to capture.
 */
function isShownVariant(name: string): boolean {
  return !name.includes('+') || name.startsWith(`${DEFAULT_VARIANT}+`);
}

/** The variant part of a frame key (`<id>#<variant>:<frame>`). */
function variantOfKey(key: string): string {
  return key.slice(key.indexOf('#') + 1, key.indexOf(':'));
}

function zoomFor(b: BakedSprite): number {
  const size = Math.max(b.meta.w, b.meta.h);
  return size <= 20 ? 3 : 2;
}

function scaled(
  img: RgbaImage,
  zoom: number,
  glow?: { img: RgbaImage; dx: number; dy: number },
): HTMLCanvasElement {
  const src = imageToCanvas(img);
  const c = el('canvas');
  c.width = img.w * zoom;
  c.height = img.h * zoom;
  const ctx = c.getContext('2d');
  if (ctx === null) return c;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  if (glow !== undefined) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(
      imageToCanvas(glow.img),
      glow.dx * zoom,
      glow.dy * zoom,
      glow.img.w * zoom,
      glow.img.h * zoom,
    );
  }
  return c;
}

interface Counters {
  rendered: number;
}

function panel(
  frames: readonly { name: string; f: BakedFrame }[],
  zoom: number,
  shade: 'dark' | 'light',
  count: Counters | null,
  glows?: ReadonlyMap<string, BakedFrame>,
): HTMLElement {
  const p = el('div', `panel ${shade}`);
  for (const { name, f } of frames) {
    const box = el('div', 'frame');
    const one = imageToCanvas(f.image);
    if (count !== null && hasOpaque(f.image)) count.rendered++;
    box.append(one);
    const g = glows?.get(f.key);
    const halo =
      g === undefined
        ? undefined
        : { img: g.image, dx: f.anchor.x - g.anchor.x, dy: f.anchor.y - g.anchor.y };
    box.append(scaled(f.image, zoom, halo), el('span', undefined, name));
    p.append(box);
  }
  return p;
}

function spriteCard(b: BakedSprite, count: Counters): HTMLElement {
  const card = el('section', 'card');
  card.dataset['spriteId'] = b.id;
  const title = el('h3', undefined, b.id);
  const m = b.meta;
  title.append(
    el(
      'small',
      undefined,
      `${m.w}×${m.h} · anchor ${m.anchor.x},${m.anchor.y} · ${b.frameNames.length} frames · ${b.anims.length / b.variants.length} anims`,
    ),
  );
  card.append(title);
  const zoom = zoomFor(b);
  const byKey = new Map(b.frames.map((f) => [f.key, f]));
  const variants = el('div', 'variants');
  card.append(variants);
  for (const v of b.variants.filter(isShownVariant)) {
    const frames = b.frameNames.flatMap((name) => {
      const f = byKey.get(frameKey(b.id, v, name));
      return f === undefined ? [] : [{ name, f }];
    });
    const block = el('div', 'variant');
    const panels = el('div', 'panels');
    panels.append(panel(frames, zoom, 'dark', count), panel(frames, zoom, 'light', null));
    block.append(el('div', 'vlabel', v), panels);
    variants.append(block);
  }
  const glows = new Map<string, BakedFrame>();
  for (const name of b.frameNames) {
    const k = frameKey(b.id, DEFAULT_VARIANT, name);
    const g = byKey.get(glowKey(k));
    if (g !== undefined) glows.set(k, g);
  }
  if (glows.size > 0) {
    const frames = b.frameNames.flatMap((name) => {
      const f = byKey.get(frameKey(b.id, DEFAULT_VARIANT, name));
      return f === undefined ? [] : [{ name, f }];
    });
    const block = el('div', 'variant');
    block.append(
      el('div', 'vlabel', 'default + @glow (additive)'),
      panel(frames, zoom, 'dark', null, glows),
    );
    variants.append(block);
  }
  return card;
}

// A corner of an Act I map: S spawn, # path, o pad, ^ high ground, + power node, C core, . decor.
// prettier-ignore
const DIORAMA_MAP = [
  '....S....',
  '....#.o+.',
  '.^^.#.o..',
  '....####.',
  '...o...#o',
  '...o...#.',
  '....####.',
  '..o.#....',
  '....C....',
];

const isTileChar = (c: string): c is TileChar => '#o^+x.SC'.includes(c);

/** The diorama as a map grid, so groundTiles dresses it exactly as GroundView dresses a map. */
const DIORAMA_GRID: GroundGrid = {
  cols: DIORAMA_MAP[0]?.length ?? 0,
  rows: DIORAMA_MAP.length,
  tiles: DIORAMA_MAP.join('').split('').filter(isTileChar),
};

/**
 * The head frame a tower of `tier` shows: from tier 2, the up-armored `<facing>_t2` frames where
 * the head has them (`se` → `se_t2`, `se_fire` → `se_t2_fire`); idle heads keep their frame.
 */
function headFrame(
  baked: ReadonlyMap<string, BakedSprite>,
  id: SpriteId,
  frame: string,
  tier: number,
): string {
  if (tier < 2) return frame;
  const [facing, ...rest] = frame.split('_');
  const t2 = [facing, 't2', ...rest].join('_');
  return baked.get(id)?.frameNames.includes(t2) === true ? t2 : frame;
}

type Placed = readonly [
  spriteId: SpriteId,
  frame: string,
  gx: number,
  gy: number,
  variant?: string,
];

function diorama(
  baked: ReadonlyMap<string, BakedSprite>,
  env: EnvPaletteId,
  zoom: number,
): HTMLCanvasElement {
  const rowsN = DIORAMA_MAP.length;
  const colsN = DIORAMA_MAP[0]?.length ?? 0;
  // The grid plus the decor apron the game draws around it (APRON_RINGS on every side).
  const R = APRON_RINGS;
  const w = (colsN + rowsN + 4 * R) * 16;
  const oy = R * 16 + 24; // headroom over the back corner for the props
  const h = oy + (colsN + rowsN + 2 * R - 2) * 8 + 16;
  const ox = (rowsN + 2 * R) * 16;
  const c = el('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx === null) return c;
  backdrop(ctx, env, w, h);
  const frameOf = (id: SpriteId, frame: string, variant: string): BakedFrame | undefined => {
    const b = baked.get(id);
    return b?.frames.find((f) => f.key === frameKey(id, variant, frame));
  };
  const screen = (gx: number, gy: number): [number, number] => [
    Math.round((gx - gy) * 16 + ox),
    Math.round((gx + gy) * 8 + oy),
  ];
  const draw = (f: BakedFrame | undefined, x: number, y: number, glow?: BakedFrame): void => {
    if (f === undefined) return;
    ctx.drawImage(imageToCanvas(f.image), x - f.anchor.x, y - f.anchor.y);
    if (glow !== undefined) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(imageToCanvas(glow.image), x - glow.anchor.x, y - glow.anchor.y);
      ctx.globalCompositeOperation = 'source-over';
    }
  };
  // Ground and props as the game dresses them (render/views/groundTiles.ts, GroundView): the apron
  // with its fence and the env's decor first, then the grid, each back to front. High-ground
  // blocks stand in `world`, sorted with the props by their tile center.
  const objects: Placed[] = [];
  const blocks: { id: SpriteId; frame: string; i: number; j: number }[] = [];
  const cell = (i: number, j: number, look: TileDressing): void => {
    const [sx, sy] = screen(i, j);
    draw(frameOf(look.ground.sprite, look.ground.frame, envVariant(env)), sx, sy);
    if (look.block !== undefined)
      blocks.push({ id: look.block.sprite, frame: look.block.frame, i, j });
    const p = look.prop;
    if (p !== null) objects.push([p.sprite, p.frame, i + 0.5, j + 0.5, propVariant(p.sprite, env)]);
  };
  for (const a of apronCells(DIORAMA_GRID, env)) cell(a.col, a.row, a);
  for (let d = 0; d <= colsN + rowsN - 2; d++) {
    for (let i = Math.max(0, d - rowsN + 1); i <= Math.min(d, colsN - 1); i++) {
      cell(i, d - i, dressTile(DIORAMA_GRID, i, d - i));
    }
  }
  // World objects sorted by ground y (tech-spec § Depth sorting).
  objects.push(
    ['enemy.nibbler', 'walk_sw_0', 4.5, 1.1],
    ['enemy.brood_hauler', 'walk_sw_1', 4.5, 2.5],
    ['enemy.zoomer', 'walk_se_0', 5.8, 3.5],
    ['enemy.chonk', 'walk_se_0', 7.5, 4.6],
    ['enemy.nibbler', 'walk_sw_1', 4.6, 6.5],
    // A burst sack, its young scurrying back up the road the way they came.
    ['fx.sack_burst', 'f2', 6.1, 6.5],
    ['enemy.hauler_young', 'walk_se_0', 6.8, 6.3],
    ['enemy.hauler_young', 'walk_se_1', 7.2, 6.75],
    // Bricks at his post beside the road.
    ['ally.bricks', 'fire_nw_0', 8.5, 6.5],
  );
  // [base, head, col, row, head frame, tier]; the Rivet on (2, 2) stands on high ground.
  const towers: readonly [SpriteId, SpriteId, number, number, string, number][] = [
    ['tower.rivet', 'tower.rivet_head', 6, 1, 'sw', 1],
    ['tower.thumper', 'tower.thumper_head', 6, 2, 'se', 2],
    ['tower.rivet', 'tower.rivet_head', 2, 2, 'se', 2],
    ['tower.sprinkler', 'tower.sprinkler_head', 3, 4, 'spin_0', 3],
    ['tower.rivet', 'tower.rivet_head', 8, 4, 'nw', 2],
    ['tower.thumper', 'tower.thumper_head', 3, 5, 'ne', 1],
    ['tower.rivet', 'tower.rivet_head', 2, 7, 'se_fire', 3],
  ];
  const raised = new Set(blocks.map((b) => `${b.i},${b.j}`));
  type Tower = {
    tower: SpriteId;
    headId: SpriteId;
    gx: number;
    gy: number;
    head: string;
    tier: number;
    z: number;
  };
  type Block = { block: SpriteId; frame: string; gx: number; gy: number };
  const all: (Placed | Tower | Block)[] = [
    ...objects,
    ...blocks.map((b) => ({ block: b.id, frame: b.frame, gx: b.i + 0.5, gy: b.j + 0.5 })),
    ...towers.map(([t, headId, i, j, head, tier]) => ({
      tower: t,
      headId,
      gx: i + 0.5,
      gy: j + 0.5,
      head: headFrame(baked, headId, head, tier),
      tier,
      z: raised.has(`${i},${j}`) ? 1 : 0,
    })),
  ];
  // Ground enemies stand on contact shadows (decal layer, under everything in `world`).
  for (const o of objects) {
    const [id, , gx, gy] = o;
    if (!id.startsWith('enemy.')) continue;
    const s = groundShadowFor(id);
    const [sx, sy] = screen(gx, gy);
    ctx.globalAlpha = s.alpha;
    draw(frameOf(s.sprite, s.frame, DEFAULT_VARIANT), sx, sy);
    ctx.globalAlpha = 1;
  }
  // Sorted by footY plus the kind bias (render/depth.ts): blocks, props, enemies, towers.
  const key = (o: (typeof all)[number]): number =>
    'tower' in o
      ? (o.gx + o.gy) * 8 + 0.3
      : 'block' in o
        ? (o.gx + o.gy) * 8 + 0.05
        : (o[2] + o[3]) * 8 + (o[0].startsWith('prop.') ? 0.1 : 0.2);
  for (const o of all.toSorted((a, b) => key(a) - key(b))) {
    if ('block' in o) {
      const [sx, sy] = screen(o.gx - 0.5, o.gy - 0.5);
      draw(frameOf(o.block, o.frame, envVariant(env)), sx, sy);
    } else if ('tower' in o) {
      const baseId = o.tower;
      const headId = o.headId;
      const [sx, gy] = screen(o.gx, o.gy);
      const sy = gy - o.z * 8; // on high ground, the anchor draws one step up
      const base = frameOf(baseId, `t${o.tier}`, DEFAULT_VARIANT);
      draw(base, sx, sy, glowOf(baked, baseId, `t${o.tier}`));
      const def = SPRITES.find((d) => d.id === baseId);
      const mount = def === undefined ? null : mountOf(def);
      if (base !== undefined && mount !== null) {
        draw(
          frameOf(headId, o.head, DEFAULT_VARIANT),
          sx - base.anchor.x + mount.x,
          sy - base.anchor.y + mount.y,
          glowOf(baked, headId, o.head),
        );
      }
    } else {
      const [id, frame, gx, gy, variant] = o;
      const [sx, sy] = screen(gx, gy);
      draw(frameOf(id, frame, variant ?? DEFAULT_VARIANT), sx, sy, glowOf(baked, id, frame));
    }
  }
  // VFX on top: a shell mid-arc over its shadow, a burst, and the Orbital Strike reticle.
  const [shx, shy] = screen(5.5, 6.5);
  draw(frameOf('fx.shadow', 'medium', DEFAULT_VARIANT), shx, shy);
  draw(frameOf('projectile.thumper_shell', 'spin_0', DEFAULT_VARIANT), shx, shy - 18);
  const [bx, by] = screen(4.5, 7.5);
  draw(frameOf('fx.explosion', 'f1', DEFAULT_VARIANT), bx, by, glowOf(baked, 'fx.explosion', 'f1'));
  const [rx, ry] = screen(7.5, 3.5);
  draw(frameOf('fx.orbital_reticle', 'march_0', DEFAULT_VARIANT), rx, ry);
  const [tx, ty] = screen(6.5, 2.0);
  draw(frameOf('projectile.rivet_tracer', 'e', DEFAULT_VARIANT), tx - 6, ty - 6);
  // Link tethers over everything: Crossfire (Rivet + Thumper) and Sitting Ducks (Thumper +
  // Sprinkler), each drawn from its left (or upper) tower's ground point.
  for (const [link, a, b, phase] of [
    ['crossfire', [6, 1], [6, 2], 0],
    ['sitting_ducks', [3, 4], [3, 5], 2],
  ] as const) {
    const t = tetherDir(b[0] - a[0], b[1] - a[1]);
    if (t === null) continue;
    const from = t.fromB ? b : a;
    const [lx, ly] = screen(from[0] + 0.5, from[1] + 0.5);
    draw(frameOf('fx.link_tether', `${link}_${t.dir}_${phase}`, DEFAULT_VARIANT), lx, ly);
  }

  const out = el('canvas');
  out.width = w * zoom;
  out.height = h * zoom;
  const octx = out.getContext('2d');
  if (octx !== null) {
    octx.imageSmoothingEnabled = false;
    octx.drawImage(c, 0, 0, out.width, out.height);
  }
  return out;
}

// prettier-ignore
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

/**
 * The diorama's backdrop: the env's sky gradient as stepped bands across the top (4×4 ordered
 * dither at each seam), over its `shade` below, so palettes that share ground ramps
 * (act2.gold, act2.dusk) still read apart.
 */
function backdrop(ctx: CanvasRenderingContext2D, env: EnvPaletteId, w: number, h: number): void {
  const sky = ENV_SKY[env];
  const bands = [...sky, ENV_PALETTES[env].outline];
  const bandH = Math.round((h * 0.6) / sky.length);
  // Written as pixels in one ImageData (a fillRect per pixel is slow at the dioramas' size).
  const img = ctx.createImageData(w, h);
  const data = img.data;
  for (let y = 0; y < h; y++) {
    const band = Math.min(Math.floor(y / bandH), bands.length - 1);
    const next = Math.min(band + 1, bands.length - 1);
    // Over a band's last 4 rows, the ordered dither steps 0 → 75% into the next band.
    const threshold = Math.max(0, y - band * bandH - (bandH - 4)) * 4;
    const row = BAYER4[y % 4] ?? BAYER4[0];
    const on = rgbOf(bands[band] ?? 'ink.0');
    const off = rgbOf(bands[next] ?? 'ink.0');
    for (let x = 0; x < w; x++) {
      const c = (row[x % 4] ?? 0) < threshold ? off : on;
      const i = (y * w + x) * 4;
      data[i] = c.r;
      data[i + 1] = c.g;
      data[i + 2] = c.b;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function glowOf(
  baked: ReadonlyMap<string, BakedSprite>,
  id: SpriteId,
  frame: string,
): BakedFrame | undefined {
  const key = glowKey(frameKey(id, DEFAULT_VARIANT, frame));
  return baked.get(id)?.frames.find((f) => f.key === key);
}

function render(root: HTMLElement): void {
  const t0 = performance.now();
  const baked = bakeAll(SPRITES, PALETTES);
  const bakeMs = performance.now() - t0;
  const byId = new Map(baked.map((b) => [b.id, b]));
  const frames = baked.flatMap((b) => b.frames.filter((f) => !f.key.endsWith('@glow')));
  const shown = frames.filter((f) => isShownVariant(variantOfKey(f.key)));

  root.append(
    el('h1', undefined, 'Stardust sprite gallery'),
    el(
      'div',
      'sub',
      `${baked.length} sprites · ${frames.length} frames across all variants · dark (ink.0) and light (steel.4) backgrounds`,
    ),
  );
  root.append(el('h2', undefined, 'Dioramas: act1 at 2×, then every environment palette at 1×'));
  const dioramas = el('div', 'dioramas');
  dioramas.append(diorama(byId, 'act1', 2));
  root.append(dioramas);
  const envRow = el('div', 'dioramas');
  for (const env of ENV_PALETTE_IDS) {
    const box = el('div', 'frame');
    box.append(diorama(byId, env, 1), el('span', undefined, env));
    envRow.append(box);
  }
  root.append(envRow);

  root.append(el('h2', undefined, 'Sprites'));
  const count: Counters = { rendered: 0 };
  for (const b of baked) root.append(spriteCard(b, count));

  const ds = document.body.dataset;
  ds['spriteCount'] = String(baked.length);
  ds['framesExpected'] = String(shown.length);
  ds['framesRendered'] = String(count.rendered);
  ds['bakeMs'] = bakeMs.toFixed(1);
  ds['galleryReady'] = '1';
}

const root = document.getElementById('gallery');
if (root === null) {
  logError('gallery: missing #gallery');
} else {
  try {
    render(root);
  } catch (err: unknown) {
    logError('gallery failed', err);
  }
}
