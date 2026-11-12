// The Long Walk's waymarks (`prop.waymark`; finale.md § FIN *Waymarks*, design/maps.md § 4 *Special
// tiles*: "the Long Walk's old waymarks, glowing fungus lanterns"; art-direction §6): the markers the
// warrens set along their road to the Deep Halls, forty thousand years of families walking their
// dead north past them. A squat standing stone of old grey rock, worn round (`steel`, as the wreck's), the hum-glyph (a
// singer's ring and two arcs, the billboard row's) cut in its face, moss at its foot, and on its
// crown a woven reed cradle holding a big **fungus cap**, the lantern. The Hollow came down the
// road first, so on the finale map all four are wreckage (`prop.wreckage`'s `v8`/`v9`, built from
// the same shapes here, `waymarkWreck`); clearing one stands it back up and relights it.
// - `dark`: standing, the cap a cold dead grey, the glyph only a cut (the drone's half-cleared
//   frame is this, on the wreck's scorch).
// - `lit` and `lit_1` (`lit`, 3 fps): the cap glowing warm pink-gold (`stardust.sung`'s gold: the
//   remembered, art-direction §1 principle 6) on the palette's emissives, so it bakes a glow, the
//   glyph lit gold with it; the light breathes, a pixel of its rim trading.
// - `light_0`, `light_1` (`light`, 6 fps, once, then `lit`): the relighting: a spark in the cap's
//   heart, then the cap half lit from below.
// - `wreck`: knocked down, the stone lying on its side, the cradle crushed and the cap split, grey.
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, stamp, type CharGrid } from '../helpers.ts';

const W = 20;
const H = 26;
const CX = 10;
const FOOT_Y = 22;

/** The colours a waymark is drawn in: each role's char in the sprite that draws it. */
export interface WaymarkInk {
  /** Stone: lit face, mid, shaded face, deep shade. */
  readonly stone: readonly [string, string, string, string];
  /** Moss: lit, shaded. */
  readonly moss: readonly [string, string];
  /** The reed cradle: lit, shaded. */
  readonly reed: readonly [string, string];
  /** The fungus cap, dark: rim, body, gills. */
  readonly capDark: readonly [string, string, string];
  /** The cut glyph, dark. */
  readonly cut: string;
  /** Lit: the cap's glow (outer), its core, its pink heart; the glyph lit (`litCut`). */
  readonly glow: string;
  readonly litCut: string;
  readonly core: string;
  readonly heart: string;
  /** The ground shadow. */
  readonly shadow: string;
}

/** The waymark's own legend roles (`prop.waymark`). */
const OWN: WaymarkInk = {
  stone: ['D', 'C', 'B', 'A'],
  moss: ['G', 'F'],
  reed: ['J', 'I'],
  capDark: ['M', 'L', 'K'],
  cut: 'E',
  glow: '+',
  litCut: 'N',
  core: '*',
  heart: 'P',
  shadow: '_',
};

type Light = 'dark' | 'lit' | 'lit_1' | 'spark' | 'half';

/** The standing stone, its foot at (cx, foot): a worn round-shouldered block 9 px wide. */
function stone(g: CharGrid, ink: WaymarkInk, cx: number, foot: number, glyph: string): void {
  const [lit, mid, shade, deep] = ink.stone;
  // prettier-ignore
  const shape = [
    '..mmmmm..',
    '.LmmmmmSs',
    'LLmmmmmSs',
    'LLmmmmmSs',
    'LLmmmmmSs',
    'LLmmmmmSs',
    'LLmmmmmSs',
    'LLmmmmmSs',
    'LLmmmmmSs',
    '.LmmmmmS.',
  ];
  const x0 = cx - 4;
  const y0 = foot - shape.length;
  shape.forEach((r, dy) =>
    r.split('').forEach((ch, dx) => {
      if (ch === '.') return;
      plot(g, x0 + dx, y0 + dy, ch === 'L' ? lit : ch === 'm' ? mid : ch === 'S' ? shade : deep);
    }),
  );
  // The hum-glyph cut in its face: a singer's ring and two arcs over it.
  // prettier-ignore
  const hum = [
    '.g.g.',
    'g...g',
    '..g..',
    '.g.g.',
    '..g..',
  ];
  hum.forEach((r, dy) =>
    r.split('').forEach((ch, dx) => ch === 'g' && plot(g, x0 + 2 + dx, y0 + 3 + dy, glyph)),
  );
  // Moss round its foot, and the shadow it stands in.
  for (let x = x0 - 1; x <= x0 + 9; x++) plot(g, x, foot, ink.shadow);
  for (const [dx, ch] of [
    [0, 0],
    [1, 1],
    [6, 0],
    [7, 1],
    [8, 1],
  ] as const) {
    plot(g, x0 + dx, foot - 1, ink.moss[ch]);
  }
  plot(g, x0 + 1, foot - 2, ink.moss[0]);
}

/** The reed cradle on the stone's crown and the fungus cap in it, by its light. */
function lantern(g: CharGrid, ink: WaymarkInk, cx: number, top: number, light: Light): void {
  const [reedLit, reedShade] = ink.reed;
  // The cap: a wide dome, gills under its rim.
  const [rim, body, gills] = ink.capDark;
  // prettier-ignore
  const cap = [
    '...rrrr...',
    '.rbbbbbbr.',
    'rbbbbbbbbr',
    'rbbbbbbbbr',
    'ggggggggg.',
  ];
  const x0 = cx - 5;
  const y0 = top;
  cap.forEach((r, dy) =>
    r.split('').forEach((ch, dx) => {
      if (ch === '.') return;
      let c = ch === 'r' ? rim : ch === 'b' ? body : gills;
      if (light === 'lit' || light === 'lit_1') {
        // Lit: the whole cap glows, its heart pink-gold, the rim breathing a pixel between frames.
        c = ch === 'g' ? ink.glow : dy === 3 && dx >= 4 && dx <= 5 ? ink.heart : ink.core;
        if (ch === 'r') c = ink.glow;
        if (light === 'lit_1' && ch === 'r' && dx === 3) c = ink.core;
        if (light === 'lit' && ch === 'r' && dx === 6) c = ink.core;
      } else if (light === 'half') {
        // Half lit, from below: the gills and the lowest row.
        if (ch === 'g') c = ink.glow;
        else if (dy === 3) c = dx >= 3 && dx <= 6 ? ink.core : ink.glow;
      } else if (light === 'spark') {
        if (dy === 3 && (dx === 4 || dx === 5)) c = ink.core;
      }
      plot(g, x0 + dx, y0 + dy, c);
    }),
  );
  // The cradle: reeds bound round the cap's stalk, splaying over the stone's shoulders.
  const cy = top + 5;
  for (let dx = -3; dx <= 3; dx++) plot(g, cx + dx, cy, dx < 0 ? reedLit : reedShade);
  plot(g, cx - 4, cy - 1, reedLit);
  plot(g, cx + 3, cy - 1, reedShade);
  plot(g, cx - 1, cy + 1, reedLit);
  plot(g, cx, cy + 1, reedShade);
}

/** A standing waymark, by its light. */
export function waymarkStanding(
  g: CharGrid,
  ink: WaymarkInk,
  cx: number,
  foot: number,
  light: Light,
): void {
  const lit = light === 'lit' || light === 'lit_1';
  stone(g, ink, cx, foot, lit ? ink.litCut : ink.cut);
  lantern(g, ink, cx, foot - 17, light);
}

/**
 * A knocked-down waymark (`v` 0: the stone on its side, the cap split beside it; 1: the stone
 * snapped, its top half fallen across its foot, the cradle crushed under it), drawn dark.
 */
export function waymarkWreck(
  g: CharGrid,
  ink: WaymarkInk,
  cx: number,
  foot: number,
  v: 0 | 1,
): void {
  const [lit, mid, shade, deep] = ink.stone;
  const [rim, body, gills] = ink.capDark;
  if (v === 0) {
    // The stone lying along the ground, its glyph face turned up.
    // prettier-ignore
    stamp(g, cx - 7, foot - 5, [
      `..${lit}${lit}${mid}${mid}${mid}${mid}${mid}${mid}..`,
      `.${lit}${lit}${mid}${mid}${mid}${mid}${mid}${mid}${mid}${shade}.`,
      `${lit}${mid}${mid}${ink.cut}${mid}${ink.cut}${mid}${mid}${mid}${shade}${shade}.`,
      `${shade}${mid}${mid}${mid}${ink.cut}${mid}${mid}${mid}${shade}${shade}${deep}.`,
      `.${shade}${shade}${shade}${shade}${shade}${shade}${deep}${deep}${deep}..`,
    ]);
    // The cap split in two beside it, grey.
    // prettier-ignore
    stamp(g, cx + 4, foot - 4, [
      `.${rim}${rim}..`,
      `${rim}${body}${body}.${rim}`,
      `${gills}${gills}.${body}${body}`,
      `...${gills}${gills}`,
    ]);
    plot(g, cx - 9, foot - 1, ink.reed[0]);
    plot(g, cx - 8, foot, ink.reed[1]);
    plot(g, cx + 2, foot, ink.reed[0]);
  } else {
    // The stump still standing, snapped across; its top lying over its foot.
    // prettier-ignore
    stamp(g, cx - 4, foot - 5, [
      `${lit}${mid}${mid}.${mid}${mid}${shade}`,
      `${lit}${lit}${mid}${mid}${mid}${mid}${shade}${shade}`,
      `${lit}${lit}${mid}${mid}${mid}${mid}${shade}${shade}`,
      `${lit}${lit}${mid}${mid}${mid}${mid}${shade}${shade}`,
      `.${lit}${mid}${mid}${mid}${mid}${shade}.`,
    ]);
    // prettier-ignore
    stamp(g, cx - 9, foot - 3, [
      `.${lit}${mid}${mid}${ink.cut}${mid}.`,
      `${lit}${mid}${ink.cut}${mid}${mid}${shade}${deep}`,
      `.${shade}${shade}${shade}${deep}${deep}.`,
    ]);
    // The crushed cradle and a shard of cap.
    stamp(g, cx + 3, foot - 2, [`${rim}${body}.`, `${gills}${ink.reed[1]}${ink.reed[0]}`]);
  }
  for (let x = cx - 8; x <= cx + 7; x++)
    if ((g[foot]?.[x] ?? '.') === '.') plot(g, x, foot, ink.shadow);
  plot(g, cx - 3, foot - 1, ink.moss[0]);
  plot(g, cx + 6, foot, ink.moss[1]);
}

function frame(light: Light | 'wreck'): string[] {
  const g = grid(W, H);
  if (light === 'wreck') waymarkWreck(g, OWN, CX, FOOT_Y, 0);
  else waymarkStanding(g, OWN, CX, FOOT_Y, light);
  return rows(g);
}

export const propWaymark = defineSprite({
  id: 'prop.waymark',
  size: { w: W, h: H },
  anchor: { x: CX, y: FOOT_Y - 3 },
  // The warrens' own: the Skitterkin palette's gold emissives are the cap's light; the stone,
  // moss, reeds and the dead cap are custom legend, so they hold in every act.
  palette: 'skitterkin.ally',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: {
    A: 'steel.0',
    B: 'steel.1',
    C: 'steel.2',
    D: 'steel.3',
    E: 'ink.2',
    F: 'green.1',
    G: 'green.2',
    I: 'brass.1',
    J: 'brass.2',
    K: 'ink.4',
    L: 'steel.1',
    M: 'steel.2',
    N: 'gold.2',
    P: 'pink.3',
  },
  frames: {
    dark: frame('dark'),
    lit: frame('lit'),
    lit_1: frame('lit_1'),
    light_0: frame('spark'),
    light_1: frame('half'),
    wreck: frame('wreck'),
  },
  anims: {
    lit: { frames: ['lit', 'lit_1'], fps: 3 },
    light: { frames: ['light_0', 'light_1', 'lit'], fps: 6, loop: false },
  },
});
