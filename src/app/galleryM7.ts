// The M7 corners of the sprite gallery's diorama sheet (T740c, after the M6 corners): three strips
// of Act III ground in the Long Night, one per map of M7, dressed by the game's own ground code
// (`dressTile` and `DECOR_MARKERS` place the props from each strip's markers, with the act's looks)
// so the art trail shows A3M4–A3M6 as play draws them.
// - **The Shelters** (A3M4): the tunnel down to the hall junction and the corridor to the shelter
//   generator (standing in for the core, as T730b draws it there), the hall door below it, the last
//   Fun Friday banner over three sleeping kids, two shelter bays, Gerald's mail chute, and both
//   flags' dressing at once (the gallery shows the art, not a run): HE HELD THE DOOR (convoy) and
//   the humming ring (warren). A Liability Enforcer walks the corridor to repossess the generator;
//   a Silencer uncoils its tell on the tunnel.
// - **Second Harvest at night** (A3M5): the vats at full blaze, the three feed lines burst on the
//   north edge (Cut the Feed's wrecks), "Shareholder Value"'s hangar, its REC lamp blinking, the
//   boss jettisoned on the road (`panic`) and its four plates dug in on the crash site, two bearers
//   carrying the vats' dead along the road.
// - **Dome Row at night** (A3M6): the 2-wide lane (`tile.path`'s `wide_*`) up to the gate, Dome 1
//   open beside it and frosting, the old road barricaded with lettuce crates, Pebble on the Peeker's
//   rock, Zibzab's crate open, a militia post, refugees walking in, and the Gathering Maw behind them.
// Act III has no darkness (D141): scenery wears its baked glow at NIGHT_GLOW, lamps their whole
// light, and the two moons hang in the sky (galleryKit `backdrop`).
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
import {
  apronCells,
  dressTile,
  envVariant,
  propVariant,
  type GroundGrid,
  type TileDressing,
} from '../render/views/groundTiles.ts';
import { emissiveGlow, PROP_GLOWS } from '../render/vfx/glowPixels.ts';
import { NIGHT_GLOW } from '../render/vfx/nightGlow.ts';
import { backdrop, el, glowOf, isTileChar, type Placed } from './galleryKit.ts';

const ENV: EnvPaletteId = 'act3';

export type M7Scene = 'shelters' | 'harvest' | 'dome_row';

/** The three corners, in sheet order, with their captions. */
export const M7_CORNERS: readonly (readonly [M7Scene, string])[] = [
  [
    'shelters',
    'M7 corner · act3 · the Shelters: the generator, the hall, the Fun Friday banner, HE HELD THE DOOR (convoy) and the humming ring (warren)',
  ],
  [
    'harvest',
    'M7 corner · act3 · Second Harvest at night: vats at full blaze, the feed lines burst, the hangar, the jettison’s crash site',
  ],
  [
    'dome_row',
    'M7 corner · act3 · Dome Row at night: the 2-wide lane, Dome 1 open and frosting, the lettuce-crate barricade, Pebble on her rock, Zibzab’s crate',
  ],
];

/** One corner: its grid, the ground frames that stand in for render's (the lane), its props
 * placed by hand (the views' props), and its units. */
interface Corner {
  readonly grid: GroundGrid;
  readonly ground?: Readonly<Record<string, string>>;
  readonly props: readonly Placed[];
  readonly units: readonly Placed[];
}

/** A grid from its rows, markers and roads. */
function strip(
  map: readonly string[],
  markers: Readonly<Record<string, readonly [number, number]>>,
  roads: readonly (readonly (readonly [number, number])[])[],
): GroundGrid {
  return {
    cols: map[0]?.length ?? 0,
    rows: map.length,
    tiles: map.join('').split('').filter(isTileChar),
    markers,
    env: ENV,
    routeList: roads.map((tiles) => ({ kind: 'path', tiles })),
  };
}

const along = (row: number, from: number, to: number): [number, number][] =>
  [...Array(to - from + 1).keys()].map((k) => [from + k, row]);
const down = (col: number, from: number, to: number): [number, number][] =>
  [...Array(to - from + 1).keys()].map((k) => [col, from + k]);

const CORNERS: Readonly<Record<M7Scene, Corner>> = {
  // The tunnel along row 1 to the junction (4,1), the corridor down to the generator (4,4); the
  // hall below it: its door, the banner, and the two flags' memorials either side.
  shelters: {
    grid: strip(
      ['..o...o..', '#########', '....#....', '....#....', '....C....', '.........', '.........'],
      {
        mail_chute: [0, 0],
        bay_1: [1, 3],
        bay_2: [7, 3],
        hall_door: [4, 5],
        banner_friday: [4, 6],
        held_door: [2, 6],
        humming_ring: [6, 6],
      },
      [along(1, 0, 8), [...down(4, 1, 4)]],
    ),
    props: [],
    units: [
      ['enemy.liability', 'walk_sw_1', 4.5, 2.6],
      ['enemy.silencer', 'tell_se_0', 2.4, 1.5],
      ['enemy.associate', 'walk_se_2', 6.6, 1.45],
    ],
  },
  // The road along row 2, the vats north of it and the hangar east; the burst feed lines (moved
  // south of the road here, where the vats don't hide them) and the crash site's four plates.
  harvest: {
    grid: strip(
      ['.........', '.........', '#########', '.x.x.x...', '.........'],
      {
        feed_1: [1, 3],
        feed_2: [3, 3],
        feed_3: [5, 3],
        vat_west: [1, 1],
        vat_middle: [3, 1],
        vat_east: [5, 1],
        hangar: [8, 0],
      },
      [along(2, 0, 8)],
    ),
    props: [
      ['prop.crash_plate', 'v0', 2.5, 4.5],
      ['prop.crash_plate', 'v1', 4.5, 4.5],
      ['prop.crash_plate', 'v2', 6.5, 3.5],
      ['prop.crash_plate', 'v3', 7.5, 4.5],
    ],
    units: [
      ['enemy.shareholder_value', 'panic_sw_1', 6.6, 2.5],
      ['ally.bearer', 'walk_sw_0', 0.7, 2.4],
      ['ally.bearer', 'walk_sw_1', 1.9, 2.65],
    ],
  },
  // The 2-wide lane along rows 2–3 to the gate (6), Dome 1 open beside it, the old road on east
  // barricaded; Pebble's rock north of the lane, Zibzab's crate and a militia post south of it.
  dome_row: {
    grid: strip(
      ['.........', '.........', '#######..', '#######..', '.........', '.........'],
      { dome_1: [7, 1], barricade_y: [7, 3], zibzab_crate: [4, 5] },
      [along(2, 0, 6), along(3, 0, 6)],
    ),
    ground: Object.fromEntries([
      ...along(2, 0, 6).map(([c, r]) => [`${c},${r}`, 'wide_x_ne']),
      ...along(3, 0, 6).map(([c, r]) => [`${c},${r}`, 'wide_x_sw']),
    ]),
    props: [
      ['prop.pebble_rock', 'perch_0', 2.5, 1.5],
      ['prop.dome', 'frost_1', 7.5, 1.5],
    ],
    units: [
      ['ally.militia', 'idle_ne_0', 2.5, 4.5],
      ['ally.refugee', 'walk_se_0', 5.3, 2.4],
      ['ally.refugee', 'carry_se_1', 4.6, 3.3],
      ['ally.refugee', 'walk_se_1', 4.0, 2.55],
      ['ally.pebble', 'walk_se_0', 3.4, 3.4, 'skitterkin.ally'],
      ['enemy.gathering_maw', 'walk_se_1', 0.9, 3.0],
    ],
  },
};

/** A placed sprite's depth: its ground point, scenery a hair behind a unit on the same spot. */
const foot = (o: Placed): number => (o[2] + o[3]) * 8 + (o[0].startsWith('prop.') ? 0.1 : 0.2);

/** One M7 corner at `zoom`. */
export function m7Corner(
  baked: ReadonlyMap<string, BakedSprite>,
  scene: M7Scene,
  zoom: number,
): HTMLCanvasElement {
  const corner = CORNERS[scene];
  const grid = corner.grid;
  const rowsN = grid.rows;
  const colsN = grid.cols;
  const R = APRON_RINGS;
  const w = (colsN + rowsN + 4 * R) * 16;
  const oy = R * 16 + 40; // headroom for the tall props on the back corner
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
  // The ground and its scenery, as GroundView dresses an Act III map (the lane's frames as T730b
  // draws them; the generator on the Shelters' core tile).
  const props: Placed[] = [...corner.props];
  const cell = (i: number, j: number, look: TileDressing): void => {
    const [sx, sy] = screen(i, j);
    const ground = corner.ground?.[`${i},${j}`] ?? look.ground.frame;
    draw(frameOf(look.ground.sprite, ground, envVariant(ENV)), sx, sy);
    for (const v of look.verge ?? []) draw(frameOf('tile.verge', v, envVariant(ENV)), sx, sy);
    const p = look.prop;
    if (p === null) return;
    const sprite: SpriteId = p.sprite === 'prop.core' ? 'prop.generator' : p.sprite;
    // Dome 1 is placed by hand in a later frame (its frost, T730b's).
    if (scene === 'dome_row' && sprite === 'prop.dome') return;
    props.push([sprite, p.frame, i + 0.5, j + 0.5, propVariant(sprite, ENV)]);
  };
  for (const a of apronCells(grid, ENV)) cell(a.col, a.row, a);
  for (let d = 0; d <= colsN + rowsN - 2; d++) {
    for (let i = Math.max(0, d - rowsN + 1); i <= Math.min(d, colsN - 1); i++) {
      cell(i, d - i, dressTile(grid, i, d - i));
    }
  }
  // Contact shadows under the units (the decal layer).
  for (const [id, , gx, gy] of corner.units) {
    const s = groundShadowFor(id);
    const [sx, sy] = screen(gx, gy);
    ctx.globalAlpha = s.alpha;
    draw(frameOf(s.sprite, s.frame), sx, sy);
    ctx.globalAlpha = 1;
  }
  // Everything standing, back to front: scenery (its glow at NIGHT_GLOW, a lamp's light whole),
  // then the units.
  const all: Placed[] = [...props, ...corner.units];
  for (const o of all.toSorted((a, b) => foot(a) - foot(b))) {
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
