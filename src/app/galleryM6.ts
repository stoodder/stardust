// The M6 corners of the sprite gallery's diorama sheet (review R10, after the M5 corner): two strips
// of Act III ground in the Long Night, staged with the game's own looks so the art trail shows
// Act III as play draws it.
// - **The Preserve** (A3M1): the warren homes in the basin (one tagged, one with its lantern lit),
//   a Scuttle Den whose swarmlings have latched onto a Fracture on the road, a grown Maw mid-gulp
//   (its tell: a `violet.4` noose round the Mote it holds, three white-cored tendrils from it to the
//   mouth, a bead riding each), and a rift torn open below the road, a Mote climbing out.
// - **The Gap at the SEAL** (A3M3): the Hollow piled at Bricks's post, Bricks in his `last` stance
//   firing up the cut, the blast door at the road's foot running shut (`closing`), a Lullaby Choir's
//   dashed gold song ring and blue Lullaby ring over the road (a Mote in them Lulled), and a revoked Rivet
//   folding away under its LICENSE REVOKED stamp, dark (`POWER_DOWN_COLOR`) and half sunk.
// Act III has no darkness (D141): scenery wears its baked glow at NIGHT_GLOW, the emergency lamps
// burn red, and the two moons hang in the sky (galleryKit `backdrop`).
import { rgbOf, type ColorName } from '../content/palettes/master.ts';
import { SPRITES, type SpriteId } from '../content/sprites/index.ts';
import { groundShadowFor } from '../content/sprites/shadows.ts';
import { APRON_RINGS } from '../content/sprites/tiles/apron.ts';
import type { EnvPaletteId } from '../content/sprites/types.ts';
import { choir } from '../content/towers/choir.ts';
import {
  DEFAULT_VARIANT,
  frameKey,
  mountOf,
  type BakedFrame,
  type BakedSprite,
} from '../render/sprites/bake.ts';
import { imageToCanvas } from '../render/sprites/canvas.ts';
import type { RgbaImage } from '../render/sprites/rasterize.ts';
import {
  LULL_RING_COLOR,
  lulledImage,
  noteImage,
  NOTE_LIFT_PX,
  NOTE_SIDE_PX,
  SONG_COLOR,
  SONG_UNDER,
} from '../render/views/choirLook.ts';
import { beadAt, nooseTiles, TENDRIL_STROKES } from '../render/views/gatherLook.ts';
import {
  apronCells,
  dressTile,
  envVariant,
  propVariant,
  type GroundGrid,
  type TileDressing,
} from '../render/views/groundTiles.ts';
import { foldSinkPx, POWER_DOWN_COLOR } from '../render/views/towerLook.ts';
import { emissiveGlow, PROP_GLOWS } from '../render/vfx/glowPixels.ts';
import { NIGHT_GLOW } from '../render/vfx/nightGlow.ts';
import { ringImage } from '../render/vfx/overlayPixels.ts';
import { backdrop, cssOf, el, FLY_LIFT_PX, glowOf, isTileChar, type Placed } from './galleryKit.ts';

const ENV: EnvPaletteId = 'act3';

export type M6Scene = 'preserve' | 'seal';

/** The two corners, in sheet order, with their captions. */
export const M6_CORNERS: readonly (readonly [M6Scene, string])[] = [
  [
    'preserve',
    'M6 corner · act3 · the Preserve: warren homes, a Den latching, a Maw mid-gulp, an open rift',
  ],
  [
    'seal',
    'M6 corner · act3 · the Gap at the SEAL: Bricks’s last stand, a door closing, the song, a revoked Rivet',
  ],
];

/** A grid from its rows, markers and road. */
function strip(
  map: readonly string[],
  markers: Readonly<Record<string, readonly [number, number]>>,
  road: readonly (readonly [number, number])[],
): GroundGrid {
  return {
    cols: map[0]?.length ?? 0,
    rows: map.length,
    tiles: map.join('').split('').filter(isTileChar),
    markers,
    env: ENV,
    routeList: [{ kind: 'ground', tiles: road }],
  };
}

/** The Preserve: the road along row 2, the homes in the basin, the Den on its pad, a rift south. */
const PRESERVE = strip(
  ['.o.......', '.........', '#########', '.........', '.....o...'],
  { home_1: [4, 0], home_2: [7, 0], home_3: [2, 4] },
  [...Array(9).keys()].map((c) => [c, 2] as const),
);
/** The rift's lane: two half-cracks per tile, from the apron up to the road (tile.rift). */
const RIFT: readonly (readonly [number, number, string])[] = [
  [7, 4, 'sw'],
  [7, 4, 'ne'],
  [7, 3, 'sw'],
  [7, 3, 'ne'],
];

/** The Maw in its tell, and the Mote it holds ahead of it on the road. */
const MAW = [4.1, 2.45] as const;
const HELD = [6.2, 2.6] as const;

/** The Gap: the cut down column 3 to the blast door at its foot, Bricks's post on the rock east. */
const GAP = strip(
  ['...#...', '.o.#.o.', '...#...', '...#...', '...#...', '.o.#...', '...#...', '...#...'],
  { bricks_post: [4, 3] },
  [...Array(8).keys()].map((r) => [3, r] as const),
);
const DOOR = [3, 7] as const;
const POST = [4.5, 3.5] as const;
const CHOIR_PAD = [1, 1] as const;
const REVOKED_PAD = [5, 1] as const;
/** How far the revoked Rivet has folded (towerLook `foldSinkPx`): its head half into its base. */
const REVOKED_FOLD = 0.25;
/** The stamp's plate centre sits this far over the tower's ground point (RevokedView). */
const STAMP_LIFT_PX = 18;

/** `img` multiplied by `tint` with its bottom `crop` rows cut off (a powered-down tower part). */
function tinted(img: RgbaImage, tint: ColorName, crop: number): RgbaImage {
  const t = rgbOf(tint);
  const h = Math.max(0, img.h - crop);
  const data = new Uint8ClampedArray(img.w * img.h * 4);
  for (let i = 0; i < img.w * h * 4; i += 4) {
    data[i] = ((img.data[i] ?? 0) * t.r) / 255;
    data[i + 1] = ((img.data[i + 1] ?? 0) * t.g) / 255;
    data[i + 2] = ((img.data[i + 2] ?? 0) * t.b) / 255;
    data[i + 3] = img.data[i + 3] ?? 0;
  }
  return { w: img.w, h: img.h, data };
}

/** One M6 corner at `zoom`. */
export function m6Corner(
  baked: ReadonlyMap<string, BakedSprite>,
  scene: M6Scene,
  zoom: number,
): HTMLCanvasElement {
  const grid = scene === 'preserve' ? PRESERVE : GAP;
  const rowsN = grid.rows;
  const colsN = grid.cols;
  // The grid plus the decor apron the game draws round it (APRON_RINGS on every side).
  const R = APRON_RINGS;
  const w = (colsN + rowsN + 4 * R) * 16;
  const oy = R * 16 + 24; // headroom for the props on the back corner
  const h = oy + (colsN + rowsN + 2 * R - 2) * 8 + 16;
  const ox = (rowsN + 2 * R) * 16;
  const c = el('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx === null) return c;
  backdrop(ctx, ENV, w, h);
  const frameOf = (id: SpriteId, frame: string, variant = DEFAULT_VARIANT) =>
    baked.get(id)?.frames.find((f) => f.key === frameKey(id, variant, frame));
  const screen = (gx: number, gy: number): [number, number] => [
    Math.round((gx - gy) * 16 + ox),
    Math.round((gx + gy) * 8 + oy),
  ];
  const image = (img: RgbaImage, x: number, y: number, alpha = 1, add = false): void => {
    ctx.globalAlpha = alpha;
    if (add) ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(imageToCanvas(img), x, y);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  };
  const draw = (f: BakedFrame | undefined, x: number, y: number, glow?: BakedFrame, k = 1) => {
    if (f === undefined) return;
    image(f.image, x - f.anchor.x, y - f.anchor.y);
    if (glow !== undefined) image(glow.image, x - glow.anchor.x, y - glow.anchor.y, k, true);
  };
  // The ground and its scenery, as GroundView dresses an Act III map.
  const props: Placed[] = [];
  const cell = (i: number, j: number, look: TileDressing): void => {
    const [sx, sy] = screen(i, j);
    draw(frameOf(look.ground.sprite, look.ground.frame, envVariant(ENV)), sx, sy);
    for (const v of look.verge ?? []) draw(frameOf('tile.verge', v, envVariant(ENV)), sx, sy);
    const p = look.prop;
    if (p !== null) props.push([p.sprite, p.frame, i + 0.5, j + 0.5, propVariant(p.sprite, ENV)]);
  };
  for (const a of apronCells(grid, ENV)) cell(a.col, a.row, a);
  for (let d = 0; d <= colsN + rowsN - 2; d++) {
    for (let i = Math.max(0, d - rowsN + 1); i <= Math.min(d, colsN - 1); i++) {
      cell(i, d - i, dressTile(grid, i, d - i));
    }
  }
  // The rift's cracks on the ground (RiftView: under everything standing), torn open.
  if (scene === 'preserve') {
    for (const [i, j, edge] of RIFT) {
      const [sx, sy] = screen(i, j);
      const f = `open_${edge}_0`;
      draw(frameOf('tile.rift', f), sx, sy, glowOf(baked, 'tile.rift', f));
    }
  }

  // Everything standing, back to front: scenery (its glow at NIGHT_GLOW, a lamp's light whole),
  // the towers, the units.
  type Tower = {
    tower: SpriteId;
    head: SpriteId;
    base: string;
    frame: string;
    gx: number;
    gy: number;
    fold?: number;
  };
  type Stand = Placed | Tower;
  const towers: Tower[] =
    scene === 'preserve'
      ? [
          {
            tower: 'tower.burrow',
            head: 'tower.burrow_head',
            base: 't2',
            frame: 'peek_3',
            gx: 1.5,
            gy: 0.5,
          },
        ]
      : [
          {
            tower: 'tower.choir',
            head: 'tower.choir_head',
            base: 'spec_a',
            frame: 'hum_spec_a_1',
            gx: CHOIR_PAD[0] + 0.5,
            gy: CHOIR_PAD[1] + 0.5,
          },
          {
            tower: 'tower.rivet',
            head: 'tower.rivet_head',
            base: 't2',
            frame: 'sw_t2',
            gx: REVOKED_PAD[0] + 0.5,
            gy: REVOKED_PAD[1] + 0.5,
            fold: REVOKED_FOLD,
          },
        ];
  const units: Placed[] =
    scene === 'preserve'
      ? [
          // The Den's swarmlings latched onto a Fracture, one more running to it.
          ['enemy.fracture', 'walk_se_1', 2.5, 2.5],
          ['ally.swarmling', 'latch_se_0', 2.2, 2.45],
          ['ally.swarmling', 'latch_ne_1', 2.75, 2.75],
          ['ally.swarmling', 'walk_se_1', 1.8, 1.55],
          // The Maw (grown twice) in its tell, the Mote it holds ahead of it on the road.
          ['enemy.maw_g2', 'tell_se_1', MAW[0], MAW[1]],
          ['enemy.mote', 'walk_sw_0', HELD[0], HELD[1]],
          // A Mote climbing out of the rift, toward the road.
          ['enemy.mote', 'walk_ne_1', 7.45, 3.7],
        ]
      : [
          // The Hollow piled up the cut against Bricks's block, one of them Lulled by the song.
          ['enemy.fracture', 'walk_sw_1', 3.5, 1.2],
          ['enemy.mote', 'walk_sw_0', 3.35, 2.1],
          ['enemy.mote', 'walk_sw_2', 3.7, 2.55],
          ['enemy.fracture_shard', 'walk_sw_0', 3.45, 0.35],
          ['ally.bricks', 'last_fire_ne_0', POST[0], POST[1]],
        ];
  const all: Stand[] = [...props, ...towers, ...units];
  const foot = (o: Stand): number =>
    'tower' in o
      ? (o.gx + o.gy) * 8 + 0.3
      : (o[2] + o[3]) * 8 + (o[0].startsWith('prop.') ? 0.1 : 0.2);
  // Contact shadows under the units (the decal layer).
  for (const [id, , gx, gy] of units) {
    if (!id.startsWith('enemy.') && !id.startsWith('ally.')) continue;
    const s = groundShadowFor(id);
    const [sx, sy] = screen(gx, gy);
    ctx.globalAlpha = s.alpha;
    draw(frameOf(s.sprite, s.frame), sx, sy);
    ctx.globalAlpha = 1;
  }
  for (const o of all.toSorted((a, b) => foot(a) - foot(b))) {
    if ('tower' in o) {
      const [sx, sy] = screen(o.gx, o.gy);
      const base = frameOf(o.tower, o.base);
      const head = frameOf(o.head, o.frame);
      const def = SPRITES.find((d) => d.id === o.tower);
      const mount = def === undefined ? null : mountOf(def);
      if (base === undefined || head === undefined || mount === null) continue;
      if (o.fold === undefined) {
        draw(base, sx, sy, glowOf(baked, o.tower, o.base));
        draw(
          head,
          sx - base.anchor.x + mount.x,
          sy - base.anchor.y + mount.y,
          glowOf(baked, o.head, o.frame),
        );
        continue;
      }
      // Revoked: dark, glows out, the head sinking into the base (TowerView `powerDown`).
      const sink = foldSinkPx(o.fold, head.image.h, base.image.h);
      image(
        tinted(base.image, POWER_DOWN_COLOR, sink.base),
        sx - base.anchor.x,
        sy - base.anchor.y + sink.base,
      );
      const hx = sx - base.anchor.x + mount.x - head.anchor.x;
      const hy = sy - base.anchor.y + mount.y - head.anchor.y + sink.base + sink.head;
      image(tinted(head.image, POWER_DOWN_COLOR, sink.head + sink.base), hx, hy);
      continue;
    }
    const [id, frame, gx, gy, variant] = o;
    const [sx, sy] = screen(gx, gy);
    const f = frameOf(id, frame, variant ?? DEFAULT_VARIANT);
    const isProp = id.startsWith('prop.');
    draw(f, sx, sy, glowOf(baked, id, frame), isProp ? NIGHT_GLOW : 1);
    const lamp = PROP_GLOWS[id];
    if (isProp && lamp !== undefined && f !== undefined) {
      const r = lamp.radius;
      const glow = emissiveGlow([f.image], lamp.colors, r, lamp.halo ?? null);
      image(glow, sx - f.anchor.x - r, sy - f.anchor.y - r, 1, true);
    }
  }

  if (scene === 'preserve') {
    // The Maw's tell over the units (HollowView): the noose closing round the held Mote, three
    // tendrils from it to the mouth, a bead riding each; late in the tell, so the noose is tight.
    const progress = 0.6;
    const [mx, my] = screen(...HELD);
    const held = [mx, my - 6] as const;
    const [gx, gy] = screen(...MAW);
    const mouth = [gx + 9, gy - 6] as const;
    const noose = ringImage(nooseTiles(progress), 'violet.4', false, 'ink.0');
    image(noose.image, held[0] - noose.cx, held[1] + 4 - noose.cy);
    const tendril = (k: number, t: number): [number, number] => {
      const x = held[0] + (mouth[0] - held[0]) * t;
      // Fanned apart between the ends (the outer two bow out), each wavering on its own.
      const y = held[1] + (mouth[1] - held[1]) * t + (k - 1) * (2 + 8 * Math.sin(Math.PI * t));
      return [x + Math.sin(t * 9 + k * 2) * 1.5, y];
    };
    for (const s of TENDRIL_STROKES) {
      ctx.globalAlpha = s.alpha;
      ctx.strokeStyle = cssOf(s.color);
      ctx.lineWidth = s.px;
      ctx.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        for (let n = 0; n <= 12; n++) {
          const [x, y] = tendril(k, n / 12);
          if (n === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = cssOf('white.1');
    for (let k = 0; k < 3; k++) {
      const [x, y] = tendril(k, beadAt(progress, k / 3));
      ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
    }
    // A Rift Moth fluttering up out of the crack, over its shadow.
    const [fx, fy] = screen(7.3, 3.3);
    draw(frameOf('fx.shadow', 'small'), fx, fy);
    draw(
      frameOf('enemy.riftmoth', 'walk_ne_1'),
      fx,
      fy - FLY_LIFT_PX,
      glowOf(baked, 'enemy.riftmoth', 'walk_ne_1'),
    );
  } else {
    // The blast door at the cut's foot, running shut (BlastDoorView's `closing`), its glow whole.
    const [dx, dy] = screen(DOOR[0] + 0.5, DOOR[1] + 0.5);
    draw(
      frameOf('prop.blast_door', 'closing_1'),
      dx,
      dy,
      glowOf(baked, 'prop.blast_door', 'closing_1'),
    );
    // A Lullaby Choir's rings (ChoirView): its own dashed blue reach under the song's dashed gold
    // (T3's aura, which a spec keeps), a step off; its note; the Lulled notes on the Mote in it.
    const [cx, cy] = screen(CHOIR_PAD[0] + 0.5, CHOIR_PAD[1] + 0.5);
    const reach = choir.tiers[2]?.auras?.find((a) => a.kind === 'choir')?.radiusTiles ?? 2;
    const lull = choir.specs?.a.lull?.radiusTiles ?? 2.5;
    for (const [r, color, shift] of [
      [lull, LULL_RING_COLOR, 1],
      [reach, SONG_COLOR, 0],
    ] as const) {
      const ring = ringImage(r, color, true, SONG_UNDER, shift);
      image(ring.image, cx - ring.cx, cy - ring.cy);
    }
    const note = noteImage('gold.4');
    image(note, cx + NOTE_SIDE_PX - Math.floor(note.w / 2), cy - NOTE_LIFT_PX - note.h);
    const lulled = lulledImage('blue.4');
    const [lx, ly] = screen(3.35, 2.1);
    image(lulled, lx + 2, ly - 16 - lulled.h);
    // The LICENSE REVOKED stamp over the folding Rivet.
    const stamp = frameOf('icon.stamp.license_revoked', 'icon');
    const [rx, ry] = screen(REVOKED_PAD[0] + 0.5, REVOKED_PAD[1] + 0.5);
    if (stamp !== undefined) {
      image(
        stamp.image,
        rx - Math.floor(stamp.image.w / 2),
        ry - STAMP_LIFT_PX - Math.floor(stamp.image.h / 2),
      );
    }
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
