// FIN on Story in its hardest cells (D156; balance/__fixtures__/finCombos.ts): Story is easier
// than Standard for every build the finale offers, so par and every alt win there, each at
// least as well as on Standard in the same cell.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { cellName, FIN_HARDEST_CELLS, runFinCell } from './__fixtures__/finCombos.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';

const content = compileContent(RAW_CONTENT);
const BUILDS = [
  'par',
  ...Object.keys(content.maps.fin_m01.builds.altBuilds).map((n) => `alt:${n}`),
];

describe('FIN on Story in the hardest cells', { timeout: HARNESS_TEST_TIMEOUT_MS * 2 }, () => {
  it('par and every alt win, each at least its Standard margin', () => {
    expect(FIN_HARDEST_CELLS.length).toBeGreaterThan(0);
    const bad: string[] = [];
    for (const build of BUILDS) {
      for (const cell of FIN_HARDEST_CELLS) {
        const story = runFinCell(content, build, cell, 'story');
        const name = `${build} ${cellName(cell)}`;
        if (story.result.outcome !== 'won') {
          bad.push(`${name}: ${story.result.outcome} at W${story.result.lostAtWave}`);
          continue;
        }
        const standard = runFinCell(content, build, cell);
        if (story.margin < standard.margin) {
          bad.push(`${name}: Story ${story.margin} under Standard ${standard.margin}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
