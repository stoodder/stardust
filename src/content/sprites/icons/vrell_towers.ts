// Build icons for the Vrell towers licensed in Act II (art-direction §5: 14×14 front views, the
// auto outline makes 16×16), each on the rusty footing with its price tag still on, like the
// Zapcoil's (icons/zapcoil.ts). **Lookout Shack:** a hut on brass stilts under a patina roof, a lit
// window, its ear trumpet, and the brass spyglass with a green lens glint. **Grapple Harpoon:** a
// banded brass whaling gun tipped up, a barbed steel harpoon in its muzzle and its rope drum.
// **Salvage Crane:** a rust cab and a long lattice jib, a steel hook hanging off its tip.
import { defineSprite } from '../defineSprite.ts';
import { line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { ICON, iconGrid, rect } from './iconGen.ts';

/** The rusty footing and the white price tag every Vrell icon stands on. */
function footing(g: CharGrid): void {
  rect(g, 1, 11, 9, 3, '6');
  rect(g, 1, 11, 9, 1, '7');
  rect(g, 1, 11, 1, 3, '7');
  stamp(g, 10, 11, ['WWW', 'WkU']);
}

function lookoutIcon(): string[] {
  const g = iconGrid();
  footing(g);
  // Stilts.
  line(g, 3, 8, 3, 10, '4');
  line(g, 7, 8, 7, 10, '2');
  // The hut, lit left, a warm window.
  rect(g, 2, 4, 7, 4, '7');
  rect(g, 6, 4, 3, 4, '6');
  stamp(g, 3, 5, ['3+', '3*']);
  // The roof.
  stamp(g, 1, 2, ['..cccc...', 'ddccccbb.', '.........']);
  rect(g, 1, 3, 9, 1, 'd');
  plot(g, 9, 3, 'b');
  // The ear trumpet.
  stamp(g, 9, 5, ['.dc', 'bk.', '...']);
  // The spyglass on its post, lens glinting green.
  plot(g, 5, 1, '2');
  line(g, 2, 1, 9, 0, '4');
  line(g, 2, 2, 9, 1, '2');
  plot(g, 10, 0, 'G');
  plot(g, 10, 1, 'G');
  return rows(g);
}

function harpoonIcon(): string[] {
  const g = iconGrid();
  footing(g);
  // The yoke and breech.
  rect(g, 3, 8, 4, 3, '5');
  rect(g, 2, 6, 5, 3, '3');
  rect(g, 2, 6, 5, 1, '4');
  // The barrel, tipped up to the right, banded.
  line(g, 5, 6, 10, 3, '4');
  line(g, 5, 7, 10, 4, '2');
  line(g, 6, 8, 10, 5, '1');
  plot(g, 8, 4, '3');
  // The harpoon head in the muzzle, barbs swept back.
  line(g, 11, 3, 12, 2, 'S');
  plot(g, 13, 1, 'w');
  plot(g, 11, 1, 'T');
  plot(g, 13, 3, 'T');
  // The rope drum and its crank.
  stamp(g, 0, 7, ['44', 'RQ', 'QR', '22']);
  line(g, 1, 6, 0, 4, '3');
  return rows(g);
}

function craneIcon(): string[] {
  const g = iconGrid();
  footing(g);
  // The cab, a warm window, the patina counterweight.
  rect(g, 2, 7, 6, 4, '7');
  rect(g, 6, 7, 2, 4, '6');
  stamp(g, 4, 8, ['3+']);
  rect(g, 0, 8, 2, 3, 'c');
  // The jib, up to the right, a lattice of brass.
  line(g, 5, 7, 11, 0, '4');
  line(g, 6, 7, 12, 1, '1');
  plot(g, 8, 4, '3');
  plot(g, 10, 2, '3');
  // The hook on its cable.
  line(g, 12, 1, 12, 6, 'T');
  stamp(g, 11, 7, ['.S', 'S.', 'SS']);
  return rows(g);
}

const LEGEND = {
  W: 'white.0',
  U: 'blue.3',
  G: 'green.4',
  S: 'steel.4',
  T: 'steel.2',
  R: 'grime.4',
  Q: 'grime.2',
} as const;

export const iconTowerLookout = defineSprite({
  id: 'icon.tower.lookout',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'vrell',
  outline: 'auto',
  legend: LEGEND,
  frames: { icon: lookoutIcon() },
});

export const iconTowerHarpoon = defineSprite({
  id: 'icon.tower.harpoon',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'vrell',
  outline: 'auto',
  legend: LEGEND,
  frames: { icon: harpoonIcon() },
});

export const iconTowerCrane = defineSprite({
  id: 'icon.tower.crane',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'vrell',
  outline: 'auto',
  legend: LEGEND,
  frames: { icon: craneIcon() },
});
