// Nibbler's wave-preview icon: round, all eyes and tuft.
import { defineSprite } from '../defineSprite.ts';
import { BIG_EYE } from '../enemies/skitter.ts';
import { enemyIcon } from './enemyIcon.ts';
import { ICON } from './iconGen.ts';

export const iconEnemyNibbler = defineSprite({
  id: 'icon.enemy.nibbler',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'skitterkin',
  outline: 'auto',
  frames: {
    icon: enemyIcon({
      cx: 7,
      cy: 8.5,
      rx: 6.4,
      ry: 5.2,
      belly: 0.4,
      features: [
        [5, 1, ['.dc.', 'cdcb', '.bb.']],
        [7, 6, BIG_EYE],
        [10, 6, BIG_EYE],
        [9, 10, ['k']],
        [2, 7, ['+']],
      ],
    }),
  },
});
