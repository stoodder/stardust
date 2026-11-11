// Your old turrets, dead (`prop.dead_turret`; A3M2 decor, act3.md § A3M2, markers
// `dead_turret_<n>`): two of the Everglow turrets you built on A1M4, still standing in the dark
// band round the plaza with their power cut. They must read as **wreckage, never as a tower**
// (art-direction §8 Tile readability): the Everglow plinth in worn paint, one chevron, its trim
// ring dark, a grime run down its faces, its status light out, and its head **knocked off its
// mount**: `v0` a Rivet's twin-barrel head tipped over on its mount, its twin barrels slumped
// off the plinth's left corner into the dirt; `v1` a Thumper's mortar tube toppled across the plinth top, its muzzle
// hanging over the side. On both, cold violet crystal (unsung stardust, §3 Act III) has grown up
// the plinth's shaded face, the Long Night taking back what was left out in it.
import { defineSprite } from '../defineSprite.ts';
import { BASE_ANCHOR, BASE_H, BASE_W, everglowBase } from '../towers/base.ts';
import { fromRows, hash01, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';

/** The plinth, dead: tier 1, its ring dark, grime run down its faces, its light out. */
function plinth(seed: number): CharGrid {
  const g = fromRows(everglowBase(1, '1'));
  const { x: cx, y: cy } = BASE_ANCHOR;
  for (let y = 0; y < BASE_H; y++) {
    for (let x = 0; x < BASE_W; x++) {
      const c = g[y]?.[x];
      if ((c === '2' || c === '1') && hash01(x, 0, seed) < 0.3 && y > cy - 4) plot(g, x, y, 'G');
      if (c === '3' && hash01(x, y, seed) < 0.12) plot(g, x, y, 'G');
    }
  }
  // Crystal growing up the shaded right face from the ground: three shards, lit on their left.
  for (const [x, h] of [
    [cx + 5, 6],
    [cx + 8, 4],
    [cx + 3, 3],
  ] as const) {
    const foot = cy + 7 - Math.round((x - cx) / 2);
    for (let k = 0; k < h; k++) {
      plot(g, x, foot - k, k === h - 1 ? 'W' : 'U');
      if (k < h - 2) plot(g, x + 1, foot - k, 'V');
    }
  }
  plot(g, cx - 7, cy + 4, 'U');
  plot(g, cx - 7, cy + 3, 'W');
  return g;
}

/** `v0`: a Rivet's head slumped off the front corner, its twin barrels in the dirt. */
function rivet(): string[] {
  const g = plinth(5);
  const { x: cx, y: cy } = BASE_ANCHOR;
  // The head: a steel drum tipped over on the mount, its visor dark and cracked.
  // prettier-ignore
  stamp(g, cx - 4, cy - 14, [
    '...2222...',
    '.22333322.',
    '2334443322',
    '2344433221',
    '23kk3k3221',
    '.2333k221.',
    '..222211..',
  ]);
  // Twin barrels slumped down off the plinth's left corner into the dirt.
  line(g, cx - 4, cy - 10, cx - 12, cy - 2, '3');
  line(g, cx - 4, cy - 9, cx - 12, cy - 1, '1');
  line(g, cx - 3, cy - 8, cx - 11, cy + 1, '2');
  line(g, cx - 3, cy - 7, cx - 11, cy + 2, '1');
  plot(g, cx - 13, cy - 1, 'G');
  plot(g, cx - 12, cy + 2, 'G');
  return rows(g);
}

/** `v1`: a Thumper's mortar tube toppled across the plinth top, its muzzle hanging over. */
function thumper(): string[] {
  const g = plinth(9);
  const { x: cx, y: cy } = BASE_ANCHOR;
  // The tube lying along the top face, from the back left down to the front right corner.
  for (let k = 0; k < 20; k++) {
    const x = cx - 7 + k;
    const y = cy - 9 + Math.floor(k / 2);
    plot(g, x, y - 1, k < 16 ? '4' : '3');
    plot(g, x, y, '3');
    plot(g, x, y + 1, '2');
    plot(g, x, y + 2, '1');
  }
  // The muzzle's dark bore and a band of worn orange.
  stamp(g, cx + 13, cy, ['11', 'kk', 'kk', '.1']);
  for (let y = cy - 6; y <= cy - 3; y++) plot(g, cx + 3, y + 1, 'c');
  // Its cradle, snapped, standing empty on the mount.
  line(g, cx - 2, cy - 7, cx - 2, cy - 4, '1');
  line(g, cx + 2, cy - 6, cx + 2, cy - 4, '1');
  return rows(g);
}

export const propDeadTurret = defineSprite({
  id: 'prop.dead_turret',
  size: { w: BASE_W, h: BASE_H },
  anchor: BASE_ANCHOR,
  palette: 'everglow.worn',
  outline: 'auto',
  // Grime runs, and the crystal's cold violet (dark, lit, its white-violet tip).
  legend: { G: 'grime.1', V: 'violet.1', U: 'violet.3', W: 'violet.4' },
  frames: { v0: rivet(), v1: thumper() },
});
