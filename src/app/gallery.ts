// Sprite gallery dev page (gallery.html, T104): every sprite, variant, and frame at 1× and an
// integer zoom on dark and light backgrounds, plus small dioramas that exercise anchors, tile
// seams, head mounts, and environment palette swaps. Deterministic, so its screenshot can be
// compared milestone to milestone. Smoke reads the data-* counters on <body>. The page is laid
// out as sheets of at most SHEET_MAX_PX, each captured as its own image (the art trail); the
// dioramas fill sheet 1 alone, the sprite cards start on sheet 2. After the
// environment dioramas comes the M5 corner (review U11), on A2M5–A2M6's dusk palette: by dusk, the
// Ward kneeling over the road as refugees file past and a Prism beaming; at full dark, a lamp's
// pool, a beaming Prism's lit disc and a resting one's ghost, composited with the game's own
// night (vfx/darknessPixels.ts, vfx/glowPixels.ts) so the trail shows the night as play draws it.
// Then the M6 corners (review R10, app/galleryM6.ts): A3M1's Preserve and A3M3's Gap at the SEAL;
// and the M7 corners (T740c, app/galleryM7.ts): A3M4's Shelters, A3M5's Second Harvest at night,
// A3M6's Dome Row at night. The act3 diorama and the Act III corners hang the two moons in their sky
// (app/galleryKit.ts).
import { ENV_PALETTE_IDS } from '../content/palettes/env.ts';
import { PALETTES } from '../content/palettes/index.ts';
import type { SpriteId } from '../content/sprites/index.ts';
import { ALL_SPRITES } from '../content/sprites/all.ts';
// The finale's stills: out of ALL_SPRITES (the boot atlas), shown here as cards all the same (T843).
import { FINALE_SCENE_SPRITES } from '../content/sprites/scenes/finale.ts';
import { tetherDir } from '../content/sprites/fx/link_tether.ts';
import { groundShadowFor } from '../content/sprites/shadows.ts';
import type { EnvPaletteId, SpriteDef } from '../content/sprites/types.ts';
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
import {
  apronCells,
  dressTile,
  envVariant,
  isActTwo,
  propVariant,
  wreckageFrame,
  type GroundGrid,
  type TileDressing,
} from '../render/views/groundTiles.ts';
import { OUTLINE_PAD, outlineImage, silhouetteContour } from '../render/vfx/clickOutline.ts';
import { LAMP_RADIUS_TILES } from '../content/rules.ts';
import { prism } from '../content/towers/prism.ts';
import {
  darkTones,
  drawDarkMask,
  drawLampMask,
  ghostDiscImage,
  noDark,
  type LightDisc,
} from '../render/vfx/darknessPixels.ts';
import {
  emissiveGlow,
  glowAlpha,
  poolImage,
  prismHaloImage,
  PROP_GLOWS,
} from '../render/vfx/glowPixels.ts';
import { GHOST_REST_ALPHA } from '../render/views/LightGhostView.ts';
import { backdrop, cssOf, el, FLY_LIFT_PX, glowOf, isTileChar, type Placed } from './galleryKit.ts';
import { m6Corner, M6_CORNERS } from './galleryM6.ts';
import { m7Corner, M7_CORNERS } from './galleryM7.ts';
import { logError } from './log.ts';

function hasOpaque(img: RgbaImage): boolean {
  for (let i = 3; i < img.data.length; i += 4) if ((img.data[i] ?? 0) > 0) return true;
  return false;
}

/**
 * Which palette variant a sprite card shows beside `default`: one per sprite keeps the page
 * capturable (D044), and the dioramas show every environment palette anyway. Env-tinted sprites
 * show `act3` (the deepest dark), the others their first variant (`skitterkin.ally`,
 * `everglow.worn`).
 */
function secondVariant(b: BakedSprite): string | undefined {
  const palettes = b.variants.filter((v) => v !== DEFAULT_VARIANT && !v.includes('+'));
  return palettes.includes('act3') ? 'act3' : palettes[0];
}

/** Every sprite the gallery shows: every registry (sprites/all.ts), then the finale's stills. */
const GALLERY_SPRITES: readonly SpriteDef[] = [...ALL_SPRITES, ...FINALE_SCENE_SPRITES];

const DEFS: ReadonlyMap<string, SpriteDef> = new Map(GALLERY_SPRITES.map((d) => [d.id, d]));

/** A frame made by mirroring (`walk_sw_0`, `nw_fire`): its source frame is on show already. */
function isMirrorFrame(b: BakedSprite, name: string): boolean {
  const fd = DEFS.get(b.id)?.frames[name];
  return fd === undefined || 'mirrorOf' in fd;
}

/** Portraits show `default` and its derived `+dark` (the derived variants of the default only). */
function isShownVariant(name: string): boolean {
  return !name.includes('+') || name.startsWith(`${DEFAULT_VARIANT}+`);
}

/**
 * What a sprite card shows (T311a, T311b: to keep the art trail under the capture limit):
 * - `default`, its authored frames at 1× and zoomed, on dark (with its `@glow` added) and on light
 *   (without), then its mirrored frames at 1× only, on dark (mirrors are mechanical: the validator
 *   checks them, and the gallery only needs to show they face the other way);
 * - one more palette variant (`secondVariant`), its authored frames only, zoomed on dark;
 * - each derived variant (`default+selected`, `default+jammed`, `default+cloak`), its first frame
 *   only;
 * - a Hollow unit's Heavy and reach frames in a dark row of their own, and a fleeing body's card
 *   only its authored frames, dark (T440a);
 * - a tower's spec frames and an Aelari unit's non-walk poses in a dark row of their own (T440b),
 *   kept out of the palette variant's row.
 */
interface CardPlan {
  readonly rows: readonly {
    readonly variant: string;
    readonly frames: readonly string[];
    readonly light: boolean;
    readonly glow: boolean;
    /** Shown at 1× only (no zoomed copy). */
    readonly small?: boolean;
  }[];
}

/**
 * An enemy's death pop (T311c) gets its own row, dark only and in the default palette, so the
 * page stays inside the art-trail capture.
 */
function isDeath(n: string): boolean {
  return n.startsWith('death_');
}

/**
 * Full-screen scene art (`scene.*`, the DOM scene layer's: the Rig 9 feed) is big and drawn only
 * on the scene layer's `ink.0` stage, so its card shows its frames on dark only.
 */
function isScene(b: BakedSprite): boolean {
  return b.id.startsWith('scene.');
}

/**
 * A fleeing body (`enemy.<id>_fleeing`, T440a) is its unit's other look, built from its walk: its
 * card shows only its authored frames (the scurry, the glance, the panic hop), dark, with glow.
 */
function isFleeingBody(b: BakedSprite): boolean {
  return b.id.startsWith('enemy.') && b.id.endsWith('_fleeing');
}

/**
 * A Hollow unit's Heavy walk and hush reach (T440a) get a row of their own, dark only, so the
 * card stays one row wide.
 */
function isHollowLook(b: BakedSprite, n: string): boolean {
  return DEFS.get(b.id)?.palette === 'hollow' && /^(heavy|tell)_/.test(n);
}

/**
 * M7's boss bodies (T740a) and the Unsung's forms (T841; T871), whose many states get their own
 * dark row, like the Witch's.
 */
const M7_BOSS_BODIES =
  /^enemy\.(shareholder_value|gathering_maw(_g\d)?|unsung(_(g\d|split|burrow|song|part|rest))?)$/;

/**
 * A tower's tier-4 spec frames (`spec_a`, `se_spec_b_fire`, `spin_spec_a_0`, …; T440b), an
 * Aelari unit's non-walk poses (the Glass Witch's tell, blink, puff, and flee), and M7's bosses'
 * (T740a) get a row of their own, dark only, so the cards stay compact.
 */
function isDarkOnlyLook(b: BakedSprite, n: string): boolean {
  if (b.id.startsWith('tower.')) return /(^|_)spec_[ab]/.test(n);
  // M7's bosses (T740a): "Shareholder Value"'s and the Gathering Maw's states past the walk; the
  // Unsung's too (T871).
  if (M7_BOSS_BODIES.test(b.id)) return !n.startsWith('walk_');
  return (
    DEFS.get(b.id)?.palette === 'aelari' && b.id.startsWith('enemy.') && !n.startsWith('walk_')
  );
}

/** The jailbroken palette (T740b) and its base frames' twins (`t1_jb`; towers/base.ts). */
const JAILBROKEN = 'everglow.jailbroken';
const isJailbrokenFrame = (n: string): boolean => n.endsWith('_jb');

/**
 * A jailbroken Everglow tower (T740b) gets a row of its own in `everglow.jailbroken`, dark only: a
 * base's `_jb` twins, or a head's first two frames (its still and its shot).
 */
function jailbrokenRows(b: BakedSprite, authored: readonly string[]): CardPlan['rows'] {
  if (!b.variants.includes(JAILBROKEN)) return [];
  const twins = b.frameNames.filter(isJailbrokenFrame);
  const frames = twins.length > 0 ? twins : authored.slice(0, 2);
  return [{ variant: JAILBROKEN, frames, light: false, glow: true }];
}

function cardPlan(b: BakedSprite): CardPlan {
  if (isScene(b)) {
    return {
      rows: [{ variant: DEFAULT_VARIANT, frames: b.frameNames, light: false, glow: false }],
    };
  }
  if (isFleeingBody(b)) {
    const frames = b.frameNames.filter((n) => !isMirrorFrame(b, n) && !isDeath(n));
    return { rows: [{ variant: DEFAULT_VARIANT, frames, light: false, glow: true }] };
  }
  const looks = b.frameNames.filter(
    (n) =>
      !isMirrorFrame(b, n) && !isJailbrokenFrame(n) && (isHollowLook(b, n) || isDarkOnlyLook(b, n)),
  );
  const authored = b.frameNames.filter(
    (n) =>
      !isMirrorFrame(b, n) &&
      !isDeath(n) &&
      !isJailbrokenFrame(n) &&
      !isHollowLook(b, n) &&
      !isDarkOnlyLook(b, n),
  );
  const mirrored = b.frameNames.filter((n) => isMirrorFrame(b, n));
  const deaths = b.frameNames.filter(isDeath);
  const second = secondVariant(b);
  const first = b.frameNames[0];
  return {
    rows: [
      { variant: DEFAULT_VARIANT, frames: authored, light: true, glow: true },
      ...(looks.length === 0
        ? []
        : [{ variant: DEFAULT_VARIANT, frames: looks, light: false, glow: true }]),
      ...(deaths.length === 0
        ? []
        : [{ variant: DEFAULT_VARIANT, frames: deaths, light: false, glow: false }]),
      ...(mirrored.length === 0
        ? []
        : [{ variant: DEFAULT_VARIANT, frames: mirrored, light: false, glow: false, small: true }]),
      ...(second === undefined
        ? []
        : [{ variant: second, frames: authored, light: false, glow: false }]),
      ...jailbrokenRows(b, authored),
      ...b.variants
        .filter((v) => v.startsWith(`${DEFAULT_VARIANT}+`))
        .map((variant) => ({
          variant,
          frames: first === undefined ? [] : [first],
          light: false,
          glow: false,
        })),
    ],
  };
}

/** An integer zoom that keeps frames readable without making big ones huge. */
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
  expected: number;
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
    if (zoom > 1) box.append(scaled(f.image, zoom, halo));
    box.append(el('span', undefined, name));
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
      `${m.w}×${m.h} · anchor ${m.anchor.x},${m.anchor.y} · ${b.frameNames.length} frames · ${b.anims.length / b.variants.length} anims · ${b.variants.length} variants`,
    ),
  );
  card.append(title);
  const zoom = zoomFor(b);
  const byKey = new Map(b.frames.map((f) => [f.key, f]));
  const variants = el('div', 'variants');
  card.append(variants);
  for (const row of cardPlan(b).rows) {
    const frames = row.frames.flatMap((name) => {
      const f = byKey.get(frameKey(b.id, row.variant, name));
      return f === undefined ? [] : [{ name, f }];
    });
    count.expected += frames.length;
    const glows = new Map<string, BakedFrame>();
    if (row.glow) {
      for (const { f } of frames) {
        const g = byKey.get(glowKey(f.key));
        if (g !== undefined) glows.set(f.key, g);
      }
    }
    const block = el('div', 'variant');
    const panels = el('div', 'panels');
    const z = row.small === true ? 1 : zoom;
    panels.append(panel(frames, z, 'dark', count, glows));
    if (row.light) panels.append(panel(frames, z, 'light', null));
    const name = row.small === true ? `${row.variant}, mirrored, 1×` : row.variant;
    const label = glows.size > 0 ? `${name} (dark: + @glow)` : name;
    block.append(el('div', 'vlabel', label), panels);
    variants.append(block);
  }
  if (b.id === 'prop.peeker') variants.append(clickableBlock(byKey, zoom));
  return card;
}

/** The Peeker frame the clickable outline hugs on A2M3 (Pebble holding on to the rock; T409). */
const CLICKABLE_FRAME = 'hold_0';

/**
 * The clickable-object outline (T409, T430b; art-direction §6) round Pebble on her rock, as
 * ClickableView draws it: three steps of the march on dark, and one on light (the pale sand
 * paths it must read on). It sits beside the Peeker's last row, so it adds no height.
 */
function clickableBlock(byKey: ReadonlyMap<string, BakedFrame>, zoom: number): HTMLElement {
  const block = el('div', 'variant');
  const f = byKey.get(frameKey('prop.peeker', DEFAULT_VARIANT, CLICKABLE_FRAME));
  if (f === undefined) return block;
  const { w, h, data } = f.image;
  const alpha = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = data[i * 4 + 3] ?? 0;
  const contour = silhouetteContour(alpha, w, h);
  const outlined = (phase: number): { name: string; f: BakedFrame } => {
    const img = outlineImage(contour, alpha, w, h, phase);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const s = (y * w + x) * 4;
        if ((data[s + 3] ?? 0) === 0) continue;
        const d = ((y + OUTLINE_PAD) * img.w + x + OUTLINE_PAD) * 4;
        for (let k = 0; k < 4; k++) img.data[d + k] = data[s + k] ?? 0;
      }
    }
    return {
      name: `phase ${phase}`,
      f: { key: `clickable.${phase}`, image: img, anchor: f.anchor },
    };
  };
  const panels = el('div', 'panels');
  panels.append(
    panel([0, 1, 2].map(outlined), zoom, 'dark', null),
    panel([outlined(0)], zoom, 'light', null),
  );
  block.append(el('div', 'vlabel', `clickable outline (${CLICKABLE_FRAME}, A2M3)`), panels);
  return block;
}

/** Portraits get their own section and card (portraitCard). */
function isPortrait(b: BakedSprite): boolean {
  return b.id.startsWith('portrait.');
}

/** A portrait frame's variant prefix (`party_hat.happy` → `party_hat`), or '' for the base. */
function portraitVariantOf(frame: string): string {
  const dot = frame.indexOf('.');
  return dot < 0 ? '' : frame.slice(0, dot);
}

/** True for a frame showing an expression at rest (no `_talk`, `_scan`, or flash). */
function isRestFrame(frame: string): boolean {
  return !/_(talk|scan|flash)$/.test(frame);
}

/** A portrait with more frames than this gets a full-width card in the two-column portrait grid. */
const WIDE_PORTRAIT_FRAMES = 16;

/**
 * A portrait's card (T310a): each portrait variant's expressions at 2× in a comms-panel frame, as
 * the dialogue panel shows them, then every baked frame (talk, scan, flash, `+dark`) at 1×.
 */
function portraitCard(b: BakedSprite, count: Counters): HTMLElement {
  // Portraits pack two to a row; one with many frames (variants, extras) takes a whole row.
  const card = el('section', b.frameNames.length > WIDE_PORTRAIT_FRAMES ? 'card wide' : 'card');
  card.dataset['spriteId'] = b.id;
  const title = el('h3', undefined, b.id);
  title.append(
    el(
      'small',
      undefined,
      `${b.meta.w}×${b.meta.h} · ${b.frameNames.length} frames · ${b.anims.length / b.variants.length} anims · variants: ${b.variants.join(', ')}`,
    ),
  );
  card.append(title);
  const byKey = new Map(b.frames.map((f) => [f.key, f]));
  const groups = [...new Set(b.frameNames.map(portraitVariantOf))];
  for (const group of groups) {
    const row = el('div', 'portrait-row');
    for (const name of b.frameNames) {
      if (portraitVariantOf(name) !== group || !isRestFrame(name)) continue;
      const f = byKey.get(frameKey(b.id, DEFAULT_VARIANT, name));
      if (f === undefined) continue;
      const box = el('div', 'frame portrait-frame');
      box.append(scaled(f.image, 2), el('span', undefined, name));
      row.append(box);
    }
    card.append(row);
  }
  for (const v of b.variants.filter(isShownVariant)) {
    const strip = el('div', 'portrait-strip');
    for (const name of b.frameNames) {
      const f = byKey.get(frameKey(b.id, v, name));
      if (f === undefined) continue;
      count.expected++;
      if (hasOpaque(f.image)) count.rendered++;
      const box = el('div', 'frame');
      box.append(imageToCanvas(f.image), el('span', undefined, name));
      strip.append(box);
    }
    card.append(el('div', 'vlabel', `${v} at 1×`), strip);
  }
  return card;
}

// A corner of an Act I map: S spawn, # path, o pad, ^ high ground, + power node, x wreckage,
// C core, . decor.
// prettier-ignore
const DIORAMA_MAP = [
  '....S..o.',
  '....#.o+.',
  '.^^.#.o..',
  '....####.',
  '.o.o...#o',
  'x..o...#.',
  'x...####.',
  '..o.#.o..',
  '..o.C....',
];

/** The diorama as a map grid, so groundTiles dresses it exactly as GroundView dresses a map. */
const DIORAMA_GRID: GroundGrid = {
  cols: DIORAMA_MAP[0]?.length ?? 0,
  rows: DIORAMA_MAP.length,
  tiles: DIORAMA_MAP.join('').split('').filter(isTileChar),
  // A1M2's decor markers (groundTiles DECOR_MARKERS): Rig 3 by the power node, the housing block,
  // and the scarecrow.
  markers: { rig3: [8, 2], housing: [0, 1], scarecrow: [8, 8] },
  // Render-only terraces (T223): the back rows stand a step above the road, and the west strip
  // of the lower field a step above its east, so both cliff faces show (lit `ne`, shaded `nw`).
  // prettier-ignore
  terraces: [
    '111111111',
    '111111111',
    '111111111',
    '000000000',
    '110000000',
    '110000000',
    '110000000',
    '110000000',
    '110000000',
  ].join('').split('').map(Number),
};

/**
 * The Act II dioramas' grid (T440c): the same corner dressed as an Act II map. Its Act I markers
 * take their Act II looks (Rig 3 working the strip mine, the scarecrow's faded badge), and it adds
 * the crew's hut, an exposed warren, a spoil heap, the dark creeping in from the north-east corner
 * (`halls_dark`), grey soil over the north-west, and a mining scar down the west edge.
 */
const ACT2_DIORAMA_GRID: GroundGrid = {
  ...DIORAMA_GRID,
  markers: {
    ...DIORAMA_GRID.markers,
    crew_hut: [0, 3],
    warren_1: [5, 4],
    spoil_1: [8, 6],
    halls_dark: [8, 0],
  },
  dressing: [
    { kind: 'greySoil', area: { from: [0, 0], to: [3, 3] } },
    { kind: 'mineScar', area: { from: [0, 6], to: [1, 8] } },
  ],
};

/** The diorama grid an env dresses: Act II's on the Act II palettes, else Act I's corner. */
function dioramaGrid(env: EnvPaletteId): GroundGrid {
  return isActTwo(env) ? { ...ACT2_DIORAMA_GRID, env } : { ...DIORAMA_GRID, env };
}

/** A tower's look: a tier (1–3) or a tier-4 spec, named like its base frame. */
type TowerLook = 't1' | 't2' | 't3' | 'spec_a' | 'spec_b';

/**
 * The head frame a tower of `look` shows: from tier 2, the up-armored `<facing>_t2` frames, and
 * for a spec its `<facing>_spec_<a|b>` frames, where the head has them (`se_fire` → `se_t2_fire`,
 * `se_spec_a_fire`); idle heads keep their frame.
 */
function headFrame(
  baked: ReadonlyMap<string, BakedSprite>,
  id: SpriteId,
  frame: string,
  look: TowerLook,
): string {
  if (look === 't1') return frame;
  const [facing, ...rest] = frame.split('_');
  const named = [facing, look.startsWith('spec') ? look : 't2', ...rest].join('_');
  return baked.get(id)?.frameNames.includes(named) === true ? named : frame;
}

/**
 * The diorama's wreckage (T311b): the drone is half way through the tile at (0, 5); the one at
 * (0, 6) waits its turn. Wreckage is drawn as `prop.wreckage` (a variant per tile, half cleared
 * while the drone works it), whatever groundTiles puts on an `x` tile.
 */
function wreckageLook(
  i: number,
  j: number,
  env: EnvPaletteId,
): { sprite: SpriteId; frame: string } | null {
  if (DIORAMA_MAP[j]?.[i] !== 'x') return null;
  const v = wreckageFrame(i, j, env);
  return { sprite: 'prop.wreckage', frame: i === 0 && j === 5 ? `${v}_half` : v };
}

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
    for (const v of look.verge ?? []) draw(frameOf('tile.verge', v, envVariant(env)), sx, sy);
    // The map's dressing (grey soil, mining scars) under the verge, as GroundView draws it.
    if (look.soil !== undefined) draw(frameOf('tile.grime', look.soil, DEFAULT_VARIANT), sx, sy);
    for (const v of look.cliff ?? []) draw(frameOf('tile.cliff', v, envVariant(env)), sx, sy);
    if (look.hush !== undefined) draw(frameOf('tile.hush', look.hush, DEFAULT_VARIANT), sx, sy);
    if (look.block !== undefined)
      blocks.push({ id: look.block.sprite, frame: look.block.frame, i, j });
    const p = wreckageLook(i, j, env) ?? look.prop;
    if (p !== null) objects.push([p.sprite, p.frame, i + 0.5, j + 0.5, propVariant(p.sprite, env)]);
  };
  const grid = dioramaGrid(env);
  for (const a of apronCells(grid, env)) cell(a.col, a.row, a);
  for (let d = 0; d <= colsN + rowsN - 2; d++) {
    for (let i = Math.max(0, d - rowsN + 1); i <= Math.min(d, colsN - 1); i++) {
      cell(i, d - i, dressTile(grid, i, d - i));
    }
  }
  // Act II: Rigs 7 and 8 on the east corner (a Protect asset, AssetView's), glass in both.
  if (isActTwo(env)) objects.push(['prop.rigs', 'damaged', 8.5, 8.5]);
  // World objects sorted by ground y (tech-spec § Depth sorting).
  objects.push(
    ['enemy.nibbler', 'walk_sw_0', 4.5, 1.1],
    ['enemy.brood_hauler', 'walk_sw_1', 4.5, 2.5],
    // A Digger digging in (its burrower tell), a Bunchling, and a Zoomer down the road.
    ['enemy.digger', 'dig_se_0', 5.2, 3.5],
    ['enemy.bunchling', 'walk_se_1', 6.5, 3.45],
    // Matriarch Chitterbloom lumbering down the road (the boss's silhouette among her brood).
    ['enemy.chitterbloom', 'walk_sw_1', 7.55, 4.75],
    ['enemy.zoomer', 'walk_se_0', 7.45, 5.9],
    // A Nibbler popping (Act I's comic death, T311c) just behind it.
    ['enemy.nibbler', 'death_1', 7.5, 5.2],
    // An Elder holding three younglings to her pace (the Quiet Wave's look).
    ['enemy.elder', 'walk_sw_0', 4.75, 6.45],
    ['enemy.youngling', 'walk_sw_1', 5.45, 6.2],
    ['enemy.youngling', 'walk_sw_0', 5.5, 6.8],
    ['enemy.youngling', 'walk_sw_1', 4.3, 7.3],
    // The Peeker behind its rock in the brush.
    ['prop.peeker', 'peek_0', 5.5, 0.5],
    // A burst sack, its young scurrying back up the road the way they came.
    ['fx.sack_burst', 'f2', 6.1, 6.5],
    ['enemy.hauler_young', 'walk_se_0', 6.8, 6.3],
    ['enemy.hauler_young', 'walk_se_1', 7.2, 6.75],
    // Bricks at his post beside the road.
    ['ally.bricks', 'fire_nw_0', 8.5, 6.5],
  );
  // [base, head, col, row, head frame, look]; the Rivet on (2, 2) stands on high ground. Every
  // tier and both specs of the Rivet and Thumper are on show, facing both ways, with a Skyhook,
  // a Flash Freeze Sprinkler, a Capacitor Bank (on the power node, firing), and a Lookout.
  const towers: readonly [SpriteId, SpriteId, number, number, string, TowerLook][] = [
    ['tower.rivet', 'tower.rivet_head', 6, 1, 'sw', 't1'],
    ['tower.thumper', 'tower.thumper_head', 6, 2, 'se', 't2'],
    ['tower.rivet', 'tower.rivet_head', 2, 2, 'se', 't2'],
    ['tower.sprinkler', 'tower.sprinkler_head', 3, 4, 'spin_0', 'spec_a'],
    ['tower.skyhook', 'tower.skyhook_head', 8, 4, 'nw', 't2'],
    ['tower.zapcoil', 'tower.zapcoil_head', 7, 1, 'sw_fire', 'spec_b'],
    // A Lookout Shack keeping watch from the high ground.
    ['tower.lookout', 'tower.lookout_head', 1, 2, 'look_1', 't3'],
    ['tower.thumper', 'tower.thumper_head', 3, 5, 'ne', 't1'],
    ['tower.rivet', 'tower.rivet_head', 2, 7, 'se_fire', 't3'],
    ['tower.thumper', 'tower.thumper_head', 7, 0, 'nw', 'spec_a'],
    ['tower.thumper', 'tower.thumper_head', 1, 4, 'se', 'spec_b'],
    ['tower.rivet', 'tower.rivet_head', 6, 7, 'sw_fire', 'spec_a'],
    ['tower.rivet', 'tower.rivet_head', 2, 8, 'ne', 'spec_b'],
  ];
  const raised = new Set(blocks.map((b) => `${b.i},${b.j}`));
  type Tower = {
    tower: SpriteId;
    headId: SpriteId;
    gx: number;
    gy: number;
    head: string;
    look: TowerLook;
    z: number;
  };
  type Block = { block: SpriteId; frame: string; gx: number; gy: number };
  const all: (Placed | Tower | Block)[] = [
    ...objects,
    ...blocks.map((b) => ({ block: b.id, frame: b.frame, gx: b.i + 0.5, gy: b.j + 0.5 })),
    ...towers.map(([t, headId, i, j, head, look]) => ({
      tower: t,
      headId,
      gx: i + 0.5,
      gy: j + 0.5,
      head: headFrame(baked, headId, head, look),
      look,
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
      const base = frameOf(baseId, o.look, DEFAULT_VARIANT);
      draw(base, sx, sy, glowOf(baked, baseId, o.look));
      const def = ALL_SPRITES.find((d) => d.id === baseId);
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
  // Flyers in the `air` layer: drawn 12 px up over a ground shadow (tech-spec § Sprite anchoring),
  // a Puffwing flock over the grass, Gerald on his round, and a flak round climbing at them.
  for (const [id, frame, gx, gy, shadow] of [
    ['enemy.puffwing', 'walk_se_0', 1.6, 1.4, 'medium'],
    ['enemy.puffwing', 'walk_se_2', 2.5, 0.9, 'medium'],
    ['enemy.puffwing', 'walk_sw_1', 2.2, 2.1, 'medium'],
    ['enemy.gerald', 'walk_se_1', 1.5, 6.4, 'large'],
  ] as const) {
    const [fx, fy] = screen(gx, gy);
    draw(frameOf('fx.shadow', shadow, DEFAULT_VARIANT), fx, fy);
    draw(frameOf(id, frame, DEFAULT_VARIANT), fx, fy - FLY_LIFT_PX, glowOf(baked, id, frame));
  }
  // A Tidybot vacuuming up after a wave (Acts I–II; its anchor is the ground point, the body
  // hovers inside its frame), over its shadow.
  if (env === 'act1' || isActTwo(env)) {
    const [ux, uy] = screen(5.6, 8.4);
    draw(frameOf('fx.shadow', 'small', DEFAULT_VARIANT), ux, uy);
    draw(
      frameOf('prop.tidybot', 'vac_1', DEFAULT_VARIANT),
      ux,
      uy,
      glowOf(baked, 'prop.tidybot', 'vac_1'),
    );
  }
  // The salvage drone at work over the half-cleared wreck (its anchor is the ground point; the
  // body hovers inside its frame), over its shadow.
  const [dx, dy] = screen(0.5, 5.5);
  draw(frameOf('fx.shadow', 'small', DEFAULT_VARIANT), dx, dy);
  draw(
    frameOf('prop.salvage_drone', 'work_1', DEFAULT_VARIANT),
    dx,
    dy,
    glowOf(baked, 'prop.salvage_drone', 'work_1'),
  );
  const [qx, qy] = screen(2.6, 2.4);
  draw(frameOf('projectile.skyhook_flak', 'e', DEFAULT_VARIANT), qx, qy - 6);
  // VFX on top: a shell mid-arc over its shadow, a burst, and the Orbital Strike reticle.
  const [shx, shy] = screen(5.5, 6.5);
  draw(frameOf('fx.shadow', 'medium', DEFAULT_VARIANT), shx, shy);
  draw(frameOf('projectile.thumper_shell', 'spin_0', DEFAULT_VARIANT), shx, shy - 18);
  const [bx, by] = screen(4.5, 7.5);
  draw(frameOf('fx.explosion', 'f0', DEFAULT_VARIANT), bx, by, glowOf(baked, 'fx.explosion', 'f0'));
  // A cluster shell's bomblets: one still falling over its shadow, two popping on the road.
  const [cx, cy] = screen(7.6, 3.2);
  draw(frameOf('fx.shadow', 'small', DEFAULT_VARIANT), cx, cy);
  draw(frameOf('projectile.thumper_bomblet', 'spin_0', DEFAULT_VARIANT), cx, cy - 10);
  for (const [gx, gy, f] of [
    [4.4, 4.5, 'f1'],
    [5.1, 5.4, 'f0'],
  ] as const) {
    const [px, py] = screen(gx, gy);
    draw(
      frameOf('fx.bomblet_burst', f, DEFAULT_VARIANT),
      px,
      py,
      glowOf(baked, 'fx.bomblet_burst', f),
    );
  }
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

/**
 * The M5 corner's grid (review U11): a strip of A2M5–A2M6's road under the dusk, a lamp on its
 * gatepost by the road, two Prism pads north of it, and one south.
 */
const CORNER_MAP = ['.o.....o.', '.........', '#########', '.........', '....o....'];
const CORNER_GRID: GroundGrid = {
  cols: CORNER_MAP[0]?.length ?? 0,
  rows: CORNER_MAP.length,
  tiles: CORNER_MAP.join('').split('').filter(isTileChar),
  markers: { lamp_corner: [1, 1] },
  env: 'act2.dusk',
  // The road runs on through the apron's fence at both ends.
  routeList: [{ kind: 'ground', tiles: [...Array(9).keys()].map((c) => [c, 2] as const) }],
};
/** The beaming Prism, the resting one (night only), the lamp, and the beam's Hollow target. */
const CORNER_PRISM = [7, 0] as const;
const CORNER_REST = [4, 4] as const;
const CORNER_LAMP = CORNER_GRID.markers?.['lamp_corner'] ?? [1, 1];
const CORNER_TARGET = [8.1, 2.55] as const;
/** The beam leaves the crystal this high over its tile (render/views/BeamView.ts MUZZLE_PX). */
const CORNER_MUZZLE_PX = 14;

/**
 * A canvas the size of the corner that is `on` where `mask` is opaque (MASK_DARK) and `off`
 * elsewhere (null: clear), for compositing one of the night's images over the picture.
 */
function maskLayer(mask: Uint32Array, w: number, h: number, on: number, off: number | null) {
  const c = el('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx === null) return c;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < w * h; i++) {
    const col = mask[i] !== 0 ? on : off;
    if (col === null) continue;
    d[i * 4] = (col >> 16) & 0xff;
    d[i * 4 + 1] = (col >> 8) & 0xff;
    d[i * 4 + 2] = col & 0xff;
    d[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/**
 * The M5 corner (review U11) on `act2.dusk`: by dusk (`night` false; A2M5) the Ward kneels over
 * the road, its refugees filing past, while a Prism beams at a Hollow shard; at full dark (A2M6) a
 * lamp's pool, the beaming Prism's lit disc and a resting Prism's ghost, with the Hollow on the
 * road. The night is composited as BattleScene layers it (DarknessView, WorldGlowView,
 * LightGhostView): the ground's multiply and the lamplight, the pools, the actors, the beam and
 * the crystal's halo, then the actors' veil and the lift.
 */
function m5Corner(
  baked: ReadonlyMap<string, BakedSprite>,
  night: boolean,
  zoom: number,
): HTMLCanvasElement {
  const env: EnvPaletteId = 'act2.dusk';
  const rowsN = CORNER_GRID.rows;
  const colsN = CORNER_GRID.cols;
  // The grid plus the decor apron the game draws round it (APRON_RINGS on every side).
  const R = APRON_RINGS;
  const w = (colsN + rowsN + 4 * R) * 16;
  const oy = R * 16 + 24; // headroom for the props on the back corner
  const h = oy + (colsN + rowsN + 2 * R - 2) * 8 + 16;
  const ox = (rowsN + 2 * R) * 16;
  const origin = { x: ox, y: oy };
  const c = el('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx === null) return c;
  backdrop(ctx, env, w, h);
  const frameOf = (id: SpriteId, frame: string, variant = DEFAULT_VARIANT) =>
    baked.get(id)?.frames.find((f) => f.key === frameKey(id, variant, frame));
  const screen = (gx: number, gy: number): [number, number] => [
    Math.round((gx - gy) * 16 + ox),
    Math.round((gx + gy) * 8 + oy),
  ];
  const draw = (f: BakedFrame | undefined, x: number, y: number, add?: BakedFrame): void => {
    if (f === undefined) return;
    ctx.drawImage(imageToCanvas(f.image), x - f.anchor.x, y - f.anchor.y);
    if (add === undefined) return;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(imageToCanvas(add.image), x - add.anchor.x, y - add.anchor.y);
    ctx.globalCompositeOperation = 'source-over';
  };
  const image = (
    img: RgbaImage,
    x: number,
    y: number,
    alpha = 1,
    op: GlobalCompositeOperation = 'source-over',
  ): void => {
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = op;
    ctx.drawImage(imageToCanvas(img), x, y);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  };
  // The ground and its scenery (the lamp's gatepost), as the game dresses them.
  const props: Placed[] = [];
  const cell = (i: number, j: number, look: TileDressing): void => {
    const [sx, sy] = screen(i, j);
    draw(frameOf(look.ground.sprite, look.ground.frame, envVariant(env)), sx, sy);
    for (const v of look.verge ?? []) draw(frameOf('tile.verge', v, envVariant(env)), sx, sy);
    const p = look.prop;
    if (p !== null) props.push([p.sprite, p.frame, i + 0.5, j + 0.5, propVariant(p.sprite, env)]);
  };
  for (const a of apronCells(CORNER_GRID, env)) cell(a.col, a.row, a);
  for (let d = 0; d <= colsN + rowsN - 2; d++) {
    for (let i = Math.max(0, d - rowsN + 1); i <= Math.min(d, colsN - 1); i++) {
      cell(i, d - i, dressTile(CORNER_GRID, i, d - i));
    }
  }
  props.sort((a, b) => a[2] + a[3] - (b[2] + b[3]));
  for (const [id, frame, gx, gy, variant] of props) {
    const [sx, sy] = screen(gx, gy);
    draw(frameOf(id, frame, variant), sx, sy);
  }
  // The night: the sources' discs (the lamp; the Prism while it beams), punched out of the dark.
  const dark = night ? 1 : 0;
  const tones = darkTones(dark, noDark());
  const discs: LightDisc[] = [
    { x: CORNER_LAMP[0] + 0.5, y: CORNER_LAMP[1] + 0.5, radiusSq: LAMP_RADIUS_TILES ** 2 },
    {
      x: CORNER_PRISM[0] + 0.5,
      y: CORNER_PRISM[1] + 0.5,
      radiusSq: (prism.lightRadiusTiles ?? 0) ** 2,
    },
  ];
  const mask = new Uint32Array(w * h);
  if (night) {
    drawDarkMask(mask, w, h, 0, 0, origin, discs);
    const lamp = new Uint32Array(w * h);
    drawLampMask(lamp, w, h, 0, 0, origin, discs, 1);
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(maskLayer(mask, w, h, tones.ground, 0xffffff), 0, 0);
    ctx.drawImage(maskLayer(lamp, w, h, tones.lamp, 0xffffff), 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    // Pools of light in the discs (WorldGlowView: warm lamplight, the Prism's fainter cold light).
    for (const [disc, color, strength] of [
      [discs[0]!, 'orange.4', 1],
      [discs[1]!, 'blue.4', 0.5],
    ] as const) {
      const pool = poolImage(Math.sqrt(disc.radiusSq), color, strength);
      const [px, py] = screen(disc.x, disc.y);
      image(pool.img, px - pool.ax, py - pool.ay, dark, 'lighter');
    }
    // A resting Prism's ghost (LightGhostView): the rim of the disc it would light, in dotted golds.
    const ghost = ghostDiscImage(discs[1]!.radiusSq);
    const [gx, gy] = screen(CORNER_REST[0] + 0.5, CORNER_REST[1] + 0.5);
    image(ghost.image, gx - ghost.cx, gy - ghost.cy, GHOST_REST_ALPHA);
  }
  // The lamp's own glow (WorldGlowView's PROP_GLOWS), a little at dusk, whole in the dark.
  const lampGlow = PROP_GLOWS['prop.wall'];
  for (const [id, frame, gx, gy, variant] of props) {
    if (id !== 'prop.wall' || lampGlow === undefined) continue;
    const f = frameOf(id, frame, variant);
    if (f === undefined) continue;
    const glow = emissiveGlow([f.image], lampGlow.colors, lampGlow.radius, lampGlow.halo ?? null);
    const [sx, sy] = screen(gx, gy);
    const r = lampGlow.radius;
    image(glow, sx - f.anchor.x - r, sy - f.anchor.y - r, glowAlpha(lampGlow, dark), 'lighter');
  }
  // The actors, back to front: the Prisms, the Hollow on the road, and by dusk the Ward and its
  // refugees.
  type Actor = readonly [id: SpriteId, frame: string, gx: number, gy: number];
  const actors: Actor[] = [
    ['enemy.fracture_shard', 'walk_sw_1', ...CORNER_TARGET],
    ['enemy.mote', 'walk_sw_0', 8.6, 2.3],
  ];
  if (night) {
    actors.push(
      ['enemy.mote', 'walk_sw_1', 5.4, 2.6],
      ['enemy.fracture_shard', 'walk_sw_0', 6.3, 2.35],
    );
  } else {
    actors.push(
      ['enemy.sunderglass_penitent', 'kneel_se_0', 3.7, 2.5],
      ['ally.refugee', 'carry_se_0', 1.2, 2.35],
      ['ally.refugee', 'walk_se_1', 2.0, 2.7],
      ['ally.refugee', 'walk_se_0', 5.1, 2.35],
      ['ally.refugee', 'carry_se_1', 5.8, 2.7],
    );
  }
  const towerAt = (pad: readonly [number, number], head: string): void => {
    const [sx, sy] = screen(pad[0] + 0.5, pad[1] + 0.5);
    const base = frameOf('tower.prism', 't1');
    draw(base, sx, sy, glowOf(baked, 'tower.prism', 't1'));
    const def = ALL_SPRITES.find((d) => d.id === 'tower.prism');
    const mount = def === undefined ? null : mountOf(def);
    if (base === undefined || mount === null) return;
    draw(
      frameOf('tower.prism_head', head),
      sx - base.anchor.x + mount.x,
      sy - base.anchor.y + mount.y,
      glowOf(baked, 'tower.prism_head', head),
    );
  };
  for (const [id, , gx, gy] of actors) {
    const s = groundShadowFor(id);
    const [sx, sy] = screen(gx, gy);
    ctx.globalAlpha = s.alpha;
    draw(frameOf(s.sprite, s.frame), sx, sy);
    ctx.globalAlpha = 1;
  }
  const order: (Actor | { pad: readonly [number, number]; head: string })[] = [
    ...actors,
    { pad: CORNER_PRISM, head: 'se_fire' },
    ...(night ? [{ pad: CORNER_REST, head: 'ne' }] : []),
  ];
  const footY = (o: (typeof order)[number]): number =>
    'pad' in o ? o.pad[0] + o.pad[1] + 1.003 : o[2] + o[3];
  for (const o of order.toSorted((a, b) => footY(a) - footY(b))) {
    if ('pad' in o) {
      towerAt(o.pad, o.head);
      continue;
    }
    const [id, frame, gx, gy] = o;
    const [sx, sy] = screen(gx, gy);
    draw(frameOf(id, frame), sx, sy, glowOf(baked, id, frame));
  }
  // The beam at its cap (BeamView: a white-cored teal.4 thread over a blue.0 under-stroke), from
  // the crystal to the shard's middle, its knot burning there; the crystal's halo in the dark.
  const [bx, by] = screen(CORNER_PRISM[0] + 0.5, CORNER_PRISM[1] + 0.5);
  const target = frameOf('enemy.fracture_shard', 'walk_sw_1');
  const [tx, ty0] = screen(...CORNER_TARGET);
  const ty = ty0 - Math.round((target?.anchor.y ?? 0) / 2);
  const line = (width: number, color: string, alpha: number): void => {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(bx, by - CORNER_MUZZLE_PX);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
  line(6, cssOf('blue.0'), 0.6);
  line(4, cssOf('teal.4'), 1);
  line(2, cssOf('white.1'), 1);
  draw(frameOf('fx.beam_knot', 'h0'), tx, ty);
  if (night) {
    const halo = prismHaloImage(6, 'pink.4'); // the gem's colour (WorldGlowView)
    image(halo, bx - 6, by - CORNER_MUZZLE_PX - 6, dark, 'lighter');
    // The actors' veil and the night's lift, outside the discs (DarknessView's two images).
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(maskLayer(mask, w, h, tones.veil, 0xffffff), 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(maskLayer(mask, w, h, tones.lift, null), 0, 0);
    ctx.globalCompositeOperation = 'source-over';
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

/**
 * The tallest a sheet may be, in CSS px (T501j). The gallery is laid out as sheets, each captured
 * as its own image (smoke/gallery.spec.ts): 8,000 px fits one screenshot with no stitching and is
 * small enough to send whole.
 */
const SHEET_MAX_PX = 8000;

/**
 * Lays blocks out on sheets of at most SHEET_MAX_PX: each block goes into the current sheet's
 * open section, and one that would push the sheet over the limit moves to a new sheet, where its
 * section continues under a "(continued)" heading. Measuring forces layout, so the page is packed
 * at the viewport it opens at (the smoke test's 1600 px).
 */
class SheetPacker {
  readonly sheets: HTMLElement[] = [];
  #sheet: HTMLElement | null = null;
  #title = '';
  #cls = '';
  #box: HTMLElement | null = null;

  readonly #root: HTMLElement;

  constructor(root: HTMLElement) {
    this.#root = root;
    this.#newSheet();
  }

  /** The sheet being filled. */
  get current(): HTMLElement {
    if (this.#sheet === null) throw new Error('gallery: no sheet');
    return this.#sheet;
  }

  /** Starts a section: a heading and a container (class `cls`) its blocks go into. */
  section(title: string, cls: string): void {
    this.#title = title;
    this.#cls = cls;
    this.#open(title);
  }

  /** Adds a block to the open section, on a new sheet if it doesn't fit on this one. */
  add(block: HTMLElement): void {
    const box = this.#box;
    const sheet = this.#sheet;
    if (box === null || sheet === null) throw new Error('gallery: add before section');
    box.append(block);
    // A sheet's first block stays even if it alone is too tall (the smoke test names it).
    // The fractional box the smoke test measures (offsetHeight rounds, so 8000.1 passed as 8000).
    if (sheet.getBoundingClientRect().height <= SHEET_MAX_PX) return;
    if (box.childElementCount > 1) {
      block.remove();
      this.#newSheet();
      this.#open(`${this.#title} (continued)`);
      this.#box?.append(block);
    } else if (sheet.querySelector('h2') !== box.previousElementSibling) {
      // A section's first block that overflows a sheet already holding other sections: the
      // section (its heading and box) starts on the next sheet instead.
      const head = box.previousElementSibling;
      this.#newSheet();
      if (head !== null) this.#sheet?.append(head);
      this.#sheet?.append(box);
    }
  }

  /**
   * Ends the sheet being filled: the next section starts on a new one. The dioramas take sheet 1
   * alone (T564), so it keeps headroom for later dioramas and the sprite cards start on sheet 2.
   */
  breakSheet(): void {
    this.#newSheet();
  }

  /** Titles every sheet "… sheet n of N" once all are packed. */
  finish(): void {
    this.sheets.forEach((sh, i) => {
      sh.dataset['sheet'] = String(i + 1);
      const head = sh.querySelector('h1');
      if (head !== null) {
        head.textContent = `Stardust sprite gallery · sheet ${i + 1} of ${this.sheets.length}`;
      }
    });
  }

  #newSheet(): void {
    const sh = el('section', 'sheet');
    // The title takes its line now, so packing measures the height `finish` will give it.
    sh.append(el('h1', undefined, 'Stardust sprite gallery · sheet'));
    this.#root.append(sh);
    this.sheets.push(sh);
    this.#sheet = sh;
  }

  #open(title: string): void {
    const box = el('div', this.#cls);
    const h = el('h2', undefined, title);
    this.#sheet?.append(h, box);
    // A heading never ends a sheet alone: the section starts on the next sheet instead.
    if ((this.#sheet?.getBoundingClientRect().height ?? 0) > SHEET_MAX_PX - 200) {
      h.remove();
      box.remove();
      this.#newSheet();
      this.#sheet?.append(h, box);
    }
    this.#box = box;
  }
}

function render(root: HTMLElement): void {
  const t0 = performance.now();
  const baked = bakeAll(GALLERY_SPRITES, PALETTES);
  const bakeMs = performance.now() - t0;
  const byId = new Map(baked.map((b) => [b.id, b]));
  const frames = baked.flatMap((b) => b.frames.filter((f) => !f.key.endsWith('@glow')));

  const pack = new SheetPacker(root);
  pack.current.append(
    el(
      'div',
      'sub',
      `${baked.length} sprites · ${frames.length} frames across all variants · dark (ink.0) and light (steel.4) backgrounds`,
    ),
  );
  pack.section('Dioramas: act1 at 2×, then every environment palette at 1×', 'dioramas');
  pack.add(diorama(byId, 'act1', 2));
  for (const env of ENV_PALETTE_IDS) {
    const box = el('div', 'frame');
    box.append(diorama(byId, env, 1), el('span', undefined, env));
    pack.add(box);
  }
  // The M5 corner (review U11): A2M5 by dusk, then A2M6 at full dark.
  for (const [night, label] of [
    [false, 'M5 corner · act2.dusk · the Ward and its refugees, a Prism beaming'],
    [
      true,
      'M5 corner · act2.dusk at full dark · a lamp’s pool, a lit Prism, a resting one’s ghost',
    ],
  ] as const) {
    const box = el('div', 'frame');
    box.append(m5Corner(byId, night, 2), el('span', undefined, label));
    pack.add(box);
  }
  // The M6 corners (review R10): A3M1's Preserve, then A3M3's Gap at the SEAL.
  for (const [scene, label] of M6_CORNERS) {
    const box = el('div', 'frame');
    box.append(m6Corner(byId, scene, 2), el('span', undefined, label));
    pack.add(box);
  }
  // The M7 corners (T740c): A3M4's Shelters, A3M5's Second Harvest, A3M6's Dome Row, at night.
  for (const [scene, label] of M7_CORNERS) {
    const box = el('div', 'frame');
    box.append(m7Corner(byId, scene, 2), el('span', undefined, label));
    pack.add(box);
  }

  pack.breakSheet();
  pack.section(
    'Sprites: default (authored frames; mirrors at 1×), one more palette (authored frames), derived (first frame)',
    'cards',
  );
  const count: Counters = { expected: 0, rendered: 0 };
  for (const b of baked) if (!isPortrait(b)) pack.add(spriteCard(b, count));
  pack.section('Portraits: expressions at 2× as the comms panel frames them', 'portraits');
  for (const b of baked) if (isPortrait(b)) pack.add(portraitCard(b, count));
  pack.finish();

  const ds = document.body.dataset;
  ds['spriteCount'] = String(baked.length);
  ds['framesExpected'] = String(count.expected);
  ds['framesRendered'] = String(count.rendered);
  ds['sheetCount'] = String(pack.sheets.length);
  ds['sheetMaxPx'] = String(SHEET_MAX_PX);
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
