// M8's wave-preview icon (T841; art-direction §5: the enemy's own look, front-facing, 14×14 with
// the `auto` outline): the Unsung, shrunk from its form-1 SE walk by M7's `icon` (each block's most
// telling pixel kept, so its acid eyes, its pale hollow and the violet in it survive). Its parts
// share it (content/enemies/unsung_part.ts).
import { enemyUnsung } from '../enemies/unsung.ts';
import { icon } from './m7_enemies.ts';

export const iconEnemyUnsung = icon('icon.enemy.unsung', enemyUnsung, true);

/** M8's unit icons in gallery order (sprites/index.ts spreads them into SPRITES). */
export const M8_UNIT_ICONS = [iconEnemyUnsung] as const;
