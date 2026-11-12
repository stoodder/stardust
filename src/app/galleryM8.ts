// The M8 corner of the sprite gallery's diorama sheet (M9, T901; after the M7 corners): the mouth
// of the Deep Halls at Dawn, as the finale ends. A strip of the finale's Act III ground dressed by
// the game's own ground code (`dressTile` and the Halls' looks: the Halls-mouth ledges either side
// of the road with their gold seams, a power node's natural seam, the Spires' apron and the mouth
// itself on the north edge, `hallsMouthCell`), the road running up into the mouth, a relit waymark
// and the memorial wreck beside it. The choir stands at the mouth singing (Pebble leading, Thrum,
// the singers), and the Unsung, laid to rest, stands gold before the arch.
// The light is Dawn's as the sun lands (art-direction §3 *Finale*): the dawn sky behind, and over
// the ground the morning's additive light (songNightPixels `sunLightAt`: the rose wash, gold toward
// the east, the road and the gate lifted gold and the pads teal); every actor wears Dawn's rims,
// gold toward the sun and cyan along its top (render/views/dawnRimLook.ts).
import { rgbOf } from '../content/palettes/master.ts';
import { type SpriteId } from '../content/sprites/index.ts';
import { groundShadowFor } from '../content/sprites/shadows.ts';
import { APRON_RINGS } from '../content/sprites/tiles/apron.ts';
import type { EnvPaletteId } from '../content/sprites/types.ts';
import {
  DEFAULT_VARIANT,
  frameKey,
  type BakedFrame,
  type BakedSprite,
} from '../render/sprites/bake.ts';
import { imageToCanvas } from '../render/sprites/canvas.ts';
import type { RgbaImage } from '../render/sprites/rasterize.ts';
import { DAWN_RIMS } from '../render/views/dawnRimLook.ts';
import {
  apronCells,
  dressTile,
  envVariant,
  propVariant,
  type GroundGrid,
  type TileDressing,
} from '../render/views/groundTiles.ts';
import {
  LIFT_GOLD,
  LIFT_NONE,
  LIFT_PAD,
  sunKey,
  sunLightAt,
} from '../render/vfx/songNightPixels.ts';
import { backdrop, el, glowOf, isTileChar, type Placed } from './galleryKit.ts';

/** The ground is the finale's (baked on Act III); the sky is Dawn's. */
const ENV: EnvPaletteId = 'act3';
const SKY: EnvPaletteId = 'finale';

/** The corner's caption on the sheet. */
export const M8_CORNER_LABEL =
  'M8 corner · act3 at Dawn · the Deep Halls’ mouth: the choir singing, the Unsung laid to rest, the memorial wreck, a relit waymark';

// The road up from the south-east into the mouth on row 0 (its spawn); the Halls-mouth ledges
// (`^`) either side of it, a power node's seam (`+`), pads (`o`).
const MAP = [
  '....S....', //
  '...^#^...',
  '.o..#..o.',
  '....#+...',
  '..o.####C',
  '.........',
] as const;

const along = (row: number, from: number, to: number): [number, number][] =>
  [...Array(to - from + 1).keys()].map((k) => [from + k, row]);
const down = (col: number, from: number, to: number): [number, number][] =>
  [...Array(to - from + 1).keys()].map((k) => [col, from + k]);

const GRID: GroundGrid = {
  cols: MAP[0].length,
  rows: MAP.length,
  tiles: MAP.join('').split('').filter(isTileChar),
  markers: { halls_mouth: [4, 0], memorial_wreck: [6, 5], waymark_1: [1, 3] },
  env: ENV,
  routeList: [{ kind: 'path', tiles: [...down(4, 0, 4), ...along(4, 5, 8)] }],
};

/** The choir at the mouth, singing, and the Unsung laid to rest before the arch. */
const UNITS: readonly Placed[] = [
  ['enemy.unsung_rest', 'walk_se_1', 6.9, 2.2],
  ['ally.pebble_lead', 'sing_ne_0', 4.5, 1.6],
  ['ally.thrum', 'sing_ne_1', 3.6, 2.4],
  ['ally.singer', 'sing_ne_0', 4.6, 2.6],
  ['ally.singer', 'sing_ne_1', 2.7, 3.1],
  ['ally.singer', 'sing_se_0', 4.3, 3.5],
  ['ally.singer', 'sing_ne_1', 5.5, 3.4],
];

/** A placed sprite's depth: its ground point, scenery a hair behind a unit on the same spot. */
const foot = (o: Placed): number => (o[2] + o[3]) * 8 + (o[0].startsWith('prop.') ? 0.1 : 0.2);

/** The Dawn light's highlight for a tile char (the road and the gate gold, the pads teal). */
function liftOf(t: string | undefined): number {
  if (t === 'o') return LIFT_PAD;
  return t === '#' || t === 'C' || t === 'S' ? LIFT_GOLD : LIFT_NONE;
}

/** Draws `img` onto `to` at (x, y), at `alpha`, additively when `add`. */
const image = (
  to: CanvasRenderingContext2D,
  img: RgbaImage | HTMLCanvasElement,
  x: number,
  y: number,
  alpha = 1,
  add = false,
): void => {
  to.globalAlpha = alpha;
  if (add) to.globalCompositeOperation = 'lighter';
  to.drawImage(img instanceof HTMLCanvasElement ? img : imageToCanvas(img), x, y);
  to.globalCompositeOperation = 'source-over';
  to.globalAlpha = 1;
};

/** The M8 corner at `zoom`. */
export function m8Corner(baked: ReadonlyMap<string, BakedSprite>, zoom: number): HTMLCanvasElement {
  const grid = GRID;
  const rowsN = grid.rows;
  const colsN = grid.cols;
  const R = APRON_RINGS;
  const w = (colsN + rowsN + 4 * R) * 16;
  const oy = R * 16 + 56; // headroom for the mouth's arch on the back corner
  const h = oy + (colsN + rowsN + 2 * R - 2) * 8 + 16;
  const ox = (rowsN + 2 * R) * 16;
  const c = el('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  // The ground on its own canvas first, so Dawn's light lands on the ground alone.
  const gc = el('canvas');
  gc.width = w;
  gc.height = h;
  const gctx = gc.getContext('2d');
  if (ctx === null || gctx === null) return c;
  backdrop(ctx, SKY, w, h);
  const frameOf = (id: SpriteId, frame: string, variant = DEFAULT_VARIANT) =>
    baked.get(id)?.frames.find((f) => f.key === frameKey(id, variant, frame));
  const screen = (gx: number, gy: number): [number, number] => [
    Math.round((gx - gy) * 16 + ox),
    Math.round((gx + gy) * 8 + oy),
  ];
  const draw = (
    to: CanvasRenderingContext2D,
    f: BakedFrame | undefined,
    x: number,
    y: number,
    glow?: BakedFrame,
  ) => {
    if (f === undefined) return;
    image(to, f.image, x - f.anchor.x, y - f.anchor.y);
    if (glow !== undefined) image(to, glow.image, x - glow.anchor.x, y - glow.anchor.y, 1, true);
  };
  // The ground, as GroundView dresses the Halls' map; the props standing on it come later.
  const props: Placed[] = [];
  const cell = (i: number, j: number, look: TileDressing): void => {
    const [sx, sy] = screen(i, j);
    draw(gctx, frameOf(look.ground.sprite, look.ground.frame, envVariant(ENV)), sx, sy);
    for (const v of look.verge ?? []) draw(gctx, frameOf('tile.verge', v, envVariant(ENV)), sx, sy);
    const p = look.prop;
    if (p === null) return;
    const frame = p.sprite === 'prop.waymark' ? 'lit' : p.frame;
    props.push([p.sprite, frame, i + 0.5, j + 0.5, propVariant(p.sprite, ENV)]);
  };
  for (const a of apronCells(grid, ENV)) cell(a.col, a.row, a);
  for (let d = 0; d <= colsN + rowsN - 2; d++) {
    for (let i = Math.max(0, d - rowsN + 1); i <= Math.min(d, colsN - 1); i++) {
      cell(i, d - i, dressTile(grid, i, d - i));
    }
  }
  // Dawn's light over the drawn ground: additive, per pixel, by its grid point.
  const gd = gctx.getImageData(0, 0, w, h);
  const px = gd.data;
  const light = { r: 0, g: 0, b: 0 };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if ((px[i + 3] ?? 0) === 0) continue;
      const u = (x + 0.5 - ox) / 16;
      const v = (y + 0.5 - oy) / 8;
      const gx = (u + v) / 2;
      const gy = (v - u) / 2;
      const col = Math.floor(gx);
      const row = Math.floor(gy);
      const t =
        col >= 0 && row >= 0 && col < colsN && row < rowsN ? grid.tiles[row * colsN + col] : '.';
      sunLightAt(sunKey(gx, colsN), false, liftOf(t), light);
      px[i] = Math.min(255, (px[i] ?? 0) + light.r);
      px[i + 1] = Math.min(255, (px[i + 1] ?? 0) + light.g);
      px[i + 2] = Math.min(255, (px[i + 2] ?? 0) + light.b);
    }
  }
  gctx.putImageData(gd, 0, 0);
  image(ctx, gc, 0, 0);
  // Contact shadows under the units (the decal layer).
  for (const [id, , gx, gy] of UNITS) {
    const s = groundShadowFor(id);
    const [sx, sy] = screen(gx, gy);
    ctx.globalAlpha = s.alpha;
    draw(ctx, frameOf(s.sprite, s.frame), sx, sy);
    ctx.globalAlpha = 1;
  }
  // Everything standing, back to front: scenery with its glow, then the units in Dawn's rims.
  const rims = DAWN_RIMS.map((r) => rgbOf(r.color));
  const all: Placed[] = [...props, ...UNITS];
  for (const o of all.toSorted((a, b) => foot(a) - foot(b))) {
    const [id, frame, gx, gy, variant] = o;
    const [sx, sy] = screen(gx, gy);
    const f = frameOf(id, frame, variant ?? DEFAULT_VARIANT);
    if (f === undefined) continue;
    if (!id.startsWith('prop.')) {
      DAWN_RIMS.forEach((r, k) => {
        const tint = rims[k]!; // k < length
        image(ctx, filled(f.image, tint), sx - f.anchor.x + r.dx, sy - f.anchor.y + r.dy, r.alpha);
      });
    }
    draw(ctx, f, sx, sy, glowOf(baked, id, frame));
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

/** `img`'s silhouette filled with one colour (a rim copy, as render's FILL tint draws it). */
function filled(img: RgbaImage, c: { r: number; g: number; b: number }): RgbaImage {
  const data = new Uint8ClampedArray(new ArrayBuffer(img.data.length));
  for (let i = 0; i < data.length; i += 4) {
    data[i] = c.r;
    data[i + 1] = c.g;
    data[i + 2] = c.b;
    data[i + 3] = img.data[i + 3] ?? 0;
  }
  return { w: img.w, h: img.h, data };
}
