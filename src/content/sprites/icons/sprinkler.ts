// Frostline Sprinkler's build icon: the teal tank and nozzle flicking frost both ways.
import { defineSprite } from '../defineSprite.ts';
import { disc, plot, rows } from '../helpers.ts';
import { everglowPlinth, ICON, iconGrid, rect } from './iconGen.ts';

function sprinklerIcon(): string[] {
  const g = iconGrid();
  everglowPlinth(g);
  disc(g, 7, 7, 3.6, (d, x, y) => (d > 2.9 ? '6' : x < 6 && y < 7 ? 'B' : x < 8 ? '8' : '7'));
  rect(g, 4, 9, 6, 1, '2');
  plot(g, 5, 5, 'w');
  rect(g, 6, 2, 2, 2, '3'); // riser and nozzle arms
  rect(g, 4, 2, 6, 1, '2');
  rect(g, 6, 1, 2, 1, '4');
  for (const [x, y, ch] of [
    [2, 1, 'B'],
    [11, 1, 'B'],
    [1, 3, 'C'],
    [12, 3, 'C'],
    [3, 4, 'B'],
    [10, 4, 'B'],
  ] as const) {
    plot(g, x, y, ch);
  }
  return rows(g);
}

export const iconTowerSprinkler = defineSprite({
  id: 'icon.tower.sprinkler',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  // A jailbroken class's loadout card and build slot (T731; towers.md § 9): its lights in Vrell orange.
  variants: ['everglow.jailbroken'],
  outline: 'auto',
  // Frost, as on the in-world head.
  legend: { B: 'blue.4', C: 'white.1' },
  frames: { icon: sprinklerIcon() },
});
