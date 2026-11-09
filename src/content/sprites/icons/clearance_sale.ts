// Clearance Sale's ability icon (Zibzab's companion ability): a brass price tag on a string, the old
// price slashed through in orange and the new one scrawled under it.
import { defineSprite } from '../defineSprite.ts';
import { line, plot, rows } from '../helpers.ts';
import { ICON, iconGrid, rect } from './iconGen.ts';

function clearanceSaleIcon(): string[] {
  const g = iconGrid();
  // The tag: brass, lit along the top, a notched left end with a punched hole.
  rect(g, 3, 4, 10, 8, '3');
  rect(g, 3, 4, 10, 1, '4');
  rect(g, 3, 11, 10, 1, '1');
  rect(g, 12, 4, 1, 8, '2');
  plot(g, 2, 6, '3');
  plot(g, 2, 7, '3');
  plot(g, 2, 8, '3');
  plot(g, 2, 9, '3');
  plot(g, 1, 7, '3');
  plot(g, 1, 8, '2');
  plot(g, 3, 7, '0');
  // The string.
  line(g, 3, 6, 0, 1, 'c');
  // The old price, slashed; the new price under it.
  rect(g, 6, 6, 5, 1, '1');
  line(g, 5, 8, 11, 5, '+');
  rect(g, 6, 9, 3, 1, 'k');
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
