// Shared bark pools (docs/story/style-guide.md § 5.5): barks that can fire on more than one map,
// each gated by its own `when` (act, map, flags) and by presence (only QUILL and the map's companion
// speak). Act I keeps one file per trigger (`barks/<trigger>.ts`); Act II's pool is one file
// (`act2.ts`). Map-only barks live with their map (`a<act>/a<act>_m0N/barks.ts`). The texts are
// canon in their act file (story/campaign/act1.md § Act I barks; act2.md).
import type { Bark } from '../types.ts';
import { act2Barks } from './act2.ts';
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
  ...act2Barks,
];
