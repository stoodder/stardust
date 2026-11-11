// M6's build icons and Underfoot's ability icon (art-direction §5: 14×14 front views, the auto
// outline makes 16×16), each saying what its tower is at a glance:
// - **Scuttle Den** (`icon.tower.burrow`): the warren mound, moss-capped, its round dark doorway
//   with two eyes shining in it and a gold lantern by it, on a plinth of turned earth with moss
//   along its top (the Skitterkin plinth: the warren footing, towers/warrenBase.ts).
// - **Hum Choir** (`icon.tower.choir`): three elders side by side in a nest of woven gold grass,
//   eyes shut, mouths round, the middle one humming highest, a gold note rising over them.
// - **Stasis Bloom** (`icon.tower.bloom`): the glass flower, ice-cyan petals fanned round a white
//   bud, floating over the Aelari plinth in its ice trim.
// - **Underfoot** (`icon.ability.underfoot`, Bramble's ability): a hole torn in the road, two coral
//   Skitterkin paws reaching up out of it, claws out, and clods of earth flung up round them. It
//   reads "something grabs you from under the road" at 16×16.
import { defineSprite } from '../defineSprite.ts';
import { disc, plot, rows, type CharGrid } from '../helpers.ts';
import { WARREN_LEGEND, dome } from '../towers/warrenBase.ts';
import { ICON, iconGrid, rect } from './iconGen.ts';

/** The Skitterkin plinth (rows 10–13): a slab of turned earth, moss along its top. */
export function warrenPlinth(g: CharGrid): void {
  rect(g, 1, 10, 12, 1, 'H');
  for (let x = 1; x < 13; x += 3) plot(g, x, 10, 'G');
  rect(g, 1, 11, 12, 1, 'F');
  rect(g, 1, 12, 12, 1, 'J');
  rect(g, 2, 13, 10, 1, 'K');
  plot(g, 9, 11, '*');
  plot(g, 11, 11, '+');
}

function denIcon(): string[] {
  const g = iconGrid();
  dome(g, 7, 6, 6, 5.5, 0.5);
  // The doorway, two eyes in its dark.
  for (let y = 4; y <= 9; y++) {
    for (let x = 5; x <= 9; x++) if (y > 4 || (x > 5 && x < 9)) plot(g, x, y, 'k');
  }
  for (let x = 5; x <= 9; x++) plot(g, x, 3, x < 7 ? 'E' : 'J');
  plot(g, 6, 6, 'w');
  plot(g, 8, 6, 'w');
  // A teal curtain tied back on the left, the lantern on the right.
  plot(g, 4, 5, 'c');
  plot(g, 4, 6, 'd');
  plot(g, 4, 7, 'c');
  plot(g, 11, 4, '6');
  plot(g, 11, 5, '*');
  plot(g, 11, 6, '+');
  warrenPlinth(g);
  return rows(g);
}

function choirIcon(): string[] {
  const g = iconGrid();
  // The nest: woven gold grass, lit left.
  rect(g, 0, 10, 14, 1, '8');
  rect(g, 0, 11, 14, 2, '7');
  rect(g, 1, 13, 12, 1, '6');
  for (let x = 0; x < 14; x += 3) plot(g, x, 11, '9');
  for (let x = 1; x < 14; x += 3) plot(g, x, 12, '8');
  // Three elders, the middle one higher, each a coral ball with a white tuft.
  for (const [cx, cy] of [
    [2.5, 8],
    [7, 6.5],
    [11.5, 8],
  ] as const) {
    disc(g, cx, cy, 2.7, (d, x, y) => (x + y < cx + cy - 1 && d < 2 ? '4' : d < 2.1 ? '3' : '2'));
    const x0 = Math.floor(cx);
    const y0 = Math.floor(cy);
    plot(g, x0, y0 - 3, 'W');
    plot(g, x0 - 1, y0 - 2, 'W');
    // Shut eyes and a round humming mouth.
    plot(g, x0 - 1, y0, 'k');
    plot(g, x0 + 1, y0, 'k');
    plot(g, x0, y0 + 1, 'k');
  }
  // A gold note rising over the middle one.
  plot(g, 9, 2, '*');
  plot(g, 10, 2, '+');
  plot(g, 10, 1, '+');
  plot(g, 10, 0, '+');
  plot(g, 11, 0, '*');
  return rows(g);
}

/** The floating Aelari plinth in the Bloom's ice trim (rows 10–13), as the Aelari icons'. */
function aelariPlinth(g: CharGrid): void {
  rect(g, 1, 10, 12, 1, 'M');
  rect(g, 1, 11, 12, 1, '3');
  for (let x = 1; x < 13; x += 2) plot(g, x, 11, 'L');
  rect(g, 1, 12, 12, 1, '2');
  plot(g, 6, 11, 'd');
  plot(g, 7, 11, 'c');
  rect(g, 2, 13, 10, 1, '_');
}

function bloomIcon(): string[] {
  const g = iconGrid();
  aelariPlinth(g);
  // Six petals fanned round the bud, back pair darker; tips white.
  // prettier-ignore
  const flower = [
    '......*.......',
    '..*...MN..*...',
    '..LN.LMNN.NM..',
    '...LMLMMNNMN..',
    '*..LMM**NMN..*',
    'LLNLM*++*NNNMN',
    '.LMMM+**+MNNN.',
    '..LLMMMMNNNN..',
    '....LMMNN.....',
  ];
  flower.forEach((r, dy) => {
    for (let dx = 0; dx < r.length; dx++) {
      const c = r.charAt(dx);
      if (c !== '.') plot(g, dx, dy, c);
    }
  });
  return rows(g);
}

function underfootIcon(): string[] {
  const g = iconGrid();
  // The road, and the hole torn in it: a dark mouth ringed in turned earth.
  rect(g, 0, 10, 14, 3, 'F');
  rect(g, 0, 12, 14, 1, 'J');
  rect(g, 1, 13, 12, 1, 'K');
  disc(g, 7, 10.5, 4.5, (d, x, y) => (y < 9 ? 'F' : d < 3.2 ? 'k' : d < 4 ? 'K' : 'E'));
  // Two coral paws reaching up out of it, claws out.
  // prettier-ignore
  const paws = [
    'W.W.......W.W.',
    '3W3W.....W3W3.',
    '4333.....3332.',
    '.433.....332..',
    '..433...332...',
    '...33...32....',
    '...32..32.....',
  ];
  paws.forEach((r, dy) => {
    for (let dx = 0; dx < r.length; dx++) {
      const c = r.charAt(dx);
      if (c !== '.') plot(g, dx, 2 + dy, c);
    }
  });
  // Clods flung up.
  plot(g, 0, 6, 'J');
  plot(g, 1, 4, 'K');
  plot(g, 13, 5, 'J');
  plot(g, 12, 3, 'K');
  plot(g, 6, 1, 'J');
  return rows(g);
}

export const iconTowerBurrow = defineSprite({
  id: 'icon.tower.burrow',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'skitterkin.ally',
  outline: 'auto',
  legend: WARREN_LEGEND,
  frames: { icon: denIcon() },
});

export const iconTowerChoir = defineSprite({
  id: 'icon.tower.choir',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'skitterkin.ally',
  outline: 'auto',
  legend: WARREN_LEGEND,
  frames: { icon: choirIcon() },
});

export const iconTowerBloom = defineSprite({
  id: 'icon.tower.bloom',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'aelari',
  outline: 'auto',
  legend: { L: 'act1.water.3', M: 'act1.water.2', N: 'act1.water.1' },
  frames: { icon: bloomIcon() },
});

export const iconAbilityUnderfoot = defineSprite({
  id: 'icon.ability.underfoot',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'skitterkin.ally',
  outline: 'auto',
  legend: WARREN_LEGEND,
  frames: { icon: underfootIcon() },
});
