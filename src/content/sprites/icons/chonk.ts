// Chonk's wave-preview icon: big and contented, with steel-lit back scutes (the Armored tell).
import { defineSprite } from '../defineSprite.ts';
import { EYE } from '../enemies/skitter.ts';
import { at, plot } from '../helpers.ts';
import { enemyIcon } from './enemyIcon.ts';
import { ICON } from './iconGen.ts';

export const iconEnemyChonk = defineSprite({
  id: 'icon.enemy.chonk',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'skitterkin',
  outline: 'auto',
  legend: { S: 'steel.4', T: 'steel.3' },
  frames: {
    icon: enemyIcon({
      cx: 7,
      cy: 7.5,
      rx: 7,
      ry: 6.2,
      belly: 0.55,
      decorate: (g) => {
        // Two rows of scutes across the upper back: a steel-lit edge over a dark seam.
        for (const [y, x0, x1] of [
          [3, 3, 10],
          [5, 1, 6],
        ] as const) {
          for (let x = x0; x <= x1; x++) {
            if (at(g, x, y) === '.') continue;
            plot(g, x, y, x < 6 ? 'S' : 'T');
            plot(g, x, y + 1, '1');
          }
        }
      },
      features: [
        [6, 0, ['.dc.', 'cdcb']],
        [8, 7, EYE],
        [11, 7, EYE],
        [10, 10, ['kk']],
      ],
    }),
  },
});
