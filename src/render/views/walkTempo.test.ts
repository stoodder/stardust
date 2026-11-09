import { describe, expect, it } from 'vitest';
import { walkTempo } from './walkTempo.ts';

describe('walkTempo (clump separation, T117)', () => {
  it('gives neighbouring uids different tempos and alternating start frames', () => {
    // A clump spawns with consecutive uids: no two neighbours share a tempo.
    for (let uid = 1; uid < 40; uid++) {
      expect(walkTempo(uid).timeScale).not.toBe(walkTempo(uid + 1).timeScale);
      expect(walkTempo(uid).startFrame).not.toBe(walkTempo(uid + 1).startFrame);
    }
  });

  it('stays subtle: within ±12% of the authored fps, and deterministic', () => {
    for (let uid = 0; uid < 100; uid++) {
      const t = walkTempo(uid).timeScale;
      expect(t).toBeGreaterThanOrEqual(0.88);
      expect(t).toBeLessThanOrEqual(1.12 + 1e-9);
      expect(walkTempo(uid)).toEqual(walkTempo(uid));
    }
  });
});
