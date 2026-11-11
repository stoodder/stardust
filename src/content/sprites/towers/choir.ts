// Hum Choir (`choir`, design/towers.md § Hum Choir): a ring of elder Skitterkin humming in
// harmony, a gift after A3M1 if the Quiet Wave was spared (Old Thrum's ring). **A home** (towers.md
// §8): a nest of woven grass, butter-gold and lit on the left, round a mossy floor, on the warren
// footing (towers/warrenBase.ts); in it sit five elders, white-tufted and green-mossed like the
// Elder the player met in A1M5, the three at the back facing out with their eyes shut and their
// mouths round, the two at the front showing their backs and their gold flank spots. Between them
// the hum glows, a warm gold light, and little gold notes rise off it. It doesn't aim: its idle
// `hum` sways the elders in turn, in time (towers.md §8), the light breathes, and a note climbs.
// **Thrum's ring** (`hum_thrum`, and `_spec_a`/`_spec_b`): the back middle elder is Old Thrum,
// broader than the rest, her old steel shell gone green with moss behind her head, its seams lit
// with her pink-gold shimmer (art-direction § Portrait roster's `thrum`), so the player who spared
// her sees her singing. Tiers read on the base: T2 stands a sheaf of woven grass at each side
// corner; T3 a reed post with a seed-pod lantern on the left. The specs: **Lullaby** (`spec_a`,
// enemies' abilities slow) hangs a moonlight-blue crescent over the ring and turns its notes blue,
// the elders swaying slower, over a base with a crescent lantern on a reed crook at each corner;
// **Rally Chorus** (`spec_b`, +damage and fire rate, no jams) stands the elders up with their paws
// raised in turn, the light bigger, over a base with a hide drum at each corner and a gold
// pennant.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, hash01, plot, rows, type CharGrid } from '../helpers.ts';
import { BASE_ANCHOR, BASE_H, BASE_MOUNT, BASE_W } from './base.ts';
import {
  WARREN_LEGEND,
  glowDrop,
  pennant,
  reedLantern,
  sheaf,
  warrenBase,
  warrenSpecBase,
} from './warrenBase.ts';

const W = 28;
const H = 26;
/** The head's anchor (sits on the base's mount, the footing's top face). */
const CX = 14;
const CY = 23;
const SEED = 77;
/** The nest ring's centre and radii. */
const NX = CX;
const NY = CY - 1;

type Kit = 't1' | 'lullaby' | 'rally';

/** T2: a sheaf of woven grass at each side corner. */
function sheaves(g: CharGrid, cx: number, cy: number): void {
  sheaf(g, cx - 11, cy - 1, 9);
  sheaf(g, cx + 12, cy, 7);
}

/** T3: a reed post with a seed-pod lantern on the left. */
function chime(g: CharGrid, cx: number, cy: number): void {
  reedLantern(g, cx - 13, cy - 7, cy - 22);
}

/** A crescent moon lantern (moonlight blue, lit white at its horn) hung off a reed crook. */
function moonCrook(g: CharGrid, x: number, foot: number, top: number, side: 1 | -1): void {
  for (let y = top; y <= foot; y++) plot(g, x, y, y % 3 === 0 ? '6' : '7');
  plot(g, x + side, top - 1, '7');
  plot(g, x + 2 * side, top - 1, '6');
  plot(g, x + 3 * side, top, '6');
  // The crescent: a C opening away from the post.
  const mx = x + 3 * side;
  const my = top + 4;
  disc(g, mx, my, 2.6, (d, px, py) => {
    const inner = Math.hypot(px + 0.5 - (mx + side * 1.4), py + 0.5 - (my - 0.4)) < 1.9;
    if (inner) return '.';
    return d < 1.4 ? 'w' : px + 0.5 < mx ? 'B' : 'C';
  });
}

/** Lullaby's base: a crescent lantern on a reed crook at each corner. */
function lullabyKit(g: CharGrid, cx: number, cy: number): void {
  moonCrook(g, cx - 11, cy - 4, cy - 18, -1);
  moonCrook(g, cx + 12, cy - 3, cy - 14, 1);
}

/** A hide drum: a short coral-red barrel under a pale hide head, laced. */
function drum(g: CharGrid, cx: number, cy: number): void {
  for (let y = cy - 4; y <= cy; y++) {
    for (let x = cx - 3; x < cx + 3; x++) {
      const band = y === cy - 1 || y === cy - 3;
      plot(g, x, y, band ? (x < cx ? 'R' : 'Q') : x < cx - 1 ? 'J' : x < cx + 1 ? 'K' : 'L');
    }
  }
  for (let x = cx - 3; x < cx + 3; x++) plot(g, x, cy - 5, x < cx ? 'W' : 'V');
  plot(g, cx - 2, cy - 6, 'W');
  plot(g, cx - 1, cy - 6, 'W');
  plot(g, cx, cy - 6, 'V');
  plot(g, cx + 1, cy - 6, 'V');
}

/** Rally Chorus's base: a hide drum at each corner and a gold pennant behind the left. */
function rallyKit(g: CharGrid, cx: number, cy: number): void {
  pennant(g, cx - 13, cy - 3, cy - 17, '9', '8', 1);
  drum(g, cx - 11, cy);
  drum(g, cx + 11, cy + 1);
  pennant(g, cx + 13, cy - 1, cy - 12, '9', '8', -1);
}

export const towerChoir = defineSprite({
  id: 'tower.choir',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  mount: BASE_MOUNT,
  palette: 'skitterkin.ally',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: WARREN_LEGEND,
  frames: {
    t1: warrenBase(1, { t2: sheaves, t3: chime }, SEED),
    t2: warrenBase(2, { t2: sheaves, t3: chime }, SEED),
    t3: warrenBase(3, { t2: sheaves, t3: chime }, SEED),
    spec_a: warrenSpecBase(lullabyKit, SEED),
    spec_b: warrenSpecBase(rallyKit, SEED),
  },
});

/** Whether (x, y) is inside the nest's ellipse of radii (rx, ry). */
function inNest(x: number, y: number, rx: number, ry: number): number {
  return Math.hypot((x + 0.5 - NX) / rx, (y + 0.5 - NY) / ry);
}

/**
 * The nest: a ring of woven grass round a mossy floor, its strands crossing. `front` draws only its
 * front wall (over the elders seated in it), else its floor and back wall.
 */
function nest(g: CharGrid, front: boolean): void {
  for (let y = NY - 7; y <= NY + 6; y++) {
    for (let x = NX - 12; x <= NX + 12; x++) {
      // The wall stands 1 px: the outer ellipse lifted, so its back rises behind the floor.
      const outer = Math.min(inNest(x, y, 10.5, 4.6), inNest(x, y + 1, 10.5, 4.6));
      if (outer > 1) continue;
      const floor = inNest(x, y, 8.5, 3.4) <= 1 && inNest(x, y + 1, 8.5, 3.4) <= 1;
      const isFront = y + 0.5 > NY;
      if (floor) {
        if (!front) plot(g, x, y, hash01(x, y, 5) < 0.3 ? 'I' : (x + y) % 3 === 0 ? 'H' : 'I');
        continue;
      }
      if (front !== isFront) continue;
      const lit = (NX - x) / 10.5 + (y < NY ? 0.3 : -0.3);
      const strand = (x + 2 * y) % 4 === 0 || (x - 2 * y + 40) % 5 === 0;
      plot(g, x, y, strand ? (lit > 0 ? '8' : '7') : lit > 0.1 ? '7' : '6');
    }
  }
}

/** One seated elder (an Elder, small): `front` shows her face, else her back. */
interface Seat {
  readonly x: number;
  readonly y: number;
  readonly front: boolean;
}

/** The ring's five seats: three at the back facing out over the light, two at the front. */
const SEATS: readonly Seat[] = [
  { x: NX - 7, y: NY - 1, front: true },
  { x: NX, y: NY - 2, front: true },
  { x: NX + 7, y: NY - 1, front: true },
  { x: NX - 9, y: NY + 3, front: false },
  { x: NX + 9, y: NY + 3, front: false },
];

/** An elder: a coral ball, a white tuft, moss on her back; a closed-eyed humming face or a back. */
function elder(g: CharGrid, s: Seat, sway: number, open: boolean, paw: boolean, tall: number): void {
  const cx = s.x + sway + 0.5;
  const rx = s.front ? 3.2 : 2.5;
  const ry = (s.front ? 3 : 2.4) + tall * 0.7;
  const cy = s.y - ry + 1;
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = Math.hypot(dx, dy);
      if (d > 1) continue;
      const lit = -0.6 * dx - 0.8 * dy;
      let ch = lit > 0.45 && d < 0.8 ? '4' : lit > -0.3 ? '3' : '2';
      if (s.front && dy > 0.45 && Math.abs(dx) < 0.5) ch = '9';
      if (!s.front && dy < -0.15 && dx > -0.6 && dx < 0.4) ch = dy < -0.55 ? 'G' : 'H';
      plot(g, x, y, ch);
    }
  }
  const top = Math.round(cy - ry);
  const x0 = Math.floor(cx);
  // The white tuft.
  plot(g, x0 - 1, top, 'W');
  plot(g, x0, top - 1, 'W');
  const ey = Math.round(cy);
  if (s.front) {
    // Eyes shut (two dark lids), the mouth a dark round O when the hum opens it.
    plot(g, x0 - 2, ey - 1, 'k');
    plot(g, x0 + 1, ey - 1, 'k');
    plot(g, x0 - 1 + (open ? 0 : 0), ey, open ? 'k' : '2');
    if (open) plot(g, x0, ey, 'k');
  } else {
    // Her gold flank spots.
    plot(g, x0 - 2, ey + 1, '+');
    plot(g, x0 + 2, ey + 1, '*');
  }
  if (paw) {
    // A paw raised over her head (Rally Chorus).
    plot(g, x0 + 2, top - 1, '3');
    plot(g, x0 + 2, top - 2, '4');
  }
}

/** Old Thrum at the back middle: broader, her mossed steel shell behind her, its seams shimmering. */
function thrum(g: CharGrid, sway: number, open: boolean, paw: boolean, tall: number): void {
  const s = SEATS[1]!;
  const cx = s.x + sway + 0.5;
  const top = s.y - 8 - Math.round(tall);
  // The shell: plates rising behind her head, moss on top, her shimmer in the seams.
  for (let y = top; y <= top + 5; y++) {
    for (let x = Math.floor(cx - 5); x <= Math.ceil(cx + 5); x++) {
      const dx = (x + 0.5 - cx) / 4.6;
      const dy = (y + 0.5 - (top + 5)) / 5;
      if (Math.hypot(dx, dy) > 1) continue;
      const seam = Math.abs(x + 0.5 - (cx - 1.5)) < 0.6 || Math.abs(x + 0.5 - (cx + 1.5)) < 0.6;
      plot(g, x, y, dy < -0.6 ? (x < cx ? 'G' : 'H') : seam ? 'P' : x < cx ? 'V' : 'S');
    }
  }
  elder(g, { x: s.x, y: s.y, front: true }, sway, open, paw, tall + 0.5);
  // Her bushy white brows and chin whiskers.
  const x0 = Math.floor(cx);
  const ey = Math.round(s.y - 2.2 - (tall + 0.5) * 0.7);
  plot(g, x0 - 3, ey - 1, 'W');
  plot(g, x0 + 2, ey - 1, 'W');
  plot(g, x0 - 2, ey - 2, 'W');
  plot(g, x0 + 1, ey - 2, 'W');
}

/** A rising note: a gold (or Lullaby blue) head with a stem and a flag. */
function note(g: CharGrid, x: number, y: number, blue: boolean): void {
  const [a, b] = blue ? ['B', 'C'] : ['*', '+'];
  plot(g, x, y, a);
  plot(g, x + 1, y, b);
  plot(g, x + 1, y - 1, b);
  plot(g, x + 1, y - 2, b);
  plot(g, x + 2, y - 2, a);
}

function choirHead(kit: Kit, beat: number, withThrum: boolean): string[] {
  const g = grid(W, H);
  const lullaby = kit === 'lullaby';
  const rally = kit === 'rally';
  const tall = rally ? 1 : 0;
  nest(g, false);
  const sing = (i: number): void => {
    const s = SEATS[i]!;
    const sway = lullaby ? 0 : (i + beat) % 2 === 0 ? 0 : i % 2 === 0 ? 1 : -1;
    const open = (i + beat) % 2 === 0;
    const paw = rally && (i + beat) % 4 < 2;
    if (i === 1 && withThrum) thrum(g, sway, open, paw, tall);
    else elder(g, s, sway, open, paw, tall);
  };
  // The back row, then the hum's light in the middle (breathing), then the front row.
  [0, 1, 2].forEach(sing);
  glowDrop(g, NX + 0.5, NY - 0.5, rally ? (beat % 2 === 0 ? 2.6 : 2.2) : beat % 2 === 0 ? 2 : 1.6);
  [3, 4].forEach(sing);
  nest(g, true);
  // A note climbing off the light, one row a beat.
  note(g, NX + 1, NY - 9 - beat, lullaby);
  if (lullaby) {
    // The moonlight crescent hanging over the ring.
    disc(g, NX - 6, 4, 2.6, (d, px, py) => {
      if (Math.hypot(px + 0.5 - (NX - 4.8), py + 0.5 - 3.5) < 2) return '.';
      return d < 1.3 ? 'w' : px + 0.5 < NX - 6 ? 'B' : 'C';
    });
  }
  return rows(g);
}

const BEATS = [0, 1, 2, 3] as const;
const frames = (prefix: string, kit: Kit, withThrum: boolean): [string, string[]][] =>
  BEATS.map((k) => [`${prefix}_${k}`, choirHead(kit, k, withThrum)]);
const anim = (prefix: string, fps: number) => ({
  frames: BEATS.map((k) => `${prefix}_${k}`),
  fps,
});

export const towerChoirHead = defineSprite({
  id: 'tower.choir_head',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'skitterkin.ally',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: WARREN_LEGEND,
  frames: Object.fromEntries([
    ...frames('hum', 't1', false),
    ...frames('hum_spec_a', 'lullaby', false),
    ...frames('hum_spec_b', 'rally', false),
    ...frames('hum_thrum', 't1', true),
    ...frames('hum_thrum_spec_a', 'lullaby', true),
    ...frames('hum_thrum_spec_b', 'rally', true),
  ]),
  anims: {
    // The first anim is the tier 1–3 idle (render's `headStyle`); `hum_thrum` is Thrum's ring.
    hum: anim('hum', 3),
    // The Lullaby sways slower.
    hum_spec_a: anim('hum_spec_a', 2),
    hum_spec_b: anim('hum_spec_b', 4),
    hum_thrum: anim('hum_thrum', 3),
    hum_thrum_spec_a: anim('hum_thrum_spec_a', 2),
    hum_thrum_spec_b: anim('hum_thrum_spec_b', 4),
  },
});
