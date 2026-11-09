// Shared builder for Skitterkin wave-preview icons: the enemy's own shaded body (enemies/skitter.ts)
// fitted into the 14×14 icon box, front-facing (SE), with its features stamped on.
import { finish, skitterBody } from '../enemies/skitter.ts';
import type { CharGrid } from '../helpers.ts';
import { ICON } from './iconGen.ts';

export interface EnemyIconShape {
  readonly cx: number;
  readonly cy: number;
  readonly rx: number;
  readonly ry: number;
  readonly belly: number;
  /** Extra passes on the body before the features (scutes). */
  readonly decorate?: (g: CharGrid) => void;
  readonly features: readonly (readonly [number, number, readonly string[]])[];
}

export function enemyIcon(s: EnemyIconShape): string[] {
  const g = skitterBody({ w: ICON, h: ICON, ...s, facing: 'se' });
  s.decorate?.(g);
  return finish(g, s.features);
}
