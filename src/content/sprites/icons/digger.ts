// Digger's wave-preview icon: long and low, a steel scoop on its snout, claws out, dirt on its back.
import { defineSprite } from '../defineSprite.ts';
import { enemyIcon } from './enemyIcon.ts';
import { ICON } from './iconGen.ts';

export const iconEnemyDigger = defineSprite({
  id: 'icon.enemy.digger',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'skitterkin',
  outline: 'auto',
  legend: { S: 'steel.4', T: 'steel.3', M: 'grime.2', N: 'grime.3' },
  frames: {
    icon: enemyIcon({
      cx: 6.5,
      cy: 8.5,
      rx: 6.4,
      ry: 3.8,
      belly: 0.3,
      features: [
        [1, 3, ['.MN', 'NMM']],
        [4, 5, ['SSSSS', 'TTTT1']],
        [9, 7, ['wkSS', 'kkST', '..TT']],
        [10, 11, ['S.S', 'T.T']],
        [1, 11, ['1.1', '0.0']],
      ],
    }),
  },
});
