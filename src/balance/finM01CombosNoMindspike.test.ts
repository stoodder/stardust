// FIN's alt:no_mindspike in all 24 story cells on Standard (D156; balance/__fixtures__/finCombos.ts): every
// alt the finale offers must win in every cell at the forgiving floor or better, its losses
// gradual (the `gradual` check, D028: no wave hushes more than half the allowance).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { notGradual } from './checks.ts';
import { cellName, FIN_CELLS, runFinCell } from './__fixtures__/finCombos.ts';
import { FORGIVING_FLOOR_PCT, HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);

describe(
  'FIN alt:no_mindspike in every story cell',
  { timeout: HARNESS_TEST_TIMEOUT_MS * 2 },
  () => {
    it('wins at the forgiving floor or better, gradually, in all 24', () => {
      const bad: string[] = [];
      for (const cell of FIN_CELLS) {
        const { result: r, margin } = runFinCell(content, 'alt:no_mindspike', cell);
        const name = cellName(cell);
        if (r.outcome !== 'won') bad.push(`${name}: ${r.outcome} at W${r.lostAtWave}`);
        else if (margin < FORGIVING_FLOOR_PCT) bad.push(`${name}: margin ${margin}`);
        const wall = notGradual(r);
        if (wall !== null) bad.push(`${name}: ${wall}`);
      }
      expect(bad).toEqual([]);
    });
  },
);
