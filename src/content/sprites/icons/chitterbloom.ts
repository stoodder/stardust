// Matriarch Chitterbloom's wave-preview icon: the big coral fluffball under her blossom crown,
// grumpy brows over big lashed eyes, blushing cheeks, and a frown.
import { defineSprite } from '../defineSprite.ts';
import { enemyIcon } from './enemyIcon.ts';
import { ICON } from './iconGen.ts';

export const iconEnemyChitterbloom = defineSprite({
  id: 'icon.enemy.chitterbloom',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'skitterkin',
  outline: 'auto',
  legend: { P: 'pink.3', Q: 'pink.4' },
  frames: {
    icon: enemyIcon({
      cx: 7,
      cy: 8.5,
      rx: 7,
      ry: 5.5,
      belly: 0.4,
      features: [
        // The crown: blossoms on a mossy wreath.
        [2, 0, ['.Q...Q...', 'P*P.P*P.Q', '.P.cbcbP*', 'cbc....P.']],
        [5, 5, ['0..0.0..0']],
        [5, 6, ['wkk.wkk']],
        [5, 7, ['kkk.kkk']],
        [4, 9, ['P.....P']],
        [7, 9, ['kk']],
        [1, 8, ['+', '.', '*']],
      ],
    }),
  },
});
