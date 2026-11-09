// Bunchling's wave-preview icon: three Nibbler lobes packed into one skin, stretched pink between.
import { defineSprite } from '../defineSprite.ts';
import { EYE } from '../enemies/skitter.ts';
import { enemyIcon } from './enemyIcon.ts';
import { ICON } from './iconGen.ts';
import { disc } from '../helpers.ts';

export const iconEnemyBunchling = defineSprite({
  id: 'icon.enemy.bunchling',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'skitterkin',
  outline: 'auto',
  legend: { P: 'pink.3' },
  frames: {
    icon: enemyIcon({
      cx: 7,
      cy: 9.5,
      rx: 5.6,
      ry: 4.2,
      belly: 0.4,
      // The two back lobes over the front one's shoulders.
      decorate: (g) => {
        disc(g, 3.5, 5, 3.2, (d, x, y) => (d > 2.4 ? '2' : x + y < 7 ? '4' : '3'));
        disc(g, 10.5, 4.5, 3, (d, x, y) => (d > 2.2 ? '2' : x + y < 13 ? '4' : '3'));
      },
      features: [
        [2, 0, ['dc']],
        [10, 0, ['cd']],
        [2, 7, ['PP.......PPP']],
        [6, 7, ['PPP']],
        [7, 8, EYE],
        [10, 8, EYE],
        [2, 4, ['k.k']],
        [9, 4, ['k.k']],
      ],
    }),
  },
});
