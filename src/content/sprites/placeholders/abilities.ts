// Placeholder ability icons (T300a): QUILL's Time Dilation (a slowed clock) and Zibzab's
// Clearance Sale (a price tag), under their final sprite ids. T311a replaces them (shapes.ts).
import { defineSprite } from '../defineSprite.ts';
import { disc, line, plot, rows } from '../helpers.ts';
import { ICON, iconGrid, rect } from '../icons/iconGen.ts';

function timeDilationIcon(): string[] {
  const g = iconGrid();
  // A teal clock face with a white rim and two hands, one dragging a motion trail.
  disc(g, 7, 7, 6.5, (d) => (d > 5.6 ? '9' : d > 4.8 ? '7' : '6'));
  line(g, 7, 7, 7, 3, 'w');
  line(g, 7, 7, 10, 9, 'w');
  for (const [x, y] of [
    [9, 4],
    [10, 5],
    [11, 6],
  ] as const) {
    plot(g, x, y, '8');
  }
  plot(g, 7, 7, '+');
  return rows(g);
}

export const iconAbilityTimeDilation = defineSprite({
  id: 'icon.ability.time_dilation',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  frames: { icon: timeDilationIcon() },
});

function clearanceSaleIcon(): string[] {
  const g = iconGrid();
  // A brass price tag on a string, with a slashed price.
  rect(g, 3, 4, 9, 8, '3');
  rect(g, 3, 4, 9, 1, '4');
  rect(g, 3, 11, 9, 1, '1');
  plot(g, 2, 7, '3');
  plot(g, 2, 8, '3');
  plot(g, 4, 7, '0'); // the hole
  line(g, 4, 6, 1, 1, 'c');
  line(g, 6, 9, 10, 6, 'd'); // the slash through the old price
  rect(g, 6, 6, 4, 1, '1');
  rect(g, 6, 9, 3, 1, '1');
  return rows(g);
}

export const iconAbilityClearanceSale = defineSprite({
  id: 'icon.ability.clearance_sale',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'vrell',
  outline: 'auto',
  frames: { icon: clearanceSaleIcon() },
});
