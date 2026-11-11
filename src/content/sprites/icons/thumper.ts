// Thumper Mortar's build icon: a squat drum with a fat tube cocked up and to the right.
import { defineSprite } from '../defineSprite.ts';
import { line, plot, rows } from '../helpers.ts';
import { everglowPlinth, ICON, iconGrid, rect } from './iconGen.ts';

function thumperIcon(): string[] {
  const g = iconGrid();
  everglowPlinth(g);
  // The tube: three parallel strokes from the drum up to the muzzle, lit on the upper edge.
  line(g, 5, 6, 10, 1, '4');
  line(g, 6, 6, 11, 1, '3');
  line(g, 6, 7, 11, 2, '3');
  line(g, 7, 7, 12, 2, '1');
  plot(g, 11, 0, 'd');
  plot(g, 12, 1, 'd');
  plot(g, 13, 2, 'c');
  // The drum, with an orange hazard band.
  rect(g, 2, 6, 9, 4, '3');
  rect(g, 3, 5, 6, 1, '4');
  rect(g, 2, 6, 9, 1, '4');
  rect(g, 2, 8, 9, 1, 'c');
  rect(g, 10, 6, 1, 4, '2');
  rect(g, 2, 9, 9, 1, '2');
  return rows(g);
}

export const iconTowerThumper = defineSprite({
  id: 'icon.tower.thumper',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  // A jailbroken class's loadout card and build slot (T731; towers.md § 9): its lights in Vrell orange.
  variants: ['everglow.jailbroken'],
  outline: 'auto',
  frames: { icon: thumperIcon() },
});
