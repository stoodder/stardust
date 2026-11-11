// M7's build icons and System Reboot's ability icon (art-direction §5: 14×14 front views, the auto
// outline makes 16×16), each saying what it is at a glance:
// - **Gloop Spitter** (`icon.tower.gloop`): the Chonk, recognizably (its steel-rimmed back bands,
//   its teal tuft), grinning, a drop of green acid on its lip, on the Skitterkin plinth of turned
//   earth.
// - **Sproing Pad** (`icon.tower.sproing`): the blue spotted mushroom pad, its leaper sat on top in
//   its own blue helmet, eyes wide, on the same plinth.
// - **System Reboot** (`icon.ability.system_reboot`, QUILL's patch): the power symbol (a broken
//   ring, a bar through its gap) in `teal.4` lit white, a clockwise arrowhead closing the ring, on a
//   dark screen in a steel bezel: "turn it off and on again".
import { defineSprite } from '../defineSprite.ts';
import { skitterBody } from '../enemies/skitter.ts';
import { disc, line, plot, rows, stamp } from '../helpers.ts';
import { WARREN_LEGEND } from '../towers/warrenBase.ts';
import { ICON, iconGrid, rect } from './iconGen.ts';
import { warrenPlinth } from './m6_towers.ts';

function gloopIcon(): string[] {
  const body = skitterBody({ w: ICON, h: ICON, cx: 7, cy: 6.5, rx: 6.8, ry: 5, facing: 'se', belly: 0.5 });
  const g = body;
  // The back bands: two rows of steel-rimmed plates over its crown.
  for (const [y, from, to, odd] of [
    [3, 3, 11, 0],
    [5, 1, 13, 1],
  ] as const) {
    for (let x = from; x < to; x++) {
      if (g[y]?.[x] === '.' || g[y]?.[x] === undefined) continue;
      const k = (x + odd * 2) % 4;
      plot(g, x, y, k === 0 ? '1' : x < 7 ? 'V' : 'S');
      if (g[y + 1]?.[x] !== '.') plot(g, x, y + 1, k === 0 ? '1' : x < 6 ? '4' : '3');
    }
  }
  stamp(g, 5, 0, ['.dc.', 'cdcb']);
  // Eyes and the grin, a drop of acid on its lip.
  stamp(g, 7, 6, ['wk.wk', 'kk.kk']);
  stamp(g, 7, 8, ['k...k', '.kkk.', '..A..']);
  warrenPlinth(g);
  return rows(g);
}

function sproingIcon(): string[] {
  const g = iconGrid();
  // The stalk and the wide blue cap.
  rect(g, 5, 7, 2, 3, 'W');
  rect(g, 7, 7, 2, 3, 'V');
  for (let y = 4; y <= 7; y++) {
    const hw = [5, 6.5, 7, 7][y - 4] ?? 7;
    for (let x = Math.round(7 - hw); x < Math.round(7 + hw); x++) {
      plot(g, x, y, y === 7 ? 'Q' : x < 5 && y < 6 ? 'B' : x > 9 ? 'D' : 'R');
    }
  }
  plot(g, 2, 6, 'X');
  plot(g, 11, 5, 'X');
  // The leaper on top: a coral ball in its blue helmet, eyes wide.
  disc(g, 7, 3, 2.6, (d, x, y) => (x + y < 9 && d < 1.8 ? '4' : '3'));
  stamp(g, 4, 0, ['.RRRR.', 'RXRRXR']);
  stamp(g, 6, 3, ['wk.', '...']);
  plot(g, 8, 3, 'w');
  plot(g, 9, 3, 'k');
  warrenPlinth(g);
  return rows(g);
}

function systemRebootIcon(): string[] {
  const g = iconGrid();
  // A dark screen in a steel bezel.
  rect(g, 0, 0, 14, 14, '2');
  rect(g, 1, 1, 12, 12, 'k');
  line(g, 1, 0, 12, 0, '4');
  line(g, 0, 1, 0, 12, '4');
  // The power ring, open at the top, lit upper left.
  disc(g, 7, 7.5, 4.6, (d, x, y) => {
    if (d < 3.3) return 'k';
    if (y < 5 && x >= 5 && x <= 8) return 'k';
    return x + y < 12 ? 'w' : '*';
  });
  // The bar through its gap.
  line(g, 6, 2, 6, 7, '*');
  line(g, 7, 2, 7, 7, 'w');
  // The arrowhead closing the ring clockwise, on its right shoulder.
  plot(g, 9, 2, '*');
  plot(g, 10, 2, '*');
  plot(g, 10, 3, '*');
  plot(g, 11, 4, '+');
  return rows(g);
}

export const iconTowerGloop = defineSprite({
  id: 'icon.tower.gloop',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'skitterkin.ally',
  outline: 'auto',
  legend: { ...WARREN_LEGEND, A: 'green.4' },
  frames: { icon: gloopIcon() },
});

export const iconTowerSproing = defineSprite({
  id: 'icon.tower.sproing',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'skitterkin.ally',
  outline: 'auto',
  legend: { ...WARREN_LEGEND, R: 'blue.3', Q: 'blue.1', D: 'blue.2', X: 'white.1' },
  frames: { icon: sproingIcon() },
});

export const iconAbilitySystemReboot = defineSprite({
  id: 'icon.ability.system_reboot',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  frames: { icon: systemRebootIcon() },
});

/** M7's tower and ability icons, in gallery order (sprites/index.ts spreads them into SPRITES). */
export const M7_TOWER_ICONS = [iconTowerGloop, iconTowerSproing, iconAbilitySystemReboot] as const;
