// Brood Hauler's wave-preview icon: a plated Skitterkin under a big glittering sack (the
// `carrier` tell reads before anything else).
import { defineSprite } from '../defineSprite.ts';
import { EYE } from '../enemies/skitter.ts';
import { sack, SACK_LEGEND } from '../enemies/sack.ts';
import { at, plot } from '../helpers.ts';
import { enemyIcon } from './enemyIcon.ts';
import { ICON } from './iconGen.ts';

export const iconEnemyBroodHauler = defineSprite({
  id: 'icon.enemy.brood_hauler',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'skitterkin',
  outline: 'auto',
  legend: { S: 'steel.4', T: 'steel.3', ...SACK_LEGEND },
  frames: {
    icon: enemyIcon({
      cx: 7,
      cy: 9.5,
      rx: 7,
      ry: 4.5,
      belly: 0.5,
      decorate: (g) => {
        // A broad steel shell plate across the back, then the sack riding on it.
        for (let x = 1; x <= 9; x++) {
          if (at(g, x, 6) === '.') continue;
          plot(g, x, 6, 'S');
          plot(g, x, 7, x === 5 ? '1' : 'T');
        }
        sack(g, { cx: 5, cy: 4.5, rx: 4, ry: 3.6, twinkle: 0 });
      },
      features: [
        [9, 9, EYE],
        [12, 9, EYE],
        [11, 12, ['kk']],
      ],
    }),
  },
});
