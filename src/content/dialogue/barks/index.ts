// Shared bark pools (docs/story/style-guide.md § 5.5): barks that can fire on more than one map,
// one file per trigger (`barks/<trigger>.ts`), each bark gated by its own `when` (act, map, flags)
// and by presence (only QUILL and the map's companion speak). Map-only barks live with their map
// (`a1/a1_m0N/barks.ts`). The texts are canon in story/campaign/act1.md § Act I barks.
import type { Bark } from '../types.ts';
import { bankNudge } from './bank_nudge.ts';
import { newEnemy } from './new_enemy.ts';
import { perfectWave } from './perfect_wave.ts';
import { towerSold } from './tower_sold.ts';
import { waveCleared } from './wave_cleared.ts';

export const SHARED_BARKS: readonly Bark[] = [
  ...waveCleared,
  ...perfectWave,
  ...bankNudge,
  ...newEnemy,
  ...towerSold,
];
