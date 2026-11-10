// Build icons for Ves'thara's Aelari towers (art-direction §5: 14×14 front views, the auto outline
// makes 16×16), each floating over the Aelari plinth: a slab of woven sapphire glass, a ruby knot at
// its front, hovering a row over its shadow like the in-world dais (towers/aelariBase.ts), its rim
// thread and woven knots in the tower's trim (U5), so the three tell apart by colour and by shape:
// **Prism Spire:** a squat ruby-pink gem, lit pink-white on the left, a white heart and a sapphire
// thread round its waist (pink trim). **Mindspike Obelisk:** a thin violet needle point-up, ruby
// knots down its face and a lilac mind-eye in a pink ring near its tip (violet trim). **Seer's
// Lantern:** a round brass cage, a gold-white light inside it, an emerald hoop on top and a ruby
// tassel below (gold trim).
import { defineSprite } from '../defineSprite.ts';
import { plot, rows, type CharGrid } from '../helpers.ts';
import { ICON, iconGrid, rect } from './iconGen.ts';

/**
 * The floating Aelari plinth (rows 10–13): its rim thread `rim`, woven glass knotted in `knot`, a
 * ruby knot, a shadow.
 */
function plinth(g: CharGrid, rim: string, knot: string): void {
  rect(g, 1, 10, 12, 1, rim);
  rect(g, 1, 11, 12, 1, '3');
  for (let x = 1; x < 13; x += 2) plot(g, x, 11, knot);
  rect(g, 1, 12, 12, 1, '2');
  plot(g, 6, 11, 'd');
  plot(g, 7, 11, 'c');
  rect(g, 2, 13, 10, 1, '_');
}

function prismIcon(): string[] {
  const g = iconGrid();
  plinth(g, 'd', 'e');
  // The gem: squat and broad, a pointed crown, a short foot (rows 1–9, 8 px wide).
  const rowsOf = [
    [6, 2],
    [5, 4],
    [4, 6],
    [3, 8],
    [3, 8],
    [3, 8],
    [3, 8],
    [4, 6],
    [5, 4],
  ] as const;
  rowsOf.forEach(([x0, w], k) => {
    for (let x = x0; x < x0 + w; x++) {
      plot(g, x, k + 1, x < 5 ? 'e' : x < 7 ? 'd' : x < 9 ? 'c' : 'b');
    }
  });
  // The lit ridge, the white heart, and the sapphire thread round its waist.
  plot(g, 5, 2, 'w');
  plot(g, 4, 4, 'w');
  plot(g, 6, 5, '*');
  plot(g, 7, 5, '+');
  plot(g, 6, 4, '+');
  for (let x = 3; x < 11; x++) plot(g, x, x < 7 ? 7 : 6, x < 7 ? '4' : '2');
  return rows(g);
}

function mindspikeIcon(): string[] {
  const g = iconGrid();
  plinth(g, 'V', 'U');
  // The needle, point-up: deep violet, lit lilac on its left edge, a white point.
  for (let y = 0; y <= 9; y++) {
    const hw = y < 3 ? 0 : 1;
    for (let x = 6 - hw; x < 8 + hw - (y < 3 ? 1 : 0); x++) {
      plot(g, x, y, x === 6 - hw ? 'V' : x < 7 ? 'T' : 'S');
    }
  }
  plot(g, 6, 0, '*');
  plot(g, 6, 1, 'U');
  // Ruby knots down its face.
  plot(g, 6, 7, 'd');
  plot(g, 6, 9, 'd');
  // The mind-eye: lilac in a pink ring.
  plot(g, 7, 3, 'd');
  plot(g, 6, 4, 'd');
  plot(g, 7, 4, 'U');
  plot(g, 8, 4, 'd');
  plot(g, 7, 5, 'd');
  return rows(g);
}

function lanternIcon(): string[] {
  const g = iconGrid();
  plinth(g, 'G', 'H');
  // The hoop at the crown.
  plot(g, 6, 0, '9');
  plot(g, 7, 0, '8');
  // The round brass cage: its rim lit left, shaded right, dark brass inside.
  const rowsOf = [
    [5, 4],
    [4, 6],
    [3, 8],
    [3, 8],
    [3, 8],
    [4, 6],
    [5, 4],
  ] as const;
  rowsOf.forEach(([x0, w], k) => {
    for (let x = x0; x < x0 + w; x++) {
      const edge = x === x0 || x === x0 + w - 1 || k === 0 || k === rowsOf.length - 1;
      plot(g, x, k + 1, edge ? (x < 7 ? 'I' : 'K') : 'L');
    }
  });
  // The seer's light: a white heart in rings of pale and deep gold.
  plot(g, 6, 3, 'H');
  plot(g, 7, 3, 'G');
  plot(g, 5, 4, 'H');
  plot(g, 6, 4, '*');
  plot(g, 7, 4, '*');
  plot(g, 8, 4, 'G');
  plot(g, 6, 5, 'H');
  plot(g, 7, 5, 'G');
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
  legend: { S: 'violet.1', T: 'violet.2', V: 'violet.3', U: 'violet.4' },
  frames: { icon: mindspikeIcon() },
});

export const iconTowerLantern = defineSprite({
  id: 'icon.tower.lantern',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'aelari',
  outline: 'auto',
  // The seer's gold-white light and its brass cage (towers/lantern.ts's legend).
  legend: { G: 'gold.3', H: 'gold.4', I: 'gold.2', K: 'brass.2', L: 'brass.1' },
  frames: { icon: lanternIcon() },
});
