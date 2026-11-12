// FIN's alt:no_mindspike in all 24 story cells on Standard (D156; balance/__fixtures__/finCombos.ts): every
// alt the finale offers must win in every cell at the forgiving floor or better, its losses
// gradual (the `gradual` check, D028: no wave hushes more than half the allowance); and again with
// ×1.5 and ×2 damage on the Unsung (D157: more damage never loses; balance/bossDamage.ts). The
// test step's slow lane (vite.config.ts).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { BOSS_DAMAGE_MULS, withBossDamage } from './bossDamage.ts';
import { altCellFailures } from './__fixtures__/finCombos.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);

describe(
  'FIN alt:no_mindspike in every story cell',
  { timeout: HARNESS_TEST_TIMEOUT_MS * 4 },
  () => {
    it('wins at the forgiving floor or better, gradually, in all 24', () => {
      expect(altCellFailures(content, 'alt:no_mindspike')).toEqual([]);
    });

    it.each(BOSS_DAMAGE_MULS)('still does with ×%s damage on the Unsung', (mul) => {
      expect(altCellFailures(withBossDamage(content, 'fin_m01', mul), 'alt:no_mindspike')).toEqual(
        [],
      );
    });
  },
);
