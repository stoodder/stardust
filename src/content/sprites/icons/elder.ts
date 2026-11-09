// Elder's wave-preview icon: a mossy steel shell, white brows over heavy lids, white whiskers.
import { defineSprite } from '../defineSprite.ts';
import { enemyIcon } from './enemyIcon.ts';
import { ICON } from './iconGen.ts';

export const iconEnemyElder = defineSprite({
  id: 'icon.enemy.elder',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'skitterkin',
  outline: 'auto',
  legend: { S: 'steel.4', T: 'steel.3', W: 'white.0' },
  frames: {
    icon: enemyIcon({
      cx: 7,
      cy: 8,
      rx: 6.8,
      ry: 5.6,
      belly: 0.35,
      features: [
        [5, 0, ['.W.W', 'WWWW']],
        [1, 3, ['.SSS', 'STT1', 'TT1.']],
        [2, 3, ['cd']],
        [6, 5, ['WWW.WW']],
        [6, 6, ['.4k.4k']],
        [7, 7, ['k..k']],
        [8, 9, ['W.W']],
        [1, 8, ['*.+']],
      ],
    }),
  },
});
