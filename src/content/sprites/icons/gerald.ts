// Gerald's wave-preview icon: the mail drone, rotor up, visor on, satchel full.
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, line, plot, rows, stamp } from '../helpers.ts';
import { ICON } from './iconGen.ts';

function geraldIcon(): string[] {
  const g = grid(ICON, ICON);
  line(g, 1, 0, 12, 0, '3');
  plot(g, 7, 1, '1');
  disc(g, 7.5, 6.5, 4.6, (d, x, y) =>
    d > 3.8 ? (x + y < 12 ? '3' : '1') : x + y < 11 ? '4' : x + y < 14 ? '3' : '2',
  );
  plot(g, 7, 2, '7');
  stamp(g, 6, 4, ['88899', '77888']);
  plot(g, 9, 4, 'w');
  line(g, 11, 4, 5, 10, 'c');
  stamp(g, 0, 8, ['.WWU..', 'eWWUe.', 'eeeeed', 'dddddc', '.cccc.']);
  plot(g, 8, 12, '+');
  plot(g, 8, 13, '*');
  return rows(g);
}

export const iconEnemyGerald = defineSprite({
  id: 'icon.enemy.gerald',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  legend: { W: 'white.0', U: 'blue.3' },
  frames: { icon: geraldIcon() },
});
