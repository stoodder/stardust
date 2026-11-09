// Zoomer's wave-preview icon: lean and low, tuft streaming back, body running hot like the sprite's.
import { defineSprite } from '../defineSprite.ts';
import { recolor } from '../helpers.ts';
import { EYE } from '../enemies/skitter.ts';
import { enemyIcon } from './enemyIcon.ts';
import { ICON } from './iconGen.ts';

export const iconEnemyZoomer = defineSprite({
  id: 'icon.enemy.zoomer',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'skitterkin',
  outline: 'auto',
  legend: { O: 'orange.3', P: 'orange.4', Q: 'orange.2' },
  frames: {
    icon: recolor(
      enemyIcon({
        cx: 7.5,
        cy: 9,
        rx: 6.5,
        ry: 3.8,
        belly: 0.2,
        features: [
          [0, 3, ['cdd...', '.bccd.', '..bb..']],
          [9, 7, EYE],
          [12, 7, EYE],
          [11, 10, ['k']],
          [3, 7, ['+.+']],
          [0, 12, ['.1..1..1..1.']],
        ],
      }),
      { '2': 'Q', '3': 'O', '4': 'P' },
    ),
  },
});
