// Build icons for Ves'thara's Aelari towers (art-direction §5: 14×14 front views, the auto outline
// makes 16×16), each floating over the Aelari plinth: a slab of woven sapphire glass rimmed in a lit
// emerald thread, a ruby knot at its front, hovering a row over its shadow like the in-world dais
// (towers/aelariBase.ts). **Prism Spire:** a tall faceted crystal, lit left, a white heart and a ruby
// thread wound round it. **Mindspike Obelisk:** a dark obelisk point-up, ruby knots down its face
// and a violet mind-eye near its tip. **Seer's Lantern:** a woven seed-shaped lantern, a white eye in
// a teal ring inside it, a ruby tassel below.
import { defineSprite } from '../defineSprite.ts';
import { plot, rows, type CharGrid } from '../helpers.ts';
import { ICON, iconGrid, rect } from './iconGen.ts';

/** The floating Aelari plinth (rows 10–13): woven glass, an emerald rim, a ruby knot, a shadow. */
function plinth(g: CharGrid): void {
  rect(g, 1, 10, 12, 1, '9');
  rect(g, 1, 11, 12, 1, '3');
  for (let x = 1; x < 13; x += 2) plot(g, x, 11, '4');
  rect(g, 1, 12, 12, 1, '2');
  plot(g, 6, 11, 'd');
  plot(g, 7, 11, 'c');
  rect(g, 2, 13, 10, 1, '_');
}

function prismIcon(): string[] {
  const g = iconGrid();
  plinth(g);
  // The crystal: pointed top and bottom, floating over the plinth.
  const rowsOf = [
    [6, 1],
    [5, 3],
    [4, 5],
    [4, 5],
    [4, 5],
    [4, 5],
    [4, 5],
    [5, 3],
    [6, 1],
  ] as const;
  rowsOf.forEach(([x0, w], k) => {
    for (let x = x0; x < x0 + w; x++) {
      plot(g, x, k, x < 6 ? '4' : x < 7 ? '3' : x < 8 ? '2' : '1');
    }
  });
  plot(g, 5, 1, '9');
  plot(g, 6, 4, '*');
  plot(g, 7, 4, '+');
  plot(g, 6, 3, '+');
  // The ruby thread wound round it.
  plot(g, 4, 6, 'd');
  plot(g, 5, 6, 'd');
  plot(g, 6, 7, 'c');
  plot(g, 7, 7, 'c');
  return rows(g);
}

function mindspikeIcon(): string[] {
  const g = iconGrid();
  plinth(g);
  // The obelisk, point-up, dark glass lit on its left edge.
  for (let y = 0; y <= 8; y++) {
    const hw = y < 2 ? y : y < 4 ? 2 : 3;
    for (let x = 7 - hw; x < 7 + hw; x++) {
      plot(g, x, y, x === 7 - hw ? '3' : x < 7 ? '1' : '0');
    }
    if (y === 0) plot(g, 6, 0, '4');
  }
  plot(g, 6, 5, 'd');
  plot(g, 6, 7, 'd');
  // The mind-eye, violet.
  plot(g, 7, 2, 'V');
  plot(g, 7, 3, 'U');
  plot(g, 8, 3, 'V');
  plot(g, 7, 4, 'V');
  return rows(g);
}

function lanternIcon(): string[] {
  const g = iconGrid();
  plinth(g);
  // The hoop at the crown.
  plot(g, 6, 0, '9');
  plot(g, 7, 0, '8');
  // The seed-shaped cage.
  const rowsOf = [
    [6, 2],
    [5, 4],
    [4, 6],
    [4, 6],
    [4, 6],
    [5, 4],
    [6, 2],
  ] as const;
  rowsOf.forEach(([x0, w], k) => {
    for (let x = x0; x < x0 + w; x++) {
      const edge = x === x0 || x === x0 + w - 1;
      plot(g, x, k + 1, edge ? (x < 7 ? '4' : '2') : '1');
    }
  });
  // The seer's eye: white in a teal ring.
  plot(g, 6, 3, '+');
  plot(g, 7, 3, '+');
  plot(g, 5, 4, '+');
  plot(g, 6, 4, '*');
  plot(g, 7, 4, '*');
  plot(g, 8, 4, '+');
  plot(g, 6, 5, '+');
  plot(g, 7, 5, '+');
  // The ruby tassel.
  plot(g, 6, 8, 'd');
  plot(g, 6, 9, 'c');
  return rows(g);
}

export const iconTowerPrism = defineSprite({
  id: 'icon.tower.prism',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'aelari',
  outline: 'auto',
  frames: { icon: prismIcon() },
});

export const iconTowerMindspike = defineSprite({
  id: 'icon.tower.mindspike',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'aelari',
  outline: 'auto',
  // Psionic: violet (art-direction §7).
  legend: { V: 'violet.3', U: 'violet.4' },
  frames: { icon: mindspikeIcon() },
});

export const iconTowerLantern = defineSprite({
  id: 'icon.tower.lantern',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'aelari',
  outline: 'auto',
  frames: { icon: lanternIcon() },
});
