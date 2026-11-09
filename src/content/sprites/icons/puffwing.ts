// Puffwing's wave-preview icon: a little round body between two big cream fluff wings.
import { defineSprite } from '../defineSprite.ts';
import { BIG_EYE } from '../enemies/skitter.ts';
import { enemyIcon } from './enemyIcon.ts';
import { ICON } from './iconGen.ts';

export const iconEnemyPuffwing = defineSprite({
  id: 'icon.enemy.puffwing',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'skitterkin',
  outline: 'auto',
  legend: { F: 'gold.4', G: 'pink.4' },
  frames: {
    icon: enemyIcon({
      cx: 7,
      cy: 8.5,
      rx: 4,
      ry: 3.8,
      belly: 0.35,
      features: [
        // The wings, raised: fluff lit to white on top, pink beneath.
        [0, 2, ['.wF.', 'wFFF', 'FFFF', 'FFFG', '.GG.']],
        [10, 2, ['.Fw.', 'FFFw', 'FFFF', 'GFFF', '.GG.']],
        [6, 3, ['dc', 'cb']],
        [7, 7, BIG_EYE],
        [9, 7, ['k', 'k']],
        [5, 12, ['1..1']],
      ],
    }),
  },
});
