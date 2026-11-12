// FIN par in all 24 story cells on Standard (D156; balance/__fixtures__/finCombos.ts): the
// harness's #14 runs one flag at a time, and the finale reads four. In every cell par wins with
// its margin in the finale's band (40–60: the lower of Voices % and the gate's %), and the choir's
// losses are gradual: no wave hushes more than 40% of the allowance, and none before W12.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import {
  cellName,
  FIN_CELLS,
  firstHushWave,
  maxWaveHushes,
  runFinCell,
} from './__fixtures__/finCombos.ts';
import { HARNESS_TEST_TIMEOUT_MS, PAR_BAND_FLOOR_PCT, PAR_BAND_WIDTH } from './rules.ts';

const content = compileContent(RAW_CONTENT);

describe('FIN par in every story cell', { timeout: HARNESS_TEST_TIMEOUT_MS * 4 }, () => {
  it('wins in band with gradual hushes in all 24', () => {
    const lo = PAR_BAND_FLOOR_PCT.finale!;
    const allowance = content.maps.fin_m01.choir!.maxHushed!;
    const bad: string[] = [];
    for (const cell of FIN_CELLS) {
      const { result: r, margin } = runFinCell(content, 'par', cell);
      const name = cellName(cell);
      if (r.outcome !== 'won') bad.push(`${name}: ${r.outcome} at W${r.lostAtWave}`);
      else if (margin < lo || margin > lo + PAR_BAND_WIDTH) bad.push(`${name}: margin ${margin}`);
      if (maxWaveHushes(r) > 0.4 * allowance) bad.push(`${name}: ${maxWaveHushes(r)} in a wave`);
      const first = firstHushWave(r);
      if (first > 0 && first < 12) bad.push(`${name}: first hush in W${first}`);
    }
    expect(bad).toEqual([]);
  });
});
