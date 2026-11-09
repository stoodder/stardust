// Rivet Autoturret's build icon: the white housing with its teal sensor and long twin barrels.
import { defineSprite } from '../defineSprite.ts';
import { rows } from '../helpers.ts';
import { everglowPlinth, ICON, iconGrid, rect } from './iconGen.ts';

function rivetIcon(): string[] {
  const g = iconGrid();
  everglowPlinth(g);
  rect(g, 4, 8, 5, 2, '1'); // neck
  rect(g, 1, 2, 8, 6, '3'); // housing
  rect(g, 2, 1, 6, 1, '4');
  rect(g, 1, 2, 8, 1, '4');
  rect(g, 1, 7, 8, 1, '2');
  rect(g, 8, 2, 1, 6, '2');
  rect(g, 2, 4, 1, 1, '+'); // sensor
  rect(g, 3, 4, 1, 1, '*');
  for (const y of [3, 5]) {
    rect(g, 9, y, 4, 1, '4'); // barrel: lit top, dark underside, white muzzle
    rect(g, 9, y + 1, 4, 1, '1');
    rect(g, 13, y, 1, 2, 'w');
  }
  return rows(g);
}

export const iconTowerRivet = defineSprite({
  id: 'icon.tower.rivet',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  frames: { icon: rivetIcon() },
});
