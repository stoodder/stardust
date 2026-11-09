// Zapcoil's build icon: Zibzab's tesla coil, brass windings under a patina toroid with a white-hot
// core, the oversized claw arm sparking blue, on a rusty footing with the price tag still on.
import { defineSprite } from '../defineSprite.ts';
import { line, plot, rows, stamp } from '../helpers.ts';
import { ICON, iconGrid, rect } from './iconGen.ts';

function zapcoilIcon(): string[] {
  const g = iconGrid();
  // The footing: rust, lit left.
  rect(g, 1, 11, 9, 3, '6');
  rect(g, 1, 11, 9, 1, '7');
  rect(g, 1, 11, 1, 3, '7');
  // The windings.
  for (let y = 3; y <= 10; y++) rect(g, 4, y, 3, 1, y % 2 ? '4' : '2');
  // The toroid with its hot core.
  stamp(g, 2, 1, ['.dddd..', 'ddcwcdd', '.aaaaa.']);
  // The claw arm and its sparking prongs.
  line(g, 7, 7, 11, 5, '3');
  line(g, 7, 8, 11, 6, '1');
  stamp(g, 11, 3, ['.4w', '4..', '...', '2..', '.2w']);
  plot(g, 13, 2, 'Z');
  plot(g, 13, 8, 'Z');
  // The price tag.
  stamp(g, 10, 11, ['WWW', 'WkU']);
  return rows(g);
}

export const iconTowerZapcoil = defineSprite({
  id: 'icon.tower.zapcoil',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'vrell',
  outline: 'auto',
  legend: { Z: 'blue.4', W: 'white.0', U: 'blue.3' },
  frames: { icon: zapcoilIcon() },
});
