import { describe, expect, it } from 'vitest';
import { A1_M01_RADIO } from './a1_m01.ts';
import { SPEAKERS } from './types.ts';

describe('radio tables', () => {
  it('fit the dialogue line limit and name known speakers (story/style-guide.md §5.4)', () => {
    for (const l of A1_M01_RADIO) {
      expect(l.text.length).toBeLessThanOrEqual(120);
      expect(Object.keys(SPEAKERS)).toContain(l.speaker);
      if (l.on === 'countdown' || l.on === 'waveStart' || l.on === 'waveCleared') {
        expect(l.wave).toBeGreaterThanOrEqual(1);
      }
      if (l.on === 'unlock') expect(l.tower).toBeDefined();
    }
  });
});
