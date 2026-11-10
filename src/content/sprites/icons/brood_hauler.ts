// Brood Hauler's wave-preview icon: a plated Skitterkin under a big glittering sack (the
// `carrier` tell reads before anything else).
import { defineSprite } from '../defineSprite.ts';
import { EYE } from '../enemies/skitter.ts';
import { sack, SACK_LEGEND, type SackShape, youngHeads } from '../enemies/sack.ts';
import { at, fromRows, plot, rows } from '../helpers.ts';
import { enemyIcon } from './enemyIcon.ts';
import { ICON } from './iconGen.ts';

export const iconEnemyBroodHauler = defineSprite({
  id: 'icon.enemy.brood_hauler',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'skitterkin',
  outline: 'auto',
  legend: { S: 'white.0', T: 'steel.4', ...SACK_LEGEND },
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

/** The Act II sack (D134): untied and lit pale, set low so the young fit over it. */
const YOUNG_BAG: SackShape = { cx: 6.5, cy: 8.5, rx: 3.7, ry: 3.4, twinkle: 0, young: 'se' };

/**
 * A fleeing Hauler's wave-preview icon (D134; W3 of A2M3 shows it): the same untied sack as its
 * body, its three young looking out over the rim, so the preview says "young" before the wave
 * walks on.
 */
export const iconEnemyBroodHaulerFleeing = defineSprite({
  id: 'icon.enemy.brood_hauler_fleeing',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'skitterkin',
  outline: 'auto',
  legend: { S: 'white.0', T: 'steel.4', ...SACK_LEGEND },
  frames: {
    icon: (() => {
      const g = fromRows(
        enemyIcon({
          cx: 7,
          cy: 10.5,
          rx: 7,
          ry: 3.5,
          belly: 0.5,
          decorate: (b) => {
            for (let x = 1; x <= 9; x++) {
              if (at(b, x, 8) === '.') continue;
              plot(b, x, 8, 'S');
            }
            sack(b, YOUNG_BAG);
          },
          features: [
            [10, 10, EYE],
            [12, 12, ['kk']],
          ],
        }),
      );
      youngHeads(g, YOUNG_BAG, 0, 0);
      return rows(g);
    })(),
  },
});
