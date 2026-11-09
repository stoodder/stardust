// Placeholder art for M3's towers (T300a): Skyhook Flak Battery and Zapcoil, base, head, icon, and
// Skyhook's flak shell, under their final sprite ids. T311a replaces them (shapes.ts).
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, line, plot, rows } from '../helpers.ts';
import { everglowPlinth, ICON, iconGrid, rect } from '../icons/iconGen.ts';
import { BASE_ANCHOR, BASE_H, BASE_MOUNT, BASE_W, everglowBase } from '../towers/base.ts';
import { HEAD_ANCHOR, HEAD_ANIMS, HEAD_H, HEAD_W, box, headFrame } from './shapes.ts';

// ── Skyhook Flak Battery: twin barrels raised at the sky ──────────────────────────────────────

/** Two short barrels angled up toward the facing; returns their muzzles. */
function flakBarrels(g: string[][], dir: 1 | -1): (readonly [number, number])[] {
  const out: [number, number][] = [];
  for (const k of [0, 2]) {
    const x0 = 9 + dir * (k - 1);
    const y0 = 8;
    const x1 = x0 + dir * 5;
    const y1 = 1 + k;
    line(g, x0, y0, x1, y1, '4');
    line(g, x0, y0 + 1, x1, y1 + 1, '1');
    out.push([x1, y1]);
  }
  plot(g, 9, 9, 'd'); // the orange safety band
  return out;
}

export const towerSkyhook = defineSprite({
  id: 'tower.skyhook',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  mount: BASE_MOUNT,
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: { t1: everglowBase(1, 'd'), t2: everglowBase(2, 'd'), t3: everglowBase(3, 'd') },
});

export const towerSkyhookHead = defineSprite({
  id: 'tower.skyhook_head',
  size: { w: HEAD_W, h: HEAD_H },
  anchor: HEAD_ANCHOR,
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  frames: {
    se: headFrame('se', false, flakBarrels),
    se_fire: headFrame('se', true, flakBarrels),
    ne: headFrame('ne', false, flakBarrels),
    ne_fire: headFrame('ne', true, flakBarrels),
  },
  anims: HEAD_ANIMS,
});

function skyhookIcon(): string[] {
  const g = iconGrid();
  everglowPlinth(g);
  disc(g, 7, 8, 3.5, (d) => (d > 2.6 ? '2' : '3'));
  for (const x of [6, 8]) line(g, x, 7, x + 4, 1, '4');
  plot(g, 10, 1, 'w');
  plot(g, 12, 1, 'w');
  rect(g, 6, 8, 3, 1, 'd');
  return rows(g);
}

export const iconTowerSkyhook = defineSprite({
  id: 'icon.tower.skyhook',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  frames: { icon: skyhookIcon() },
});

/** Skyhook's flak shell: a small hot round (the burst is the explosion fx). */
export const projectileSkyhookFlak = defineSprite({
  id: 'projectile.skyhook_flak',
  size: { w: 3, h: 3 },
  anchor: { x: 1, y: 1 },
  palette: 'everglow',
  // prettier-ignore
  frames: { e: ['.d.', 'dwd', '.d.'] },
});

// ── Zapcoil: Zibzab's coil on a mismatched base ───────────────────────────────────────────────

/** The coil: a rod with patina rings and a hot tip; the tip is the "muzzle" in both facings. */
function coil(g: string[][], dir: 1 | -1): (readonly [number, number])[] {
  for (let y = 2; y <= 9; y++) {
    plot(g, 9, y, '2');
    plot(g, 8, y, '3');
  }
  for (const y of [3, 5, 7]) {
    box(g, 6, y, 6, 1, 'c');
    plot(g, 6, y, 'd');
  }
  plot(g, 9 + dir, 1, '+');
  plot(g, 8, 1, '*');
  return [[8, 1]];
}

export const towerZapcoil = defineSprite({
  id: 'tower.zapcoil',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  mount: BASE_MOUNT,
  palette: 'vrell',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: { t1: everglowBase(1, 'c'), t2: everglowBase(2, 'c'), t3: everglowBase(3, 'c') },
});

export const towerZapcoilHead = defineSprite({
  id: 'tower.zapcoil_head',
  size: { w: HEAD_W, h: HEAD_H },
  anchor: HEAD_ANCHOR,
  palette: 'vrell',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: {
    se: headFrame('se', false, coil),
    se_fire: headFrame('se', true, coil),
    ne: headFrame('ne', false, coil),
    ne_fire: headFrame('ne', true, coil),
  },
  anims: HEAD_ANIMS,
});

function zapcoilIcon(): string[] {
  const g = grid(ICON, ICON);
  rect(g, 1, 10, 12, 1, '4');
  rect(g, 1, 11, 12, 2, '2');
  rect(g, 1, 13, 12, 1, '1');
  rect(g, 6, 2, 2, 8, '3');
  for (const y of [3, 5, 7]) rect(g, 3, y, 8, 1, 'c');
  plot(g, 6, 1, '+');
  plot(g, 7, 1, '*');
  line(g, 9, 1, 12, 0, 'e');
  return rows(g);
}

export const iconTowerZapcoil = defineSprite({
  id: 'icon.tower.zapcoil',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'vrell',
  outline: 'auto',
  frames: { icon: zapcoilIcon() },
});
