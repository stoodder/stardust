// Skyhook Flak Battery's build icon: twin flak barrels standing nearly straight up from a white
// cradle, a teal radar dish on its shoulder, on the Everglow plinth.
import { defineSprite } from '../defineSprite.ts';
import { disc, line, plot, rows } from '../helpers.ts';
import { everglowPlinth, ICON, iconGrid, rect } from './iconGen.ts';

function skyhookIcon(): string[] {
  const g = iconGrid();
  everglowPlinth(g);
  // The barrels: lit left edge, dark right edge, white muzzles, leaning toward the sky.
  for (const x of [5, 8]) {
    line(g, x, 7, x + 2, 1, '4');
    line(g, x + 1, 7, x + 3, 1, '1');
    plot(g, x + 2, 0, 'w');
    plot(g, x + 3, 0, '3');
  }
  // The cradle: white, with a teal sight.
  rect(g, 4, 6, 7, 4, '3');
  rect(g, 4, 6, 7, 1, '4');
  rect(g, 10, 6, 1, 4, '2');
  plot(g, 8, 8, '+');
  plot(g, 9, 8, '*');
  // The radar dish on its arm.
  line(g, 2, 6, 2, 8, '2');
  disc(g, 2, 4, 1.8, (d) => (d > 1.2 ? '6' : '8'));
  plot(g, 1, 4, '*');
  return rows(g);
}

export const iconTowerSkyhook = defineSprite({
  id: 'icon.tower.skyhook',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  // A jailbroken class's loadout card and build slot (T731; towers.md § 9): its lights in Vrell orange.
  variants: ['everglow.jailbroken'],
  outline: 'auto',
  frames: { icon: skyhookIcon() },
});
