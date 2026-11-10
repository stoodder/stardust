// T501i: bunched enemies' health bars sort like their bodies (overheadDepth.ts).
import { describe, expect, it } from 'vitest';
import { OVERHEAD_DEPTH, overheadDepth } from './overheadDepth.ts';

describe('overheadDepth (T501i)', () => {
  it('puts the front-most body’s overhead on top, inside the band under the floaters', () => {
    expect(overheadDepth(200, 1)).toBeGreaterThan(overheadDepth(199, 999));
    expect(overheadDepth(200, 2)).toBeGreaterThan(overheadDepth(200, 1)); // a tie: by uid
    for (const y of [-40, 0, 360, 2000]) {
      const d = overheadDepth(y, 999);
      expect(d).toBeGreaterThanOrEqual(OVERHEAD_DEPTH);
      expect(d).toBeLessThan(1); // TransientFx's floaters draw at 1
    }
  });
});
