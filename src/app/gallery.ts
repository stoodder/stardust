// Sprite gallery dev page (gallery.html, T104): every sprite, variant, and frame at 1× and an
// integer zoom on dark and light backgrounds, plus small dioramas that exercise anchors, tile
// seams, head mounts, and environment palette swaps. Deterministic, so its screenshot can be
// compared milestone to milestone. Smoke reads the data-* counters on <body>.
import { ENV_PALETTE_IDS } from '../content/palettes/env.ts';
import { PALETTES } from '../content/palettes/index.ts';
import { SPRITES, type SpriteId } from '../content/sprites/index.ts';
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

// A corner of A1M1 (story/campaign/act1.md § A1M1): S spawn, # path, o pad, C core, . decor.
// prettier-ignore
const DIORAMA_MAP = [
  '....S....',
  '....#.o..',
  '..o.#.o..',
  '....####.',
  '...o...#o',
  '...o...#.',
  '....####.',
  '..o.#....',
  '....C....',
];

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
  const w = (colsN + rowsN) * 16 + 32;
  const h = (colsN + rowsN) * 8 + 56;
  const ox = rowsN * 16 + 16;
  const oy = 40;
  const c = el('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx === null) return c;
  ctx.fillStyle = '#05030a';
  ctx.fillRect(0, 0, w, h);
  const ev = env === 'act1' ? DEFAULT_VARIANT : env;
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
  // Ground, back to front.
  DIORAMA_MAP.forEach((line, j) => {
    line.split('').forEach((ch, i) => {
      const [sx, sy] = screen(i, j);
      const vertical =
        DIORAMA_MAP[j - 1]?.charAt(i) === '#' || DIORAMA_MAP[j + 1]?.charAt(i) === '#';
      const f =
        ch === 'o'
          ? frameOf('tile.pad', 'v0', ev)
          : ch === 'S'
            ? frameOf('tile.spawn', 'v0', ev)
            : ch === '#' || ch === 'C'
              ? frameOf('tile.path', vertical ? 'tread_y' : 'tread_x', ev)
              : frameOf('tile.grass', `v${(i * 7 + j * 13) % 3}`, ev);
      draw(f, sx, sy);
    });
  });
  // World objects sorted by ground y (tech-spec § Depth sorting).
  const objects: Placed[] = [];
  DIORAMA_MAP.forEach((line, j) => {
    line.split('').forEach((ch, i) => {
      if (ch === 'C') objects.push(['prop.core', 'idle_0', i + 0.5, j + 0.5]);
      if (ch === '.' && (i * 3 + j * 5) % 7 === 0)
        objects.push(['prop.flora', 'v0', i + 0.5, j + 0.5, ev]);
      if (ch === '.' && (i * 5 + j * 3) % 11 === 0)
        objects.push(['prop.rock', 'v0', i + 0.5, j + 0.5, ev]);
    });
  });
  objects.push(
    ['enemy.nibbler', 'walk_se_0', 4.5, 1.3],
    ['enemy.nibbler', 'walk_se_1', 4.5, 2.2],
    ['enemy.zoomer', 'walk_se_0', 5.6, 3.5],
    ['enemy.chonk', 'walk_se_0', 7.5, 4.6],
    ['enemy.nibbler', 'walk_sw_1', 6.4, 6.5],
  );
  const towers: readonly [base: SpriteId, head: SpriteId, gx: number, gy: number, frame: string][] =
    [
      ['tower.rivet', 'tower.rivet_head', 6, 1, 'sw'],
      ['tower.thumper', 'tower.thumper_head', 6, 2, 'se'],
      ['tower.sprinkler', 'tower.sprinkler_head', 3, 4, 'spin_0'],
      ['tower.rivet', 'tower.rivet_head', 8, 4, 'nw'],
      ['tower.thumper', 'tower.thumper_head', 3, 5, 'ne'],
      ['tower.rivet', 'tower.rivet_head', 2, 7, 'se_fire'],
    ];
  const all: (
    | Placed
    | { tower: SpriteId; headId: SpriteId; gx: number; gy: number; head: string; tier: number }
  )[] = [
    ...objects,
    ...towers.map(([t, headId, i, j, head], n) => ({
      tower: t,
      headId,
      gx: i + 0.5,
      gy: j + 0.5,
      head,
      tier: 1 + (n % 3),
    })),
  ];
  const gxy = (o: (typeof all)[number]): number => ('tower' in o ? o.gx + o.gy : o[2] + o[3]);
  for (const o of all.toSorted((a, b) => gxy(a) - gxy(b))) {
    if ('tower' in o) {
      const baseId = o.tower;
      const headId = o.headId;
      const [sx, sy] = screen(o.gx, o.gy);
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
